import type Anthropic from "@anthropic-ai/sdk";

export const READ_TOOLS = [
  "get_business_summary",
  "get_top_clients",
  "search_orders",
  "get_financial_summary",
  "get_courses",
];

export const WRITE_TOOLS = [
  "update_orders_status",
  "create_course",
  "create_client",
  "add_expense",
];

export const TOOLS: Anthropic.Tool[] = [
  // ── Read ────────────────────────────────────────────────────────────────────
  {
    name: "get_business_summary",
    description: "Get a quick overview of the business: revenue this month, active orders, and client count.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_top_clients",
    description: "Get the top clients ranked by total revenue or order count.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit:   { type: "number", description: "How many clients to return (default 5)" },
        rank_by: { type: "string", enum: ["revenue", "orders"], description: "Sort by revenue or order count" },
      },
    },
  },
  {
    name: "search_orders",
    description: "Search and filter orders by date range, status, client name, or product type.",
    input_schema: {
      type: "object" as const,
      properties: {
        date_from:    { type: "string", description: "Start date YYYY-MM-DD" },
        date_to:      { type: "string", description: "End date YYYY-MM-DD" },
        status:       { type: "string", enum: ["pendiente", "aprobado", "en_proceso", "entregado", "cancelado"] },
        client_name:  { type: "string", description: "Partial client name match" },
        product_type: { type: "string" },
        limit:        { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "get_financial_summary",
    description: "Get revenue and expense summary for a year, or a specific month.",
    input_schema: {
      type: "object" as const,
      properties: {
        year:  { type: "number" },
        month: { type: "number", description: "1–12. Omit for full year." },
      },
      required: ["year"],
    },
  },
  {
    name: "get_courses",
    description: "List courses with their date, location, enrollment count, and revenue.",
    input_schema: {
      type: "object" as const,
      properties: {
        upcoming_only: { type: "boolean", description: "Only return future courses" },
      },
    },
  },

  // ── Write (require confirmation) ────────────────────────────────────────────
  {
    name: "update_orders_status",
    description: "Update the status of orders matching a set of criteria. Always describe what will change before calling this.",
    input_schema: {
      type: "object" as const,
      properties: {
        new_status:      { type: "string", enum: ["pendiente", "aprobado", "en_proceso", "entregado", "cancelado"] },
        date_from:       { type: "string", description: "YYYY-MM-DD" },
        date_to:         { type: "string", description: "YYYY-MM-DD" },
        current_status:  { type: "string", description: "Filter: only update orders with this current status" },
        client_name:     { type: "string", description: "Filter: partial client name match" },
        order_ids:       { type: "array", items: { type: "string" }, description: "Specific order IDs to update" },
      },
      required: ["new_status"],
    },
  },
  {
    name: "create_course",
    description: "Create a new course. Ask for course name, date, and optionally location if not provided.",
    input_schema: {
      type: "object" as const,
      properties: {
        course_name: { type: "string" },
        course_date: { type: "string", description: "YYYY-MM-DD" },
        location:    { type: "string" },
      },
      required: ["course_name", "course_date"],
    },
  },
  {
    name: "create_client",
    description: "Add a new client. Only name is required; ask for optional fields if offered.",
    input_schema: {
      type: "object" as const,
      properties: {
        name:      { type: "string" },
        phone:     { type: "string" },
        email:     { type: "string" },
        instagram: { type: "string" },
        channel:   { type: "string", description: "How the client was acquired" },
      },
      required: ["name"],
    },
  },
  {
    name: "add_expense",
    description: "Log a new business expense.",
    input_schema: {
      type: "object" as const,
      properties: {
        month:    { type: "string", description: "YYYY-MM-01" },
        category: { type: "string", enum: ["ingredientes", "accesorios", "empaque", "publicidad", "mano_de_obra", "otro"] },
        item:     { type: "string", description: "What was purchased" },
        amount:   { type: "number" },
        quantity: { type: "string", description: "e.g. 2 kg, 3 units" },
        notes:    { type: "string" },
      },
      required: ["month", "category", "item", "amount"],
    },
  },
];

// ── Human-readable description of write operations ───────────────────────────

export function getWriteDescription(
  toolName: string,
  input: Record<string, unknown>
): string {
  const fmt = (n: number) => `$${Number(n).toLocaleString("es-CA")}`;

  switch (toolName) {
    case "update_orders_status": {
      const criteria: string[] = [];
      if (input.date_from || input.date_to)
        criteria.push(`entre ${input.date_from ?? "..."} y ${input.date_to ?? "..."}`);
      if (input.client_name) criteria.push(`del cliente "${input.client_name}"`);
      if (input.current_status) criteria.push(`con estado actual "${input.current_status}"`);
      if (Array.isArray(input.order_ids) && input.order_ids.length)
        criteria.push(`(${input.order_ids.length} pedidos específicos)`);
      const scope = criteria.length ? ` de pedidos ${criteria.join(", ")}` : " de todos los pedidos";
      return `Cambiar estado a "${input.new_status}"${scope}.`;
    }
    case "create_course":
      return `Crear el curso "${input.course_name}" para el ${input.course_date}${input.location ? ` en ${input.location}` : ""}.`;
    case "create_client":
      return `Agregar a "${input.name}" como nuevo cliente${input.phone ? ` (${input.phone})` : ""}.`;
    case "add_expense":
      return `Registrar un gasto de ${fmt(input.amount as number)} en ${input.category} — "${input.item}".`;
    default:
      return `Ejecutar: ${toolName}`;
  }
}
