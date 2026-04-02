import { NextRequest, NextResponse } from "next/server";

// ── Helpers ────────────────────────────────────────────────────────────────────

function addDays(mondayStr: string, n: number): string {
  const d = new Date(mondayStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function iso(dateStr: string, time: string): string {
  return new Date(`${dateStr}T${time}:00`).toISOString();
}

// ── Mock posts ─────────────────────────────────────────────────────────────────
// Basado en brand_knowledge + recomendaciones de analíticas:
//   - Mínimo 3 carruseles, máximo 1 video
//   - Mejores días: martes, miércoles, jueves
//   - Personajes infantiles, baby showers, pasteles temáticos
//   - Cursos SOLO con pregunta emocional de apertura
//   - No sábado para contenido principal

function buildPosts(weekOf: string) {
  return [
    {
      day_of_week: "lunes",
      scheduled_at: iso(addDays(weekOf, 0), "11:00"),
      platform: "instagram",
      format: "carrusel",
      hook: "When the cake matches the vibe perfectly 🐾",
      caption_ig:
        "She asked for Bluey — we delivered a whole adventure. 🐶💙\n\nEvery detail handcrafted with love, from the little ears to the tiny Bingo beside her. Because some birthdays deserve a cake that's as magical as the birthday girl herself.\n\n✨ Custom cakes for your little one's special day. DM us to start planning! 🎂",
      caption_tiktok: "POV: You ordered a Bluey cake and Carolina went ALL OUT 🐾✨",
      hashtags_ig: ["#bluey", "#customcake", "#birthdaycake", "#montrealbakery", "#cookforfriendsntl", "#kidsbirthdaycake", "#cakemontreal", "#blueybirthday", "#customcakemontreal", "#birthdaygirl"],
      hashtags_tiktok: ["#bluey", "#customcake", "#cakemontreal", "#birthdaycake", "#montrealbakery"],
      visual_brief:
        "Serie de 4-5 fotos del pastel de Bluey: (1) foto completa con Bluey y Bingo modelados en fondant, (2) detalle de las figuritas, (3) slice mostrando el interior colorido, (4) foto con la festejada si es posible. Fondo neutro claro, luz natural.",
      image_suggestion: "Pastel temático Bluey de 2 pisos con personajes en fondant, colores azul y naranja pastel",
    },
    {
      day_of_week: "martes",
      scheduled_at: iso(addDays(weekOf, 1), "10:00"),
      platform: "instagram",
      format: "carrusel",
      hook: "For the mom-to-be who deserves the sweetest celebration 🤍",
      caption_ig:
        "Baby showers are our absolute favorite to design. 🌸\n\nSoft colors, delicate details, and a whole lot of love baked into every layer. This floral dream was made for a beautiful mama and her little one on the way.\n\n📩 DM us to design your custom baby shower cake — we'd love to be part of your celebration! 🎀",
      caption_tiktok: "Baby shower cake goals ✨🌸 Handcrafted with love in Montreal",
      hashtags_ig: ["#babyshower", "#babyshowercake", "#montrealbakery", "#customcake", "#cookforfriendsntl", "#babyshowermontreal", "#cakemontreal", "#floraldreamcake"],
      hashtags_tiktok: ["#babyshower", "#babyshowercake", "#cakemontreal", "#customcake"],
      visual_brief:
        "Carrusel baby shower: (1) pastel completo con flores de azúcar en tonos blanco, sage y durazno, (2) detalle de las flores modeladas, (3) mesa de postres si existe, (4) foto con la mamá. Tonos pastel suaves, estética limpia.",
      image_suggestion: "Pastel de baby shower elegante con flores de azúcar modeladas a mano, tonos neutros",
    },
    {
      day_of_week: "miercoles",
      scheduled_at: iso(addDays(weekOf, 2), "09:00"),
      platform: "instagram",
      format: "carrusel",
      hook: "¿Siempre quisiste aprender a decorar pasteles pero no sabes por dónde empezar? 🎂✨",
      caption_ig:
        "Repostería Creativa 0.0 está hecha exactamente para ti. 💕\n\nEn este curso vas a aprender desde cero — sin experiencia previa necesaria. Carolina te guía paso a paso para que salgas con una torta decorada hecha por tus propias manos.\n\n📍 Montreal · Cupos limitados\n📅 ¡Próxima fecha disponible!\n\nEscríbenos por DM para inscribirte 👇",
      caption_tiktok: "¿Quieres aprender repostería desde cero? 🎂 Mira lo que hacen nuestras alumnas ✨",
      hashtags_ig: ["#reposteria", "#cursosreposteria", "#aprendereposteria", "#reposteriacreativa", "#cookforfriendsntl", "#montreal", "#cursomontreal", "#comunidadlatina"],
      hashtags_tiktok: ["#reposteria", "#cursoreposteria", "#montreal", "#aprender", "#reposteriacreativa"],
      visual_brief:
        "Carrusel del curso: (1) pregunta de apertura en tipografía rose/cream, (2) foto de alumnas en el taller, (3) resultado de una alumna principiante, (4) Carolina enseñando con sonrisa, (5) CTA con próxima fecha y lugar.",
      image_suggestion: "Fotos del taller de repostería con alumnas aprendiendo, ambiente cálido y acogedor",
    },
    {
      day_of_week: "jueves",
      scheduled_at: iso(addDays(weekOf, 3), "11:00"),
      platform: "instagram",
      format: "carrusel",
      hook: "Level up your birthday game 🎮",
      caption_ig:
        "When a Minecraft fan turns 8, you don't just make a cake — you build one. 🧱✨\n\nEvery creeper, every pixel, every tiny detail crafted by hand. Because the best cakes tell a story.\n\n🎂 Custom themed cakes for every fandom. DM us to start designing yours!",
      caption_tiktok: "Minecraft cake that actually looks like the game 🎮🧱 Hand-crafted in Montreal",
      hashtags_ig: ["#minecraftcake", "#gamingcake", "#customcake", "#birthdaycake", "#montrealbakery", "#cookforfriendsntl", "#cakemontreal", "#kidscake"],
      hashtags_tiktok: ["#minecraft", "#minecraftcake", "#gamingcake", "#customcake", "#cakemontreal"],
      visual_brief:
        "Pastel Minecraft: (1) vista frontal completa con elementos pixelados en fondant, (2) detalle de creepers y personajes, (3) cumpleañero con el pastel, (4) slice con capas de colores del interior.",
      image_suggestion: "Pastel de Minecraft con elementos 3D en fondant, colores verdes, grises y cafés",
    },
    {
      day_of_week: "viernes",
      scheduled_at: iso(addDays(weekOf, 4), "14:00"),
      platform: "instagram",
      format: "video",
      hook: "The magic is in the details ✨",
      caption_ig:
        "A little sneak peek into how the flowers come to life. 🌸\n\nHours of work, one petal at a time. This is what handcrafted really means.\n\nCertified MAPAQ · Made with love in Montreal 🍁",
      caption_tiktok: "Making sugar flowers from scratch ✨🌸 This is how we do it",
      hashtags_ig: ["#sugarflowers", "#behindthescenes", "#customcake", "#montrealbakery", "#cakeprocess", "#handcrafted", "#mapaq", "#cookforfriendsntl"],
      hashtags_tiktok: ["#sugarflowers", "#cakeprocess", "#behindthescenes", "#cakedecorating"],
      visual_brief:
        "Video corto 15-30 seg: manos trabajando el fondant, formando pétalos, ensamblando la flor. Luz cálida natural, fondo neutro claro, música suave de fondo. Sin texto en pantalla.",
      image_suggestion: "Video de proceso: manos creando flores de azúcar artesanales paso a paso",
    },
    {
      day_of_week: "sabado",
      scheduled_at: iso(addDays(weekOf, 5), "12:00"),
      platform: "instagram",
      format: "foto",
      hook: "Something sweet is coming... 🤫",
      caption_ig:
        "We've been working on something new and we can't wait to share it with you. 👀\n\nStay tuned — your taste buds are going to thank you. 🍋✨",
      caption_tiktok: null,
      hashtags_ig: ["#comingsoon", "#newmenu", "#cookforfriendsntl", "#montrealbakery", "#minipostres", "#desserts"],
      hashtags_tiktok: [],
      visual_brief:
        "Foto de teasing: mini postre (marquesa de maracuyá) parcialmente visible o fuera de foco. Colores vibrantes, tonos cálidos. No revelar el producto completo — solo despertar curiosidad.",
      image_suggestion: "Marquesa de maracuyá parcialmente visible, fondo oscuro, colores vibrantes",
    },
    {
      day_of_week: "domingo",
      scheduled_at: iso(addDays(weekOf, 6), "10:00"),
      platform: "instagram",
      format: "carrusel",
      hook: "¿Lunes sin planes todavía? 👀",
      caption_ig:
        "Quedan cupos para nuestra próxima clase de Repostería Creativa. 🎂\n\nAprende a decorar pasteles desde cero con Carolina — en un ambiente súper cálido y sin presión.\n\n📍 Montreal / Brossard\n📩 Escríbenos para apartar tu lugar ✨",
      caption_tiktok: null,
      hashtags_ig: ["#reposteria", "#cursosreposteria", "#montreal", "#brossard", "#cookforfriendsntl", "#aprender", "#reposteriamontreal", "#comunidadlatina"],
      hashtags_tiktok: [],
      visual_brief:
        "Carrusel domingo: (1) pregunta casual en diseño simple rose/cream, (2) foto del ambiente cálido del taller, (3) resultado de una alumna sonriendo, (4) CTA con info de inscripción.",
      image_suggestion: "Ambiente del taller: cálido, acogedor, luz natural",
    },
  ];
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const weekOf: string = body.week_of ?? new Date().toISOString().split("T")[0];

  // Si hay instrucciones custom (post on-demand), agregar un post extra
  if (body.custom_instructions) {
    const customPost = {
      day_of_week: null,
      scheduled_at: null,
      platform: "instagram",
      format: "carrusel",
      hook: "Post personalizado — edita este hook ✏️",
      caption_ig: `Post generado a partir de: "${body.custom_instructions}"\n\n[Edita este caption antes de publicar]`,
      caption_tiktok: null,
      hashtags_ig: ["#cookforfriendsntl", "#montrealbakery", "#customcake"],
      hashtags_tiktok: [],
      visual_brief: `Briefing para imagen: ${body.custom_instructions}`,
      image_suggestion: body.custom_instructions,
    };
    return NextResponse.json({ posts: [customPost] });
  }

  return NextResponse.json({ posts: buildPosts(weekOf) });
}
