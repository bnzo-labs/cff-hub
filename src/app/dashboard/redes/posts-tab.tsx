"use client";

import React, { useState, useTransition, useEffect } from "react";
import { createWeeklyPlan, addCustomPost, deletePost } from "./actions";
import PostEditModal, { StatusBadge, FormatBadge } from "./post-edit-modal";
import type { Post } from "./post-edit-modal";

// ── Types ──────────────────────────────────────────────────────────────────────

interface WeeklyPlan {
  id: string;
  client_id: string;
  week_of: string;
  status: string;
  created_at: string;
}

interface Props {
  initialPlans: WeeklyPlan[];
  initialPosts: Post[];
}

// ── Date helpers ───────────────────────────────────────────────────────────────

function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function getCurrentMonday(): string {
  return getMondayOf(new Date().toISOString().split("T")[0]);
}

function weekLabel(monday: string): string {
  const mon = new Date(monday + "T12:00:00");
  const sun = new Date(monday + "T12:00:00");
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("es-CA", { day: "numeric", month: "short" });
  return `${fmt(mon)} – ${fmt(sun)}`;
}

function dayDate(monday: string, offset: number): string {
  const d = new Date(monday + "T12:00:00");
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("es-CA", { day: "numeric", month: "short" });
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"] as const;
const DAY_SHORT = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const DAY_LONG: Record<string, string> = {
  lunes:"Lunes", martes:"Martes", miercoles:"Miércoles",
  jueves:"Jueves", viernes:"Viernes", sabado:"Sábado", domingo:"Domingo",
};

// ── Media helpers ─────────────────────────────────────────────────────────────

function isVideo(url: string) {
  return /\.(mp4|webm|mov|avi|m4v)(\?|$)/i.test(url);
}

// ── Post preview modal ────────────────────────────────────────────────────────

function PostPreviewModal({
  post,
  onClose,
  onEdit,
  onDelete,
}: {
  post: Post;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const urls = post.image_urls ?? [];
  const [idx, setIdx] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const DAY_LABEL: Record<string, string> = {
    lunes: "Lunes", martes: "Martes", miercoles: "Miércoles",
    jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo",
  };

  function prev() { setIdx((i) => Math.max(0, i - 1)); }
  function next() { setIdx((i) => Math.min(urls.length - 1, i + 1)); }

  // keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const currentUrl = urls[idx] ?? null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 60,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 61,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            maxHeight: "92dvh",
            background: "var(--surface)",
            borderRadius: 20,
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            display: "flex",
            flexDirection: "column",
            pointerEvents: "auto",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px 12px",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink)", lineHeight: 1.2 }}>
                {post.day_of_week ? DAY_LABEL[post.day_of_week] ?? post.day_of_week : "Post extra"}
              </p>
              <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                <StatusBadge status={post.status} />
                {post.format && <FormatBadge format={post.format} />}
                {post.scheduled_at && (
                  <span style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center" }}>
                    <i className="fa-regular fa-clock" style={{ marginRight: 3 }} />
                    {new Date(post.scheduled_at).toLocaleString("es-CA", {
                      month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-2)", color: "var(--muted)",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 14, flexShrink: 0,
              }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          {/* Media area */}
          {urls.length > 0 ? (
            <div style={{ position: "relative", background: "#000", flexShrink: 0 }}>
              {/* Media */}
              <div style={{ aspectRatio: "1", maxHeight: "55dvh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {currentUrl && isVideo(currentUrl) ? (
                  <video
                    key={currentUrl}
                    src={currentUrl}
                    controls
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : currentUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={currentUrl}
                    src={currentUrl}
                    alt={`Slide ${idx + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : null}
              </div>

              {/* Nav arrows */}
              {urls.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    disabled={idx === 0}
                    style={{
                      position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                      width: 36, height: 36, borderRadius: "50%",
                      background: "rgba(0,0,0,0.5)", border: "none",
                      color: "#fff", cursor: idx === 0 ? "default" : "pointer",
                      opacity: idx === 0 ? 0.3 : 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14,
                    }}
                  >
                    <i className="fa-solid fa-chevron-left" />
                  </button>
                  <button
                    onClick={next}
                    disabled={idx === urls.length - 1}
                    style={{
                      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                      width: 36, height: 36, borderRadius: "50%",
                      background: "rgba(0,0,0,0.5)", border: "none",
                      color: "#fff", cursor: idx === urls.length - 1 ? "default" : "pointer",
                      opacity: idx === urls.length - 1 ? 0.3 : 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14,
                    }}
                  >
                    <i className="fa-solid fa-chevron-right" />
                  </button>
                </>
              )}

              {/* Dots */}
              {urls.length > 1 && (
                <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 5 }}>
                  {urls.map((_, di) => (
                    <button
                      key={di}
                      onClick={() => setIdx(di)}
                      style={{
                        width: di === idx ? 18 : 6, height: 6,
                        borderRadius: 3, border: "none",
                        background: di === idx ? "#fff" : "rgba(255,255,255,0.5)",
                        cursor: "pointer",
                        transition: "width 0.2s, background 0.2s",
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              height: 200, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              background: "var(--surface-2)", gap: 8, flexShrink: 0,
            }}>
              <i className="fa-solid fa-camera" style={{ fontSize: 32, color: "var(--border)" }} />
              <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Sin imágenes</p>
              {post.image_suggestion && (
                <p style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic", margin: "0 16px", textAlign: "center" }}>
                  {post.image_suggestion}
                </p>
              )}
            </div>
          )}

          {/* Content */}
          <div style={{ overflowY: "auto", flex: 1, padding: "14px 18px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {post.hook && (
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: 0, lineHeight: 1.4 }}>
                  {post.hook}
                </p>
              )}
              {post.caption_ig && (
                <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.6, whiteSpace: "pre-line" }}>
                  {post.caption_ig}
                </p>
              )}
              {post.hashtags_ig && post.hashtags_ig.length > 0 && (
                <p style={{ fontSize: 12, color: "var(--rose)", margin: 0, lineHeight: 1.8, wordBreak: "break-word" }}>
                  {post.hashtags_ig.join(" ")}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", flexShrink: 0, display: "flex", gap: 8 }}>
            {confirmDelete ? (
              <>
                <p style={{ fontSize: 12, color: "#991b1b", flex: 1, alignSelf: "center", margin: 0 }}>
                  ¿Eliminar este post?
                </p>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ padding: "9px 14px", borderRadius: 9, fontSize: 13, fontWeight: 500, fontFamily: "var(--font-sans)", background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    await deletePost(post.id);
                    onDelete();
                  }}
                  style={{ padding: "9px 16px", borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "var(--font-sans)", background: "#dc2626", color: "#fff", border: "none", cursor: "pointer", opacity: isDeleting ? 0.6 : 1 }}
                >
                  {isDeleting ? "Eliminando..." : "Sí, eliminar"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    padding: "10px 14px", borderRadius: 10,
                    fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)",
                    background: "transparent", color: "#dc2626",
                    border: "1px solid #fca5a5", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <i className="fa-solid fa-trash" style={{ fontSize: 12 }} />
                </button>
                <button
                  onClick={onEdit}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 10,
                    fontSize: 13, fontWeight: 700, fontFamily: "var(--font-sans)",
                    background: "var(--rose)", color: "#fff",
                    border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <i className="fa-solid fa-pen" style={{ fontSize: 12 }} />
                  Editar post
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Post card ──────────────────────────────────────────────────────────────────

function PostCard({
  post,
  dayLabel,
  dateLabel,
  compact,
  onPreview,
}: {
  post: Post | null;
  dayLabel: string;
  dateLabel: string;
  compact: boolean;
  onPreview: (p: Post) => void;
}) {
  const isEmpty = !post;

  return (
    <div
      onClick={post ? () => onPreview(post) : undefined}
      style={{
        background: isEmpty ? "var(--surface-2)" : "var(--surface)",
        border: isEmpty
          ? "1.5px dashed var(--border)"
          : post!.status === "published"
          ? "1.5px solid #86efac"
          : post!.status === "approved"
          ? "1.5px solid #fde047"
          : "1.5px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: compact ? 180 : "auto",
        cursor: post ? "pointer" : "default",
        transition: "box-shadow 0.15s, transform 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!post) return;
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
        (e.currentTarget as HTMLElement).style.transform = "none";
      }}
    >
      {/* Day header */}
      <div
        style={{
          padding: compact ? "8px 10px 6px" : "10px 14px 8px",
          borderBottom: "1px solid var(--border)",
          background: isEmpty ? "transparent" : "var(--surface-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <div>
          <span
            style={{
              fontSize: compact ? 12 : 13,
              fontWeight: 700,
              color: "var(--ink)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {compact ? dayLabel : `${dayLabel} · ${dateLabel}`}
          </span>
          {compact && (
            <p style={{ fontSize: 10, color: "var(--muted)", margin: 0 }}>{dateLabel}</p>
          )}
        </div>
        {post && <StatusBadge status={post.status} />}
      </div>

      {/* Body */}
      {isEmpty ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
          }}
        >
          <p
            style={{
              fontSize: 11,
              color: "var(--muted)",
              textAlign: "center",
              fontStyle: "italic",
            }}
          >
            Sin post
          </p>
        </div>
      ) : (
        <>
          {/* Image thumbnail or placeholder */}
          {post!.image_urls && post!.image_urls.length > 0 ? (
            <div style={{ position: "relative", height: compact ? 80 : 100, overflow: "hidden", flexShrink: 0 }}>
              {isVideo(post!.image_urls[0]) ? (
                <div style={{ width: "100%", height: "100%", background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="fa-solid fa-play" style={{ fontSize: 24, color: "#fff" }} />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post!.image_urls[0]}
                  alt="Preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
              {post!.format === "carrusel" && post!.image_urls.length > 1 && (
                <span
                  style={{
                    position: "absolute", top: 4, right: 4,
                    background: "rgba(0,0,0,0.6)", color: "#fff",
                    fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                  }}
                >
                  1/{post!.image_urls.length}
                </span>
              )}
            </div>
          ) : (
            <div
              style={{
                height: compact ? 56 : 70,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: "var(--surface-2)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <i className="fa-solid fa-camera" style={{ fontSize: 16, color: "var(--border)" }} />
            </div>
          )}

          <div style={{ padding: compact ? "8px 10px" : "10px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            {post!.format && <FormatBadge format={post!.format} />}

            {post!.hook && (
              <p
                style={{
                  fontSize: compact ? 11 : 12,
                  color: "var(--ink)",
                  fontWeight: 500,
                  lineHeight: 1.4,
                  display: "-webkit-box",
                  WebkitLineClamp: compact ? 2 : 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  margin: 0,
                }}
              >
                {post!.hook}
              </p>
            )}

            {!compact && post!.scheduled_at && (
              <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>
                <i className="fa-regular fa-clock" style={{ marginRight: 4 }} />
                {new Date(post!.scheduled_at).toLocaleTimeString("es-CA", {
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            )}

            {!compact && (!post!.image_urls || post!.image_urls.length === 0) && (
              <p style={{ fontSize: 11, color: "#b45309", margin: 0 }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 4 }} />
                Sin imagen
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Custom post modal ─────────────────────────────────────────────────────────

function CustomPostModal({
  planId,
  onClose,
  onCreated,
}: {
  planId: string;
  onClose: () => void;
  onCreated: (post: Post) => void;
}) {
  const [instructions, setInstructions] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!instructions.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/agents/genaro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: "cook-for-friends-mtl",
            custom_instructions: instructions,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error del agente");
        const [postData] = data.posts as Post[];
        const created = await addCustomPost(planId, postData as Parameters<typeof addCustomPost>[1]);
        onCreated(created as Post);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido");
      }
    });
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.4)" }}
      />
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 51,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16, pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "100%", maxWidth: 500,
            background: "var(--surface)", borderRadius: 18,
            boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
            pointerEvents: "auto", overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "18px 22px 14px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--ink)" }}>
              Pedir post extra
            </h3>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--surface-2)", color: "var(--muted)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
          <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
              Dile a Genaro qué post quieres en lenguaje natural. Se agregará al plan como borrador.
            </p>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              placeholder='Ej: "Quiero un post de las marquesas de maracuyá para este viernes, tono misterioso para hacer teasing"'
              style={{
                width: "100%", border: "1px solid var(--border)", borderRadius: 10,
                padding: "10px 12px", fontSize: 13, fontFamily: "var(--font-sans)",
                color: "var(--ink)", background: "var(--surface)",
                resize: "vertical", outline: "none", lineHeight: 1.6, boxSizing: "border-box",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--rose)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--rose-light)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
            />
            {error && <p style={{ fontSize: 12, color: "#991b1b", margin: 0 }}>{error}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={onClose}
                style={{ padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 500, fontFamily: "var(--font-sans)", background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!instructions.trim() || isPending}
                style={{
                  padding: "9px 20px", borderRadius: 9, fontSize: 13, fontWeight: 700,
                  fontFamily: "var(--font-sans)", background: "var(--rose)", color: "#fff",
                  border: "none", cursor: isPending ? "default" : "pointer",
                  opacity: isPending ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {isPending ? (
                  <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 11 }} /> Generando...</>
                ) : (
                  <><i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 11 }} /> Generar post</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PostsTab({ initialPlans, initialPosts }: Props) {
  const [weekOf, setWeekOf] = useState(getCurrentMonday());
  const [plans, setPlans]   = useState<WeeklyPlan[]>(initialPlans);
  const [allPosts, setAllPosts] = useState<Post[]>(initialPosts);
  const [previewPost, setPreviewPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const currentPlan = plans.find((p) => p.week_of === weekOf) ?? null;
  const currentPosts = allPosts.filter((p) => p.plan_id === currentPlan?.id);

  const postsByDay = Object.fromEntries(
    DAYS.map((day) => [day, currentPosts.find((p) => p.day_of_week === day) ?? null])
  ) as Record<typeof DAYS[number], Post | null>;

  const extraPosts = currentPosts.filter((p) => !p.day_of_week);

  function prevWeek() { setWeekOf(addDays(weekOf, -7)); }
  function nextWeek() { setWeekOf(addDays(weekOf, 7)); }

  function handleUpdatePost(updated: Post) {
    setAllPosts((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    // If the preview is showing this post, update it too
    setPreviewPost((prev) => prev?.id === updated.id ? updated : prev);
  }

  async function handleGeneratePlan() {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/agents/genaro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: "cook-for-friends-mtl", week_of: weekOf }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error del agente");

      startTransition(async () => {
        const result = await createWeeklyPlan(weekOf, data.posts);
        setPlans((prev) => [result.plan, ...prev]);
        setAllPosts((prev) => [...prev, ...(result.posts as Post[])]);
      });
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "Error al generar el plan");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleCustomPostCreated(post: Post) {
    setAllPosts((prev) => [...prev, post]);
  }

  function handleOpenEdit(post: Post) {
    setPreviewPost(null);
    setEditingPost(post);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Week navigation bar ── */}
      <div
        style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap", gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={prevWeek} style={navBtnStyle} aria-label="Semana anterior">
            <i className="fa-solid fa-chevron-left" />
          </button>
          <span
            style={{
              fontSize: 14, fontWeight: 600, color: "var(--ink)",
              fontFamily: "var(--font-sans)", minWidth: 160, textAlign: "center",
            }}
          >
            {weekLabel(weekOf)}
          </span>
          <button onClick={nextWeek} style={navBtnStyle} aria-label="Semana siguiente">
            <i className="fa-solid fa-chevron-right" />
          </button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {currentPlan && (
            <button
              onClick={() => setShowCustomModal(true)}
              style={{
                padding: "8px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                fontFamily: "var(--font-sans)", background: "var(--border)",
                color: "var(--ink)", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 11 }} />
              Post extra
            </button>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {generateError && (
        <div
          style={{
            background: "#fef2f2", border: "1px solid #fca5a5",
            borderRadius: 10, padding: "10px 16px",
            fontSize: 13, color: "#991b1b",
          }}
        >
          {generateError}
        </div>
      )}

      {/* ── No plan: empty state ── */}
      {!currentPlan && (
        <div
          style={{
            border: "2px dashed var(--border)", borderRadius: 16,
            padding: "48px 24px", textAlign: "center",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
          }}
        >
          <i className="fa-solid fa-calendar-week" style={{ fontSize: 36, color: "var(--border)" }} />
          <div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-display)", marginBottom: 4 }}>
              Sin plan para esta semana
            </p>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              Genera el plan con Genaro para ver los 7 posts
            </p>
          </div>
          <button
            onClick={handleGeneratePlan}
            disabled={isGenerating}
            style={{
              padding: "12px 28px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              fontFamily: "var(--font-sans)", background: "var(--rose)", color: "#fff",
              border: "none", cursor: isGenerating ? "default" : "pointer",
              opacity: isGenerating ? 0.7 : 1,
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            {isGenerating ? (
              <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 13 }} /> Generando plan...</>
            ) : (
              <><i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 13 }} /> Generar plan semanal</>
            )}
          </button>
        </div>
      )}

      {/* ── Plan exists: responsive grid ── */}
      {currentPlan && (
        <>
          <PlanStats posts={currentPosts} />

          <div
            className="grid grid-cols-1 md:grid-cols-7"
            style={{ gap: 10 }}
          >
            {DAYS.map((day, i) => (
              <PostCard
                key={day}
                post={postsByDay[day]}
                dayLabel={isMobile ? DAY_LONG[day] : DAY_SHORT[i]}
                dateLabel={dayDate(weekOf, i)}
                compact={!isMobile}
                onPreview={setPreviewPost}
              />
            ))}
          </div>

          {/* Extra posts (on-demand, no day assigned) */}
          {extraPosts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p
                style={{
                  fontSize: 12, fontWeight: 700, color: "var(--muted)",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Posts extra
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                {extraPosts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    dayLabel="Post extra"
                    dateLabel="Sin fecha"
                    compact={false}
                    onPreview={setPreviewPost}
                  />
                ))}
              </div>
            </div>
          )}

        </>
      )}

      {/* ── Preview modal ── */}
      {previewPost && (
        <PostPreviewModal
          post={previewPost}
          onClose={() => setPreviewPost(null)}
          onEdit={() => handleOpenEdit(previewPost)}
          onDelete={() => {
            setAllPosts((prev) => prev.filter((p) => p.id !== previewPost.id));
            setPreviewPost(null);
          }}
        />
      )}

      {/* ── Edit modal ── */}
      {editingPost && (
        <PostEditModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onUpdate={handleUpdatePost}
          onPublish={() => {}}
        />
      )}

      {/* ── Custom post modal ── */}
      {showCustomModal && currentPlan && (
        <CustomPostModal
          planId={currentPlan.id}
          onClose={() => setShowCustomModal(false)}
          onCreated={handleCustomPostCreated}
        />
      )}
    </div>
  );
}

// ── Plan stats bar ─────────────────────────────────────────────────────────────

function PlanStats({ posts }: { posts: Post[] }) {
  const total     = posts.length;
  const draft     = posts.filter((p) => p.status === "draft").length;
  const approved  = posts.filter((p) => p.status === "approved").length;
  const published = posts.filter((p) => p.status === "published").length;
  const withImage = posts.filter((p) => p.image_urls && p.image_urls.length > 0).length;

  return (
    <div
      style={{
        background: "var(--surface-2)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "12px 18px",
        display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center",
      }}
    >
      <Stat label="Total"      value={String(total)} />
      <Stat label="Borradores" value={String(draft)}     color="var(--muted)" />
      <Stat label="Aprobados"  value={String(approved)}  color="#854d0e" />
      <Stat label="Publicados" value={String(published)} color="#166534" />
      <Stat label="Con imagen" value={`${withImage}/${total}`} color="var(--rose)" />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "var(--font-sans)", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: color ?? "var(--ink)", fontFamily: "var(--font-display)", lineHeight: 1 }}>{value}</span>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface)", color: "var(--muted)",
  cursor: "pointer", display: "flex",
  alignItems: "center", justifyContent: "center",
  fontSize: 13,
};
