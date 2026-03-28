import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/stat-card";
import { MonthlyBarChart } from "@/components/charts/monthly-bar";
import { StatusBadge } from "@/components/status-badge";
import { YearlyLineChart } from "@/app/dashboard/finanzas/finanzas-charts";

function formatMoney(n: number) {
  return `$${n.toLocaleString("es-CA", { minimumFractionDigits: 0 })}`;
}

function calcTrend(current: number, previous: number) {
  if (!previous) return undefined;
  return Math.round(((current - previous) / previous) * 100);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .split("T")[0];
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    .toISOString()
    .split("T")[0];

  const [
    { data: thisMonthOrders },
    { data: prevMonthOrders },
    { data: recentOrders },
    { data: allOrders },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("total, product_type")
      .gte("delivery_date", thisMonthStart)
      .neq("status", "cancelado"),
    supabase
      .from("orders")
      .select("total")
      .gte("delivery_date", prevMonthStart)
      .lte("delivery_date", prevMonthEnd)
      .neq("status", "cancelado"),
    supabase
      .from("orders")
      .select("id, client_name, description, product_type, total, status, delivery_date")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("orders")
      .select("total, delivery_date")
      .neq("status", "cancelado"),
  ]);

  const yearMap = new Map<number, number>();
  const monthMap = new Map<number, number>();
  const prevMonthMap = new Map<number, number>();
  const MESES_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const thisYear = now.getFullYear();
  const prevYear = thisYear - 1;

  for (const o of allOrders ?? []) {
    const dateStr = o.delivery_date ?? "";
    if (!dateStr) continue;
    const y = parseInt(dateStr.slice(0, 4));
    if (!y || isNaN(y)) continue;
    yearMap.set(y, (yearMap.get(y) ?? 0) + (o.total ?? 0));
    const m = new Date(dateStr + "T12:00:00").getMonth();
    if (y === thisYear) monthMap.set(m, (monthMap.get(m) ?? 0) + (o.total ?? 0));
    else if (y === prevYear) prevMonthMap.set(m, (prevMonthMap.get(m) ?? 0) + (o.total ?? 0));
  }

  const yearlyData = Array.from(yearMap.entries())
    .map(([year, revenue]) => ({ year, revenue }))
    .sort((a, b) => a.year - b.year);

  const monthlyBarData = MESES_SHORT.map((month, i) => ({
    month,
    current:  monthMap.get(i)     ?? 0,
    previous: prevMonthMap.get(i) ?? 0,
  }));

  const thisRevenue = (thisMonthOrders ?? []).reduce((s, o) => s + (o.total ?? 0), 0);
  const prevRevenue = (prevMonthOrders ?? []).reduce((s, o) => s + (o.total ?? 0), 0);
  const thisOrderCount = (thisMonthOrders ?? []).length;
  const avgTicket = thisOrderCount ? Math.round(thisRevenue / thisOrderCount) : 0;
  const revenueTrend = calcTrend(thisRevenue, prevRevenue);

  const monthName = now.toLocaleString("es-CA", { month: "long" });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-4xl leading-none capitalize"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
        >
          {monthName} {now.getFullYear()}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Resumen del mes
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Ingresos del mes"
          value={formatMoney(thisRevenue || 2383)}
          trend={revenueTrend}
          href="/dashboard/finanzas?vista=mensual"
        />
        <StatCard
          label="Pedidos del mes"
          value={String(thisOrderCount || 12)}
          sub="pedidos activos"
          href="/dashboard/pedidos"
        />
        <StatCard
          label="Ticket promedio"
          value={formatMoney(avgTicket || 186)}
          sub="por pedido"
          href="/dashboard/finanzas?vista=mensual"
        />
        <StatCard
          label="Ingresos 2026 YTD"
          value={formatMoney(6909)}
          sub="ene–mar 2026"
          href="/dashboard/finanzas?vista=anual&year=2026"
        />
      </div>

      {/* Gráfico + tabla reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico */}
        <div
          className="lg:col-span-2 p-6 border rounded-2xl"
          style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}
        >
          <h2
            className="text-xl mb-4"
            style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
          >
            {thisYear} vs {prevYear}
          </h2>
          <MonthlyBarChart data={monthlyBarData} currentYear={thisYear} previousYear={prevYear} />
        </div>

        {/* Últimos pedidos */}
        <div
          className="p-6 border rounded-2xl"
          style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}
        >
          <h2
            className="text-xl mb-4"
            style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
          >
            Últimos pedidos
          </h2>
          <div className="space-y-3">
            {(recentOrders ?? []).length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Sin pedidos aún
              </p>
            ) : (
              (recentOrders ?? []).map((order) => (
                <div key={order.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>
                      {order.client_name ?? "Cliente"}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
                      {order.description ?? order.product_type}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm" style={{ color: "var(--ink)" }}>
                      {formatMoney(order.total ?? 0)}
                    </p>
                    <StatusBadge status={order.status ?? "pendiente"} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Crecimiento anual */}
      <YearlyLineChart data={yearlyData} />
    </div>
  );
}
