import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic();

const CLIENT = "Cook for Friends Mtl";

// ── Date helpers ─────────────────────────────────────────────────────────────

function getNextMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getWeekDates(startMonday: Date): Array<{ name: string; date: string }> {
  const dayNames = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
  return dayNames.map((name, i) => {
    const d = new Date(startMonday);
    d.setDate(d.getDate() + i);
    return { name, date: formatDate(d) };
  });
}

// ── Load knowledge context from Supabase ─────────────────────────────────────

interface Inputs {
  brandKnowledge: string | null;
  priorities: string | null;
  memory: Record<string, unknown> | null;
  trends: string | null;
  guidelines: Record<string, unknown> | null;
}

async function loadInputs(): Promise<Inputs> {
  const supabase = await createClient();

  const [brandDoc, prioritiesDoc, analyticsRow, trendsRow, guidelinesRow] = await Promise.all([
    supabase
      .from("social_brand_docs")
      .select("content")
      .eq("type", "brand_knowledge")
      .single(),
    supabase
      .from("social_brand_docs")
      .select("content")
      .eq("type", "priorities")
      .single(),
    supabase
      .from("social_analytics_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("agent_outputs")
      .select("content_text")
      .eq("type", "trends_report")
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("agent_outputs")
      .select("content")
      .eq("type", "visual_guidelines")
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  return {
    brandKnowledge: brandDoc.data?.content ?? null,
    priorities: prioritiesDoc.data?.content ?? null,
    memory: analyticsRow.data ? (analyticsRow.data as Record<string, unknown>) : null,
    trends: trendsRow.data?.content_text ?? null,
    guidelines: guidelinesRow.data?.content
      ? (guidelinesRow.data.content as Record<string, unknown>)
      : null,
  };
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return "Eres un estratega de contenido especializado en redes sociales para negocios latinoamericanos.";
}

// ── User prompt builder ──────────────────────────────────────────────────────

function buildUserPrompt(
  inputs: Inputs,
  weekDates: ReturnType<typeof getWeekDates>
): string {
  const weekStart = weekDates[0].date;
  const weekEnd = weekDates[6].date;

  const guidelinesSection = inputs.guidelines
    ? `## GUIDELINES VISUALES — DORA
${JSON.stringify(inputs.guidelines, null, 2)}

---

`
    : "";

  return `Genera el plan de contenido semanal para ${CLIENT}.
Semana: ${weekStart} al ${weekEnd}

---

${guidelinesSection}## CONOCIMIENTO DE MARCA
${inputs.brandKnowledge || "No disponible."}

---

## PRIORIDADES Y CAMPAÑAS ACTIVAS
${inputs.priorities || "No disponible."}

---

## MEMORIA — QUÉ FUNCIONA Y QUÉ NO (datos reales de Instagram)
${inputs.memory ? JSON.stringify(inputs.memory, null, 2) : "No disponible."}

---

## TENDENCIAS DE LA SEMANA
${inputs.trends || "No disponible."}

---

## Reglas de escritura — OBLIGATORIAS

El copy debe sonar como una persona real, no como una IA. Estas reglas aplican a TODOS los captions sin excepción.

### Prohibido en captions
- El guión largo "—" (em dash). Nunca. Usar punto, coma, o reescribir la frase.
- Frases genéricas de IA: "dive into", "it's not just X, it's Y", "the magic is in the details", "elevate your", "crafted with care", "journey", "unleash", "transform your", "game-changer".
- Listas con flechas tipo "→ Item 1 / → Item 2" en posts emocionales o de comunidad.
- Dos puntos seguidos de lista en hooks de apertura.
- Signos de exclamación en exceso (máximo 1 por caption).

### Cómo debe sonar
- Como Carolina hablando a una amiga, no como una marca corporativa.
- Oraciones cortas. Respiración real. Pausas naturales.
- Si el caption en inglés, que suene como alguien bilingüe que vive en Montreal, no como un copy writer de NYC.
- El humor y la calidez van antes que la perfección gramatical.

---

## INSTRUCCIONES

Genera exactamente 7 posts, uno por día (lunes a domingo).
Sigue la distribución semanal del SKILL y respeta TODAS las restricciones de memory.json.

Para image_suggestion: describe en 1-2 líneas el tipo de imagen ideal para el post.
Sé específico sobre el producto, encuadre, ángulo y luz — sin referenciar archivos.

Devuelve ÚNICAMENTE un bloque JSON válido con esta estructura exacta:

\`\`\`json
{
  "week_start": "${weekStart}",
  "week_end": "${weekEnd}",
  "client": "${CLIENT}",
  "generated_at": "${new Date().toISOString()}",
  "posts": [
    {
      "day": "lunes",
      "date": "${weekDates[0].date}",
      "platform": "instagram",
      "objective": "conversión | autoridad | comunidad | reach",
      "format": "carrusel | reel | foto | story",
      "duration_seconds": null,
      "optimal_time": "19:00",
      "hook": "primeras palabras o frase de apertura",
      "hook_zone": "bottom | top | center",
      "font_style": "bold_sans | serif | display",
      "caption_instagram": "caption completo listo para copiar y pegar",
      "caption_tiktok": "versión corta máximo 150 caracteres",
      "hashtags_ig": ["hashtag1", "hashtag2"],
      "hashtags_tiktok": ["hashtag1", "hashtag2"],
      "visual_brief": "descripción exacta de qué mostrar en el carrusel, slide por slide",
      "image_suggestion": "descripción del tipo de imagen ideal: producto, encuadre, ángulo, luz",
      "strategic_reason": "por qué este post en este día"
    }
  ]
}
\`\`\`

Solo el bloque JSON. Sin texto antes ni después.`;
}

// ── Save plan to Supabase ────────────────────────────────────────────────────

const DAY_MAP: Record<string, string> = {
  miércoles: "miercoles",
  sábado: "sabado",
};

const FORMAT_MAP: Record<string, string> = {
  reel: "video",
  story: "foto",
  carrusel: "carrusel",
  foto: "foto",
  video: "video",
};

interface GenaroPost {
  day: string;
  date: string;
  platform: string;
  format: string;
  hook: string;
  caption_instagram: string;
  caption_tiktok: string;
  hashtags_ig: string[];
  hashtags_tiktok: string[];
  visual_brief: string;
  image_suggestion: string;
}

interface WeeklyPlan {
  week_start: string;
  posts: GenaroPost[];
}

async function savePlanToDb(plan: WeeklyPlan) {
  const supabase = await createClient();
  const weekOf = plan.week_start;

  // Upsert the weekly plan row (idempotent on client_id + week_of)
  const { data: planRow, error: planErr } = await supabase
    .from("weekly_plans")
    .upsert(
      { client_id: "cook-for-friends-mtl", week_of: weekOf, status: "draft" },
      { onConflict: "client_id,week_of" }
    )
    .select()
    .single();

  if (planErr) throw new Error(`weekly_plans upsert: ${planErr.message}`);

  // Delete existing posts for this plan before re-inserting
  await supabase.from("posts").delete().eq("plan_id", planRow.id);

  const rows = plan.posts.map((p) => ({
    plan_id: planRow.id,
    day_of_week: DAY_MAP[p.day] ?? p.day,
    scheduled_at: p.date ? new Date(p.date).toISOString() : null,
    platform: ["instagram", "tiktok", "both"].includes(p.platform)
      ? p.platform
      : "instagram",
    format: FORMAT_MAP[p.format] ?? null,
    hook: p.hook ?? null,
    caption_ig: p.caption_instagram ?? null,
    caption_tiktok: p.caption_tiktok ?? null,
    hashtags_ig: p.hashtags_ig ?? [],
    hashtags_tiktok: p.hashtags_tiktok ?? [],
    visual_brief: p.visual_brief ?? null,
    image_suggestion: p.image_suggestion ?? null,
    status: "draft",
  }));

  const { error: postsErr } = await supabase.from("posts").insert(rows);
  if (postsErr) throw new Error(`posts insert: ${postsErr.message}`);

  return planRow as { id: string; week_of: string };
}

// ── POST handler ─────────────────────────────────────────────────────────────

interface RequestBody {
  prompt?: string;
  week_of?: string;
}

export async function POST(req: NextRequest) {
  const body: RequestBody = await req.json().catch(() => ({}));

  const inputs = await loadInputs();
  const nextMonday = getNextMonday();
  const weekDates = getWeekDates(nextMonday);

  const systemPrompt = buildSystemPrompt();

  // If caller sends a custom prompt, use it directly with brand context appended
  const userPrompt = body.prompt
    ? `${body.prompt}\n\n---\n\n## CONTEXTO DE MARCA\n${inputs.brandKnowledge || "No disponible."}\n\n## PRIORIDADES\n${inputs.priorities || "No disponible."}\n\n## MEMORIA\n${inputs.memory ? JSON.stringify(inputs.memory, null, 2) : "No disponible."}`
    : buildUserPrompt(inputs, weekDates);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const rawText = textBlock?.text ?? "";

  // Try to extract JSON plan from response
  const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    try {
      const plan: WeeklyPlan = JSON.parse(jsonMatch[1]);

      // Save to Supabase only for weekly plan mode (not custom prompts)
      let savedPlan: { id: string; week_of: string } | null = null;
      if (!body.prompt && plan.posts?.length) {
        savedPlan = await savePlanToDb(plan);
      }

      return NextResponse.json({
        success: true,
        data: plan,
        plan_id: savedPlan?.id ?? null,
        raw: rawText,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ success: false, error: message, raw: rawText }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    data: null,
    raw: rawText,
  });
}
