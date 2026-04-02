"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

export interface FormatChartData {
  name: string;
  likes: number;
  comments: number;
}

export interface CaptionChartData {
  type: string;
  avg_likes: number;
  avg_comments: number;
  rating: string;
}

const tooltipStyle = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
    fontFamily: "var(--font-sans)",
    color: "var(--ink)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  },
};

const axisProps = {
  tick: { fontSize: 12, fill: "#7A6E6A", fontFamily: "var(--font-sans)" } as const,
  axisLine: false as const,
  tickLine: false as const,
};

export function FormatChart({ data }: { data: FormatChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data} barGap={6} barCategoryGap="45%">
        <CartesianGrid strokeDasharray="3 3" stroke="#EDE5E0" vertical={false} />
        <XAxis dataKey="name" {...axisProps} />
        <YAxis {...axisProps} tick={{ ...axisProps.tick, fontSize: 11 }} />
        <Tooltip {...tooltipStyle} />
        <Legend
          wrapperStyle={{
            fontSize: 12,
            fontFamily: "var(--font-sans)",
            color: "#7A6E6A",
            paddingTop: 8,
          }}
        />
        <Bar
          dataKey="likes"
          name="Avg. Likes"
          fill="#D4537E"
          radius={[5, 5, 0, 0]}
          maxBarSize={52}
        />
        <Bar
          dataKey="comments"
          name="Avg. Comentarios"
          fill="#F2C4D4"
          radius={[5, 5, 0, 0]}
          maxBarSize={52}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

const ratingColor: Record<string, string> = {
  top:   "#D4537E",
  bueno: "#f59e0b",
  malo:  "#7A6E6A",
};

export function CaptionChart({ data }: { data: CaptionChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={data} layout="vertical" barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 3" stroke="#EDE5E0" horizontal={false} />
        <XAxis
          type="number"
          {...axisProps}
          tick={{ ...axisProps.tick, fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="type"
          width={140}
          {...axisProps}
          tick={{ ...axisProps.tick, fontSize: 11 }}
        />
        <Tooltip {...tooltipStyle} formatter={(v: number) => [v, "Avg. likes"]} />
        <Bar dataKey="avg_likes" name="Avg. Likes" radius={[0, 5, 5, 0]} maxBarSize={22}>
          {data.map((d, i) => (
            <Cell key={i} fill={ratingColor[d.rating] ?? "#7A6E6A"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
