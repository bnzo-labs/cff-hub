import { createClient } from "@/lib/supabase/server";
import { addExpense } from "./actions";
import { StatCard } from "@/components/stat-card";
import { FinanzasFiltros } from "./filtros";
import { FinanzasCharts } from "./finanzas-charts";

function formatMoney(n: number) {
  return `$${(n ?? 0).toLocaleString("es-CA", { minimumFractionDigits: 0 })}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  ingredientes: "Ingredientes",
  accesorios: "Accesorios",
  empaque: "Empaque",
  publicidad: "Publicidad",
  mano_de_obra: "Mano de obra",
  otro: "Otro",
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function isoWeekBounds(year: number, week: number) {
  const jan4 = new Date(year, 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const mon = new Date(startOfWeek1);
  mon.setDate(startOfWeek1.getDate() + (week - 1) * 7);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().split("T")[0],
    end: sun.toISOString().split("T")[0],
  };
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).toISOString().split("T")[0];
}

function currentIsoWeek() {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  return Math.ceil((now.getTime() - startOfWeek1.getTime()) / (7 * 86400000)) + 1;
}

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; year?: string; month?: string; week?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();

  const vista = params.vista ?? "anual";
  const year = Number(params.year ?? now.getFullYear());
  const month = Number(params.month ?? now.getMonth() + 1);
  const week = Number(params.week ?? currentIsoWeek());

  const supabase = await createClient();

  // ─── Fetch ingresos según vista ────────────────────────────────────
  let orders: { id: string; client_name: string | null; product_type: string | null; total: number | null; delivery_date: string | null; status: string | null }[] = [];
  let monthlyRevenue: { month: string; revenue: number | null; order_count: number | null }[] = [];

  if (vista === "anual") {
    // Query orders directly (consistent with other views, avoids stale DB view)
    const { data } = await supabase
      .from("orders")
      .select("id, total, delivery_date")
      .gte("delivery_date", `${year}-01-01`)
      .lte("delivery_date", `${year}-12-31`)
      .neq("status", "cancelado");

    // Group by month in JS
    const byMonth = new Map<string, { revenue: number; order_count: number }>();
    for (const o of (data ?? [])) {
      const key = (o.delivery_date ?? "").slice(0, 7) + "-01";
      if (!key || key === "-01") continue;
      const curr = byMonth.get(key) ?? { revenue: 0, order_count: 0 };
      byMonth.set(key, { revenue: curr.revenue + (o.total ?? 0), order_count: curr.order_count + 1 });
    }
    monthlyRevenue = Array.from(byMonth.entries())
      .map(([m, v]) => ({ month: m, revenue: v.revenue, order_count: v.order_count }))
      .sort((a, b) => a.month.localeCompare(b.month));

  } else if (vista === "mensual") {
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const end = lastDayOfMonth(year, month);
    const { data } = await supabase
      .from("orders")
      .select("id, client_name, product_type, total, delivery_date, status")
      .gte("delivery_date", start)
      .lte("delivery_date", end)
      .neq("status", "cancelado")
      .order("delivery_date", { ascending: true });
    orders = data ?? [];

  } else if (vista === "semanal") {
    const { start, end } = isoWeekBounds(year, week);
    const { data } = await supabase
      .from("orders")
      .select("id, client_name, product_type, total, delivery_date, status")
      .gte("delivery_date", start)
      .lte("delivery_date", end)
      .neq("status", "cancelado")
      .order("delivery_date", { ascending: true });
    orders = data ?? [];
  }

  // ─── Fetch gastos ───────────────────────────────────────────────────
  let expenseStart = `${year}-01-01`;
  let expenseEnd = `${year}-12-31`;
  if (vista === "mensual") {
    expenseStart = `${year}-${String(month).padStart(2, "0")}-01`;
    expenseEnd = lastDayOfMonth(year, month);
  } else if (vista === "semanal") {
    const bounds = isoWeekBounds(year, week);
    expenseStart = bounds.start;
    expenseEnd = bounds.end;
  }

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .gte("month", expenseStart)
    .lte("month", expenseEnd)
    .order("month", { ascending: false });

  // ─── KPIs ──────────────────────────────────────────────────────────
  const totalRevenue =
    vista === "anual"
      ? monthlyRevenue.reduce((s, m) => s + (m.revenue ?? 0), 0)
      : orders.reduce((s, o) => s + (o.total ?? 0), 0);

  const totalExpenses = (expenses ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
  const grossMargin = totalRevenue - totalExpenses;
  const marginPct = totalRevenue ? Math.round((grossMargin / totalRevenue) * 100) : 0;
  const orderCount = vista === "anual"
    ? monthlyRevenue.reduce((s, m) => s + (m.order_count ?? 0), 0)
    : orders.length;
  const avgTicket = orderCount ? Math.round(totalRevenue / orderCount) : 0;

  // ─── Bar chart data ─────────────────────────────────────────────────
  const MESES_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  let barData: { label: string; revenue: number }[] = [];

  if (vista === "anual") {
    const revenueByMonth = new Map(
      monthlyRevenue.map((m) => [new Date(m.month + "T12:00:00").getMonth(), m.revenue ?? 0])
    );
    barData = MESES_SHORT.map((label, i) => ({ label, revenue: revenueByMonth.get(i) ?? 0 }));
  } else if (vista === "mensual") {
    const byWeek = new Map<number, number>();
    for (const o of orders) {
      if (!o.delivery_date) continue;
      const day = new Date(o.delivery_date + "T12:00:00").getDate();
      const wk = day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : 4;
      byWeek.set(wk, (byWeek.get(wk) ?? 0) + (o.total ?? 0));
    }
    barData = [1, 2, 3, 4].map((w) => ({ label: `Sem ${w}`, revenue: byWeek.get(w) ?? 0 }));
  } else {
    const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const byDay = new Map<number, number>();
    for (const o of orders) {
      if (!o.delivery_date) continue;
      const dow = (new Date(o.delivery_date + "T12:00:00").getDay() + 6) % 7;
      byDay.set(dow, (byDay.get(dow) ?? 0) + (o.total ?? 0));
    }
    barData = DIAS.map((label, i) => ({ label, revenue: byDay.get(i) ?? 0 }));
  }

  // ─── Yearly data for line chart ──────────────────────────────────────
  const { data: allYearOrders } = await supabase
    .from("orders")
    .select("total, delivery_date")
    .neq("status", "cancelado");

  const yearMap = new Map<number, number>();
  for (const o of allYearOrders ?? []) {
    const y = parseInt((o.delivery_date ?? "").slice(0, 4));
    if (!y || isNaN(y)) continue;
    yearMap.set(y, (yearMap.get(y) ?? 0) + (o.total ?? 0));
  }
  const yearlyData = Array.from(yearMap.entries())
    .map(([yr, revenue]) => ({ year: yr, revenue }))
    .sort((a, b) => a.year - b.year);

  // ─── Título del periodo ─────────────────────────────────────────────
  let periodoLabel = String(year);
  if (vista === "mensual") periodoLabel = `${MESES[month - 1]} ${year}`;
  if (vista === "semanal") {
    const { start, end } = isoWeekBounds(year, week);
    const fmt = (d: string) =>
      new Date(d + "T12:00:00").toLocaleDateString("es-CA", { day: "numeric", month: "short" });
    periodoLabel = `Semana ${week} · ${fmt(start)} – ${fmt(end)}`;
  }

  const PRODUCT_LABELS: Record<string, string> = {
    torta: "Torta", galletas: "Galletas", cupcakes: "Cupcakes",
    cakesicles: "Cakesicles", popcakes: "Popcakes", shots: "Shots", otro: "Otro",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1
            className="text-4xl leading-none"
            style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
          >
            Finanzas
          </h1>
          <p className="text-sm mt-1 capitalize" style={{ color: "var(--muted)" }}>
            {periodoLabel}
          </p>
        </div>
        <FinanzasFiltros vista={vista} year={year} month={month} week={week} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ingresos" value={formatMoney(totalRevenue)} />
        <StatCard label="Gastos" value={formatMoney(totalExpenses)} />
        <StatCard label="Margen bruto" value={formatMoney(grossMargin)} />
        <StatCard
          label={vista === "anual" ? "Margen %" : "Ticket promedio"}
          value={vista === "anual" ? `${marginPct}%` : formatMoney(avgTicket)}
          sub={vista === "anual" ? "sobre ingresos" : `${orderCount} pedidos`}
        />
      </div>

      {/* Charts */}
      <FinanzasCharts barData={barData} yearlyData={yearlyData} vista={vista} year={year} month={month} />

      {/* Tabla ingresos */}
      <section>
        <h2
          className="text-xl mb-4"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
        >
          {vista === "anual" ? "Ingresos por mes" : "Pedidos del periodo"}
        </h2>

        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm" style={{ background: "var(--surface)", minWidth: 420 }}>
            <thead>
              <tr className="border-b text-left" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                {vista === "anual"
                  ? ["Mes", "Pedidos", "Ingresos", "Ticket prom."].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] uppercase tracking-widest font-medium" style={{ color: "var(--muted)" }}>{h}</th>
                    ))
                  : ["Fecha", "Cliente", "Tipo", "Total"].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] uppercase tracking-widest font-medium" style={{ color: "var(--muted)" }}>{h}</th>
                    ))
                }
              </tr>
            </thead>
            <tbody>
              {vista === "anual" ? (
                monthlyRevenue.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-sm" style={{ color: "var(--muted)" }}>Sin datos para {year}</td></tr>
                ) : (
                  monthlyRevenue.map((m) => {
                    const avg = m.order_count ? Math.round((m.revenue ?? 0) / m.order_count) : 0;
                    return (
                      <tr key={m.month} className="table-row-hover border-b" style={{ borderColor: "var(--border)" }}>
                        <td className="px-4 py-3 capitalize" style={{ color: "var(--ink)" }}>
                          {new Date(m.month + "T12:00:00").toLocaleDateString("es-CA", { month: "long" })}
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{m.order_count}</td>
                        <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>{formatMoney(m.revenue ?? 0)}</td>
                        <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{formatMoney(avg)}</td>
                      </tr>
                    );
                  })
                )
              ) : (
                orders.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-sm" style={{ color: "var(--muted)" }}>Sin pedidos en este periodo</td></tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="table-row-hover border-b" style={{ borderColor: "var(--border)" }}>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--muted)" }}>
                        {o.delivery_date
                          ? new Date(o.delivery_date + "T12:00:00").toLocaleDateString("es-CA", { weekday: "short", day: "numeric", month: "short" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>{o.client_name ?? "—"}</td>
                      <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{PRODUCT_LABELS[o.product_type ?? ""] ?? o.product_type ?? "—"}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>{formatMoney(o.total ?? 0)}</td>
                    </tr>
                  ))
                )
              )}
            </tbody>
            {(vista !== "anual" && orders.length > 0) && (
              <tfoot>
                <tr style={{ borderTop: `2px solid var(--border)`, background: "var(--surface-2)" }}>
                  <td colSpan={3} className="px-4 py-3 text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>Total</td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--rose)" }}>{formatMoney(totalRevenue)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* Gastos */}
      <section>
        <h2 className="text-xl mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          Gastos
        </h2>

        <details className="overflow-hidden rounded-xl border mb-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <summary className="px-5 py-3.5 cursor-pointer text-sm font-medium select-none flex items-center gap-2" style={{ color: "var(--ink)" }}>
            <span
              className="w-5 h-5 flex items-center justify-center rounded-full text-white text-xs"
              style={{ background: "var(--rose)" }}
            >+</span>
            Agregar gasto
          </summary>
          <form action={addExpense} className="px-5 pb-5 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ borderTop: "1px solid var(--border)" }}>
            <div>
              <label className="field-label">Mes</label>
              <input name="month" type="month" required className="field w-full"
                defaultValue={`${year}-${String(month).padStart(2, "0")}`} />
            </div>
            <div>
              <label className="field-label">Categoría</label>
              <select name="category" required className="field w-full">
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Ítem</label>
              <input name="item" type="text" required className="field w-full" placeholder="Harina, moldes, etc." />
            </div>
            <div>
              <label className="field-label">Cantidad</label>
              <input name="quantity" type="text" className="field w-full" placeholder="2 kg, 3 unidades..." />
            </div>
            <div>
              <label className="field-label">Monto ($)</label>
              <input name="amount" type="number" step="0.01" required className="field w-full" placeholder="0.00" />
            </div>
            <div>
              <label className="field-label">Notas</label>
              <input name="notes" type="text" className="field w-full" />
            </div>
            <div className="col-span-2">
              <button type="submit" className="btn-primary">
                Guardar gasto
              </button>
            </div>
          </form>
        </details>

        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm" style={{ background: "var(--surface)", minWidth: 440 }}>
            <thead>
              <tr className="border-b text-left" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                {["Mes", "Categoría", "Ítem", "Cantidad", "Monto"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] uppercase tracking-widest font-medium" style={{ color: "var(--muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(expenses ?? []).length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm" style={{ color: "var(--muted)" }}>Sin gastos en este periodo</td></tr>
              ) : (
                (expenses ?? []).map((e) => (
                  <tr key={e.id} className="table-row-hover border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3 capitalize" style={{ color: "var(--ink)" }}>
                      {new Date((e.month ?? "") + "T12:00:00").toLocaleDateString("es-CA", { month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{CATEGORY_LABELS[e.category ?? ""] ?? e.category}</td>
                    <td className="px-4 py-3" style={{ color: "var(--ink)" }}>{e.item ?? "—"}</td>
                    <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{e.quantity ?? "—"}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>{formatMoney(e.amount ?? 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .field-label { display:block; font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); margin-bottom:6px; }
        .field { border:1px solid var(--border); background:var(--surface); color:var(--ink); padding:8px 12px; font-size:14px; font-family:var(--font-sans); outline:none; width:100%; border-radius: 8px; }
        .field:focus { border-color:var(--rose); box-shadow: 0 0 0 3px var(--rose-light); }
      `}</style>
    </div>
  );
}
