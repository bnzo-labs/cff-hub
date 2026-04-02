# cff-hub — Estado del proyecto al 2026-04-01

Aplicación de gestión para Cook for Friends MTL (Carolina). Deploy en Vercel → `horno.cookforfriends.ca`.
Repo: `bnzo-labs/cff-hub` (rama `main`).

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.2.1 — App Router, TypeScript, Turbopack |
| DB + Auth | Supabase (Postgres + Auth email/password) |
| Estilos | Tailwind CSS v4 + CSS variables custom |
| Gráficos | Recharts ^2.15 |
| Deploy | Vercel (auto-deploy en push a `main`) |
| Node | v20 |

---

## Lo que se hizo hasta hoy

### MVP completo (sesiones anteriores)
- Auth completo (middleware, login, callback)
- Dashboard con KPIs, gráfico mensual, últimos pedidos
- Pedidos — tabla, detalle, nuevo pedido (Server Actions)
- Clientes — tabla + leads pipeline
- Cursos — agrupados por nombre/fecha, inscritos, formulario
- Finanzas — KPIs, ingresos mensuales, gastos
- Agente IA "Muffi" — chat widget en esquina inferior derecha
- Build limpio, deploy en Vercel funcionando

### Sesión 2026-04-01
1. **Chat widget (Muffi)** — reemplazados emojis 🧁 por GIFs animados:
   - `sleeping.gif` cuando el chat está cerrado
   - `hello.gif` cuando el chat está abierto
   - Panel responsive: `min(360px, 100vw-32px)` × `min(520px, 100dvh-120px)`
   - Header del chat: GIF centrado arriba, botón × en `position: absolute` top-right

2. **Mobile — navegación hamburguesa** — reemplazado el bottom nav bar (tapaba el botón de Muffin):
   - Header fijo en móvil (`md:hidden`, altura 56px) con logo + botón ☰
   - Drawer lateral que se desliza desde la izquierda (`transform: translateX`)
   - Backdrop oscuro al abrir el drawer, cierra al tocar fuera o al navegar
   - Botón de cerrar sesión al fondo del drawer
   - Sin state en SSR — animación pura CSS, sin riesgo de hidratación

3. **Mobile — layout general**:
   - Sidebar de escritorio: `hidden md:flex` (solo desktop)
   - Padding contenido: `p-4 pt-[72px] md:pt-8 md:p-8` (espacio para header fijo)
   - Tablas con `overflow-x-auto` + `minWidth` en pedidos, clientes y finanzas
   - Formulario de gastos: `grid-cols-1 sm:grid-cols-2`

4. **Fixes de build**:
   - Recharts TypeScript: cast en tooltip callback `(props as TooltipProps<number, string>)`
   - Supabase count query: `select("*", { count: "exact", head: true })` + desestructurar `{ count }`
   - `tsconfig.json`: `"scripts"` en `exclude` para evitar error por archivo seed sin datos

5. **Seguridad — limpieza de git history**:
   - La carpeta `data/` (Excel con datos reales) fue subida por accidente en el commit inicial
   - Se usó `git filter-repo --path data --invert-paths --force` para borrarla de todo el historial
   - Force push a `main` — el historial ahora empieza limpio en `e437cd0`

---

## Estado actual

### ✅ Funciona en producción
- Auth, todas las rutas protegidas
- Dashboard, Pedidos, Clientes, Cursos, Finanzas
- Agente Muffi (chat con IA)
- Mobile: navegación hamburguesa, tablas scrolleables

### ❌ Pendiente

| # | Tarea | Prioridad |
|---|---|---|
| 1 | **Ficha de cliente** `/dashboard/clientes/[id]` — página de detalle con historial de pedidos | Media |
| 2 | Renombrar `src/middleware.ts` → `src/proxy.ts` (solo warning, no rompe) | Baja |
| 3 | `src/app/error.tsx` + `loading.tsx` en cada segmento | Baja |
| 4 | GitHub Support — pedir purge de caché de los objetos git borrados (si hay datos sensibles) | Opcional |

---

## Archivos clave

```
src/
├── app/dashboard/layout.tsx          # Layout con sidebar (desktop) + MobileNav (mobile)
├── components/
│   ├── sidebar.tsx                   # Sidebar — solo visible md:flex (desktop)
│   ├── mobile-nav.tsx                # Header + drawer hamburguesa (mobile)
│   └── chat/chat-widget.tsx          # Chat Muffi con GIFs animados
├── lib/ai/executor.ts                # Lógica del agente (Supabase queries)
└── middleware.ts                     # Protección de rutas (deprecation warning)
```

## Variables de entorno necesarias (en Vercel y `.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=            # para el agente Muffi
```

> `CFF_OWNER_ID` — no se usa en el código. Todos los inserts usan `user.id` de la sesión Supabase.

---

## Design System (CSS variables)

```css
--rose: #D4537E        /* primario */
--rose-light: #F2C4D4  /* accent suave */
--rose-dark: #B03D62   /* errores */
--cream: #FDF8F5       /* background */
--ink: #1A1410         /* texto principal */
--muted: #7A6E6A       /* texto secundario */
--border: #EDE5E0      /* bordes */
--surface: #FFFFFF     /* cards/panels */
--surface-2: #FDF6F2   /* hover/header */
```
Fuentes: `Cormorant Garamond` (headings) + `DM Sans` (body)

---

## Convenciones del proyecto

- Server Components por defecto; `'use client'` solo en sidebar, charts, mobile-nav, chat
- Mutations via Server Actions con `revalidatePath()` — sin API routes
- Todo el texto visible en **español**; código/variables en inglés
- No se usa shadcn/ui — CSS puro con variables
- `supabase/server.ts` usa `await cookies()` (Next.js 16 requiere función async)
