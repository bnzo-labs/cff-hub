"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function addExpense(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // El campo month viene como "YYYY-MM", lo convertimos a primer día del mes
  const monthInput = formData.get("month") as string;
  const month = monthInput ? `${monthInput}-01` : null;

  const { error } = await supabase.from("expenses").insert({
    owner_id: user.id,
    month,
    category: formData.get("category") as string,
    item: formData.get("item") as string,
    quantity: formData.get("quantity") || null,
    amount: Number(formData.get("amount")) || 0,
    notes: formData.get("notes") || null,
  });

  if (error) throw error;

  revalidatePath("/dashboard/finanzas");
}
