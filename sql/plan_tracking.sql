-- Plan tracking tables
create table if not exists public.plan_subscriptions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  plan_backend_id text, -- id from Node backend (Mongo _id)
  plan_title text not null,
  billing_period text not null check (billing_period in ('weekly','monthly','per_day','per_serve','per_year')),
  total_days integer not null check (total_days > 0),
  delivered_count integer not null default 0,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.plan_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.plan_subscriptions(id) on delete cascade,
  day_number integer not null,
  status text not null check (status in ('pending','shipped','out_for_delivery','delivered','rejected')),
  notes text,
  updated_at timestamp with time zone not null default now(),
  unique (subscription_id, day_number)
);

-- Basic RLS (adjust to your needs)
alter table public.plan_subscriptions enable row level security;
alter table public.plan_deliveries enable row level security;

-- Allow anon to insert/select/update (mirror existing pattern)
create policy if not exists plan_subscriptions_anon_ins on public.plan_subscriptions for insert to anon with check (true);
create policy if not exists plan_subscriptions_anon_sel on public.plan_subscriptions for select to anon using (true);
create policy if not exists plan_subscriptions_anon_upd on public.plan_subscriptions for update to anon using (true) with check (true);

create policy if not exists plan_deliveries_anon_ins on public.plan_deliveries for insert to anon with check (true);
create policy if not exists plan_deliveries_anon_sel on public.plan_deliveries for select to anon using (true);
create policy if not exists plan_deliveries_anon_upd on public.plan_deliveries for update to anon using (true) with check (true);
