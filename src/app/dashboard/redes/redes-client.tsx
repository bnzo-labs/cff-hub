"use client";

import { useState, useTransition } from "react";
import React from "react";
import { updateBrandDoc } from "./actions";
import { FormatChart, CaptionChart } from "./analiticas-charts";
import type { FormatChartData, CaptionChartData } from "./analiticas-charts";
import PostsTab from "./posts-tab";
import type { Post as SocialPost } from "./post-edit-modal";

// ── Types ──────────────────────────────────────────────────────────────────────

interface BrandDoc {
  id: string;
  type: string;
  title: string;
  content: string;
  updated_at: string;
}

interface FormatStat {
  posts: number;
  avg_likes: number;
  avg_comments: number;
}

interface Post {
  title: string;
  date: string;
  format: string;
  likes: number;
  comments: number;
  caption_type: string;
  rank: "top" | "bottom";
}

interface DayPerf {
  day: string;
  performance: "alto" | "medio" | "bajo";
  note?: string;
}

interface CaptionPerf {
  type: string;
  avg_likes: number;
  avg_comments: number;
  rating: "top" | "bueno" | "malo";
}

interface AnalyticsReport {
  id: string;
  report_date: string;
  followers: number | null;
  reach: number | null;
  reach_pct: number | null;
  profile_views: number | null;
  posts_count: number | null;
  format_stats: { carousel?: FormatStat; video?: FormatStat } | null;
  top_posts: Post[] | null;
  best_days: DayPerf[] | null;
  caption_performance: CaptionPerf[] | null;
  insights: string[] | null;
  week_summary: string | null;
  created_at: string;
}

interface WeeklyPlan {
  id: string;
  client_id: string;
  week_of: string;
  status: string;
  created_at: string;
}

interface Props {
  brandDocs: BrandDoc[];
  reports: AnalyticsReport[];
  plans: WeeklyPlan[];
  posts: SocialPost[];
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function inlineRender(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return <strong key={idx} style={{ color: "var(--ink)", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
      return (
        <code key={idx} style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          padding: "1px 5px",
          fontSize: "0.88em",
          fontFamily: "monospace",
          color: "#B03D62",
        }}>
          {part.slice(1, -1)}
        </code>
      );
    return <span key={idx}>{part}</span>;
  });
}

function renderMarkdown(md: string): React.ReactNode {
  if (!md.trim()) return null;
  const lines = md.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  const k = () => String(key++);

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={k()} style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "14px 16px",
          fontSize: 12,
          fontFamily: "monospace",
          overflowX: "auto",
          margin: "12px 0",
          lineHeight: 1.6,
          color: "var(--ink)",
        }}>
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      i++;
      continue;
    }

    // Table
    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const parseRow = (l: string) =>
          l.split("|").map(s => s.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        const headers = parseRow(tableLines[0]);
        const dataRows = tableLines.slice(2).map(parseRow);
        nodes.push(
          <div key={k()} style={{ overflowX: "auto", margin: "10px 0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {headers.map((h, hi) => (
                    <th key={hi} style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      background: "var(--surface-2)",
                      borderBottom: "2px solid var(--border)",
                      color: "var(--muted)",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}>
                      {inlineRender(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: "1px solid var(--border)" }}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{
                        padding: "8px 12px",
                        color: ci === 0 ? "var(--ink)" : "var(--muted)",
                        verticalAlign: "top",
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}>
                        {inlineRender(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // H1
    const h1 = line.match(/^# (.+)/);
    if (h1) {
      nodes.push(
        <h1 key={k()} style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--ink)", margin: "20px 0 8px" }}>
          {inlineRender(h1[1])}
        </h1>
      );
      i++; continue;
    }

    // H2
    const h2 = line.match(/^## (.+)/);
    if (h2) {
      nodes.push(
        <h2 key={k()} style={{
          fontFamily: "var(--font-display)",
          fontSize: 18,
          color: "var(--rose)",
          margin: "22px 0 8px",
          paddingBottom: 6,
          borderBottom: "1px solid var(--border)",
        }}>
          {inlineRender(h2[1])}
        </h2>
      );
      i++; continue;
    }

    // H3
    const h3 = line.match(/^### (.+)/);
    if (h3) {
      nodes.push(
        <h3 key={k()} style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--ink)",
          margin: "14px 0 5px",
          fontFamily: "var(--font-sans)",
        }}>
          {inlineRender(h3[1])}
        </h3>
      );
      i++; continue;
    }

    // H4
    const h4 = line.match(/^#### (.+)/);
    if (h4) {
      nodes.push(
        <h4 key={k()} style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--muted)",
          margin: "12px 0 4px",
          fontFamily: "var(--font-sans)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}>
          {inlineRender(h4[1])}
        </h4>
      );
      i++; continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const qLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        qLines.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <blockquote key={k()} style={{
          borderLeft: "3px solid var(--rose-light)",
          paddingLeft: 14,
          margin: "10px 0",
          color: "var(--muted)",
          fontStyle: "italic",
        }}>
          {qLines.map((l, li) => (
            <p key={li} style={{ fontSize: 13, margin: "3px 0", lineHeight: 1.5 }}>{inlineRender(l)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // HR
    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
      nodes.push(<hr key={k()} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "16px 0" }} />);
      i++; continue;
    }

    // Unordered list
    if (line.match(/^\s*[-*]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\s*[-*]\s+/)) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      nodes.push(
        <ul key={k()} style={{ margin: "6px 0 10px 0", paddingLeft: 18 }}>
          {items.map((item, ii) => (
            <li key={ii} style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 2 }}>
              {inlineRender(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") { i++; continue; }

    // Paragraph
    nodes.push(
      <p key={k()} style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "4px 0" }}>
        {inlineRender(line)}
      </p>
    );
    i++;
  }

  return <>{nodes}</>;
}

// ── Doc card (Marca tab) ───────────────────────────────────────────────────────

function DocCard({ doc }: { doc: BrandDoc }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(doc.content);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateBrandDoc(doc.id, draft);
      setEditing(false);
    });
  }

  function cancel() {
    setDraft(doc.content);
    setEditing(false);
  }

  const updatedAt = new Date(doc.updated_at).toLocaleDateString("es-CA", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <section style={{
      background: "var(--surface)",
      border: "1.5px solid var(--border)",
      borderRadius: 16,
      overflow: "hidden",
    }}>
      {/* Card header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface-2)",
        flexWrap: "wrap",
        gap: 10,
      }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--ink)", lineHeight: 1.2 }}>
            {doc.title}
          </h2>
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, fontFamily: "var(--font-sans)" }}>
            Actualizado: {updatedAt}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {editing && (
            <button
              onClick={cancel}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "var(--font-sans)",
                background: "transparent",
                color: "var(--muted)",
                border: "1px solid var(--border)",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          )}
          <button
            onClick={editing ? save : () => setEditing(true)}
            disabled={isPending}
            style={{
              padding: "6px 18px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
              background: editing ? "var(--rose)" : "var(--border)",
              color: editing ? "#fff" : "var(--muted)",
              border: "none",
              cursor: isPending ? "default" : "pointer",
              opacity: isPending ? 0.7 : 1,
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {isPending ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 11 }} />
                Guardando...
              </>
            ) : editing ? (
              <>
                <i className="fa-solid fa-floppy-disk" style={{ fontSize: 11 }} />
                Guardar
              </>
            ) : (
              <>
                <i className="fa-solid fa-pen" style={{ fontSize: 11 }} />
                Editar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: "20px 24px", maxHeight: 620, overflowY: "auto" }}>
        {editing ? (
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 520,
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "14px 16px",
              fontSize: 13,
              fontFamily: "monospace",
              color: "var(--ink)",
              background: "var(--surface)",
              resize: "vertical",
              outline: "none",
              lineHeight: 1.65,
              boxSizing: "border-box",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = "var(--rose)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--rose-light)"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
          />
        ) : doc.content ? (
          <div>{renderMarkdown(doc.content)}</div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <i className="fa-solid fa-file-lines" style={{ fontSize: 28, color: "var(--border)", display: "block", marginBottom: 10 }} />
            <p style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
              Sin contenido. Haz clic en <strong>Editar</strong> para agregar el documento.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon, alert,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  alert?: boolean;
}) {
  return (
    <div style={{
      background: "var(--surface)",
      border: `1.5px solid ${alert ? "var(--rose)" : "var(--border)"}`,
      borderRadius: 14,
      padding: "18px 20px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: alert ? "var(--rose-light)" : "var(--border)",
          color: alert ? "var(--rose)" : "var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          flexShrink: 0,
        }}>
          <i className={icon} />
        </span>
        <span style={{
          fontSize: 11,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontFamily: "var(--font-sans)",
          fontWeight: 600,
        }}>
          {label}
        </span>
      </div>
      <p style={{
        fontSize: 30,
        fontWeight: 700,
        color: alert ? "var(--rose)" : "var(--ink)",
        fontFamily: "var(--font-display)",
        lineHeight: 1,
      }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 5 }}>{sub}</p>}
    </div>
  );
}

// ── Analytics tab ─────────────────────────────────────────────────────────────

const dayPerfWidth: Record<string, string> = { alto: "100%", medio: "55%", bajo: "20%" };
const dayPerfColor: Record<string, string> = { alto: "var(--rose)", medio: "#f59e0b", bajo: "#EDE5E0" };
const dayPerfLabel: Record<string, string> = { alto: "Excelente", medio: "Regular", bajo: "Evitar" };

function AnaliticasView({ reports }: { reports: AnalyticsReport[] }) {
  const [selectedId, setSelectedId] = useState<string>(reports[0]?.id ?? "");
  const report = reports.find(r => r.id === selectedId) ?? reports[0];

  if (!report) {
    return (
      <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--muted)" }}>
        <i className="fa-solid fa-chart-bar" style={{ fontSize: 36, display: "block", marginBottom: 14, opacity: 0.25 }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Sin reportes disponibles</p>
        <p style={{ fontSize: 12, marginTop: 4 }}>
          Agrega datos en Supabase usando <code style={{ fontFamily: "monospace" }}>social_analytics_reports</code>
        </p>
      </div>
    );
  }

  const formatData: FormatChartData[] = report.format_stats
    ? [
        { name: "Carrusel", likes: report.format_stats.carousel?.avg_likes ?? 0, comments: report.format_stats.carousel?.avg_comments ?? 0 },
        { name: "Video",    likes: report.format_stats.video?.avg_likes    ?? 0, comments: report.format_stats.video?.avg_comments    ?? 0 },
      ]
    : [];

  const captionData: CaptionChartData[] = (report.caption_performance ?? []).map(c => ({
    type: c.type,
    avg_likes: c.avg_likes,
    avg_comments: c.avg_comments,
    rating: c.rating,
  }));

  const topPosts    = (report.top_posts ?? []).filter(p => p.rank === "top");
  const bottomPosts = (report.top_posts ?? []).filter(p => p.rank === "bottom");
  const allPosts    = [...topPosts, ...bottomPosts];

  const fmtDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-CA", { day: "numeric", month: "short" });

  const fmtReportDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-CA", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

  return (
    <div className="space-y-6">
      {/* Report selector */}
      {reports.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-sans)", fontWeight: 600 }}>
            Semana:
          </label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 13,
              fontFamily: "var(--font-sans)",
              color: "var(--ink)",
              background: "var(--surface)",
              outline: "none",
            }}
          >
            {reports.map(r => (
              <option key={r.id} value={r.id}>
                {fmtReportDate(r.report_date)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Period label */}
      <p style={{ fontSize: 13, color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
        Reporte semana del{" "}
        <strong style={{ color: "var(--ink)" }}>{fmtReportDate(report.report_date)}</strong>
      </p>

      {/* Diagnosis banner */}
      {report.week_summary && (
        <div style={{
          background: "var(--surface-2)",
          border: "1.5px solid var(--border)",
          borderLeft: "4px solid var(--rose)",
          borderRadius: 12,
          padding: "14px 18px",
        }}>
          <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.6, fontFamily: "var(--font-sans)" }}>
            <strong style={{ color: "var(--rose)" }}>Diagnóstico — </strong>
            {report.week_summary}
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Seguidores"
          value={(report.followers ?? 0).toLocaleString("es-CA")}
          icon="fa-solid fa-users"
        />
        <KpiCard
          label="Alcance"
          value={(report.reach ?? 0).toLocaleString("es-CA")}
          sub={`${report.reach_pct ?? 0}% de seguidores`}
          icon="fa-solid fa-bullseye"
          alert={(report.reach_pct ?? 100) < 30}
        />
        <KpiCard
          label="Vistas de perfil"
          value={(report.profile_views ?? 0).toLocaleString("es-CA")}
          icon="fa-solid fa-eye"
        />
        <KpiCard
          label="Posts"
          value={String(report.posts_count ?? 0)}
          sub="esta semana"
          icon="fa-solid fa-images"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Format comparison */}
        <div style={{
          background: "var(--surface)",
          border: "1.5px solid var(--border)",
          borderRadius: 16,
          padding: "20px 24px",
        }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink)", marginBottom: 4 }}>
            Carrusel vs Video
          </h3>
          {report.format_stats && (
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14, fontFamily: "var(--font-sans)" }}>
              Carrusel: <strong>{report.format_stats.carousel?.posts ?? 0}</strong> post
              &nbsp;·&nbsp;
              Video: <strong>{report.format_stats.video?.posts ?? 0}</strong> posts
            </p>
          )}
          <FormatChart data={formatData} />
        </div>

        {/* Caption performance */}
        <div style={{
          background: "var(--surface)",
          border: "1.5px solid var(--border)",
          borderRadius: 16,
          padding: "20px 24px",
        }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink)", marginBottom: 4 }}>
            Apertura del caption
          </h3>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14, fontFamily: "var(--font-sans)" }}>
            Promedio de likes por tipo de apertura
          </p>
          {captionData.length > 0 ? (
            <CaptionChart data={captionData} />
          ) : (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Sin datos de caption</p>
          )}
        </div>
      </div>

      {/* Posts table */}
      <div style={{
        background: "var(--surface)",
        border: "1.5px solid var(--border)",
        borderRadius: 16,
        overflow: "hidden",
      }}>
        <div style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-2)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink)", flex: 1 }}>
            Posts de la semana
          </h3>
          <span style={{
            padding: "3px 10px",
            borderRadius: 20,
            background: "var(--rose-light)",
            color: "var(--rose)",
            fontSize: 11,
            fontWeight: 700,
          }}>
            {topPosts.length} destacados
          </span>
          <span style={{
            padding: "3px 10px",
            borderRadius: 20,
            background: "var(--border)",
            color: "var(--muted)",
            fontSize: 11,
            fontWeight: 700,
          }}>
            {bottomPosts.length} bajo rendimiento
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 520 }}>
            <thead>
              <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                {["", "Post", "Fecha", "Formato", "Apertura", "Likes", "Comentarios"].map(h => (
                  <th key={h} className="px-4 py-3 text-left" style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--muted)",
                    fontWeight: 600,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPosts.map((p, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-4 py-3">
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      fontSize: 11,
                      fontWeight: 700,
                      background: p.rank === "top" ? "var(--rose-light)" : "var(--border)",
                      color: p.rank === "top" ? "var(--rose)" : "var(--muted)",
                    }}>
                      {p.rank === "top" ? "↑" : "↓"}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--ink)", fontWeight: 500, maxWidth: 180 }}>
                    {p.title}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--muted)", fontSize: 12 }}>
                    {fmtDate(p.date)}
                  </td>
                  <td className="px-4 py-3">
                    <span style={{
                      padding: "2px 9px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      background: p.format === "carrusel" ? "var(--rose-light)" : "var(--border)",
                      color: p.format === "carrusel" ? "var(--rose)" : "var(--muted)",
                    }}>
                      {p.format}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)", fontSize: 12, maxWidth: 160 }}>
                    {p.caption_type}
                  </td>
                  <td className="px-4 py-3 font-medium" style={{
                    color: p.likes >= 10 ? "var(--rose)" : "var(--ink)",
                    fontSize: 14,
                  }}>
                    {p.likes}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>
                    {p.comments}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best days + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best days */}
        {report.best_days && report.best_days.length > 0 && (
          <div style={{
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: 16,
            padding: "20px 24px",
          }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink)", marginBottom: 18 }}>
              Mejores días para publicar
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {report.best_days.map((d, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600, fontFamily: "var(--font-sans)" }}>
                      {d.day}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
                      {dayPerfLabel[d.performance]}
                      {d.note ? ` · ${d.note}` : ""}
                    </span>
                  </div>
                  <div style={{ height: 7, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: dayPerfWidth[d.performance],
                      background: dayPerfColor[d.performance],
                      borderRadius: 4,
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights */}
        {report.insights && report.insights.length > 0 && (
          <div style={{
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: 16,
            padding: "20px 24px",
          }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink)", marginBottom: 18 }}>
              Recomendaciones
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {report.insights.map((insight, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{
                    flexShrink: 0,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "var(--rose-light)",
                    color: "var(--rose)",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 1,
                  }}>
                    {i + 1}
                  </span>
                  <p style={{
                    fontSize: 13,
                    color: "var(--ink)",
                    lineHeight: 1.55,
                    margin: 0,
                    fontFamily: "var(--font-sans)",
                  }}>
                    {insight}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

const TABS = [
  { id: "posts"      as const, label: "Posts",       icon: "fa-solid fa-calendar-week" },
  { id: "marca"      as const, label: "Marca",       icon: "fa-solid fa-star" },
  { id: "analiticas" as const, label: "Analíticas",  icon: "fa-solid fa-chart-bar" },
];

export default function RedesClient({ brandDocs, reports, plans, posts }: Props) {
  const [tab, setTab] = useState<"marca" | "analiticas" | "posts">("posts");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-4xl leading-none"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
        >
          Redes Sociales
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Estrategia de contenido · Instagram
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: 4,
        background: "var(--surface-2)",
        padding: 4,
        borderRadius: 12,
        border: "1px solid var(--border)",
        width: "fit-content",
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 20px",
              borderRadius: 9,
              fontSize: 13,
              fontWeight: tab === t.id ? 700 : 500,
              fontFamily: "var(--font-sans)",
              background: tab === t.id ? "var(--rose)" : "transparent",
              color: tab === t.id ? "#fff" : "var(--muted)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <i className={t.icon} style={{ fontSize: 12 }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "marca" && (
        <div className="space-y-6">
          {brandDocs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <i className="fa-solid fa-database" style={{ fontSize: 32, color: "var(--border)", display: "block", marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: "var(--muted)" }}>
                Crea las tablas en Supabase usando <code style={{ fontFamily: "monospace" }}>social_tables.sql</code>
              </p>
            </div>
          ) : (
            brandDocs.map(doc => <DocCard key={doc.id} doc={doc} />)
          )}
        </div>
      )}

      {tab === "analiticas" && <AnaliticasView reports={reports} />}

      {tab === "posts" && (
        <PostsTab initialPlans={plans} initialPosts={posts} />
      )}
    </div>
  );
}
