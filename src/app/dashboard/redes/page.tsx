import { createClient } from "@/lib/supabase/server";
import RedesClient from "./redes-client";

export default async function RedesPage() {
  const supabase = await createClient();

  const [
    { data: brandDocs },
    { data: reports },
    { data: plans },
    { data: posts },
    { data: trendsRow },
    { data: guiaRow },
  ] = await Promise.all([
    supabase.from("social_brand_docs").select("*").order("type"),
    supabase
      .from("social_analytics_reports")
      .select("*")
      .order("report_date", { ascending: false }),
    supabase
      .from("weekly_plans")
      .select("*")
      .order("week_of", { ascending: false }),
    supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("agent_outputs")
      .select("id, content_text")
      .eq("type", "trends_report")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("agent_outputs")
      .select("id, content")
      .eq("type", "visual_guidelines")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <RedesClient
      brandDocs={brandDocs ?? []}
      reports={reports ?? []}
      plans={plans ?? []}
      posts={posts ?? []}
      trendsId={trendsRow?.id ?? null}
      trendsContent={trendsRow?.content_text ?? null}
      guiaId={guiaRow?.id ?? null}
      guiaContent={(guiaRow?.content as Record<string, unknown>) ?? null}
    />
  );
}
