"use client";

import { useState, useTransition } from "react";
import { upsertVisualGuidelines } from "./actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// ── Field editors ─────────────────────────────────────────────────────────────

function StringField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "7px 12px",
        fontSize: 13,
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        background: "var(--surface)",
        outline: "none",
        boxSizing: "border-box",
        transition: "border-color 0.15s",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--rose)";
        e.currentTarget.style.boxShadow = "0 0 0 3px var(--rose-light)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

function ArrayField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  function updateItem(idx: number, val: string) {
    const next = value.map((item, i) => (i === idx ? val : item));
    onChange(next);
  }

  function removeItem(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function addItem() {
    onChange([...value, ""]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {value.map((item, idx) => (
        <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(idx, e.target.value)}
            style={{
              flex: 1,
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 13,
              fontFamily: "var(--font-sans)",
              color: "var(--ink)",
              background: "var(--surface)",
              outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--rose)";
              e.currentTarget.style.boxShadow = "0 0 0 3px var(--rose-light)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <button
            onClick={() => removeItem(idx)}
            title="Eliminar"
            style={{
              flexShrink: 0,
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--rose-light)";
              e.currentTarget.style.color = "var(--rose)";
              e.currentTarget.style.borderColor = "var(--rose)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--muted)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        style={{
          alignSelf: "flex-start",
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "5px 12px",
          borderRadius: 8,
          border: "1px dashed var(--border)",
          background: "transparent",
          color: "var(--muted)",
          fontSize: 12,
          fontFamily: "var(--font-sans)",
          cursor: "pointer",
          transition: "all 0.15s",
          marginTop: 2,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--rose)";
          e.currentTarget.style.color = "var(--rose)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.color = "var(--muted)";
        }}
      >
        <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />
        Agregar elemento
      </button>
    </div>
  );
}

function ObjectField({
  value,
  onChange,
  depth,
}: {
  value: Record<string, JsonValue>;
  onChange: (v: Record<string, JsonValue>) => void;
  depth: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingLeft: depth > 0 ? 12 : 0,
        borderLeft: depth > 0 ? "2px solid var(--border)" : "none",
      }}
    >
      {Object.entries(value).map(([k, v]) => (
        <div key={k}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontFamily: "var(--font-sans)",
              marginBottom: 5,
            }}
          >
            {k.replace(/_/g, " ")}
          </label>
          <FieldEditor
            value={v}
            onChange={(next) => onChange({ ...value, [k]: next })}
            depth={depth + 1}
          />
        </div>
      ))}
    </div>
  );
}

function FieldEditor({
  value,
  onChange,
  depth,
}: {
  value: JsonValue;
  onChange: (v: JsonValue) => void;
  depth: number;
}) {
  if (typeof value === "string") {
    return (
      <StringField value={value} onChange={(v) => onChange(v)} />
    );
  }

  if (Array.isArray(value)) {
    const allStrings = value.every((item) => typeof item === "string");
    if (allStrings) {
      return (
        <ArrayField
          value={value as string[]}
          onChange={(v) => onChange(v)}
        />
      );
    }
    return (
      <p style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
        (array complejo — editar directamente en Supabase)
      </p>
    );
  }

  if (value !== null && typeof value === "object") {
    return (
      <ObjectField
        value={value as Record<string, JsonValue>}
        onChange={(v) => onChange(v)}
        depth={depth}
      />
    );
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return (
      <input
        type={typeof value === "number" ? "number" : "text"}
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          if (typeof value === "number") onChange(Number(raw));
          else onChange(raw === "true");
        }}
        style={{
          width: "100%",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "7px 12px",
          fontSize: 13,
          fontFamily: "var(--font-sans)",
          color: "var(--ink)",
          background: "var(--surface)",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    );
  }

  return null;
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({
  label,
  value,
  onChange,
}: {
  label: string;
  value: JsonValue;
  onChange: (v: JsonValue) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1.5px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          background: "var(--surface-2)",
          border: "none",
          borderBottom: open ? "1px solid var(--border)" : "none",
          cursor: "pointer",
          gap: 10,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            color: "var(--ink)",
            textAlign: "left",
          }}
        >
          {label.replace(/_/g, " ")}
        </span>
        <i
          className={`fa-solid fa-chevron-${open ? "up" : "down"}`}
          style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}
        />
      </button>
      {open && (
        <div style={{ padding: "16px 20px" }}>
          <FieldEditor value={value} onChange={onChange} depth={0} />
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  initialId: string | null;
  initialContent: Record<string, unknown> | null;
}

export default function GuiaVisualTab({ initialId, initialContent }: Props) {
  const [data, setData] = useState<Record<string, JsonValue>>(
    (initialContent as Record<string, JsonValue>) ?? {}
  );
  const [savedId, setSavedId] = useState<string | null>(initialId);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function updateKey(key: string, value: JsonValue) {
    setData((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await upsertVisualGuidelines(savedId, data as Record<string, unknown>);
      setSavedId(savedId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  const hasContent = Object.keys(data).length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 0 20px",
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
            Guía Visual de Marca
          </h2>
          <p
            style={{
              fontSize: 11,
              color: "var(--muted)",
              marginTop: 3,
              fontFamily: "var(--font-sans)",
            }}
          >
            Lineamientos visuales generados por el agente · edita y guarda los
            cambios
          </p>
        </div>
        {hasContent && (
          <button
            onClick={handleSave}
            disabled={isPending}
            style={{
              padding: "8px 20px",
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
              background: saved ? "#16a34a" : "var(--rose)",
              color: "#fff",
              border: "none",
              cursor: isPending ? "default" : "pointer",
              opacity: isPending ? 0.7 : 1,
              transition: "all 0.2s",
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
            ) : saved ? (
              <>
                <i className="fa-solid fa-check" style={{ fontSize: 11 }} />
                Guardado
              </>
            ) : (
              <>
                <i
                  className="fa-solid fa-floppy-disk"
                  style={{ fontSize: 11 }}
                />
                Guardar cambios
              </>
            )}
          </button>
        )}
      </div>

      {/* Content */}
      {!hasContent ? (
        <div
          style={{
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: 16,
            padding: "60px 20px",
            textAlign: "center",
          }}
        >
          <i
            className="fa-solid fa-palette"
            style={{
              fontSize: 32,
              color: "var(--border)",
              display: "block",
              marginBottom: 12,
            }}
          />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
            Sin guía visual disponible
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--muted)",
              marginTop: 4,
              maxWidth: 320,
              margin: "8px auto 0",
            }}
          >
            Ejecuta el agente de marca para generar los lineamientos visuales
            automáticamente.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Object.entries(data).map(([key, value]) => (
            <SectionCard
              key={key}
              label={key}
              value={value}
              onChange={(next) => updateKey(key, next)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
