import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { TOOLS, READ_TOOLS, WRITE_TOOLS, getWriteDescription } from "@/lib/ai/tools";
import { executeReadTool, executeWriteTool } from "@/lib/ai/executor";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;
const MAX_HISTORY = 30; // message objects (not pairs)

function buildSystem(): string {
  const today = new Date().toLocaleDateString("es-CA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  return `Eres Muffi, la asistente virtual de "Cook for Friends" (CFF), una pastelería artesanal en Montreal, Canadá.
Ayudas a la propietaria a gestionar su negocio: clientes, pedidos, finanzas y cursos de repostería.
Responde siempre en español, de forma concisa, cálida y directa. Sé conversacional, no uses listas innecesariamente.
Usa las herramientas disponibles para consultar datos reales antes de responder preguntas sobre el negocio.
Para operaciones de escritura (create_*, update_*), explica brevemente qué vas a hacer — el sistema pedirá confirmación al usuario antes de ejecutar.
Los montos son en dólares canadienses (CAD). Hoy es ${today}.`;
}

function trimHistory(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  if (messages.length <= MAX_HISTORY) return messages;
  const trimmed = messages.slice(-MAX_HISTORY);
  // Never start with a dangling tool_result (its tool_use was trimmed away)
  let i = 0;
  while (i < trimmed.length) {
    const msg = trimmed[i];
    if (
      msg.role === "user" &&
      Array.isArray(msg.content) &&
      (msg.content as Anthropic.ToolResultBlockParam[]).every((b) => b.type === "tool_result")
    ) {
      i++;
    } else {
      break;
    }
  }
  return trimmed.slice(i);
}

export async function POST(req: Request) {
  const body = await req.json() as {
    messages: Anthropic.MessageParam[];
    pendingExecution?: {
      toolUseId: string;
      toolName: string;
      toolInput: Record<string, unknown>;
    };
  };

  const supabase = await createClient();
  const encoder = new TextEncoder();

  const responseStream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        let currentMessages = trimHistory([...body.messages]);

        // If confirming a pending write action, execute it and add result to history
        if (body.pendingExecution) {
          const result = await executeWriteTool(
            body.pendingExecution.toolName,
            body.pendingExecution.toolInput,
            supabase
          );
          currentMessages.push({
            role: "user",
            content: [{
              type: "tool_result",
              tool_use_id: body.pendingExecution.toolUseId,
              content: result,
            }],
          });
        }

        // Tool-use loop — Claude may call multiple tools before returning a final answer
        let continueLoop = true;
        while (continueLoop) {
          const stream = anthropic.messages.stream({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system: buildSystem(),
            tools: TOOLS,
            messages: currentMessages,
          });

          // Forward text tokens to the client in real-time
          stream.on("text", (text) => send({ type: "text", content: text }));

          const finalMsg = await stream.finalMessage();

          // Add the complete assistant turn to history
          currentMessages.push({ role: "assistant", content: finalMsg.content });

          if (finalMsg.stop_reason === "end_turn") {
            // Normal completion — send updated history and finish
            send({ type: "history_update", messages: currentMessages });
            continueLoop = false;

          } else if (finalMsg.stop_reason === "tool_use") {
            const toolBlocks = finalMsg.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
            );

            const writeBlock = toolBlocks.find((b) => WRITE_TOOLS.includes(b.name));

            if (writeBlock) {
              // Write tool — pause for user confirmation
              send({
                type: "confirmation_required",
                toolUseId:   writeBlock.id,
                toolName:    writeBlock.name,
                toolInput:   writeBlock.input,
                description: getWriteDescription(writeBlock.name, writeBlock.input as Record<string, unknown>),
              });
              send({ type: "history_update", messages: currentMessages });
              continueLoop = false;

            } else {
              // Read tools — execute all, then loop back so Claude can answer
              send({ type: "thinking" });
              const toolResults = await Promise.all(
                toolBlocks
                  .filter((b) => READ_TOOLS.includes(b.name))
                  .map(async (b) => ({
                    type: "tool_result" as const,
                    tool_use_id: b.id,
                    content: await executeReadTool(
                      b.name,
                      b.input as Record<string, unknown>,
                      supabase
                    ),
                  }))
              );
              currentMessages.push({ role: "user", content: toolResults });
              // Continue — Claude will now process the tool results and respond
            }

          } else {
            // max_tokens or unexpected stop — still send history
            send({ type: "history_update", messages: currentMessages });
            continueLoop = false;
          }
        }

        send({ type: "done" });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Error desconocido" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
