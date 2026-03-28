"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteClient(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Check for linked orders before deleting
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("client_id", id);

  if ((count ?? 0) > 0) {
    return { error: `Este cliente tiene ${count} pedido(s) vinculado(s). Desvincula los pedidos primero.` };
  }

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/clientes");
  return {};
}
