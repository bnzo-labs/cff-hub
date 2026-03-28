"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createOrder(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const client_id = formData.get("client_id") as string | null;
  const client_name_input = formData.get("client_name") as string | null;

  // Si hay client_id, obtener el nombre del cliente
  let client_name = client_name_input || null;
  if (client_id) {
    const { data } = await supabase
      .from("clients")
      .select("name")
      .eq("id", client_id)
      .single();
    if (data) client_name = data.name;
  }

  const { error, data } = await supabase
    .from("orders")
    .insert({
      owner_id: user.id,
      client_id: client_id || null,
      client_name,
      contact_date: formData.get("contact_date") || null,
      delivery_date: formData.get("delivery_date") as string,
      product_type: formData.get("product_type") as string,
      quantity: Number(formData.get("quantity")) || null,
      description: formData.get("description") || null,
      flavors: formData.get("flavors") || null,
      quoted: Number(formData.get("quoted")) || null,
      total: Number(formData.get("total")),
      delivery_fee: Number(formData.get("delivery_fee")) || 0,
      payment_interac: Number(formData.get("payment_interac")) || 0,
      payment_cash: Number(formData.get("payment_cash")) || 0,
      payment_card: Number(formData.get("payment_card")) || 0,
      notes: formData.get("notes") || null,
      status: "pendiente",
      payment_status: "pendiente",
    })
    .select("id")
    .single();

  if (error) throw error;

  revalidatePath("/dashboard/pedidos");
  revalidatePath("/dashboard");
  redirect(`/dashboard/pedidos/${data.id}`);
}

export async function createOrderDrawer(formData: FormData): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const client_id = formData.get("client_id") as string | null;
  const client_name_input = formData.get("client_name") as string | null;

  let client_name = client_name_input || null;
  if (client_id) {
    const { data } = await supabase
      .from("clients")
      .select("name")
      .eq("id", client_id)
      .single();
    if (data) client_name = data.name;
  }

  const { error, data } = await supabase
    .from("orders")
    .insert({
      owner_id: user.id,
      client_id: client_id || null,
      client_name,
      contact_date: formData.get("contact_date") || null,
      delivery_date: formData.get("delivery_date") as string,
      product_type: formData.get("product_type") as string,
      quantity: Number(formData.get("quantity")) || null,
      description: formData.get("description") || null,
      flavors: formData.get("flavors") || null,
      quoted: Number(formData.get("quoted")) || null,
      total: Number(formData.get("total")),
      delivery_fee: Number(formData.get("delivery_fee")) || 0,
      payment_interac: Number(formData.get("payment_interac")) || 0,
      payment_cash: Number(formData.get("payment_cash")) || 0,
      payment_card: Number(formData.get("payment_card")) || 0,
      notes: formData.get("notes") || null,
      status: "pendiente",
      payment_status: "pendiente",
    })
    .select("id")
    .single();

  if (error) throw error;

  revalidatePath("/dashboard/pedidos");
  revalidatePath("/dashboard");

  return { id: data.id };
}

export async function updateOrder(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("orders")
    .update({
      contact_date: formData.get("contact_date") || null,
      delivery_date: formData.get("delivery_date") as string,
      product_type: formData.get("product_type") as string,
      quantity: Number(formData.get("quantity")) || null,
      description: formData.get("description") || null,
      flavors: formData.get("flavors") || null,
      quoted: Number(formData.get("quoted")) || null,
      total: Number(formData.get("total")),
      delivery_fee: Number(formData.get("delivery_fee")) || 0,
      status: formData.get("status") as string,
      payment_status: formData.get("payment_status") as string,
      payment_interac: Number(formData.get("payment_interac")) || 0,
      payment_cash: Number(formData.get("payment_cash")) || 0,
      payment_card: Number(formData.get("payment_card")) || 0,
      notes: formData.get("notes") || null,
    })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) throw error;

  revalidatePath("/dashboard/pedidos");
  revalidatePath(`/dashboard/pedidos/${id}`);
  revalidatePath("/dashboard");
}

export async function updateOrderStatus(id: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) throw error;

  revalidatePath("/dashboard/pedidos");
  revalidatePath(`/dashboard/pedidos/${id}`);
  revalidatePath("/dashboard");
}

export async function updatePaymentStatus(id: string, payment_status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("orders")
    .update({ payment_status })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) throw error;

  revalidatePath("/dashboard/pedidos");
  revalidatePath(`/dashboard/pedidos/${id}`);
}
