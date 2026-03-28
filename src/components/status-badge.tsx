// CFF brand-aligned status badge colors
const ORDER_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pendiente:  { label: "Pendiente",  bg: "#f2d6f8", color: "#9d24b2" },
  aprobado:   { label: "Aprobado",   bg: "#d5f1fa", color: "#1a7fa0" },
  en_proceso: { label: "En proceso", bg: "#fef0d0", color: "#b07010" },
  entregado:  { label: "Entregado",  bg: "#dcfce7", color: "#166534" },
  cancelado:  { label: "Cancelado",  bg: "#fee2e2", color: "#991b1b" },
};

const PAYMENT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pendiente: { label: "Pendiente", bg: "#f8f1fc", color: "#7a6585" },
  parcial:   { label: "Parcial",   bg: "#fef0d0", color: "#b07010" },
  pagado:    { label: "Pagado",    bg: "#dcfce7", color: "#166534" },
};

const LEAD_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  nuevo:      { label: "Nuevo",      bg: "#f8f1fc", color: "#7a6585" },
  contactado: { label: "Contactado", bg: "#d5f1fa", color: "#1a7fa0" },
  cotizando:  { label: "Cotizando",  bg: "#fef0d0", color: "#b07010" },
  ganado:     { label: "Ganado",     bg: "#dcfce7", color: "#166534" },
  perdido:    { label: "Perdido",    bg: "#fee2e2", color: "#991b1b" },
};

interface StatusBadgeProps {
  status: string;
  type?: "order" | "payment" | "lead";
}

export function StatusBadge({ status, type = "order" }: StatusBadgeProps) {
  const map = type === "payment" ? PAYMENT_STATUS : type === "lead" ? LEAD_STATUS : ORDER_STATUS;
  const config = map[status] ?? { label: status, bg: "#f8f1fc", color: "#7a6585" };

  return (
    <span
      className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}
