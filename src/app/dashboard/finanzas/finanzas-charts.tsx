"use client";

import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import type { TooltipProps } from "recharts";

export type BarItem   = { label: string; revenue: number };
export type YearItem  = { year: number;  revenue: number };

function fmt(n: number) {
  return `$${n.toLocaleString("es-CA", { minimumFractionDigits: 0 })}`;
}

function yTick(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
  return `$${v}`;
}

const tooltipStyle: React.CSSProperties = {
  background: "#fff",
  border: "1.5px solid #e8d8f2",
  borderRadius: 10,
  padding: "8px 14px",
  fontFamily: "Nunito, sans-serif",
  boxShadow: "0 4px 12px rgba(157,36,178,0.09)",
};

const tickStyle = { fill: "#7a6585", fontSize: 11, fontFamily: "Nunito, sans-serif" };

function BarTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      <p style={{ color: "#7a6585", fontSize: 11, marginBottom: 2 }}>{label}</p>
      <p style={{ color: "#9d24b2", fontWeight: 700, fontSize: 14 }}>{fmt(payload[0].value ?? 0)}</p>
    </div>
  );
}

function AreaTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      <p style={{ color: "#7a6585", fontSize: 11, marginBottom: 2 }}>{label}</p>
      <p style={{ color: "#f8aa40", fontWeight: 700, fontSize: 14 }}>{fmt(payload[0].value ?? 0)}</p>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "20px",
  boxShadow: "var(--shadow-sm)",
};

const titleStyle: React.CSSProperties = {
  color: "var(--ink)",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 16,
};

function getIsoWeek(date: Date): number {
  const jan4 = new Date(date.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  return Math.ceil((date.getTime() - startOfWeek1.getTime()) / (7 * 86400000)) + 1;
}

export function FinanzasCharts({
  barData,
  yearlyData,
  vista,
  year,
  month,
}: {
  barData: BarItem[];
  yearlyData: YearItem[];
  vista: string;
  year: number;
  month: number;
}) {
  const router = useRouter();
  const isClickable = vista === "anual" || vista === "mensual";

  function handleBarClick(_data: unknown, index: number) {
    if (vista === "anual") {
      const targetMonth = index + 1;
      router.push(`/dashboard/finanzas?vista=mensual&year=${year}&month=${targetMonth}`);
    } else if (vista === "mensual") {
      // Sem 1 = days 1-7, Sem 2 = 8-14, Sem 3 = 15-21, Sem 4 = 22+
      const startDay = index * 7 + 1;
      const targetWeek = getIsoWeek(new Date(year, month - 1, startDay));
      router.push(`/dashboard/finanzas?vista=semanal&year=${year}&month=${month}&week=${targetWeek}`);
    }
  }

  const barTitle =
    vista === "anual"   ? "Ingresos por mes" :
    vista === "mensual" ? "Ingresos por semana" :
                          "Ingresos por día";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

      {/* Bar chart — period breakdown */}
      <div className="lg:col-span-2" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ ...titleStyle, marginBottom: 0 }}>{barTitle}</p>
          {isClickable && (
            <span style={{ color: "#7a6585", fontSize: 11, fontFamily: "Nunito, sans-serif" }}>
              Clic para ver detalle →
            </span>
          )}
        </div>
        <div style={{ cursor: isClickable ? "pointer" : "default" }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8d8f2" vertical={false} />
              <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={yTick}
                tick={tickStyle}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: "#f2d6f8" }} />
              <Bar
                dataKey="revenue"
                fill="#9d24b2"
                radius={[6, 6, 0, 0]}
                maxBarSize={44}
                onClick={isClickable ? handleBarClick : undefined}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Area chart — year-over-year growth */}
      <YearlyLineChart data={yearlyData} />

    </div>
  );
}

// ── Standalone yearly line chart (reusable outside finanzas) ────────────────

function YearlyAreaContent({ data }: { data: YearItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8aa40" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#f8aa40" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8d8f2" vertical={false} />
        <XAxis dataKey="year" tick={tickStyle} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={yTick}
          tick={tickStyle}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip content={<AreaTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#f8aa40"
          strokeWidth={2.5}
          fill="url(#amberGrad)"
          dot={{ fill: "#f8aa40", r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: "#f8aa40", strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function YearlyLineChart({ data }: { data: YearItem[] }) {
  return (
    <div style={cardStyle}>
      <p style={titleStyle}>Crecimiento anual</p>
      <YearlyAreaContent data={data} />
    </div>
  );
}
