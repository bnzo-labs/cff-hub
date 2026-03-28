import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { updateOrder } from "../actions";
import Link from "next/link";

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("es-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function PedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (!order) notFound();

  const updateOrderWithId = updateOrder.bind(null, id);

  const statuses = ["pendiente", "aprobado", "en_proceso", "entregado", "cancelado"];
  const paymentStatuses = ["pendiente", "parcial", "pagado"];
  const tipos = ["torta", "galletas", "cupcakes", "cakesicles", "popcakes", "shots", "otro"];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/pedidos"
            className="text-xs uppercase tracking-widest hover:opacity-70 font-semibold"
            style={{ color: "var(--rose)", fontFamily: "var(--font-sans)" }}
          >
            ← Pedidos
          </Link>
          <h1
            className="text-4xl mt-2 leading-none"
            style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
          >
            {order.client_name ?? "Pedido"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Entrega: {formatDate(order.delivery_date)}
          </p>
        </div>
        <div className="flex gap-2 mt-1">
          <StatusBadge status={order.status ?? "pendiente"} />
          <StatusBadge status={order.payment_status ?? "pendiente"} type="payment" />
        </div>
      </div>

      {/* Resumen */}
      <div
        className="panel p-5 grid grid-cols-3 gap-4"
      >
        <div>
          <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: "var(--muted)" }}>
            Total
          </p>
          <p className="text-2xl mt-1" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
            ${(order.total ?? 0).toLocaleString("es-CA")}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: "var(--muted)" }}>
            Cotizado
          </p>
          <p className="text-2xl mt-1" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
            ${(order.quoted ?? 0).toLocaleString("es-CA")}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: "var(--muted)" }}>
            Envío
          </p>
          <p className="text-2xl mt-1" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
            ${(order.delivery_fee ?? 0).toLocaleString("es-CA")}
          </p>
        </div>
      </div>

      {/* Formulario edición */}
      <form action={updateOrderWithId} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Estado</label>
            <select name="status" defaultValue={order.status ?? "pendiente"} className="field">
              {statuses.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Pago</label>
            <select name="payment_status" defaultValue={order.payment_status ?? "pendiente"} className="field">
              {paymentStatuses.map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Tipo</label>
            <select name="product_type" defaultValue={order.product_type ?? ""} className="field">
              {tipos.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Cantidad</label>
            <input name="quantity" type="number" min="1" defaultValue={order.quantity ?? ""} className="field" />
          </div>

          <div className="col-span-2">
            <label className="field-label">Descripción</label>
            <textarea name="description" rows={2} defaultValue={order.description ?? ""} className="field" />
          </div>

          <div className="col-span-2">
            <label className="field-label">Sabores</label>
            <input name="flavors" type="text" defaultValue={order.flavors ?? ""} className="field" />
          </div>

          <div>
            <label className="field-label">Fecha contacto</label>
            <input name="contact_date" type="date" defaultValue={order.contact_date ?? ""} className="field" />
          </div>
          <div>
            <label className="field-label">Fecha entrega</label>
            <input name="delivery_date" type="date" defaultValue={order.delivery_date ?? ""} className="field" />
          </div>

          <div>
            <label className="field-label">Cotizado ($)</label>
            <input name="quoted" type="number" step="0.01" defaultValue={order.quoted ?? ""} className="field" />
          </div>
          <div>
            <label className="field-label">Total ($)</label>
            <input name="total" type="number" step="0.01" defaultValue={order.total ?? ""} className="field" />
          </div>
          <div>
            <label className="field-label">Envío ($)</label>
            <input name="delivery_fee" type="number" step="0.01" defaultValue={order.delivery_fee ?? 0} className="field" />
          </div>
          <div>
            <label className="field-label">Interac ($)</label>
            <input name="payment_interac" type="number" step="0.01" defaultValue={order.payment_interac ?? 0} className="field" />
          </div>
          <div>
            <label className="field-label">Efectivo ($)</label>
            <input name="payment_cash" type="number" step="0.01" defaultValue={order.payment_cash ?? 0} className="field" />
          </div>
          <div>
            <label className="field-label">Tarjeta ($)</label>
            <input name="payment_card" type="number" step="0.01" defaultValue={order.payment_card ?? 0} className="field" />
          </div>

          <div className="col-span-2">
            <label className="field-label">Notas</label>
            <textarea name="notes" rows={2} defaultValue={order.notes ?? ""} className="field" />
          </div>
        </div>

        <button type="submit" className="btn-primary">
          Guardar cambios
        </button>
      </form>
    </div>
  );
}
