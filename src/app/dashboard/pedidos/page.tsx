import { createClient } from "@/lib/supabase/server";
import { PedidosPageClient } from "./pedidos-page-client";

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tipo?: string; nuevo?: string; client_id?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // ── Date ranges (ISO week: Mon–Sun) ────────────────────────────────────────
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Monday
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - dayOfWeek);
  const thisSunday = new Date(thisMonday);
  thisSunday.setDate(thisMonday.getDate() + 6);
  const nextMonday = new Date(thisMonday);
  nextMonday.setDate(thisMonday.getDate() + 7);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  const toStr = (d: Date) => d.toISOString().split("T")[0];

  const thisWeekStart = toStr(thisMonday);
  const thisWeekEnd = toStr(thisSunday);
  const nextWeekStart = toStr(nextMonday);
  const nextWeekEnd = toStr(nextSunday);

  // ── Parallel queries ───────────────────────────────────────────────────────
  let ordersQuery = supabase
    .from("orders")
    .select(
      "id, client_name, description, product_type, total, status, payment_status, delivery_date"
    )
    .order("delivery_date", { ascending: false });

  if (params.status) ordersQuery = ordersQuery.eq("status", params.status);
  if (params.tipo) ordersQuery = ordersQuery.eq("product_type", params.tipo);

  const [
    { data: orders },
    { data: thisWeekOrders },
    { data: nextWeekOrders },
    { data: recentDelivered },
    { data: clients },
  ] = await Promise.all([
    ordersQuery,
    supabase
      .from("orders")
      .select("id, client_name, total, delivery_date, status")
      .gte("delivery_date", thisWeekStart)
      .lte("delivery_date", thisWeekEnd)
      .order("delivery_date", { ascending: true }),
    supabase
      .from("orders")
      .select("id, client_name, total, delivery_date, status")
      .gte("delivery_date", nextWeekStart)
      .lte("delivery_date", nextWeekEnd)
      .order("delivery_date", { ascending: true }),
    supabase
      .from("orders")
      .select("id, client_name, product_type, total, delivery_date")
      .eq("status", "entregado")
      .order("delivery_date", { ascending: false })
      .limit(5),
    supabase
      .from("clients")
      .select("id, name")
      .order("name"),
  ]);

  return (
    <PedidosPageClient
      orders={orders ?? []}
      thisWeekOrders={thisWeekOrders ?? []}
      nextWeekOrders={nextWeekOrders ?? []}
      recentDelivered={recentDelivered ?? []}
      clients={clients ?? []}
      activeStatus={params.status}
      activeTipo={params.tipo}
      totalCount={(orders ?? []).length}
      initialClientId={params.nuevo === "1" ? (params.client_id ?? null) : null}
    />
  );
}
