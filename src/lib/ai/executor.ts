import type { SupabaseClient } from "@supabase/supabase-js";

function fmt(n: number): string {
  return `$${n.toLocaleString("es-CA", { minimumFractionDigits: 0 })}`;
}

// ── Read tools ────────────────────────────────────────────────────────────────

export async function executeReadTool(
  name: string,
  input: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<string> {
  try {
    switch (name) {
      case "get_business_summary": {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

        const [
          { data: monthOrders },
          { data: activeOrders },
          { count: clientCount },
        ] = await Promise.all([
          supabase.from("orders").select("total").gte("delivery_date", monthStart).neq("status", "cancelado"),
          supabase.from("orders")
            .select("client_name, delivery_date, total, status")
            .in("status", ["pendiente", "aprobado", "en_proceso"])
            .order("delivery_date", { ascending: true })
            .limit(5),
          supabase.from("clients").select("*", { count: "exact", head: true }),
        ]);

        const monthRevenue = (monthOrders ?? []).reduce((s, o) => s + (o.total ?? 0), 0);
        const monthLabel = now.toLocaleDateString("es-CA", { month: "long", year: "numeric" });

        let result = `Resumen del negocio (${now.toLocaleDateString("es-CA")}):\n`;
        result += `• Ingresos de ${monthLabel}: ${fmt(monthRevenue)} (${monthOrders?.length ?? 0} pedidos)\n`;
        result += `• Clientes registrados: ${clientCount ?? 0}\n`;
        result += `• Pedidos activos: ${activeOrders?.length ?? 0}\n`;
        if (activeOrders?.length) {
          result += "\nPróximos pedidos activos:\n";
          result += activeOrders
            .map((o) => `  - ${o.delivery_date} | ${o.client_name} | ${fmt(o.total ?? 0)} | ${o.status}`)
            .join("\n");
        }
        return result;
      }

      case "get_top_clients": {
        const limit = Math.min((input.limit as number) ?? 5, 20);
        const rankBy = (input.rank_by as string) ?? "revenue";

        const [{ data: clients }, { data: orders }] = await Promise.all([
          supabase.from("clients").select("id, name"),
          supabase.from("orders").select("client_id, client_name, total").neq("status", "cancelado"),
        ]);

        const aggById = new Map<string, { name: string; revenue: number; count: number }>();
        const aggByName = new Map<string, { revenue: number; count: number }>();

        for (const o of orders ?? []) {
          if (o.client_id) {
            const cur = aggById.get(o.client_id) ?? { name: "", revenue: 0, count: 0 };
            aggById.set(o.client_id, { ...cur, revenue: cur.revenue + (o.total ?? 0), count: cur.count + 1 });
          } else if (o.client_name) {
            const key = o.client_name.toLowerCase().trim();
            const cur = aggByName.get(key) ?? { revenue: 0, count: 0 };
            aggByName.set(key, { revenue: cur.revenue + (o.total ?? 0), count: cur.count + 1 });
          }
        }

        const ranked = (clients ?? [])
          .map((c) => {
            const byId   = aggById.get(c.id) ?? { revenue: 0, count: 0 };
            const byName = aggByName.get(c.name.toLowerCase().trim()) ?? { revenue: 0, count: 0 };
            return { name: c.name, revenue: byId.revenue + byName.revenue, count: byId.count + byName.count };
          })
          .sort((a, b) => rankBy === "orders" ? b.count - a.count : b.revenue - a.revenue)
          .slice(0, limit);

        if (!ranked.length) return "No hay clientes registrados.";

        let result = `Top ${ranked.length} clientes por ${rankBy === "orders" ? "pedidos" : "ingresos"}:\n`;
        ranked.forEach((c, i) => {
          result += `${i + 1}. ${c.name} — ${fmt(c.revenue)} · ${c.count} pedido${c.count !== 1 ? "s" : ""}\n`;
        });
        return result.trim();
      }

      case "search_orders": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query: any = supabase
          .from("orders")
          .select("id, client_name, description, product_type, total, status, delivery_date");

        if (input.date_from)    query = query.gte("delivery_date", input.date_from);
        if (input.date_to)      query = query.lte("delivery_date", input.date_to);
        if (input.status)       query = query.eq("status", input.status);
        if (input.client_name)  query = query.ilike("client_name", `%${input.client_name}%`);
        if (input.product_type) query = query.ilike("product_type", `%${input.product_type}%`);

        const limit = Math.min((input.limit as number) ?? 20, 50);
        const { data, error } = await query.order("delivery_date", { ascending: false }).limit(limit);

        if (error) return `Error al buscar pedidos: ${error.message}`;
        if (!data?.length) return "No se encontraron pedidos con esos criterios.";

        const total = data.reduce((s: number, o: { total?: number }) => s + (o.total ?? 0), 0);
        let result = `${data.length} pedido${data.length !== 1 ? "s" : ""} encontrado${data.length !== 1 ? "s" : ""}:\n`;
        result += data
          .map((o: { delivery_date?: string; client_name?: string; product_type?: string; total?: number; status?: string }) =>
            `• ${o.delivery_date ?? "sin fecha"} | ${o.client_name ?? "—"} | ${o.product_type ?? "—"} | ${fmt(o.total ?? 0)} | ${o.status}`
          )
          .join("\n");
        result += `\nTotal: ${fmt(total)}`;
        return result;
      }

      case "get_financial_summary": {
        const year  = input.year as number;
        const month = input.month as number | undefined;
        const start = month
          ? `${year}-${String(month).padStart(2, "0")}-01`
          : `${year}-01-01`;
        const end = month
          ? new Date(year, month, 0).toISOString().split("T")[0]
          : `${year}-12-31`;

        const [{ data: orders }, { data: expenses }] = await Promise.all([
          supabase.from("orders").select("total").gte("delivery_date", start).lte("delivery_date", end).neq("status", "cancelado"),
          supabase.from("expenses").select("amount").gte("month", start).lte("month", end),
        ]);

        const revenue  = (orders ?? []).reduce((s, o) => s + (o.total ?? 0), 0);
        const spending = (expenses ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
        const margin   = revenue - spending;
        const pct      = revenue ? Math.round((margin / revenue) * 100) : 0;

        const label = month
          ? new Date(year, month - 1, 1).toLocaleDateString("es-CA", { month: "long", year: "numeric" })
          : String(year);

        return `Resumen financiero — ${label}:\nIngresos: ${fmt(revenue)} (${orders?.length ?? 0} pedidos)\nGastos: ${fmt(spending)}\nMargen bruto: ${fmt(margin)} (${pct}%)`;
      }

      case "get_courses": {
        const { data: rows, error } = await supabase
          .from("courses")
          .select("*")
          .order("course_date", { ascending: false });

        if (error) return `Error: ${error.message}`;
        if (!rows?.length) return "No hay cursos registrados.";

        const today = new Date().toISOString().split("T")[0];
        const courseMap = new Map<string, typeof rows>();
        for (const r of rows) {
          const key = `${r.course_date}__${r.course_name}__${r.location ?? ""}`;
          if (!courseMap.has(key)) courseMap.set(key, []);
          courseMap.get(key)!.push(r);
        }

        let result = "Cursos:\n";
        let shown = 0;
        for (const [, group] of courseMap) {
          const first = group[0];
          if (input.upcoming_only && (first.course_date ?? "") < today) continue;
          const inscritos = group.filter((r) => r.student_name);
          const total = inscritos.reduce((s, r) => s + (r.amount ?? 0), 0);
          result += `• ${first.course_name} — ${first.course_date}`;
          if (first.location) result += ` (${first.location})`;
          result += ` — ${inscritos.length} inscrito${inscritos.length !== 1 ? "s" : ""} · ${fmt(total)}\n`;
          shown++;
        }
        return shown ? result.trim() : "No hay cursos próximos.";
      }

      default:
        return `Herramienta desconocida: ${name}`;
    }
  } catch (err) {
    return `Error en ${name}: ${err instanceof Error ? err.message : "error desconocido"}`;
  }
}

// ── Write tools ───────────────────────────────────────────────────────────────

export async function executeWriteTool(
  name: string,
  input: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "Error: usuario no autenticado.";

    switch (name) {
      case "update_orders_status": {
        const newStatus = input.new_status as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query: any = supabase.from("orders").update({ status: newStatus });

        if (Array.isArray(input.order_ids) && input.order_ids.length > 0) {
          query = query.in("id", input.order_ids);
        } else {
          if (input.date_from)      query = query.gte("delivery_date", input.date_from);
          if (input.date_to)        query = query.lte("delivery_date", input.date_to);
          if (input.current_status) query = query.eq("status", input.current_status);
          if (input.client_name)    query = query.ilike("client_name", `%${input.client_name}%`);
        }

        const { data, error } = await query.select("id");
        if (error) return `Error al actualizar: ${error.message}`;
        const n = data?.length ?? 0;
        return `✅ ${n} pedido${n !== 1 ? "s" : ""} actualizado${n !== 1 ? "s" : ""} a "${newStatus}".`;
      }

      case "create_course": {
        const { error } = await supabase.from("courses").insert({
          owner_id:    user.id,
          course_name: input.course_name as string,
          course_date: input.course_date as string,
          location:    (input.location as string) || null,
          student_name: null,
          amount: 0,
          status: "activo",
        });
        if (error) return `Error al crear curso: ${error.message}`;
        return `✅ Curso "${input.course_name}" creado para el ${input.course_date}.`;
      }

      case "create_client": {
        const { error } = await supabase.from("clients").insert({
          owner_id:  user.id,
          name:      input.name as string,
          phone:     (input.phone as string) || null,
          email:     (input.email as string) || null,
          instagram: (input.instagram as string) || null,
          channel:   (input.channel as string) || null,
        });
        if (error) return `Error al crear cliente: ${error.message}`;
        return `✅ Cliente "${input.name}" agregado correctamente.`;
      }

      case "add_expense": {
        const { error } = await supabase.from("expenses").insert({
          owner_id: user.id,
          month:    input.month as string,
          category: input.category as string,
          item:     input.item as string,
          amount:   input.amount as number,
          quantity: (input.quantity as string) || null,
          notes:    (input.notes as string) || null,
        });
        if (error) return `Error al registrar gasto: ${error.message}`;
        return `✅ Gasto de ${fmt(input.amount as number)} registrado en ${input.category}.`;
      }

      default:
        return `Herramienta de escritura desconocida: ${name}`;
    }
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : "error desconocido"}`;
  }
}
