"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PedidosTable } from "./pedidos-table";
import { NuevoPedidoDrawer } from "./nuevo-pedido-drawer";

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface WeekOrder {
  id: string;
  client_name: string | null;
  total: number | null;
  delivery_date: string | null;
  status: string | null;
}

interface RecentDelivered {
  id: string;
  client_name: string | null;
  product_type: string | null;
  total: number | null;
  delivery_date: string | null;
}

interface Client {
  id: string;
  name: string;
}

interface Props {
  orders: Order[];
  thisWeekOrders: WeekOrder[];
  nextWeekOrders: WeekOrder[];
  recentDelivered: RecentDelivered[];
  clients: Client[];
  activeStatus?: string;
  activeTipo?: string;
  totalCount: number;
  initialClientId?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(n: number) {
  return `$${(n ?? 0).toLocaleString("es-CA", { minimumFractionDigits: 0 })}`;
}

const STATUSES = ["pendiente", "aprobado", "en_proceso", "entregado", "cancelado"];
const TIPOS = ["torta", "galletas", "cupcakes", "cakesicles", "popcakes", "shots", "otro"];
const PRODUCT_LABELS: Record<string, string> = {
  torta: "Torta",
  galletas: "Galletas",
  cupcakes: "Cupcakes",
  cakesicles: "Cakesicles",
  popcakes: "Popcakes",
  shots: "Shots",
  otro: "Otro",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  pendiente:  "#9d24b2",
  aprobado:   "#1a7fa0",
  en_proceso: "#b07010",
  entregado:  "#166534",
  cancelado:  "#991B1B",
};

function formatDateShort(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("es-CA", {
    weekday: "short", day: "numeric", month: "short",
  });
}

// ── Stats cards ───────────────────────────────────────────────────────────────

function WeekStatCard({ label, orders }: { label: string; orders: WeekOrder[] }) {
  const revenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);

  return (
    <div
      className="p-5 rounded-xl border flex flex-col"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: "var(--muted)" }}>
          {label}
        </p>
        <span className="text-xs font-semibold" style={{ color: "var(--rose)" }}>
          {orders.length} · {formatMoney(revenue)}
        </span>
      </div>

      {/* Order list */}
      {orders.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>Sin pedidos</p>
      ) : (
        <div className="space-y-2.5" style={{ maxHeight: 200, overflowY: "auto" }}>
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  style={{
                    width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                    background: STATUS_DOT[o.status ?? ""] ?? "var(--border)",
                  }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>
                    {o.client_name ?? "—"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {formatDateShort(o.delivery_date)}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold shrink-0" style={{ color: "var(--ink)" }}>
                {formatMoney(o.total ?? 0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentDeliveredCard({ orders }: { orders: RecentDelivered[] }) {
  return (
    <div
      className="p-5 rounded-xl border flex flex-col"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}
    >
      <p className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: "var(--muted)" }}>
        Últimos entregados
      </p>
      {orders.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>Sin entregados recientes</p>
      ) : (
        <div className="space-y-2.5" style={{ maxHeight: 200, overflowY: "auto" }}>
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>
                  {o.client_name ?? "—"}
                </p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {formatDateShort(o.delivery_date)}
                </p>
              </div>
              <span className="text-sm font-semibold shrink-0" style={{ color: "var(--rose)" }}>
                {formatMoney(o.total ?? 0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PedidosPageClient({
  orders,
  thisWeekOrders,
  nextWeekOrders,
  recentDelivered,
  clients,
  activeStatus,
  activeTipo,
  totalCount,
  initialClientId,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (initialClientId) setDrawerOpen(true);
  }, [initialClientId]);

  const noFilter = !activeStatus && !activeTipo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-4xl leading-none"
            style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
          >
            Pedidos
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {totalCount} pedidos en total
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setDrawerOpen(true)}
        >
          + Nuevo pedido
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <WeekStatCard label="Esta semana" orders={thisWeekOrders} />
        <WeekStatCard label="Próxima semana" orders={nextWeekOrders} />
        <RecentDeliveredCard orders={recentDelivered} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/pedidos"
          className="filter-pill"
          style={{
            background: noFilter ? "var(--rose)" : "var(--surface)",
            color: noFilter ? "#fff" : "var(--muted)",
            borderColor: noFilter ? "var(--rose)" : "var(--border)",
          }}
        >
          Todos
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/dashboard/pedidos?status=${s}`}
            className="filter-pill capitalize"
            style={{
              background: activeStatus === s ? "var(--rose)" : "var(--surface)",
              color: activeStatus === s ? "#fff" : "var(--muted)",
              borderColor: activeStatus === s ? "var(--rose)" : "var(--border)",
            }}
          >
            {s.replace("_", " ")}
          </Link>
        ))}
        <span
          className="text-xs self-center px-2"
          style={{ color: "var(--border)" }}
        >
          |
        </span>
        {TIPOS.map((t) => (
          <Link
            key={t}
            href={`/dashboard/pedidos?tipo=${t}`}
            className="filter-pill"
            style={{
              background: activeTipo === t ? "var(--rose)" : "var(--surface)",
              color: activeTipo === t ? "#fff" : "var(--muted)",
              borderColor: activeTipo === t ? "var(--rose)" : "var(--border)",
            }}
          >
            {PRODUCT_LABELS[t]}
          </Link>
        ))}
      </div>

      {/* Tabla */}
      <PedidosTable orders={orders} />

      {/* Drawer */}
      <NuevoPedidoDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        clients={clients}
        initialClientId={initialClientId ?? undefined}
      />
    </div>
  );
}
