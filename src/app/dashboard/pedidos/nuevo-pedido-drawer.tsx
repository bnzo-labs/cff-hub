"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrderDrawer } from "./actions";

// ── MoneyInput ─────────────────────────────────────────────────────────────────

function MoneyInput({
  name,
  placeholder = "$0",
  required,
  defaultRaw = "",
}: {
  name: string;
  placeholder?: string;
  required?: boolean;
  defaultRaw?: string;
}) {
  const [raw, setRaw] = useState(defaultRaw); // numeric string, e.g. "150.50"
  const [focused, setFocused] = useState(false);

  const formatted = (() => {
    const n = parseFloat(raw);
    if (!raw || isNaN(n)) return "";
    return `$${n.toLocaleString("es-CA", { minimumFractionDigits: 0 })}`;
  })();

  return (
    <>
      <input type="hidden" name={name} value={raw || "0"} />
      <input
        type="text"
        inputMode="decimal"
        value={focused ? raw : formatted}
        onChange={(e) => setRaw(e.target.value.replace(/[^0-9.]/g, ""))}
        onFocus={(e) => {
          setFocused(true);
          setTimeout(() => e.target.select(), 0);
        }}
        onBlur={() => setFocused(false)}
        className="field"
        placeholder={placeholder}
        required={required && !raw}
        style={{ textAlign: "right" }}
      />
    </>
  );
}

// ── SearchableSelect ──────────────────────────────────────────────────────────

interface SelectOption {
  value: string;
  label: string;
}

function SearchableSelect({
  name,
  options,
  placeholder,
  required,
  defaultValue,
}: {
  name: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectOption | null>(
    defaultValue ? (options.find((o) => o.value === defaultValue) ?? null) : null
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  function handleSelect(opt: SelectOption | null) {
    setSelected(opt);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={selected?.value ?? ""} />

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="field w-full text-left flex items-center justify-between"
        style={{ cursor: "pointer" }}
      >
        <span style={{ color: selected ? "var(--ink)" : "var(--muted)" }}>
          {selected ? selected.label : (placeholder ?? "— Seleccionar —")}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{ flexShrink: 0, opacity: 0.5, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}
        >
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            maxHeight: 220,
            overflowY: "auto",
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: "var(--radius-xs)",
            boxShadow: "var(--shadow-lg)",
            marginTop: 4,
          }}
        >
          {/* Search input */}
          <div style={{ padding: "8px 8px 4px" }}>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar…"
              style={{
                width: "100%",
                padding: "6px 10px",
                border: "1.5px solid var(--border)",
                borderRadius: "var(--radius-xs)",
                background: "var(--surface-2)",
                color: "var(--ink)",
                fontSize: "13px",
                fontFamily: "var(--font-sans)",
                outline: "none",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--rose)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
            />
          </div>

          {/* Options list */}
          <div>
            {/* Clear option (only when not required) */}
            {!required && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  textAlign: "left",
                  fontSize: "13px",
                  cursor: "pointer",
                  color: "var(--muted)",
                  background: selected === null ? "var(--rose-light)" : "transparent",
                  fontWeight: selected === null ? 600 : 400,
                }}
                onMouseEnter={(e) => { if (selected !== null) (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                onMouseLeave={(e) => { if (selected !== null) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                — Ninguno —
              </button>
            )}

            {filtered.length === 0 ? (
              <p style={{ padding: "8px 12px", fontSize: "13px", color: "var(--muted)" }}>Sin resultados</p>
            ) : (
              filtered.map((opt) => {
                const isActive = selected?.value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      textAlign: "left",
                      fontSize: "13px",
                      cursor: "pointer",
                      background: isActive ? "var(--rose-light)" : "transparent",
                      color: isActive ? "var(--rose)" : "var(--ink)",
                      fontWeight: isActive ? 600 : 400,
                    }}
                    onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                    onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    {opt.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── NuevoPedidoDrawer ─────────────────────────────────────────────────────────

const PRODUCT_OPTIONS: SelectOption[] = [
  { value: "torta", label: "Torta" },
  { value: "galletas", label: "Galletas" },
  { value: "cupcakes", label: "Cupcakes" },
  { value: "cakesicles", label: "Cakesicles" },
  { value: "popcakes", label: "Popcakes" },
  { value: "shots", label: "Shots" },
  { value: "otro", label: "Otro" },
];

interface NuevoPedidoDrawerProps {
  open: boolean;
  onClose: () => void;
  clients: { id: string; name: string }[];
  initialClientId?: string;
}

export function NuevoPedidoDrawer({ open, onClose, clients, initialClientId }: NuevoPedidoDrawerProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const clientOptions: SelectOption[] = clients.map((c) => ({ value: c.id, label: c.name }));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await createOrderDrawer(fd);
      router.refresh();
      onClose();
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          background: "rgba(26,13,36,0.35)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 520,
          zIndex: 41,
          background: "var(--surface)",
          overflowY: "auto",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor: "var(--border)", flexShrink: 0 }}
        >
          <h2
            className="text-2xl leading-none"
            style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
          >
            Nuevo pedido
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{
              background: "var(--surface-2)",
              color: "var(--muted)",
              fontSize: "18px",
              cursor: "pointer",
              border: "none",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--border)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {/* Cliente (select) */}
              <div className="col-span-2">
                <label className="field-label">Cliente</label>
                <SearchableSelect
                  name="client_id"
                  options={clientOptions}
                  placeholder="— Seleccionar cliente —"
                  defaultValue={initialClientId}
                />
              </div>

              {/* Nombre manual */}
              <div className="col-span-2">
                <label className="field-label">Nombre del cliente (si no está en lista)</label>
                <input
                  name="client_name"
                  type="text"
                  className="field"
                  placeholder="O escribe el nombre manualmente"
                />
              </div>

              {/* Tipo de producto */}
              <div>
                <label className="field-label">Tipo de producto *</label>
                <SearchableSelect
                  name="product_type"
                  options={PRODUCT_OPTIONS}
                  placeholder="— Tipo —"
                  required
                />
              </div>

              {/* Cantidad */}
              <div>
                <label className="field-label">Cantidad</label>
                <input name="quantity" type="number" min="1" className="field" />
              </div>

              {/* Descripción */}
              <div className="col-span-2">
                <label className="field-label">Descripción</label>
                <textarea
                  name="description"
                  rows={2}
                  className="field"
                  placeholder="Torta de chocolate, 6 porciones, fondant…"
                />
              </div>

              {/* Sabores */}
              <div className="col-span-2">
                <label className="field-label">Sabores</label>
                <input
                  name="flavors"
                  type="text"
                  className="field"
                  placeholder="Chocolate, vainilla…"
                />
              </div>

              {/* Fecha contacto / entrega */}
              <div>
                <label className="field-label">Fecha de contacto</label>
                <input name="contact_date" type="date" className="field" />
              </div>
              <div>
                <label className="field-label">Fecha de entrega *</label>
                <input name="delivery_date" type="date" className="field" required />
              </div>

              {/* Cotizado / Total */}
              <div>
                <label className="field-label">Cotizado</label>
                <MoneyInput name="quoted" placeholder="$0" />
              </div>
              <div>
                <label className="field-label">Total *</label>
                <MoneyInput name="total" placeholder="$0" required />
              </div>

              {/* Envío */}
              <div>
                <label className="field-label">Envío</label>
                <MoneyInput name="delivery_fee" placeholder="$0" />
              </div>

              {/* Pago Interac */}
              <div>
                <label className="field-label">Pago Interac</label>
                <MoneyInput name="payment_interac" placeholder="$0" />
              </div>

              {/* Pago Efectivo */}
              <div>
                <label className="field-label">Pago Efectivo</label>
                <MoneyInput name="payment_cash" placeholder="$0" />
              </div>

              {/* Pago Tarjeta */}
              <div>
                <label className="field-label">Pago Tarjeta</label>
                <MoneyInput name="payment_card" placeholder="$0" />
              </div>

              {/* Notas */}
              <div className="col-span-2">
                <label className="field-label">Notas</label>
                <textarea name="notes" rows={2} className="field" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <button type="submit" className="btn-primary" disabled={isPending}>
                {isPending ? "Guardando…" : "Guardar pedido"}
              </button>
              <button type="button" className="btn-outline" onClick={onClose} disabled={isPending}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
