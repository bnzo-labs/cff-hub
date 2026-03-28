"use client";

import { useState, useRef, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import { updateOrderStatus, updatePaymentStatus } from "./actions";

// CFF brand colors used in badges
const ORDER_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pendiente:  { label: "Pendiente",  bg: "#f2d6f8", color: "#9d24b2" },
  aprobado:   { label: "Aprobado",   bg: "#d5f1fa", color: "#1a7fa0" },
  en_proceso: { label: "En proceso", bg: "#fef0d0", color: "#b07010" },
  entregado:  { label: "Entregado",  bg: "#DCFCE7", color: "#166534" },
  cancelado:  { label: "Cancelado",  bg: "#FEE2E2", color: "#991B1B" },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pendiente: { label: "Pendiente", bg: "#f8f1fc", color: "#7a6585" },
  parcial:   { label: "Parcial",   bg: "#fef0d0", color: "#b07010" },
  pagado:    { label: "Pagado",    bg: "#DCFCE7", color: "#166534" },
};

const ORDER_STATUSES  = ["pendiente", "aprobado", "en_proceso", "entregado", "cancelado"].map((v) => ({ value: v }));
const PAYMENT_STATUSES = ["pendiente", "parcial", "pagado"].map((v) => ({ value: v }));
const PAGE_SIZE_OPTIONS = [25, 50, 100, 250];

const PRODUCT_LABELS: Record<string, string> = {
  torta: "Torta", galletas: "Galletas", cupcakes: "Cupcakes",
  cakesicles: "Cakesicles", popcakes: "Popcakes", shots: "Shots", otro: "Otro",
};

function formatMoney(n: number) {
  return `$${(n ?? 0).toLocaleString("es-CA", { minimumFractionDigits: 0 })}`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("es-CA", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── Status dropdown ──────────────────────────────────────────────────────────

interface StatusDropdownProps {
  orderId: string;
  value: string;
  options: { value: string }[];
  config: Record<string, { label: string; bg: string; color: string }>;
  onSave: (id: string, v: string) => Promise<void>;
}

function StatusDropdown({ orderId, value, options, config, onSave }: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const [optimistic, setOptimistic] = useState(value);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setOptimistic(value); }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleSelect(newValue: string) {
    setOptimistic(newValue);
    setOpen(false);
    startTransition(async () => { await onSave(orderId, newValue); });
  }

  const cfg = config[optimistic] ?? { label: optimistic, bg: "#F3F4F6", color: "#6B7280" };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
        style={{
          background: cfg.bg, color: cfg.color,
          opacity: isPending ? 0.7 : 1,
          transition: "all 0.15s ease", cursor: "pointer",
          border: `1.5px solid ${cfg.bg}`,
        }}
        title="Click para cambiar estado"
      >
        {cfg.label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.7 }}>
          <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div
          className="absolute z-50 left-0 top-full mt-1.5 bg-white rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-lg)", minWidth: "150px" }}
        >
          {options.map((opt) => {
            const oc = config[opt.value] ?? { label: opt.value, bg: "#F3F4F6", color: "#6B7280" };
            const isActive = opt.value === optimistic;
            return (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left text-xs"
                style={{ background: isActive ? "var(--surface-2)" : "transparent", transition: "background 0.1s ease" }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span className="inline-block px-2 py-0.5 rounded-full font-medium text-xs" style={{ background: oc.bg, color: oc.color }}>
                  {oc.label}
                </span>
                {isActive && <span style={{ color: "var(--rose)", marginLeft: "auto" }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Table row ────────────────────────────────────────────────────────────────

interface Order {
  id: string;
  client_name: string | null;
  description: string | null;
  product_type: string | null;
  total: number | null;
  status: string | null;
  payment_status: string | null;
  delivery_date: string | null;
}

function TableRow({ order }: { order: Order }) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      className="border-b"
      style={{
        borderColor: "var(--border)",
        background: hovered ? "var(--surface-2)" : "transparent",
        transition: "background 0.12s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--muted)" }}>
        <Link href={`/dashboard/pedidos/${order.id}`} className="hover:text-inherit">
          {formatDate(order.delivery_date)}
        </Link>
      </td>
      <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>
        <Link href={`/dashboard/pedidos/${order.id}`} className="hover:underline" style={{ color: "var(--ink)" }}>
          {order.client_name ?? "—"}
        </Link>
      </td>
      <td className="px-4 py-3 max-w-xs truncate" style={{ color: "var(--muted)" }}>
        {order.description ?? "—"}
      </td>
      <td className="px-4 py-3" style={{ color: "var(--muted)" }}>
        {PRODUCT_LABELS[order.product_type ?? ""] ?? order.product_type ?? "—"}
      </td>
      <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>
        {formatMoney(order.total ?? 0)}
      </td>
      <td className="px-4 py-3">
        <StatusDropdown orderId={order.id} value={order.status ?? "pendiente"} options={ORDER_STATUSES} config={ORDER_STATUS_CONFIG} onSave={updateOrderStatus} />
      </td>
      <td className="px-4 py-3">
        <StatusDropdown orderId={order.id} value={order.payment_status ?? "pendiente"} options={PAYMENT_STATUSES} config={PAYMENT_STATUS_CONFIG} onSave={updatePaymentStatus} />
      </td>
    </tr>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export function PedidosTable({ orders }: { orders: Order[] }) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter((o) =>
      (o.client_name ?? "").toLowerCase().includes(q) ||
      (o.description ?? "").toLowerCase().includes(q) ||
      (o.product_type ?? "").toLowerCase().includes(q) ||
      (PRODUCT_LABELS[o.product_type ?? ""] ?? "").toLowerCase().includes(q)
    );
  }, [orders, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Reset to page 1 whenever search or pageSize changes
  useEffect(() => { setPage(1); }, [search, pageSize]);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 10px",
    borderRadius: "var(--radius-xs)",
    border: "1.5px solid var(--border)",
    background: active ? "var(--rose)" : "var(--surface)",
    color: active ? "#fff" : "var(--muted)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: active ? "default" : "pointer",
    fontFamily: "var(--font-sans)",
    transition: "all 0.15s ease",
  });

  return (
    <div className="space-y-3">
      {/* Search + page size */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="relative flex-1 min-w-55 max-w-sm">
          <i
            className="fa-solid fa-magnifying-glass"
            style={{
              position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)",
              color: "var(--muted)", fontSize: "12px", pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Buscar por cliente, descripción o tipo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              paddingLeft: "32px",
              paddingRight: "12px",
              paddingTop: "8px",
              paddingBottom: "8px",
              border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-xs)",
              background: "var(--surface)",
              color: "var(--ink)",
              fontSize: "13px",
              fontFamily: "var(--font-sans)",
              outline: "none",
              transition: "border-color 0.15s ease",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--rose)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs" style={{ color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
            Mostrar
          </span>
          {PAGE_SIZE_OPTIONS.map((n) => (
            <button key={n} onClick={() => setPageSize(n)} style={btnStyle(pageSize === n)}>
              {n}
            </button>
          ))}
          <span className="text-xs ml-1" style={{ color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
            {filtered.length !== orders.length
              ? `${filtered.length} de ${orders.length} pedidos`
              : `${orders.length} pedidos`}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-sm" style={{ background: "var(--surface)" }}>
          <thead>
            <tr className="border-b text-left" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
              {["Entrega", "Cliente", "Descripción", "Tipo", "Total", "Estado", "Pago"].map((h) => (
                <th key={h} className="px-4 py-3 text-[11px] uppercase tracking-widest font-medium" style={{ color: "var(--muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: "var(--muted)" }}>
                  {search ? `Sin resultados para "${search}"` : "Sin pedidos"}
                </td>
              </tr>
            ) : (
              slice.map((order) => <TableRow key={order.id} order={order} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs" style={{ color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
            Página {safePage} de {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(1)}
              disabled={safePage === 1}
              style={{ ...btnStyle(false), opacity: safePage === 1 ? 0.4 : 1 }}
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{ ...btnStyle(false), opacity: safePage === 1 ? 0.4 : 1 }}
            >
              ‹ Anterior
            </button>

            {/* Page number pills — show up to 5 around current */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} style={{ color: "var(--muted)", fontSize: "12px", padding: "0 4px" }}>…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p as number)} style={btnStyle(p === safePage)}>
                    {p}
                  </button>
                )
              )}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{ ...btnStyle(false), opacity: safePage === totalPages ? 0.4 : 1 }}
            >
              Siguiente ›
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={safePage === totalPages}
              style={{ ...btnStyle(false), opacity: safePage === totalPages ? 0.4 : 1 }}
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
