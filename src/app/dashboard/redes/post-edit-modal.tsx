"use client";

import { useState, useRef, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { updatePost, approvePost, updatePostImages } from "./actions";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Post {
  id: string;
  plan_id: string;
  day_of_week: string | null;
  scheduled_at: string | null;
  platform: string | null;
  format: string | null;
  hook: string | null;
  caption_ig: string | null;
  caption_tiktok: string | null;
  hashtags_ig: string[] | null;
  hashtags_tiktok: string[] | null;
  visual_brief: string | null;
  image_suggestion: string | null;
  image_urls: string[] | null;
  blotato_post_id: string | null;
  status: string;
  created_at: string;
}

interface Props {
  post: Post;
  onClose: () => void;
  onUpdate: (updated: Post) => void;
  onPublish: (postId: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  both: "IG + TikTok",
};

const FORMAT_LABELS: Record<string, string> = {
  carrusel: "Carrusel",
  video: "Video",
  foto: "Foto",
};

function toLocalDT(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function uploadImageToStorage(file: File, postId: string): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${postId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("post-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) throw new Error(error.message);

  const { data: { publicUrl } } = supabase.storage
    .from("post-images")
    .getPublicUrl(path);

  return publicUrl;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 14px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "var(--font-sans)",
        background: active ? "var(--rose)" : "var(--border)",
        color: active ? "#fff" : "var(--muted)",
        border: "none",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--muted)",
          fontWeight: 600,
          fontFamily: "var(--font-sans)",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 13,
  fontFamily: "var(--font-sans)",
  color: "var(--ink)",
  background: "var(--surface)",
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  lineHeight: 1.6,
};

// ── Image uploader ─────────────────────────────────────────────────────────────

function ImageUploader({
  postId,
  format,
  imageUrls,
  onUrlsChange,
}: {
  postId: string;
  format: string | null;
  imageUrls: string[];
  onUrlsChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const isCarrusel = format === "carrusel";

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadImageToStorage(file, postId);
        newUrls.push(url);
      }
      const updated = isCarrusel ? [...imageUrls, ...newUrls] : [newUrls[0]];
      onUrlsChange(updated);
      await updatePostImages(postId, updated);
    } catch (e) {
      alert(`Error al subir imagen: ${e instanceof Error ? e.message : "Error desconocido"}`);
    } finally {
      setUploading(false);
    }
  }

  function moveUp(i: number) {
    if (i === 0) return;
    const arr = [...imageUrls];
    [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    onUrlsChange(arr);
    updatePostImages(postId, arr);
  }

  function moveDown(i: number) {
    if (i === imageUrls.length - 1) return;
    const arr = [...imageUrls];
    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
    onUrlsChange(arr);
    updatePostImages(postId, arr);
  }

  function remove(i: number) {
    const arr = imageUrls.filter((_, idx) => idx !== i);
    onUrlsChange(arr);
    updatePostImages(postId, arr);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Thumbnails */}
      {imageUrls.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {imageUrls.map((url, i) => (
            <div
              key={i}
              style={{
                position: "relative",
                width: 90,
                height: 90,
                borderRadius: 8,
                overflow: "hidden",
                border: "1.5px solid var(--border)",
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Imagen ${i + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {/* Controls */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: "rgba(0,0,0,0.55)",
                  display: "flex",
                  justifyContent: "center",
                  gap: 4,
                  padding: "4px 2px",
                }}
              >
                {isCarrusel && (
                  <>
                    <button
                      type="button"
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      style={thumbBtnStyle}
                      title="Mover izquierda"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(i)}
                      disabled={i === imageUrls.length - 1}
                      style={thumbBtnStyle}
                      title="Mover derecha"
                    >
                      →
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  style={{ ...thumbBtnStyle, color: "#fca5a5" }}
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
              {/* Index badge for carousel */}
              {isCarrusel && (
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    left: 4,
                    background: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 4,
                  }}
                >
                  {i + 1}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {(isCarrusel || imageUrls.length === 0) && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            border: "2px dashed var(--border)",
            borderRadius: 10,
            padding: "18px 12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            background: uploading ? "var(--surface-2)" : "var(--surface)",
            cursor: uploading ? "default" : "pointer",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => { if (!uploading) (e.currentTarget as HTMLElement).style.borderColor = "var(--rose)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
        >
          <i
            className={uploading ? "fa-solid fa-circle-notch fa-spin" : "fa-solid fa-cloud-arrow-up"}
            style={{ fontSize: 22, color: uploading ? "var(--rose)" : "var(--muted)" }}
          />
          <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
            {uploading
              ? "Subiendo..."
              : isCarrusel
              ? "Agregar imágenes (puedes seleccionar varias)"
              : "Subir imagen"}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple={isCarrusel}
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

const thumbBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#fff",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  padding: "0 2px",
  lineHeight: 1,
};

// ── Main modal ─────────────────────────────────────────────────────────────────

export default function PostEditModal({ post, onClose, onUpdate, onPublish }: Props) {
  const [platform, setPlatform] = useState(post.platform ?? "instagram");
  const [format, setFormat] = useState(post.format ?? "carrusel");
  const [scheduledAt, setScheduledAt] = useState(toLocalDT(post.scheduled_at));
  const [hook, setHook] = useState(post.hook ?? "");
  const [captionIg, setCaptionIg] = useState(post.caption_ig ?? "");
  const [captionTiktok, setCaptionTiktok] = useState(post.caption_tiktok ?? "");
  const [hashtagsIg, setHashtagsIg] = useState((post.hashtags_ig ?? []).join("\n"));
  const [hashtagsTiktok, setHashtagsTiktok] = useState((post.hashtags_tiktok ?? []).join("\n"));
  const [visualBrief, setVisualBrief] = useState(post.visual_brief ?? "");
  const [imageUrls, setImageUrls] = useState<string[]>(post.image_urls ?? []);
  const [isPending, startTransition] = useTransition();
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPublish =
    post.status === "approved" &&
    imageUrls.length > 0 &&
    !!scheduledAt;

  function buildFields() {
    return {
      platform,
      format,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      hook,
      caption_ig: captionIg,
      caption_tiktok: captionTiktok || null,
      hashtags_ig: hashtagsIg.split("\n").map((h) => h.trim()).filter(Boolean),
      hashtags_tiktok: hashtagsTiktok.split("\n").map((h) => h.trim()).filter(Boolean),
      visual_brief: visualBrief,
      image_urls: imageUrls,
    };
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        const fields = buildFields();
        await updatePost(post.id, fields);
        onUpdate({ ...post, ...fields });
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      try {
        const fields = buildFields();
        await updatePost(post.id, fields);
        await approvePost(post.id);
        onUpdate({ ...post, ...fields, status: "approved" });
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al aprobar");
      }
    });
  }

  async function handlePublish() {
    setError(null);
    setIsPublishing(true);
    try {
      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al publicar");
      onUpdate({ ...post, ...buildFields(), status: "published", blotato_post_id: data.blotato_post_id ?? null });
      onPublish(post.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al publicar");
    } finally {
      setIsPublishing(false);
    }
  }

  const DAY_LABEL: Record<string, string> = {
    lunes: "Lunes", martes: "Martes", miercoles: "Miércoles",
    jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 51,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 680,
            maxHeight: "92dvh",
            background: "var(--surface)",
            borderRadius: "20px 20px 0 0",
            display: "flex",
            flexDirection: "column",
            pointerEvents: "auto",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 24px 14px",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  color: "var(--ink)",
                  lineHeight: 1.2,
                }}
              >
                {post.day_of_week ? DAY_LABEL[post.day_of_week] ?? post.day_of_week : "Post extra"}
              </p>
              <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                <StatusBadge status={post.status} />
                {post.format && <FormatBadge format={post.format} />}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 34, height: 34,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                color: "var(--muted)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, flexShrink: 0,
              }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          {/* Body — scrollable */}
          <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Platform + Format */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Plataforma">
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                      <Pill key={k} label={v} active={platform === k} onClick={() => setPlatform(k)} />
                    ))}
                  </div>
                </Field>
                <Field label="Formato">
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {Object.entries(FORMAT_LABELS).map(([k, v]) => (
                      <Pill key={k} label={v} active={format === k} onClick={() => setFormat(k)} />
                    ))}
                  </div>
                </Field>
              </div>

              {/* Scheduled at */}
              <Field label="Fecha y hora de publicación">
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--rose)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--rose-light)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </Field>

              {/* Hook */}
              <Field label="Hook (primera línea / título del post)">
                <input
                  type="text"
                  value={hook}
                  onChange={(e) => setHook(e.target.value)}
                  placeholder="Ej: When the cake matches the vibe perfectly 🐾"
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--rose)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--rose-light)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </Field>

              {/* Caption IG */}
              <Field label="Caption Instagram">
                <textarea
                  value={captionIg}
                  onChange={(e) => setCaptionIg(e.target.value)}
                  rows={5}
                  placeholder="Caption completo para Instagram..."
                  style={textareaStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--rose)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--rose-light)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </Field>

              {/* Hashtags IG */}
              <Field label="Hashtags Instagram (uno por línea)">
                <textarea
                  value={hashtagsIg}
                  onChange={(e) => setHashtagsIg(e.target.value)}
                  rows={4}
                  placeholder="#customcake&#10;#montrealbakery&#10;#cookforfriendsntl"
                  style={{ ...textareaStyle, fontFamily: "monospace", fontSize: 12 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--rose)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--rose-light)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </Field>

              {/* TikTok (collapsible) */}
              <details style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <summary
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--muted)",
                    fontFamily: "var(--font-sans)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    background: "var(--surface-2)",
                    userSelect: "none",
                  }}
                >
                  TikTok (opcional)
                </summary>
                <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 14 }}>
                  <Field label="Caption TikTok">
                    <textarea
                      value={captionTiktok}
                      onChange={(e) => setCaptionTiktok(e.target.value)}
                      rows={3}
                      placeholder="Caption para TikTok..."
                      style={textareaStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--rose)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--rose-light)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                  </Field>
                  <Field label="Hashtags TikTok (uno por línea)">
                    <textarea
                      value={hashtagsTiktok}
                      onChange={(e) => setHashtagsTiktok(e.target.value)}
                      rows={3}
                      placeholder="#customcake&#10;#cakemontreal"
                      style={{ ...textareaStyle, fontFamily: "monospace", fontSize: 12 }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--rose)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--rose-light)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                  </Field>
                </div>
              </details>

              {/* Visual brief */}
              <Field label="Brief visual (descripción de la imagen ideal)">
                <textarea
                  value={visualBrief}
                  onChange={(e) => setVisualBrief(e.target.value)}
                  rows={3}
                  placeholder="Descripción de qué fotos usar y cómo componerlas..."
                  style={{ ...textareaStyle, fontSize: 12 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--rose)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--rose-light)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </Field>

              {/* Images */}
              <Field label={format === "carrusel" ? `Imágenes (${imageUrls.length} / orden = secuencia del carrusel)` : "Imagen"}>
                <ImageUploader
                  postId={post.id}
                  format={format}
                  imageUrls={imageUrls}
                  onUrlsChange={setImageUrls}
                />
                {post.image_suggestion && imageUrls.length === 0 && (
                  <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, fontStyle: "italic" }}>
                    Sugerencia: {post.image_suggestion}
                  </p>
                )}
              </Field>

              {/* Error */}
              {error && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fca5a5",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "#991b1b",
                  }}
                >
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: "14px 24px",
              borderTop: "1px solid var(--border)",
              flexShrink: 0,
              flexWrap: "wrap",
              background: "var(--surface)",
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 500,
                fontFamily: "var(--font-sans)", background: "transparent",
                color: "var(--muted)", border: "1px solid var(--border)", cursor: "pointer",
              }}
            >
              Cancelar
            </button>

            <button
              onClick={handleSave}
              disabled={isPending}
              style={{
                padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                fontFamily: "var(--font-sans)", background: "var(--border)",
                color: "var(--ink)", border: "none", cursor: "pointer", flex: 1,
                opacity: isPending ? 0.6 : 1,
              }}
            >
              {isPending ? "Guardando..." : "Guardar"}
            </button>

            {post.status === "draft" && (
              <button
                onClick={handleApprove}
                disabled={isPending}
                style={{
                  padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                  fontFamily: "var(--font-sans)", background: "#fef9c3",
                  color: "#854d0e", border: "1px solid #fde047", cursor: "pointer", flex: 1,
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                {isPending ? "Aprobando..." : "✓ Aprobar"}
              </button>
            )}

            <button
              onClick={handlePublish}
              disabled={!canPublish || isPublishing}
              title={
                !imageUrls.length
                  ? "Necesitas subir al menos una imagen"
                  : !scheduledAt
                  ? "Necesitas definir fecha y hora"
                  : post.status !== "approved"
                  ? "El post debe estar aprobado"
                  : ""
              }
              style={{
                padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 700,
                fontFamily: "var(--font-sans)",
                background: canPublish ? "var(--rose)" : "var(--border)",
                color: canPublish ? "#fff" : "var(--muted)",
                border: "none",
                cursor: canPublish && !isPublishing ? "pointer" : "not-allowed",
                flex: 1,
                opacity: isPublishing ? 0.7 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              {isPublishing ? (
                <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 11 }} /> Publicando...</>
              ) : (
                <><i className="fa-brands fa-instagram" style={{ fontSize: 12 }} /> Publicar</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Badge helpers (exported for use in posts-tab) ─────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; color: string }> = {
    draft:     { label: "Borrador",   bg: "var(--border)",  color: "var(--muted)" },
    approved:  { label: "Aprobado",   bg: "#fef9c3",        color: "#854d0e" },
    published: { label: "Publicado",  bg: "#dcfce7",        color: "#166534" },
  };
  const c = cfg[status] ?? cfg.draft;
  return (
    <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

export function FormatBadge({ format }: { format: string }) {
  const icon: Record<string, string> = { carrusel: "fa-images", video: "fa-video", foto: "fa-camera" };
  return (
    <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "var(--rose-light)", color: "var(--rose)", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <i className={`fa-solid ${icon[format] ?? "fa-image"}`} style={{ fontSize: 10 }} />
      {format}
    </span>
  );
}
