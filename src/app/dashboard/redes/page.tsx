import { createClient } from "@/lib/supabase/server";
import RedesClient from "./redes-client";

export default async function RedesPage() {
  const supabase = await createClient();

  const [
    { data: brandDocs },
    { data: reports },
    { data: plans },
    { data: posts },
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
  ]);

  return (
    <RedesClient
      brandDocs={brandDocs ?? []}
      reports={reports ?? []}
      plans={plans ?? []}
      posts={posts ?? []}
    />
  );
}
