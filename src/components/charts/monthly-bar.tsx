"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { TooltipProps } from "recharts";

interface DataPoint {
  month: string;
  current: number;
  previous: number;
}

interface MonthlyBarChartProps {
  data: DataPoint[];
  currentYear: number;
  previousYear: number;
}

function ChartTooltip({
  active, payload, label, currentYear, previousYear,
}: TooltipProps<number, string> & { currentYear: number; previousYear: number }) {
  if (!active || !payload?.length) return null;
  const fmt = (n: number) => `$${n.toLocaleString("es-CA", { minimumFractionDigits: 0 })}`;
  return (
    <div style={{
      background: "#fff", border: "1.5px solid #e8d8f2", borderRadius: 10,
      padding: "10px 14px", fontFamily: "Nunito, sans-serif",
      boxShadow: "0 4px 12px rgba(157,36,178,0.09)", minWidth: 130,
    }}>
      <p style={{ color: "#7a6585", fontSize: 11, marginBottom: 6 }}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4">
          <span style={{ color: "#7a6585", fontSize: 12 }}>
            {entry.dataKey === "current" ? currentYear : previousYear}
          </span>
          <span style={{ color: entry.dataKey === "current" ? "#9d24b2" : "#c4a0d8", fontWeight: 700, fontSize: 13 }}>
            {fmt(entry.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function MonthlyBarChart({ data, currentYear, previousYear }: MonthlyBarChartProps) {
  const tickStyle = { fontSize: 11, fill: "#7a6585", fontFamily: "Nunito, sans-serif" };

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <span className="flex items-center gap-1.5 text-xs" style={{ color: "#7a6585", fontFamily: "Nunito, sans-serif" }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#9d24b2" }} />
          {currentYear}
        </span>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: "#7a6585", fontFamily: "Nunito, sans-serif" }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#c4a0d8" }} />
          {previousYear}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }} barGap={3} barCategoryGap="22%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e8d8f2" vertical={false} />
          <XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} />
          <YAxis
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
            width={44}
          />
          <Tooltip
            content={(props) => <ChartTooltip {...(props as TooltipProps<number, string>)} currentYear={currentYear} previousYear={previousYear} />}
            cursor={{ fill: "#f2d6f8" }}
          />
          <Bar dataKey="previous" fill="#c4a0d8" radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Bar dataKey="current"  fill="#9d24b2" radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
