import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const anthropic = new Anthropic();

// ── Knowledge paths (bnzo-agency repo) ───────────────────────────────────────

const KNOWLEDGE_DIR = path.resolve(
  process.env.GENARO_KNOWLEDGE_DIR ||
    path.join(process.cwd(), "../bnzo-agency/clients/cook-for-friends/knowledge")
);
const TRENDS_DIR = path.resolve(path.join(KNOWLEDGE_DIR, "../trends"));
const CLIENT = "Cook for Friends Mtl";

// ── Helpers ──────────────────────────────────────────────────────────────────

function readIfExists(filePath: string): string | null {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : null;
}

function findLatest(dir: string, keyword: string, ext: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.includes(keyword) && f.endsWith(ext))
    .sort()
    .reverse();
  return files.length > 0 ? path.join(dir, files[0]) : null;
}

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

// ── Load knowledge context ───────────────────────────────────────────────────

function loadInputs(): {
  brandKnowledge: string | null;
  priorities: string | null;
  memory: Record<string, unknown> | null;
  trends: string | null;
  guidelines: Record<string, unknown> | null;
} {
  const brandFile = fs
    .readdirSync(KNOWLEDGE_DIR)
    .filter((f) => f.startsWith("brand_knowledge") && f.endsWith(".md"))
    .sort((a, b) => b.length - a.length)[0];

  const brandKnowledge = brandFile
    ? fs.readFileSync(path.join(KNOWLEDGE_DIR, brandFile), "utf-8")
    : null;

  const priorities = readIfExists(path.join(KNOWLEDGE_DIR, "current_priorities.md"));

  const memoryRaw = readIfExists(path.join(KNOWLEDGE_DIR, "memory.json"));
  const memory = memoryRaw ? (JSON.parse(memoryRaw) as Record<string, unknown>) : null;

  const trendsPath = findLatest(TRENDS_DIR, "trends_report", ".md");
  const trends = trendsPath ? fs.readFileSync(trendsPath, "utf-8") : null;

  const guidelinesPath = findLatest(TRENDS_DIR, "visual_guidelines", ".json");
  const guidelinesRaw = guidelinesPath ? readIfExists(guidelinesPath) : null;
  const guidelines = guidelinesRaw
    ? (JSON.parse(guidelinesRaw) as Record<string, unknown>)
    : null;

  return { brandKnowledge, priorities, memory, trends, guidelines };
}

// ── System prompt (from SKILL.md) ────────────────────────────────────────────

function buildSystemPrompt(): string {
  const skillPath = path.resolve(
    process.env.GENARO_SKILL_PATH ||
      path.join(
        process.cwd(),
        "../bnzo-agency/agents/skills/genaro/SKILL.md"
      )
  );
  if (fs.existsSync(skillPath)) {
    return fs.readFileSync(skillPath, "utf-8");
  }
  return "Eres un estratega de contenido especializado en redes sociales para negocios latinoamericanos.";
}

// ── User prompt builder ──────────────────────────────────────────────────────

function buildUserPrompt(
  inputs: ReturnType<typeof loadInputs>,
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

// ── POST handler ─────────────────────────────────────────────────────────────

interface RequestBody {
  prompt?: string;
  week_of?: string;
}

export async function POST(req: NextRequest) {
  const body: RequestBody = await req.json().catch(() => ({}));

  const inputs = loadInputs();
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
      const plan = JSON.parse(jsonMatch[1]);
      return NextResponse.json({
        success: true,
        data: plan,
        raw: rawText,
      });
    } catch {
      // JSON parse failed — return raw text
    }
  }

  return NextResponse.json({
    success: true,
    data: null,
    raw: rawText,
  });
}
