"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type Anthropic from "@anthropic-ai/sdk";

// ── Types ────────────────────────────────────────────────────────────────────

type DisplayMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isThinking?: boolean;
};

type PendingConfirmation = {
  toolUseId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  description: string;
};

type SSEEvent =
  | { type: "text"; content: string }
  | { type: "thinking" }
  | { type: "confirmation_required"; toolUseId: string; toolName: string; toolInput: Record<string, unknown>; description: string }
  | { type: "history_update"; messages: Anthropic.MessageParam[] }
  | { type: "done" }
  | { type: "error"; message: string };

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2);
}

async function readSSEStream(
  response: Response,
  onEvent: (event: SSEEvent) => void
) {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by \n\n
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data: ")) continue;
        try {
          onEvent(JSON.parse(line.slice(6)));
        } catch { /* ignore malformed lines */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ── Chat Widget ───────────────────────────────────────────────────────────────

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [apiHistory, setApiHistory]         = useState<Anthropic.MessageParam[]>([]);
  const [inputValue, setInputValue]         = useState("");
  const [isStreaming, setIsStreaming]        = useState(false);
  const [pending, setPending]               = useState<PendingConfirmation | null>(null);
  const [pendingHistory, setPendingHistory] = useState<Anthropic.MessageParam[] | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages, pending]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // ── Stream handler ─────────────────────────────────────────────────────────

  const handleStream = useCallback((onEvent: (h: SSEEvent) => void) => {
    return (event: SSEEvent) => {
      onEvent(event);

      if (event.type === "text") {
        setDisplayMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = { ...last, content: last.content + event.content, isThinking: false };
          }
          return next;
        });

      } else if (event.type === "thinking") {
        // Claude is executing a read tool — show a fresh thinking bubble
        setDisplayMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          // Only add thinking if the last assistant message has content (it already said something)
          if (last?.role === "assistant" && last.content && !last.isThinking) {
            next.push({ id: uid(), role: "assistant", content: "", isThinking: true });
          }
          return next;
        });

      } else if (event.type === "confirmation_required") {
        setPending({
          toolUseId:   event.toolUseId,
          toolName:    event.toolName,
          toolInput:   event.toolInput,
          description: event.description,
        });
        // Finalize the streaming assistant message
        setDisplayMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = { ...last, isThinking: false };
          }
          return next;
        });

      } else if (event.type === "history_update") {
        setApiHistory(event.messages);
        if (event.type === "history_update") setPendingHistory(event.messages);

      } else if (event.type === "done") {
        setDisplayMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = { ...last, isThinking: false };
          }
          return next;
        });
        setIsStreaming(false);
      }
    };
  }, []);

  // ── Send message ───────────────────────────────────────────────────────────

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return;

    const userMsg: DisplayMessage   = { id: uid(), role: "user", content: text };
    const assistantMsg: DisplayMessage = { id: uid(), role: "assistant", content: "", isThinking: true };

    const newHistory: Anthropic.MessageParam[] = [
      ...apiHistory,
      { role: "user", content: text },
    ];

    setDisplayMessages((prev) => [...prev, userMsg, assistantMsg]);
    setApiHistory(newHistory);
    setInputValue("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory }),
      });
      await readSSEStream(res, handleStream(() => {}));
    } catch {
      setDisplayMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = { ...last, content: "Ocurrió un error. Intenta de nuevo.", isThinking: false };
        }
        return next;
      });
      setIsStreaming(false);
    }
  }

  // ── Confirm write action ───────────────────────────────────────────────────

  async function confirmAction() {
    if (!pending || !pendingHistory) return;

    const assistantMsg: DisplayMessage = { id: uid(), role: "assistant", content: "", isThinking: true };
    setDisplayMessages((prev) => [...prev, assistantMsg]);
    setIsStreaming(true);
    const confirmedPending = pending;
    setPending(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: pendingHistory,
          pendingExecution: {
            toolUseId: confirmedPending.toolUseId,
            toolName:  confirmedPending.toolName,
            toolInput: confirmedPending.toolInput,
          },
        }),
      });
      await readSSEStream(res, handleStream(() => {}));
    } catch {
      setDisplayMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = { ...last, content: "Error al ejecutar la acción.", isThinking: false };
        }
        return next;
      });
      setIsStreaming(false);
    } finally {
      setPendingHistory(null);
    }
  }

  function cancelAction() {
    setPending(null);
    setPendingHistory(null);
    setDisplayMessages((prev) => [
      ...prev,
      { id: uid(), role: "assistant", content: "De acuerdo, acción cancelada. ¿Puedo ayudarte con algo más?" },
    ]);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: "fixed", bottom: 16, right: 16, zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>

      {/* ── Chat panel ── */}
      {isOpen && (
        <div
          style={{
            width: "min(360px, calc(100vw - 32px))",
            height: "min(520px, calc(100dvh - 120px))",
            marginBottom: 12,
            display: "flex",
            flexDirection: "column",
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: 20,
            boxShadow: "var(--shadow-lg)",
            overflow: "hidden",
            animation: "slideUp 0.2s ease",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "16px 16px 12px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface-2)",
            flexShrink: 0,
            position: "relative",
          }}>
            <button
              onClick={() => setIsOpen(false)}
              style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 20, lineHeight: 1, padding: 4 }}
            >
              ×
            </button>
            <img
              src="/hello.gif"
              alt="Muffi"
              style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", marginBottom: 8 }}
            />
            <p style={{ fontFamily: "var(--font-display)", color: "var(--ink)", fontSize: 16, lineHeight: 1, marginBottom: 3 }}>Muffi</p>
            <p style={{ color: "var(--muted)", fontSize: 11, fontFamily: "var(--font-sans)" }}>
              {isStreaming ? "Escribiendo…" : "Asistente CFF"}
            </p>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {displayMessages.length === 0 && (
              <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", marginTop: 40, fontFamily: "var(--font-sans)", lineHeight: 1.6 }}>
                <img src="/hello.gif" alt="Muffi" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", marginBottom: 8 }} />
                <p style={{ fontWeight: 600, color: "var(--ink)" }}>¡Hola! Soy Muffi</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>
                  Pregúntame sobre tus clientes, pedidos,<br />finanzas o cursos.
                </p>
              </div>
            )}

            {displayMessages.map((msg) => (
              <div
                key={msg.id}
                style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}
              >
                <div style={{
                  maxWidth: "82%",
                  padding: "9px 13px",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user" ? "var(--rose)" : "var(--surface-2)",
                  color: msg.role === "user" ? "#fff" : "var(--ink)",
                  fontSize: 13,
                  lineHeight: 1.55,
                  fontFamily: "var(--font-sans)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {msg.isThinking && !msg.content ? (
                    <span style={{ opacity: 0.5 }}>
                      <ThinkingDots />
                    </span>
                  ) : (
                    <>
                      {msg.content}
                      {isStreaming && msg.isThinking === false && msg.content &&
                        msg === displayMessages[displayMessages.length - 1] && (
                        <span style={{ opacity: 0.4, animation: "blink 1s infinite" }}> ▌</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Confirmation card */}
            {pending && (
              <div style={{
                background: "#fef9ec",
                border: "1.5px solid #f8aa40",
                borderRadius: 12,
                padding: "12px 14px",
                fontFamily: "var(--font-sans)",
              }}>
                <p style={{ color: "#b07010", fontWeight: 700, fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  ⚠ Confirmar acción
                </p>
                <p style={{ color: "var(--ink)", fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
                  {pending.description}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={confirmAction}
                    style={{
                      background: "var(--rose)", color: "#fff",
                      border: "none", borderRadius: 8,
                      padding: "6px 14px", fontSize: 12, fontWeight: 700,
                      cursor: "pointer", fontFamily: "var(--font-sans)",
                    }}
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={cancelAction}
                    style={{
                      background: "var(--surface)", color: "var(--muted)",
                      border: "1.5px solid var(--border)", borderRadius: 8,
                      padding: "6px 14px", fontSize: 12, fontWeight: 700,
                      cursor: "pointer", fontFamily: "var(--font-sans)",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "12px 14px",
            borderTop: "1px solid var(--border)",
            display: "flex", gap: 8,
            flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(inputValue);
                }
              }}
              placeholder={isStreaming ? "Muffi está respondiendo…" : "Pregunta algo…"}
              disabled={isStreaming}
              style={{
                flex: 1,
                border: "1.5px solid var(--border)",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 13,
                fontFamily: "var(--font-sans)",
                background: isStreaming ? "var(--surface-2)" : "var(--surface)",
                color: "var(--ink)",
                outline: "none",
                transition: "border-color 0.15s ease",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--rose)"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "var(--border)"; }}
            />
            <button
              onClick={() => sendMessage(inputValue)}
              disabled={isStreaming || !inputValue.trim()}
              style={{
                background: "var(--rose)", color: "#fff",
                border: "none", borderRadius: 10,
                width: 36, height: 36,
                flexShrink: 0,
                cursor: isStreaming || !inputValue.trim() ? "not-allowed" : "pointer",
                opacity: isStreaming || !inputValue.trim() ? 0.45 : 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, transition: "opacity 0.15s ease",
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* ── Floating muffin button ── */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        style={{
          width: 80, height: 80,
          borderRadius: "50%",
          background: "var(--surface)",
          border: "2px solid var(--border)",
          cursor: "pointer",
          padding: 6,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "var(--shadow-lg)",
          transition: "transform 0.2s ease",
          transform: isOpen ? "scale(0.92)" : "scale(1)",
        }}
        onMouseEnter={(e) => { if (!isOpen) (e.currentTarget as HTMLElement).style.transform = "scale(1.08)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = isOpen ? "scale(0.92)" : "scale(1)"; }}
        title="Abrir asistente Muffi"
      >
        <img
          src={isOpen ? "/hello.gif" : "/sleeping.gif"}
          alt="Muffi"
          style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
        />
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%           { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

// ── Thinking dots animation ────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center", height: 16 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 5, height: 5,
            borderRadius: "50%",
            background: "var(--muted)",
            display: "inline-block",
            animation: `bounce 1.2s ease infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </span>
  );
}
