"use client";

import { useRouter } from "next/navigation";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const YEARS = [2021, 2022, 2023, 2024, 2025, 2026];

function isoWeekRange(year: number, week: number) {
  const jan4 = new Date(year, 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const mon = new Date(startOfWeek1);
  mon.setDate(startOfWeek1.getDate() + (week - 1) * 7);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { mon, sun };
}

function weeksInYear(year: number) {
  const dec28 = new Date(year, 11, 28);
  const dayOfWeek = (dec28.getDay() + 6) % 7;
  return Math.ceil((dec28.getDate() - dayOfWeek + 10) / 7);
}

const selectStyle: React.CSSProperties = {
  borderColor: "var(--border)",
  background:  "var(--surface)",
  color:       "var(--ink)",
  borderRadius: "var(--radius-xs)",
  fontFamily:  "var(--font-sans)",
  fontSize:    "13px",
  fontWeight:  500,
  padding:     "6px 12px",
  border:      "1.5px solid var(--border)",
  outline:     "none",
  cursor:      "pointer",
  transition:  "border-color 0.15s ease",
};

export function FinanzasFiltros({
  vista,
  year,
  month,
  week,
}: {
  vista: string;
  year: number;
  month: number;
  week: number;
}) {
  const router = useRouter();

  function go(params: Record<string, string | number>) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => sp.set(k, String(v)));
    router.push(`/dashboard/finanzas?${sp.toString()}`);
  }

  const totalWeeks = weeksInYear(year);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Vista toggle — pill group */}
      <div
        className="flex overflow-hidden"
        style={{
          border:       "1.5px solid var(--border)",
          borderRadius: "var(--radius-xs)",
          background:   "var(--surface)",
        }}
      >
        {(["anual", "mensual", "semanal"] as const).map((v, i, arr) => (
          <button
            key={v}
            onClick={() => go({ vista: v, year, month, week })}
            className="px-4 py-1.5 text-xs font-semibold capitalize transition-colors"
            style={{
              background:  vista === v ? "var(--rose)" : "var(--surface)",
              color:       vista === v ? "#fff" : "var(--muted)",
              borderRight: i < arr.length - 1 ? "1.5px solid var(--border)" : undefined,
              fontFamily:  "var(--font-sans)",
              cursor:      "pointer",
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Año */}
      <select
        value={year}
        onChange={(e) => go({ vista, year: e.target.value, month, week })}
        style={selectStyle}
      >
        {YEARS.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      {/* Mes (solo mensual y semanal) */}
      {(vista === "mensual" || vista === "semanal") && (
        <select
          value={month}
          onChange={(e) => go({ vista, year, month: e.target.value, week: 1 })}
          style={selectStyle}
        >
          {MESES.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
      )}

      {/* Semana (solo semanal) */}
      {vista === "semanal" && (
        <div className="flex items-center" style={{ border: "1.5px solid var(--border)", borderRadius: "var(--radius-xs)", overflow: "hidden" }}>
          <button
            onClick={() => go({ vista, year, month, week: Math.max(1, week - 1) })}
            className="px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              borderRight: "1.5px solid var(--border)",
              color:       "var(--muted)",
              background:  "var(--surface)",
              fontFamily:  "var(--font-sans)",
              cursor:      "pointer",
            }}
          >
            ‹
          </button>
          <span
            className="text-xs px-3 py-1.5"
            style={{ color: "var(--ink)", background: "var(--surface)", fontFamily: "var(--font-sans)", fontWeight: 500, whiteSpace: "nowrap" }}
          >
            {(() => {
              const { mon, sun } = isoWeekRange(year, week);
              const fmt = (d: Date) =>
                d.toLocaleDateString("es-CA", { day: "numeric", month: "short" });
              return `Sem ${week} · ${fmt(mon)} – ${fmt(sun)}`;
            })()}
          </span>
          <button
            onClick={() => go({ vista, year, month, week: Math.min(totalWeeks, week + 1) })}
            className="px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              borderLeft: "1.5px solid var(--border)",
              color:      "var(--muted)",
              background: "var(--surface)",
              fontFamily: "var(--font-sans)",
              cursor:     "pointer",
            }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
