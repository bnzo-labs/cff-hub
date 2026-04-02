import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { postId } = await req.json();

  if (!postId) {
    return NextResponse.json({ error: "postId requerido" }, { status: 400 });
  }

  const supabase = await createClient();

  // Obtener el post
  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (error || !post) {
    return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
  }

  if (post.status !== "approved") {
    return NextResponse.json(
      { error: "El post debe estar aprobado antes de publicar" },
      { status: 400 }
    );
  }

  if (!post.image_urls || (post.image_urls as string[]).length === 0) {
    return NextResponse.json(
      { error: "El post necesita al menos una imagen" },
      { status: 400 }
    );
  }

  if (!post.scheduled_at) {
    return NextResponse.json(
      { error: "El post necesita fecha y hora de publicación" },
      { status: 400 }
    );
  }

  const apiKey = process.env.BLOTATO_API_KEY;
  const accountId = process.env.BLOTATO_ACCOUNT_ID;

  if (!apiKey || !accountId) {
    return NextResponse.json(
      { error: "Configuración de Blotato incompleta (variables de entorno)" },
      { status: 500 }
    );
  }

  // Llamada a Blotato
  const blobRes = await fetch("https://api.blotato.com/v1/schedules", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      account_id: accountId,
      content: post.caption_ig,
      media_urls: post.image_urls,
      scheduled_at: post.scheduled_at,
      platform: "instagram",
    }),
  });

  if (!blobRes.ok) {
    const errText = await blobRes.text().catch(() => "Error desconocido");
    return NextResponse.json(
      { error: `Error de Blotato: ${errText}` },
      { status: 502 }
    );
  }

  const blobData = await blobRes.json();

  // Actualizar estado en DB
  await supabase
    .from("posts")
    .update({ blotato_post_id: blobData.id ?? blobData.schedule_id, status: "published" })
    .eq("id", postId);

  return NextResponse.json({ success: true, blotato_id: blobData.id ?? blobData.schedule_id });
}
