import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { ClientesTable } from "./clientes-table";

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("es-CA", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function ClientesPage() {
  const supabase = await createClient();

  const [{ data: rawClients, error: clientsError }, { data: orders }, { data: leads }] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .order("name"),
    supabase
      .from("orders")
      .select("client_id, client_name, total, delivery_date")
      .neq("status", "cancelado"),
    supabase
      .from("leads")
      .select("id, name, intent, status, created_at, message")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (clientsError) console.error("clients query error:", clientsError);

  // ── Aggregate order stats ──────────────────────────────────────────────────
  // Orders with client_id → grouped by ID
  // Orders without client_id → grouped by normalized client_name
  // This handles both app-created orders (linked by ID) and imported orders (name only)
  type Agg = { count: number; total: number; last: string | null };
  const aggById: Record<string, Agg> = {};
  const aggByName: Record<string, Agg> = {};

  for (const o of (orders ?? [])) {
    const addTo = (bucket: Record<string, Agg>, key: string) => {
      const a = bucket[key] ?? { count: 0, total: 0, last: null };
      bucket[key] = {
        count: a.count + 1,
        total: a.total + (o.total ?? 0),
        last:
          !a.last || (o.delivery_date && o.delivery_date > a.last)
            ? o.delivery_date
            : a.last,
      };
    };

    if (o.client_id) {
      addTo(aggById, o.client_id);
    } else if (o.client_name) {
      addTo(aggByName, o.client_name.toLowerCase().trim());
    }
  }

  const clients = (rawClients ?? [])
    .map((c) => {
      const byId = aggById[c.id] ?? { count: 0, total: 0, last: null };
      const byName = aggByName[c.name?.toLowerCase().trim() ?? ""] ?? { count: 0, total: 0, last: null };
      const last =
        byId.last && byName.last
          ? byId.last > byName.last ? byId.last : byName.last
          : byId.last ?? byName.last;
      return {
        ...c,
        order_count: byId.count + byName.count,
        total_spent: byId.total + byName.total,
        last_order: last,
      };
    })
    .sort((a, b) => {
      if (!a.last_order && !b.last_order) return 0;
      if (!a.last_order) return 1;
      if (!b.last_order) return -1;
      return b.last_order.localeCompare(a.last_order);
    });

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1
          className="text-4xl leading-none"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
        >
          Clientes
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          {clients.length} clientes registrados
        </p>
      </div>

      {/* Leads */}
      <section>
        <h2
          className="text-xl mb-4"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
        >
          Leads — Pipeline
        </h2>
        <div
          className="overflow-hidden rounded-2xl border"
          style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}
        >
          <table className="w-full text-sm" style={{ background: "var(--surface)" }}>
            <thead>
              <tr
                className="border-b text-left"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              >
                {["Nombre", "Intención", "Mensaje", "Estado", "Fecha"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[11px] uppercase tracking-widest font-medium"
                    style={{ color: "var(--muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(leads ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: "var(--muted)" }}>
                    Sin leads aún
                  </td>
                </tr>
              ) : (
                (leads ?? []).map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>
                      {lead.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 capitalize" style={{ color: "var(--muted)" }}>
                      {lead.intent ?? "—"}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate" style={{ color: "var(--muted)" }}>
                      {lead.message ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status ?? "nuevo"} type="lead" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--muted)" }}>
                      {formatDate(lead.created_at?.split("T")[0] ?? null)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tabla clientes */}
      <section>
        <h2
          className="text-xl mb-4"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
        >
          Clientes activos
        </h2>
        <ClientesTable clients={clients} />
      </section>
    </div>
  );
}
