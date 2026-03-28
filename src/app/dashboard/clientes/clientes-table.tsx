"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteClient } from "./actions";

interface Client {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
  channel?: string | null;
  order_count: number;
  total_spent: number;
  last_order: string | null;
}

function formatMoney(n: number) {
  return `$${(n ?? 0).toLocaleString("es-CA", { minimumFractionDigits: 0 })}`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("es-CA", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function cleanPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];

// ── Icon button ────────────────────────────────────────────────────────────────

function IconBtn({
  icon, label, onClick, href, danger, disabled, muted, brands,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
  muted?: boolean;
  brands?: boolean;
}) {
  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    borderRadius: "var(--radius-xs)",
    border: "1.5px solid var(--border)",
    background: "var(--surface)",
    color: danger ? "#991b1b" : muted ? "var(--border)" : "var(--muted)",
    fontSize: 12,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: "all 0.15s ease",
    textDecoration: "none",
    flexShrink: 0,
  };

  function onEnter(e: React.MouseEvent<HTMLElement>) {
    if (disabled) return;
    const el = e.currentTarget as HTMLElement;
    el.style.background = danger ? "#fee2e2" : "var(--surface-2)";
    el.style.borderColor = danger ? "#fca5a5" : "var(--rose)";
    el.style.color = danger ? "#991b1b" : "var(--rose)";
  }
  function onLeave(e: React.MouseEvent<HTMLElement>) {
    const el = e.currentTarget as HTMLElement;
    el.style.background = "var(--surface)";
    el.style.borderColor = "var(--border)";
    el.style.color = danger ? "#991b1b" : muted ? "var(--border)" : "var(--muted)";
  }

  if (href && !disabled) {
    return (
      <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
        title={label} style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}
      >
        <i className={`${brands ? "fa-brands" : "fa-solid"} ${icon}`} />
      </a>
    );
  }

  return (
    <button type="button" title={label} onClick={disabled ? undefined : onClick}
      style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}
    >
      <i className={`${brands ? "fa-brands" : "fa-solid"} ${icon}`} />
    </button>
  );
}

// ── Client row ─────────────────────────────────────────────────────────────────

function ClientRow({
  client,
  confirmDelete,
  setConfirmDelete,
}: {
  client: Client;
  confirmDelete: string | null;
  setConfirmDelete: (id: string | null) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isConfirming = confirmDelete === client.id;

  const waPhone = client.phone ? cleanPhone(client.phone) : null;
  const contactHref = waPhone
    ? `https://wa.me/${waPhone}`
    : client.email
    ? `mailto:${client.email}`
    : null;

  const contactIcon = waPhone ? "fa-whatsapp fa-brands" : "fa-envelope";

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteClient(client.id);
      if (result.error) {
        setDeleteError(result.error);
        setConfirmDelete(null);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <>
      <tr
        className="border-b"
        style={{
          borderColor: "var(--border)",
          background: isConfirming ? "#fff8f8" : "transparent",
          transition: "background 0.12s ease",
        }}
      >
        <td className="px-4 py-3">
          <a
            href={`/dashboard/clientes/${client.id}`}
            className="font-medium text-sm hover:underline"
            style={{ color: "var(--ink)", textDecoration: "none" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--rose)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink)"; }}
          >
            {client.name}
          </a>
          {(client.phone || client.email) && (
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {client.phone ?? client.email}
            </p>
          )}
        </td>
        <td className="px-4 py-3 text-sm" style={{ color: client.order_count ? "var(--ink)" : "var(--muted)" }}>
          {client.order_count || "—"}
        </td>
        <td className="px-4 py-3 text-sm font-medium" style={{ color: client.total_spent ? "var(--rose)" : "var(--muted)" }}>
          {client.total_spent ? formatMoney(client.total_spent) : "—"}
        </td>
        <td className="px-4 py-3 text-sm" style={{ color: "var(--muted)" }}>
          {formatDate(client.last_order)}
        </td>

        {/* Quick actions */}
        <td className="px-4 py-3">
          {isConfirming ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: "#991b1b" }}>¿Borrar?</span>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                style={{
                  background: "#fee2e2", color: "#991b1b",
                  border: "1.5px solid #fca5a5", cursor: "pointer",
                  opacity: isPending ? 0.7 : 1,
                }}
              >
                {isPending ? "…" : "Sí, borrar"}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={isPending}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                style={{
                  background: "var(--surface-2)", color: "var(--muted)",
                  border: "1.5px solid var(--border)", cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {/* Contactar */}
              <IconBtn
                icon={waPhone ? "fa-whatsapp" : "fa-envelope"}
                label={waPhone ? "Contactar por WhatsApp" : client.email ? "Enviar email" : "Sin contacto"}
                href={contactHref ?? undefined}
                disabled={!contactHref}
                muted={!contactHref}
                brands={!!waPhone}
              />

              {/* Nuevo pedido */}
              <IconBtn
                icon="fa-bag-shopping"
                label="Nuevo pedido"
                href={`/dashboard/pedidos?nuevo=1&client_id=${client.id}`}
              />

              {/* Editar */}
              <IconBtn
                icon="fa-pen"
                label="Editar cliente"
                href={`/dashboard/clientes/${client.id}/editar`}
              />

              {/* Borrar */}
              <IconBtn
                icon="fa-trash"
                label="Borrar cliente"
                onClick={() => setConfirmDelete(client.id)}
                danger
              />
            </div>
          )}
          {deleteError && (
            <p className="text-xs mt-1" style={{ color: "#991b1b" }}>{deleteError}</p>
          )}
        </td>
      </tr>
    </>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function ClientesTable({ clients }: { clients: Client[] }) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
    );
  }, [clients, search]);

  useEffect(() => { setPage(1); }, [search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

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
        <div className="relative flex-1 min-w-0 max-w-sm">
          <i
            className="fa-solid fa-magnifying-glass"
            style={{
              position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)",
              color: "var(--muted)", fontSize: "12px", pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", paddingLeft: "32px", paddingRight: "12px",
              paddingTop: "8px", paddingBottom: "8px",
              border: "1.5px solid var(--border)", borderRadius: "var(--radius-xs)",
              background: "var(--surface)", color: "var(--ink)",
              fontSize: "13px", fontFamily: "var(--font-sans)", outline: "none",
              transition: "border-color 0.15s ease",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--rose)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs" style={{ color: "var(--muted)", fontFamily: "var(--font-sans)" }}>Mostrar</span>
          {PAGE_SIZE_OPTIONS.map((n) => (
            <button key={n} onClick={() => setPageSize(n)} style={btnStyle(pageSize === n)}>{n}</button>
          ))}
          <span className="text-xs ml-1" style={{ color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
            {filtered.length !== clients.length
              ? `${filtered.length} de ${clients.length} clientes`
              : `${clients.length} clientes`}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-sm" style={{ background: "var(--surface)", minWidth: 560 }}>
          <thead>
            <tr className="border-b text-left" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
              {["Nombre", "Pedidos", "Total gastado", "Último pedido", "Acciones"].map((h) => (
                <th key={h} className="px-4 py-3 text-[11px] uppercase tracking-widest font-medium" style={{ color: "var(--muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: "var(--muted)" }}>
                  {search ? `Sin resultados para "${search}"` : "Sin clientes"}
                </td>
              </tr>
            ) : (
              slice.map((c) => (
                <ClientRow
                  key={c.id}
                  client={c}
                  confirmDelete={confirmDelete}
                  setConfirmDelete={setConfirmDelete}
                />
              ))
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
            <button onClick={() => setPage(1)} disabled={safePage === 1}
              style={{ ...btnStyle(false), opacity: safePage === 1 ? 0.4 : 1 }}>«</button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
              style={{ ...btnStyle(false), opacity: safePage === 1 ? 0.4 : 1 }}>‹ Anterior</button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`e-${i}`} style={{ color: "var(--muted)", fontSize: "12px", padding: "0 4px" }}>…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p as number)} style={btnStyle(p === safePage)}>{p}</button>
                )
              )}

            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
              style={{ ...btnStyle(false), opacity: safePage === totalPages ? 0.4 : 1 }}>Siguiente ›</button>
            <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
              style={{ ...btnStyle(false), opacity: safePage === totalPages ? 0.4 : 1 }}>»</button>
          </div>
        </div>
      )}
    </div>
  );
}
