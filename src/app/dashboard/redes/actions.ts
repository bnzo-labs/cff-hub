"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── Marca ──────────────────────────────────────────────────────────────────────

export async function updateBrandDoc(id: string, content: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("social_brand_docs")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/redes");
}

// ── Posts ──────────────────────────────────────────────────────────────────────

interface PostInput {
  day_of_week?: string | null;
  scheduled_at?: string | null;
  platform?: string;
  format?: string;
  hook?: string;
  caption_ig?: string;
  caption_tiktok?: string | null;
  hashtags_ig?: string[];
  hashtags_tiktok?: string[];
  visual_brief?: string;
  image_suggestion?: string;
  image_urls?: string[];
}

/** Crea un plan semanal y sus 7 posts de una vez (viene del mock de Genaro). */
export async function createWeeklyPlan(weekOf: string, posts: PostInput[]) {
  const supabase = await createClient();

  const { data: plan, error: planErr } = await supabase
    .from("weekly_plans")
    .insert({ week_of: weekOf, status: "draft" })
    .select()
    .single();

  if (planErr) throw new Error(planErr.message);

  const rows = posts.map((p) => ({ ...p, plan_id: plan.id, status: "draft" }));
  const { data: createdPosts, error: postsErr } = await supabase
    .from("posts")
    .insert(rows)
    .select();
  if (postsErr) throw new Error(postsErr.message);

  revalidatePath("/dashboard/redes");
  return {
    plan: plan as { id: string; week_of: string; status: string; client_id: string; created_at: string },
    posts: (createdPosts ?? []) as unknown[],
  };
}

/** Agrega un post custom a un plan existente (Genaro on-demand). */
export async function addCustomPost(planId: string, post: PostInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({ ...post, plan_id: planId, status: "draft" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/redes");
  return data as unknown;
}

/** Actualiza los campos editables de un post (guarda como draft). */
export async function updatePost(
  id: string,
  fields: Partial<PostInput & { status?: string }>
) {
  const supabase = await createClient();
  const { error } = await supabase.from("posts").update(fields).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/redes");
}

/** Cambia el estado de un post a 'approved'. */
export async function approvePost(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({ status: "approved" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/redes");
}

/** Elimina un post. */
export async function deletePost(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/redes");
}

/** Actualiza las URLs de imágenes de un post. */
export async function updatePostImages(id: string, urls: string[]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({ image_urls: urls })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/redes");
}

/** Carga un plan y sus posts por plan_id (para sincronizar estado del cliente tras llamada a Genaro). */
export async function fetchPlanWithPosts(planId: string) {
  const supabase = await createClient();

  const { data: plan, error: planErr } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("id", planId)
    .single();
  if (planErr) throw new Error(planErr.message);

  const { data: posts, error: postsErr } = await supabase
    .from("posts")
    .select("*")
    .eq("plan_id", planId)
    .order("created_at", { ascending: true });
  if (postsErr) throw new Error(postsErr.message);

  return {
    plan: plan as { id: string; week_of: string; status: string; client_id: string; created_at: string },
    posts: (posts ?? []) as unknown[],
  };
}

// ── Agent outputs ──────────────────────────────────────────────────────────────

export async function upsertTrendsReport(id: string | null, content: string) {
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase
      .from("agent_outputs")
      .update({ content_text: content })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("agent_outputs")
      .insert({ client_id: "cff", type: "trends_report", content_text: content });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/dashboard/redes");
}

export async function upsertVisualGuidelines(id: string | null, content: Record<string, unknown>) {
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase
      .from("agent_outputs")
      .update({ content })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("agent_outputs")
      .insert({ client_id: "cff", type: "visual_guidelines", content });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/dashboard/redes");
}
