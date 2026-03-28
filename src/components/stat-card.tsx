import Link from "next/link";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  href?: string;
}

export function StatCard({ label, value, sub, trend, href }: StatCardProps) {
  const inner = (
    <>
      <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      <p className="text-3xl mt-2 leading-none" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>{sub}</p>
      )}
      {trend !== undefined && (
        <p className="text-xs mt-1.5 font-semibold" style={{ color: trend >= 0 ? "#166534" : "#991b1b" }}>
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}% vs mes anterior
        </p>
      )}
      {href && (
        <p className="text-[11px] mt-3 font-semibold" style={{ color: "var(--rose)" }}>
          Ver detalles →
        </p>
      )}
    </>
  );

  const cls   = "card-hover p-5 rounded-xl border block";
  const style = { background: "var(--surface)", borderColor: "var(--border)" };

  return href
    ? <Link href={href} className={cls} style={style}>{inner}</Link>
    : <div className={cls} style={style}>{inner}</div>;
}
