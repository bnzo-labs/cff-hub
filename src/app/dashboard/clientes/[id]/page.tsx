import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PedidosTable } from "@/app/dashboard/pedidos/pedidos-table";
import { ClientActions } from "./client-actions";

function formatMoney(n: number) {
  return `$${(n ?? 0).toLocaleString("es-CA", { minimumFractionDigits: 0 })}`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("es-CA", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch client
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (!client) notFound();

  // Fetch orders by client_id OR client_name (covers imported historical data)
  const { data: orders } = await supabase
    .from("orders")
    .select("id, client_name, description, product_type, total, status, payment_status, delivery_date")
    .or(`client_id.eq.${id},client_name.ilike.${client.name}`)
    .order("delivery_date", { ascending: false });

  const activeOrders = (orders ?? []).filter((o) => o.status !== "cancelado");
  const totalSpent = activeOrders.reduce((s, o) => s + (o.total ?? 0), 0);
  const orderCount = activeOrders.length;
  const avgTicket = orderCount ? Math.round(totalSpent / orderCount) : 0;
  const lastOrder = activeOrders[0]?.delivery_date ?? null;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
        <a
          href="/dashboard/clientes"
          className="hover:underline"
          style={{ color: "var(--muted)", textDecoration: "none" }}
        >
          Clientes
        </a>
        <span>/</span>
        <span style={{ color: "var(--ink)", fontWeight: 600 }}>{client.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1
            className="text-4xl leading-none"
            style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
          >
            {client.name}
          </h1>
          {(client.phone || client.email) && (
            <p className="text-sm mt-1.5" style={{ color: "var(--muted)" }}>
              {[client.phone, client.email].filter(Boolean).join("  ·  ")}
            </p>
          )}
        </div>
        <ClientActions
          clientId={client.id}
          clientName={client.name}
          phone={client.phone ?? null}
          email={client.email ?? null}
        />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total gastado",   value: formatMoney(totalSpent), accent: true },
          { label: "Pedidos",         value: String(orderCount) },
          { label: "Ticket promedio", value: formatMoney(avgTicket) },
          { label: "Último pedido",   value: formatDate(lastOrder), small: true },
        ].map(({ label, value, accent, small }) => (
          <div
            key={label}
            className="p-5 rounded-xl border"
            style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}
          >
            <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: "var(--muted)" }}>
              {label}
            </p>
            <p
              className={`mt-2 leading-none font-medium ${small ? "text-xl" : "text-3xl"}`}
              style={{
                fontFamily: "var(--font-display)",
                color: accent ? "var(--rose)" : "var(--ink)",
              }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Orders */}
      <section>
        <h2 className="text-xl mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          Pedidos
        </h2>
        {(orders ?? []).length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Sin pedidos registrados para este cliente.
          </p>
        ) : (
          <PedidosTable orders={orders ?? []} />
        )}
      </section>
    </div>
  );
}
