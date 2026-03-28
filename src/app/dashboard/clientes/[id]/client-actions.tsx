"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteClient } from "../actions";

interface Props {
  clientId: string;
  clientName: string;
  phone?: string | null;
  email?: string | null;
}

function cleanPhone(p: string) {
  return p.replace(/\D/g, "");
}

export function ClientActions({ clientId, clientName, phone, email }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const waHref = phone ? `https://wa.me/${cleanPhone(phone)}` : null;
  const contactHref = waHref ?? (email ? `mailto:${email}` : null);
  const contactIcon = waHref ? "fa-brands fa-whatsapp" : "fa-solid fa-envelope";
  const contactLabel = waHref ? "WhatsApp" : "Email";

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteClient(clientId);
      if (result.error) {
        setError(result.error);
        setConfirming(false);
      } else {
        router.push("/dashboard/clientes");
      }
    });
  }

  const btnBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    border: "1.5px solid var(--border)",
    background: "var(--surface)",
    color: "var(--muted)",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "var(--font-sans)",
    cursor: "pointer",
    transition: "all 0.15s ease",
    textDecoration: "none",
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Contactar */}
      {contactHref ? (
        <a
          href={contactHref}
          target={waHref ? "_blank" : undefined}
          rel="noopener noreferrer"
          style={btnBase}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--rose)";
            (e.currentTarget as HTMLElement).style.color = "var(--rose)";
            (e.currentTarget as HTMLElement).style.background = "var(--rose-light)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            (e.currentTarget as HTMLElement).style.color = "var(--muted)";
            (e.currentTarget as HTMLElement).style.background = "var(--surface)";
          }}
        >
          <i className={contactIcon} />
          {contactLabel}
        </a>
      ) : (
        <button style={{ ...btnBase, opacity: 0.4, cursor: "not-allowed" }} disabled>
          <i className="fa-solid fa-phone" />
          Sin contacto
        </button>
      )}

      {/* Nuevo pedido */}
      <a
        href={`/dashboard/pedidos?nuevo=1&client_id=${clientId}`}
        style={btnBase}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--rose)";
          (e.currentTarget as HTMLElement).style.color = "var(--rose)";
          (e.currentTarget as HTMLElement).style.background = "var(--rose-light)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLElement).style.color = "var(--muted)";
          (e.currentTarget as HTMLElement).style.background = "var(--surface)";
        }}
      >
        <i className="fa-solid fa-bag-shopping" />
        Nuevo pedido
      </a>

      {/* Editar */}
      <a
        href={`/dashboard/clientes/${clientId}/editar`}
        style={btnBase}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--rose)";
          (e.currentTarget as HTMLElement).style.color = "var(--rose)";
          (e.currentTarget as HTMLElement).style.background = "var(--rose-light)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLElement).style.color = "var(--muted)";
          (e.currentTarget as HTMLElement).style.background = "var(--surface)";
        }}
      >
        <i className="fa-solid fa-pen" />
        Editar
      </a>

      {/* Borrar */}
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "#991b1b" }}>¿Borrar a {clientName}?</span>
          <button
            onClick={handleDelete}
            disabled={isPending}
            style={{
              ...btnBase,
              background: "#fee2e2",
              color: "#991b1b",
              borderColor: "#fca5a5",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? "Borrando…" : "Sí, borrar"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={isPending}
            style={{ ...btnBase }}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          style={{ ...btnBase, color: "#991b1b", borderColor: "#fca5a5" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#fee2e2";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--surface)";
          }}
        >
          <i className="fa-solid fa-trash" />
          Borrar
        </button>
      )}

      {error && (
        <p className="w-full text-xs mt-1" style={{ color: "#991b1b" }}>{error}</p>
      )}
    </div>
  );
}
