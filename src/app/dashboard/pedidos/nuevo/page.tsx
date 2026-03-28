import { createOrder } from "../actions";
import { createClient } from "@/lib/supabase/server";

export default async function NuevoPedidoPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .order("name");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1
          className="text-4xl leading-none"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
        >
          Nuevo pedido
        </h1>
      </div>

      <form action={createOrder} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="field-label">Cliente</label>
            <select name="client_id" className="field">
              <option value="">— Seleccionar cliente —</option>
              {(clients ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="field-label">Nombre del cliente (si no está en lista)</label>
            <input name="client_name" type="text" className="field" placeholder="Nombre" />
          </div>

          <div>
            <label className="field-label">Tipo de producto</label>
            <select name="product_type" className="field" required>
              <option value="">— Tipo —</option>
              {["torta", "galletas", "cupcakes", "cakesicles", "popcakes", "shots", "otro"].map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Cantidad</label>
            <input name="quantity" type="number" min="1" className="field" />
          </div>

          <div className="col-span-2">
            <label className="field-label">Descripción</label>
            <textarea name="description" rows={3} className="field" placeholder="Torta de chocolate, 6 porciones, fondant..." />
          </div>

          <div className="col-span-2">
            <label className="field-label">Sabores</label>
            <input name="flavors" type="text" className="field" placeholder="Chocolate, vainilla..." />
          </div>

          <div>
            <label className="field-label">Fecha de contacto</label>
            <input name="contact_date" type="date" className="field" />
          </div>
          <div>
            <label className="field-label">Fecha de entrega</label>
            <input name="delivery_date" type="date" className="field" required />
          </div>

          <div>
            <label className="field-label">Cotizado ($)</label>
            <input name="quoted" type="number" step="0.01" className="field" placeholder="0.00" />
          </div>
          <div>
            <label className="field-label">Total ($)</label>
            <input name="total" type="number" step="0.01" className="field" placeholder="0.00" required />
          </div>

          <div>
            <label className="field-label">Envío ($)</label>
            <input name="delivery_fee" type="number" step="0.01" defaultValue="0" className="field" />
          </div>
          <div>
            <label className="field-label">Pago Interac ($)</label>
            <input name="payment_interac" type="number" step="0.01" defaultValue="0" className="field" />
          </div>
          <div>
            <label className="field-label">Pago Efectivo ($)</label>
            <input name="payment_cash" type="number" step="0.01" defaultValue="0" className="field" />
          </div>
          <div>
            <label className="field-label">Pago Tarjeta ($)</label>
            <input name="payment_card" type="number" step="0.01" defaultValue="0" className="field" />
          </div>

          <div className="col-span-2">
            <label className="field-label">Notas</label>
            <textarea name="notes" rows={2} className="field" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary">
            Guardar pedido
          </button>
          <a href="/dashboard/pedidos" className="btn-outline">
            Cancelar
          </a>
        </div>
      </form>
    </div>
  );
}
