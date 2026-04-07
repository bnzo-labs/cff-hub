"use client";

import { useState, useTransition } from "react";
import React from "react";
import { upsertTrendsReport } from "./actions";

// ── Inline markdown renderer (same as redes-client) ───────────────────────────

function inlineRender(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return (
        <strong key={idx} style={{ color: "var(--ink)", fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
      return (
        <code
          key={idx}
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            padding: "1px 5px",
            fontSize: "0.88em",
            fontFamily: "monospace",
            color: "#B03D62",
          }}
        >
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

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre
          key={k()}
          style={{
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
          }}
        >
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      i++;
      continue;
    }

    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const parseRow = (l: string) =>
          l
            .split("|")
            .map((s) => s.trim())
            .filter((_, idx2, arr) => idx2 > 0 && idx2 < arr.length - 1);
        const headers = parseRow(tableLines[0]);
        const dataRows = tableLines.slice(2).map(parseRow);
        nodes.push(
          <div key={k()} style={{ overflowX: "auto", margin: "10px 0" }}>
            <table
              style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
            >
              <thead>
                <tr>
                  {headers.map((h, hi) => (
                    <th
                      key={hi}
                      style={{
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
                      }}
                    >
                      {inlineRender(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: "1px solid var(--border)" }}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        style={{
                          padding: "8px 12px",
                          color: ci === 0 ? "var(--ink)" : "var(--muted)",
                          verticalAlign: "top",
                          fontSize: 12,
                          lineHeight: 1.5,
                        }}
                      >
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

    const h1 = line.match(/^# (.+)/);
    if (h1) {
      nodes.push(
        <h1
          key={k()}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            color: "var(--ink)",
            margin: "20px 0 8px",
          }}
        >
          {inlineRender(h1[1])}
        </h1>
      );
      i++;
      continue;
    }

    const h2 = line.match(/^## (.+)/);
    if (h2) {
      nodes.push(
        <h2
          key={k()}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            color: "var(--rose)",
            margin: "22px 0 8px",
            paddingBottom: 6,
            borderBottom: "1px solid var(--border)",
          }}
        >
          {inlineRender(h2[1])}
        </h2>
      );
      i++;
      continue;
    }

    const h3 = line.match(/^### (.+)/);
    if (h3) {
      nodes.push(
        <h3
          key={k()}
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--ink)",
            margin: "14px 0 5px",
            fontFamily: "var(--font-sans)",
          }}
        >
          {inlineRender(h3[1])}
        </h3>
      );
      i++;
      continue;
    }

    const h4 = line.match(/^#### (.+)/);
    if (h4) {
      nodes.push(
        <h4
          key={k()}
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--muted)",
            margin: "12px 0 4px",
            fontFamily: "var(--font-sans)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {inlineRender(h4[1])}
        </h4>
      );
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      const qLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        qLines.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <blockquote
          key={k()}
          style={{
            borderLeft: "3px solid var(--rose-light)",
            paddingLeft: 14,
            margin: "10px 0",
            color: "var(--muted)",
            fontStyle: "italic",
          }}
        >
          {qLines.map((l, li) => (
            <p
              key={li}
              style={{ fontSize: 13, margin: "3px 0", lineHeight: 1.5 }}
            >
              {inlineRender(l)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
      nodes.push(
        <hr
          key={k()}
          style={{
            border: "none",
            borderTop: "1px solid var(--border)",
            margin: "16px 0",
          }}
        />
      );
      i++;
      continue;
    }

    if (line.match(/^\s*[-*]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\s*[-*]\s+/)) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      nodes.push(
        <ul key={k()} style={{ margin: "6px 0 10px 0", paddingLeft: 18 }}>
          {items.map((item, ii) => (
            <li
              key={ii}
              style={{
                fontSize: 13,
                color: "var(--muted)",
                lineHeight: 1.6,
                marginBottom: 2,
              }}
            >
              {inlineRender(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    nodes.push(
      <p
        key={k()}
        style={{
          fontSize: 13,
          color: "var(--muted)",
          lineHeight: 1.6,
          margin: "4px 0",
        }}
      >
        {inlineRender(line)}
      </p>
    );
    i++;
  }

  return <>{nodes}</>;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  initialId: string | null;
  initialContent: string | null;
}

export default function TendenciasTab({ initialId, initialContent }: Props) {
  const [editing, setEditing] = useState(!initialContent);
  const [draft, setDraft] = useState(initialContent ?? "");
  const [savedId, setSavedId] = useState<string | null>(initialId);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await upsertTrendsReport(savedId, draft);
      setSavedId(savedId);
      setEditing(false);
    });
  }

  function cancel() {
    setDraft(initialContent ?? "");
    setEditing(false);
  }

  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1.5px solid var(--border)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-2)",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              color: "var(--ink)",
              lineHeight: 1.2,
            }}
          >
            Reporte de Tendencias
          </h2>
          <p
            style={{
              fontSize: 11,
              color: "var(--muted)",
              marginTop: 3,
              fontFamily: "var(--font-sans)",
            }}
          >
            Pega aquí el reporte de tendencias en formato Markdown
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {editing && initialContent && (
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
                <i
                  className="fa-solid fa-circle-notch fa-spin"
                  style={{ fontSize: 11 }}
                />
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

      {/* Body */}
      <div style={{ padding: "20px 24px", maxHeight: 700, overflowY: "auto" }}>
        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Pega aquí el reporte de tendencias en Markdown..."
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 560,
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
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--rose)";
              e.currentTarget.style.boxShadow =
                "0 0 0 3px var(--rose-light)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        ) : draft ? (
          <div>{renderMarkdown(draft)}</div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <i
              className="fa-solid fa-arrow-trend-up"
              style={{
                fontSize: 28,
                color: "var(--border)",
                display: "block",
                marginBottom: 10,
              }}
            />
            <p
              style={{
                fontSize: 13,
                color: "var(--muted)",
                fontStyle: "italic",
              }}
            >
              Sin reporte. Haz clic en <strong>Editar</strong> para agregar el
              contenido.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
