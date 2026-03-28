-- Cook for Friends MTL — Supabase Schema
-- Run in Supabase SQL editor (Dashboard → SQL Editor)

-- ─── CLIENTS ──────────────────────────────────────────────────────────
create table clients (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  owner_id      uuid references auth.users not null,
  name          text not null,
  phone         text,
  email         text,
  channel       text check (channel in ('CFF','WhatsApp','Instagram','Messenger','email','familia','otro')),
  notes         text,
  order_count   int default 0,
  total_spent   numeric default 0
);

alter table clients enable row level security;
create policy "owner_clients" on clients
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ─── ORDERS ───────────────────────────────────────────────────────────
create table orders (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now(),
  owner_id            uuid references auth.users not null,
  client_id           uuid references clients(id) on delete set null,
  client_name         text,                     -- denormalized for speed
  contact_date        date,
  delivery_date       date,
  product_type        text check (product_type in ('torta','galletas','cupcakes','cakesicles','popcakes','shots','otro')),
  quantity            int,
  description         text,
  flavors             text,
  quoted              numeric,
  total               numeric,
  delivery_fee        numeric default 0,
  status              text default 'pendiente'
                      check (status in ('pendiente','aprobado','en_proceso','entregado','cancelado')),
  payment_status      text default 'pendiente'
                      check (payment_status in ('pendiente','parcial','pagado')),
  payment_interac     numeric default 0,
  payment_cash        numeric default 0,
  payment_card        numeric default 0,
  notes               text
);

alter table orders enable row level security;
create policy "owner_orders" on orders
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ─── COURSES ──────────────────────────────────────────────────────────
create table courses (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  owner_id        uuid references auth.users not null,
  course_date     date,
  course_name     text,
  student_name    text,
  email           text,
  phone           text,
  location        text,
  amount          numeric,
  status          text default 'inscrito'
                  check (status in ('inscrito','confirmado','pagado','cancelado')),
  notes           text
);

alter table courses enable row level security;
create policy "owner_courses" on courses
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ─── EXPENSES ─────────────────────────────────────────────────────────
create table expenses (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  owner_id    uuid references auth.users not null,
  month       date,            -- first day of the month e.g. 2025-01-01
  category    text check (category in ('ingredientes','accesorios','empaque','publicidad','mano_de_obra','otro')),
  item        text,
  quantity    text,
  amount      numeric,
  notes       text
);

alter table expenses enable row level security;
create policy "owner_expenses" on expenses
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ─── LEADS ────────────────────────────────────────────────────────────
-- Captured by agente Rosa from DMs
create table leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  owner_id      uuid references auth.users not null,
  source        text default 'instagram_dm',
  name          text,
  message       text,
  intent        text check (intent in ('precio','cotizacion','cursos','otro')),
  status        text default 'nuevo'
                check (status in ('nuevo','contactado','convertido','descartado')),
  auto_reply    text,
  notes         text
);

alter table leads enable row level security;
create policy "owner_leads" on leads
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ─── HELPFUL VIEWS ────────────────────────────────────────────────────

-- Monthly revenue summary
create view monthly_revenue as
select
  date_trunc('month', delivery_date)::date as month,
  owner_id,
  count(*) as order_count,
  sum(total) as revenue,
  avg(total) as avg_ticket,
  sum(delivery_fee) as total_delivery
from orders
where status = 'entregado'
group by 1, 2;

-- Product mix
create view product_mix as
select
  owner_id,
  product_type,
  count(*) as count,
  sum(total) as revenue,
  round(sum(total) * 100.0 / sum(sum(total)) over (partition by owner_id), 1) as pct
from orders
where status = 'entregado'
group by owner_id, product_type;

-- Top clients
create view top_clients as
select
  c.id,
  c.owner_id,
  c.name,
  count(o.id) as order_count,
  sum(o.total) as total_spent,
  max(o.delivery_date) as last_order
from clients c
left join orders o on o.client_id = c.id and o.status = 'entregado'
group by c.id, c.owner_id, c.name
order by total_spent desc;
