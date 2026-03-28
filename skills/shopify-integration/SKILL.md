---
name: shopify-integration
description: >
  Skill for integrating Shopify with external apps via webhooks, Admin API, and
  Storefront API. Use when syncing Shopify orders to a database, building
  post-purchase email flows, connecting product catalogs to Instagram, setting up
  abandoned cart recovery, or automating any Shopify store workflow.
  Trigger on: "Shopify webhook", "sync Shopify orders", "Shopify API",
  "post-purchase email", "abandoned cart", "Instagram shopping", "Shopify automation".
---

# Shopify Integration Guide

## Core Concepts

| Concept | What it does | When to use |
|---|---|---|
| Webhooks | Shopify pushes events to your URL | Order created, paid, fulfilled |
| Admin API (REST/GraphQL) | You pull/push data | Read orders, update inventory |
| Storefront API | Public-facing, no secret | Product catalog for frontend |
| Shopify Flow | No-code automation in Shopify | Simple email triggers |

---

## Webhook Setup (receiving Shopify events)

### 1. Register webhook in Shopify Admin
Settings → Notifications → Webhooks → Create webhook

Or via Admin API:
```bash
curl -X POST "https://YOUR_STORE.myshopify.com/admin/api/2024-01/webhooks.json" \
  -H "X-Shopify-Access-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "topic": "orders/create",
      "address": "https://hub.cookforfriends.ca/api/shopify/webhook",
      "format": "json"
    }
  }'
```

### 2. Next.js webhook route

```typescript
// app/api/shopify/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // service role — bypasses RLS
)

function verifyWebhook(body: string, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET!
  const hash = createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64')
  return hash === hmacHeader
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const hmac = req.headers.get('x-shopify-hmac-sha256') ?? ''
  const topic = req.headers.get('x-shopify-topic') ?? ''

  if (!verifyWebhook(body, hmac)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = JSON.parse(body)

  if (topic === 'orders/create') {
    await handleOrderCreate(payload)
  } else if (topic === 'orders/paid') {
    await handleOrderPaid(payload)
  }

  return NextResponse.json({ ok: true })
}

async function handleOrderCreate(order: ShopifyOrder) {
  // Upsert client
  const { data: client } = await supabase
    .from('clients')
    .upsert({
      owner_id: process.env.CFF_OWNER_ID!,  // Carolina's user ID
      name: `${order.customer?.first_name} ${order.customer?.last_name}`,
      email: order.customer?.email,
      phone: order.customer?.phone,
      channel: 'shopify',
    }, { onConflict: 'email' })
    .select()
    .single()

  // Insert order
  await supabase.from('orders').insert({
    owner_id: process.env.CFF_OWNER_ID!,
    client_id: client?.id,
    client_name: client?.name,
    product_type: mapShopifyProduct(order.line_items[0]?.title),
    description: order.line_items.map(i => `${i.quantity}x ${i.title}`).join(', '),
    total: parseFloat(order.total_price),
    delivery_fee: parseFloat(order.shipping_lines?.[0]?.price ?? '0'),
    status: 'aprobado',
    payment_status: order.financial_status === 'paid' ? 'pagado' : 'pendiente',
    notes: `Shopify #${order.order_number}`,
  })
}

function mapShopifyProduct(title = ''): string {
  const t = title.toLowerCase()
  if (t.includes('torta') || t.includes('cake')) return 'torta'
  if (t.includes('galleta') || t.includes('cookie')) return 'galletas'
  if (t.includes('cupcake')) return 'cupcakes'
  if (t.includes('curso') || t.includes('course')) return 'otro'
  return 'otro'
}
```

---

## Post-Purchase Email (Shopify Flow — no code)

The easiest path for Shopify Payments customers:

1. Shopify Admin → **Automations** → Create automation
2. Trigger: `Order paid`
3. Action: `Send email`

Three-email sequence:
```
Email 1 (delay: 0 min)  — Confirmación + qué esperar
Email 2 (delay: 3 days) — "¿Cómo quedó? Mándanos una foto"
Email 3 (delay: 7 days) — "¿Otro evento pronto? 10% de descuento"
```

For richer templates use **Klaviyo** (free up to 500 contacts):
```bash
npm install @klaviyo/api
```

---

## Abandoned Cart Recovery (native Shopify)

Settings → Notifications → Abandoned checkout → Enable

Default: sends email after 1 hour if cart > $0. Recovers ~8-12% of abandoned carts. No code needed.

---

## Instagram Shopping — Connect Catalog

1. Shopify Admin → **Sales channels** → Add **Facebook & Instagram**
2. Connect Meta Business account (same one Carolina uses for IG)
3. Products sync automatically to Instagram Shopping
4. In Instagram posts: tag product → button appears

Requirements:
- Products must have prices
- Shopify store must be active (not password-protected)
- Meta Commerce Policy compliance

---

## Admin API — Pull Orders Programmatically

```typescript
// lib/shopify.ts
const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN!  // store.myshopify.com
const SHOPIFY_TOKEN  = process.env.SHOPIFY_ADMIN_TOKEN!

export async function getOrders(since?: string) {
  const params = new URLSearchParams({
    limit: '250',
    status: 'any',
    ...(since && { created_at_min: since }),
  })
  const res = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders.json?${params}`,
    { headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN } }
  )
  const { orders } = await res.json()
  return orders as ShopifyOrder[]
}
```

---

## One-Time Sync (import historical Shopify orders)

```typescript
// scripts/sync-shopify.ts — run once with `npx ts-node scripts/sync-shopify.ts`
import { getOrders } from '../lib/shopify'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const orders = await getOrders()
  console.log(`Syncing ${orders.length} orders...`)
  for (const order of orders) {
    await handleOrderCreate(order)  // reuse webhook handler
  }
  console.log('Done.')
}

main()
```

---

## Required Environment Variables

```env
SHOPIFY_DOMAIN=cookforfriends.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_xxxx         # Admin API token
SHOPIFY_WEBHOOK_SECRET=xxxx            # From webhook registration
SHOPIFY_STOREFRONT_TOKEN=xxxx          # Public, for product catalog
CFF_OWNER_ID=uuid-of-carolina-user     # Set after first Supabase login
```

---

## Shopify Order Type (TypeScript)

See [`references/shopify-types.ts`](./references/shopify-types.ts) for full type definitions.

---

## Common Gotchas

- Webhooks must respond within **5 seconds** or Shopify retries (up to 19 times)
- Always verify HMAC — never trust unverified webhooks
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — only use in server-side webhook handlers
- Shopify sends webhooks in test mode during development — use `ngrok` to test locally
- Instagram Shopping requires the store to be password-free and have real products with prices
