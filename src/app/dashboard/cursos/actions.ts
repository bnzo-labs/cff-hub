"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCourse(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase.from("courses").insert({
    owner_id: user.id,
    course_name: formData.get("course_name") as string,
    course_date: formData.get("course_date") as string,
    location: (formData.get("location") as string) || null,
    // Shell row — no student yet (inscritos come via Shopify)
    student_name: null,
    amount: 0,
    status: "activo",
  });

  if (error) throw error;
  revalidatePath("/dashboard/cursos");
}

export async function addCourseEnrollment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { error } = await supabase.from("courses").insert({
    owner_id: user.id,
    course_name: formData.get("course_name") as string,
    course_date: formData.get("course_date") as string,
    student_name: formData.get("student_name") as string,
    email: formData.get("email") || null,
    phone: formData.get("phone") || null,
    amount: Number(formData.get("amount")) || 0,
    status: formData.get("status") as string,
    location: formData.get("location") || null,
    notes: formData.get("notes") || null,
  });

  if (error) throw error;

  revalidatePath("/dashboard/cursos");
}
