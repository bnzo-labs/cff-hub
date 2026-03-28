---
name: nextjs-supabase-stack
description: >
  Full-stack development skill for building production web applications using
  Next.js 14 (App Router) + Supabase (auth, database, realtime) + Tailwind CSS,
  deployed to Vercel. Use this skill whenever building dashboards, SaaS apps,
  admin panels, CRMs, or any multi-page authenticated web app in this stack.
  Trigger on: "build a hub", "Next.js app", "Supabase backend", "authenticated
  dashboard", "CRM", "admin panel", "full-stack web app".
---

# Next.js 14 + Supabase — Production Stack

## Stack at a Glance

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | TypeScript, server components |
| Database | Supabase (Postgres) | Row-level security on all tables |
| Auth | Supabase Auth | Email/password + magic link |
| Styling | Tailwind CSS | + shadcn/ui components |
| Deploy | Vercel | `hub.` subdomain via DNS CNAME |
| ORM | Supabase JS client | `@supabase/supabase-js` v2 |

---

## Project Bootstrap

```bash
npx create-next-app@latest hub-cff --typescript --tailwind --app --src-dir
cd hub-cff
npm install @supabase/supabase-js @supabase/ssr
npx shadcn@latest init
npx shadcn@latest add card button input label badge table tabs
```

### `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-only, never expose to client
```

---

## Architecture — File Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout, fonts, providers
│   ├── page.tsx                # Public landing → redirects to /dashboard
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── callback/route.ts   # OAuth/magic link callback
│   └── dashboard/
│       ├── layout.tsx          # Protected layout, sidebar nav
│       ├── page.tsx            # Overview KPIs
│       ├── orders/page.tsx
│       ├── clients/page.tsx
│       ├── courses/page.tsx
│       └── expenses/page.tsx
├── components/
│   ├── ui/                     # shadcn auto-generated
│   ├── charts/                 # Chart.js or Recharts wrappers
│   ├── data-table.tsx          # Reusable sortable table
│   └── stat-card.tsx           # KPI metric card
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server component client
│   │   └── middleware.ts       # Session refresh
│   ├── types.ts                # DB types (auto-gen from Supabase CLI)
│   └── utils.ts
└── middleware.ts               # Route protection
```

---

## Supabase Client Setup

### `lib/supabase/client.ts` (browser)
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### `lib/supabase/server.ts` (server components / route handlers)
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )
}
```

### `middleware.ts` (route protection)
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll() },
      setAll(c) { c.forEach(({ name, value, options }) => {
        request.cookies.set(name, value)
        supabaseResponse = NextResponse.next({ request })
        supabaseResponse.cookies.set(name, value, options)
      })}
    }}
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
  return supabaseResponse
}

export const config = { matcher: ['/dashboard/:path*'] }
```

---

## Database Schema (Supabase SQL)

Read [`references/schema.sql`](./references/schema.sql) for the complete schema.

Key tables: `clients`, `orders`, `courses`, `expenses`

Rules:
- All tables have `id uuid default gen_random_uuid() primary key`
- All tables have `created_at timestamptz default now()`
- Enable RLS on every table
- Add policy: `create policy "owner" on orders using (auth.uid() = owner_id)`

---

## Server Component Data Fetching

Always fetch in Server Components unless you need client-side interactivity:

```typescript
// app/dashboard/orders/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function OrdersPage() {
  const supabase = createClient()
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*, clients(name)')
    .order('delivery_date', { ascending: false })
    .limit(50)

  if (error) throw error
  return <OrdersTable orders={orders} />
}
```

## Server Actions (mutations)

Use `'use server'` actions for forms and mutations — no API routes needed:

```typescript
// app/dashboard/orders/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createOrder(formData: FormData) {
  const supabase = createClient()
  const { error } = await supabase.from('orders').insert({
    client_id: formData.get('client_id'),
    description: formData.get('description'),
    total: Number(formData.get('total')),
    delivery_date: formData.get('delivery_date'),
    status: 'pendiente',
  })
  if (error) throw error
  revalidatePath('/dashboard/orders')
}
```

---

## Dashboard KPI Cards Pattern

```typescript
// components/stat-card.tsx
interface StatCardProps {
  label: string
  value: string
  sub?: string
  trend?: number  // percentage vs previous period
}

export function StatCard({ label, value, sub, trend }: StatCardProps) {
  return (
    <div className="bg-secondary rounded-lg p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-medium">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      {trend !== undefined && (
        <p className={`text-xs mt-1 ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs mes anterior
        </p>
      )}
    </div>
  )
}
```

---

## Charts — Recharts (recommended over Chart.js for Next.js)

```bash
npm install recharts
```

```typescript
// components/charts/monthly-revenue.tsx
'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export function MonthlyRevenueChart({ data }: { data: { month: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
        <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Ingresos']} />
        <Bar dataKey="total" fill="#D4537E" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

---

## Auth Flow

1. User visits `/auth/login` → enters email
2. Supabase sends magic link or password form
3. Callback at `/auth/callback/route.ts` exchanges code for session
4. Middleware redirects `/dashboard` → `/auth/login` if no session

```typescript
// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(`${origin}/dashboard`)
}
```

---

## Vercel Deploy + Custom Subdomain

1. `vercel --prod` or connect GitHub repo to Vercel
2. In Vercel project → Settings → Domains → Add `hub.cookforfriends.ca`
3. In DNS (wherever CFF domain lives): add `CNAME hub → cname.vercel-dns.com`
4. Add env vars in Vercel dashboard (same as `.env.local`)

---

## Type Generation (keep types in sync with DB)

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/types.ts
```

Run this whenever the schema changes.

---

## Common Gotchas

- Never use the service role key in client components — server only
- Always call `revalidatePath()` after mutations so Server Components re-fetch
- Use `loading.tsx` in route segments for suspense boundaries
- Supabase RLS must be enabled; test with a non-owner user
- `cookies()` in Next.js 14 is async in some Next versions — check

## References

- [`references/schema.sql`](./references/schema.sql) — Full DB schema
- [`references/rls-policies.sql`](./references/rls-policies.sql) — RLS policy templates
