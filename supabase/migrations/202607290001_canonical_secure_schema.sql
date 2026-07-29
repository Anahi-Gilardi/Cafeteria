-- ============================================================================
-- Castaño / Resto Bar del Teatro
-- Canonical schema, compatibility migration and strict RLS (2026-07-29)
-- Apply with Supabase CLI or the authenticated SQL editor.
-- Never execute this migration with the public anon key.
-- ============================================================================

begin;

create extension if not exists pgcrypto;

-- --------------------------------------------------------------------------
-- Canonical tables
-- --------------------------------------------------------------------------

create table if not exists public.business_profile (
  id text primary key default 'resto_bar_del_teatro',
  name text not null default 'RESTO BAR DEL TEATRO',
  cuit text not null,
  address text not null,
  city text not null default 'Río Cuarto',
  province text not null default 'Córdoba',
  phone text,
  email text,
  currency text not null default 'ARS',
  timezone text not null default 'America/Argentina/Cordoba',
  pos_number integer not null,
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  delivery_free_min numeric(12,2) not null default 0 check (delivery_free_min >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.business_profile add column if not exists delivery_fee numeric(12,2) not null default 0;
alter table public.business_profile add column if not exists delivery_free_min numeric(12,2) not null default 0;

create table if not exists public.daily_menu (
  day_of_week text primary key,
  title text not null,
  description text,
  price numeric(12,2) not null check (price >= 0),
  image text,
  starters jsonb not null default '[]'::jsonb,
  mains jsonb not null default '[]'::jsonb,
  drinks jsonb not null default '[]'::jsonb,
  desserts jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id text primary key,
  name text not null,
  price numeric(12,2) not null default 0 check (price >= 0),
  takeaway_price numeric(12,2) check (takeaway_price is null or takeaway_price >= 0),
  delivery_price numeric(12,2) check (delivery_price is null or delivery_price >= 0),
  description text,
  category text not null,
  tags text[] not null default '{}',
  image text,
  customizable boolean not null default false,
  calories numeric,
  allergens text[] not null default '{}',
  stock numeric(12,2) not null default 0 check (stock >= 0),
  is_offer boolean not null default false,
  offer_price numeric(12,2) check (offer_price is null or offer_price >= 0),
  recipe jsonb not null default '[]'::jsonb,
  vat_rate numeric(5,2),
  arca_item_code text,
  arca_unit_code text,
  fiscal_enabled boolean not null default false,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.menu_items add column if not exists customizable boolean not null default false;
alter table public.menu_items add column if not exists calories numeric;
alter table public.menu_items add column if not exists allergens text[] not null default '{}';
alter table public.menu_items add column if not exists stock numeric(12,2) not null default 0;
alter table public.menu_items add column if not exists is_offer boolean not null default false;
alter table public.menu_items add column if not exists offer_price numeric(12,2);
alter table public.menu_items add column if not exists recipe jsonb not null default '[]'::jsonb;
alter table public.menu_items add column if not exists vat_rate numeric(5,2);
alter table public.menu_items add column if not exists arca_item_code text;
alter table public.menu_items add column if not exists arca_unit_code text;
alter table public.menu_items add column if not exists fiscal_enabled boolean not null default false;
alter table public.menu_items add column if not exists is_available boolean not null default true;
alter table public.menu_items add column if not exists created_at timestamptz not null default now();
alter table public.menu_items add column if not exists updated_at timestamptz not null default now();
update public.menu_items set stock = 0 where stock is null;
alter table public.menu_items alter column stock set default 0;
alter table public.menu_items alter column stock set not null;

create table if not exists public.product_images (
  id text primary key,
  product_id text not null references public.menu_items(id) on delete cascade,
  image_base64 text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.insumos (
  id text primary key,
  name text not null,
  quantity numeric(12,3) not null default 0 check (quantity >= 0),
  unit text not null default 'u',
  min_limit numeric(12,3) not null default 0 check (min_limit >= 0),
  provider text,
  expiration_date date,
  cost_per_unit numeric(12,2) not null default 0 check (cost_per_unit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibility with the current target project.
alter table public.insumos add column if not exists quantity numeric(12,3);
alter table public.insumos add column if not exists min_limit numeric(12,3);
alter table public.insumos add column if not exists provider text;
alter table public.insumos add column if not exists expiration_date date;
alter table public.insumos add column if not exists cost_per_unit numeric(12,2) not null default 0;
alter table public.insumos add column if not exists created_at timestamptz not null default now();
alter table public.insumos add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'insumos' and column_name = 'current_stock'
  ) then
    execute 'update public.insumos set quantity = coalesce(quantity, current_stock, 0) where quantity is null';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'insumos' and column_name = 'min_stock'
  ) then
    execute 'update public.insumos set min_limit = coalesce(min_limit, min_stock, 0) where min_limit is null';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'insumos' and column_name = 'supplier'
  ) then
    execute 'update public.insumos set provider = coalesce(provider, supplier) where provider is null';
  end if;
end
$$;

alter table public.insumos alter column quantity set default 0;
alter table public.insumos alter column quantity set not null;
alter table public.insumos alter column min_limit set default 0;
alter table public.insumos alter column min_limit set not null;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  contact_name text,
  email text,
  phone text,
  supplied_items text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  capacity integer not null check (capacity between 1 and 50),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  insumo_id text references public.insumos(id) on delete set null,
  item_name text not null,
  unit text not null,
  movement_type text not null check (movement_type in ('entry','adjustment','waste','recipe_consumption')),
  quantity numeric(12,3) not null check (quantity > 0),
  stock_before numeric(12,3) not null,
  stock_after numeric(12,3) not null check (stock_after >= 0),
  estimated_cost numeric(12,2) not null default 0 check (estimated_cost >= 0),
  reason text,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_created_at_idx
  on public.inventory_movements(created_at desc);
create index if not exists inventory_movements_insumo_id_idx
  on public.inventory_movements(insumo_id, created_at desc);

create table if not exists public.client_accounts (
  id text primary key,
  name text not null,
  cuit text,
  phone text,
  balance numeric(12,2) not null default 0,
  credit_limit numeric(12,2) not null default 0 check (credit_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_accounts add column if not exists cuit text;
alter table public.client_accounts add column if not exists balance numeric(12,2) not null default 0;
alter table public.client_accounts add column if not exists credit_limit numeric(12,2) not null default 0;
alter table public.client_accounts add column if not exists created_at timestamptz not null default now();
alter table public.client_accounts add column if not exists updated_at timestamptz not null default now();

create table if not exists public.users_accounts (
  id text primary key,
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'mesero'
    check (role in ('administrador', 'dueño', 'cajero', 'barista', 'mesero')),
  active boolean not null default true,
  direccion text,
  telefono text,
  telefono_contacto text,
  sueldo numeric(12,2) not null default 0,
  antiguedad integer not null default 0,
  permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users_accounts add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;
alter table public.users_accounts add column if not exists active boolean not null default true;
alter table public.users_accounts add column if not exists direccion text;
alter table public.users_accounts add column if not exists telefono text;
alter table public.users_accounts add column if not exists telefono_contacto text;
alter table public.users_accounts add column if not exists sueldo numeric(12,2) not null default 0;
alter table public.users_accounts add column if not exists antiguedad integer not null default 0;
alter table public.users_accounts add column if not exists permissions text[] not null default '{}';
alter table public.users_accounts add column if not exists updated_at timestamptz not null default now();
create unique index if not exists users_accounts_auth_user_id_key
  on public.users_accounts(auth_user_id)
  where auth_user_id is not null;

-- Remove browser-readable credentials. Staff must exist in Supabase Auth.
alter table public.users_accounts drop column if exists password;
alter table public.users_accounts drop column if exists pin;

create table if not exists public.inventory_audits (
  id uuid primary key default gen_random_uuid(),
  auditor_id text references public.users_accounts(id) on delete set null,
  auditor_name text not null,
  details jsonb not null default '[]'::jsonb,
  has_alert boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists inventory_audits_created_at_idx
  on public.inventory_audits(created_at desc);

create table if not exists public.orders (
  id text primary key,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null default 'pos'
    check (source in ('pos', 'public_menu', 'qr_mesa', 'offline_sync')),
  order_type text not null default 'salon'
    check (order_type in ('salon', 'takeaway', 'delivery')),
  table_number text,
  client_name text default 'Consumidor Final',
  client_phone text,
  client_address text,
  waiter_name text,
  items jsonb not null default '[]'::jsonb,
  status text not null default 'Recibido'
    check (status in ('Recibido', 'Preparando', 'Listo', 'Completado')),
  payment_method text,
  payment_status text not null default 'pendiente',
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0 check (total >= 0),
  price_list text not null default 'Salon',
  type text not null default 'Mesa',
  fiscal jsonb,
  coupon_number text,
  client_account_name text,
  tip_amount numeric(12,2) not null default 0,
  delivery_fee numeric(12,2) not null default 0
);

alter table public.orders add column if not exists idempotency_key text;
alter table public.orders add column if not exists updated_at timestamptz not null default now();
alter table public.orders add column if not exists source text not null default 'pos';
alter table public.orders add column if not exists payment_status text not null default 'pendiente';
alter table public.orders add column if not exists tax numeric(12,2) not null default 0;
alter table public.orders add column if not exists delivery_fee numeric(12,2) not null default 0;
create unique index if not exists orders_idempotency_key_key
  on public.orders(idempotency_key)
  where idempotency_key is not null;
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  item_id text references public.menu_items(id),
  item_name text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  customization_summary text,
  destination text,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

create table if not exists public.reservations (
  id text primary key,
  table_id text,
  table_name text not null,
  date date not null,
  time_slot text not null,
  guests integer not null check (guests between 1 and 30),
  customer_name text not null,
  customer_phone text not null,
  reference_code text not null unique,
  status text not null default 'confirmada'
    check (status in ('pendiente', 'confirmada', 'cancelada', 'cumplida')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reservations add column if not exists status text not null default 'confirmada';
alter table public.reservations add column if not exists updated_at timestamptz not null default now();
create index if not exists reservations_date_idx on public.reservations(date);

create table if not exists public.cash_ledger (
  id text primary key default 'current',
  total_collected numeric(12,2) not null default 0,
  cash numeric(12,2) not null default 0,
  card numeric(12,2) not null default 0,
  mercadopago numeric(12,2) not null default 0,
  transactions jsonb not null default '[]'::jsonb,
  is_open boolean not null default false,
  opened_at timestamptz,
  opened_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cash_ledger add column if not exists transactions jsonb not null default '[]'::jsonb;
alter table public.cash_ledger add column if not exists is_open boolean not null default false;
alter table public.cash_ledger add column if not exists opened_at timestamptz;
alter table public.cash_ledger add column if not exists opened_by uuid references auth.users(id) on delete set null;
alter table public.cash_ledger add column if not exists updated_at timestamptz not null default now();

create table if not exists public.cash_closures (
  id text primary key,
  user_id uuid references auth.users(id),
  user_name text not null,
  opened_at timestamptz,
  closed_at timestamptz not null default now(),
  sales_total numeric(12,2) not null default 0,
  declared_cash numeric(12,2) not null default 0,
  difference numeric(12,2) not null default 0,
  notes text,
  transactions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.waiter_calls (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  call_type text not null check (call_type in ('call_waiter','request_bill')),
  customer_name text,
  status text not null default 'pending' check (status in ('pending','attended')),
  attended_by uuid references auth.users(id) on delete set null,
  attended_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists waiter_calls_pending_idx
  on public.waiter_calls(status, created_at desc);
create index if not exists cash_closures_closed_at_idx
  on public.cash_closures(closed_at desc);

create table if not exists public.barista_calibrations (
  id bigint generated by default as identity primary key,
  gramos_in numeric(8,2) not null,
  mililitros_out numeric(8,2) not null,
  tiempo numeric(8,2) not null,
  temperatura numeric(8,2) not null,
  clima text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_attendance (
  id text primary key default gen_random_uuid()::text,
  staff_id text references public.users_accounts(id),
  staff_name text not null,
  date date not null,
  check_in_time timestamptz,
  check_out_time timestamptz,
  hours_worked numeric(8,2) not null default 0,
  overtime_hours numeric(8,2) not null default 0,
  hourly_rate numeric(12,2) not null default 0,
  daily_total numeric(12,2) not null default 0,
  status text not null default 'presente',
  created_at timestamptz not null default now()
);
alter table public.staff_attendance add column if not exists latitude numeric(10,7);
alter table public.staff_attendance add column if not exists longitude numeric(10,7);
alter table public.staff_attendance add column if not exists location_address text;
alter table public.staff_attendance add column if not exists gps_accuracy numeric(10,2);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity_name text not null,
  entity_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

create table if not exists public.fiscal_invoices (
  id uuid primary key default gen_random_uuid(),
  order_id text references public.orders(id),
  idempotency_key text not null unique,
  environment text not null check (environment in ('homologation', 'production')),
  authorization_method text not null default 'CAE'
    check (authorization_method in ('CAE', 'CAEA')),
  status text not null
    check (status in ('draft', 'authorizing', 'authorized', 'observed', 'rejected', 'uncertain', 'cancelled')),
  invoice_type integer not null,
  point_of_sale integer not null,
  invoice_number bigint,
  issuer_cuit text,
  issuer_name text,
  issuer_address text,
  total numeric(12,2) not null,
  cae text,
  cae_expiration date,
  qr_url text,
  observations jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  request_snapshot jsonb,
  response_snapshot jsonb,
  requested_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.fiscal_invoices add column if not exists issuer_cuit text;
alter table public.fiscal_invoices add column if not exists issuer_name text;
alter table public.fiscal_invoices add column if not exists issuer_address text;
create index if not exists fiscal_invoices_sequence_idx
  on public.fiscal_invoices(point_of_sale, invoice_type, invoice_number);

create table if not exists public.public_order_rate_limits (
  client_hash text primary key,
  window_start timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.consume_public_rate_limit(
  p_client_hash text,
  p_window_seconds integer,
  p_max_requests integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rate_row public.public_order_rate_limits;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if length(p_client_hash) < 16
    or p_window_seconds < 1
    or p_max_requests < 1 then
    raise exception 'invalid rate limit' using errcode = '22023';
  end if;

  insert into public.public_order_rate_limits(
    client_hash, window_start, request_count, updated_at
  ) values (p_client_hash, now(), 0, now())
  on conflict (client_hash) do nothing;

  select * into rate_row
  from public.public_order_rate_limits
  where client_hash = p_client_hash
  for update;

  if rate_row.window_start < now() - make_interval(secs => p_window_seconds) then
    update public.public_order_rate_limits
    set window_start = now(), request_count = 1, updated_at = now()
    where client_hash = p_client_hash;
    return true;
  end if;
  if rate_row.request_count >= p_max_requests then
    return false;
  end if;
  update public.public_order_rate_limits
  set request_count = request_count + 1, updated_at = now()
  where client_hash = p_client_hash;
  return true;
end;
$$;

revoke all on function public.consume_public_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_public_rate_limit(text, integer, integer) to service_role;

-- --------------------------------------------------------------------------
-- Role helpers
-- --------------------------------------------------------------------------

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.users_accounts
  where auth_user_id = auth.uid() and active = true
  limit 1
$$;

create or replace function public.is_staff_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_staff_role() = any(allowed_roles), false)
$$;

revoke all on function public.current_staff_role() from public;
revoke all on function public.is_staff_role(text[]) from public;
grant execute on function public.current_staff_role() to authenticated;
grant execute on function public.is_staff_role(text[]) to authenticated;

-- --------------------------------------------------------------------------
-- Atomic and idempotent POS order persistence
-- --------------------------------------------------------------------------

create or replace function public.save_order_transaction(
  p_order jsonb,
  p_idempotency_key text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_order public.orders;
  line jsonb;
  line_item_id text;
  line_qty numeric;
  line_price numeric;
  recipe_line jsonb;
  ingredient_id text;
  ingredient_amount numeric;
begin
  if auth.uid() is null and auth.role() <> 'service_role' then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if auth.role() <> 'service_role'
    and not public.is_staff_role(array['administrador','dueño','cajero','barista','mesero']) then
    raise exception 'staff role required' using errcode = '42501';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then
    raise exception 'invalid idempotency key' using errcode = '22023';
  end if;
  if jsonb_typeof(p_order->'items') <> 'array' or jsonb_array_length(p_order->'items') = 0 then
    raise exception 'order items are required' using errcode = '22023';
  end if;

  select *
  into saved_order
  from public.orders
  where idempotency_key = p_idempotency_key;

  if found then
    return saved_order;
  end if;

  insert into public.orders (
    id, idempotency_key, created_at, source, order_type, table_number, client_name,
    client_phone, client_address, waiter_name, items, status, payment_method,
    subtotal, discount, tax, total, price_list, type, fiscal, coupon_number,
    client_account_name, tip_amount, delivery_fee
  ) values (
    p_order->>'id',
    p_idempotency_key,
    coalesce((p_order->>'created_at')::timestamptz, now()),
    coalesce(p_order->>'source', 'pos'),
    coalesce(p_order->>'order_type', 'salon'),
    p_order->>'table_number',
    coalesce(p_order->>'client_name', 'Consumidor Final'),
    p_order->>'client_phone',
    p_order->>'client_address',
    p_order->>'waiter_name',
    p_order->'items',
    coalesce(p_order->>'status', 'Recibido'),
    p_order->>'payment_method',
    coalesce((p_order->>'subtotal')::numeric, 0),
    coalesce((p_order->>'discount')::numeric, 0),
    coalesce((p_order->>'tax')::numeric, 0),
    coalesce((p_order->>'total')::numeric, 0),
    coalesce(p_order->>'price_list', 'Salon'),
    coalesce(p_order->>'type', 'Mesa'),
    p_order->'fiscal',
    p_order->>'coupon_number',
    p_order->>'client_account_name',
    coalesce((p_order->>'tip_amount')::numeric, 0),
    coalesce((p_order->>'delivery_fee')::numeric, 0)
  )
  returning * into saved_order;

  for line in select value from jsonb_array_elements(p_order->'items')
  loop
    line_item_id := nullif(line->>'itemId', '');
    line_qty := coalesce((line->>'quantity')::numeric, 0);
    line_price := coalesce((line->>'price')::numeric, 0);

    if line_qty <= 0 or line_price < 0 then
      raise exception 'invalid order item' using errcode = '22023';
    end if;

    insert into public.order_items (
      order_id, item_id, item_name, quantity, unit_price, subtotal,
      customization_summary, destination
    ) values (
      saved_order.id,
      line_item_id,
      line->>'name',
      line_qty,
      line_price,
      round(line_qty * line_price, 2),
      line->>'customizationSummary',
      line->>'destination'
    );

    if line_item_id is not null then
      update public.menu_items
      set stock = greatest(0, stock - line_qty), updated_at = now()
      where id = line_item_id and stock >= line_qty;

      if not found then
        raise exception 'insufficient stock for item %', line_item_id
          using errcode = '23514';
      end if;

      for recipe_line in
        select value
        from jsonb_array_elements(
          coalesce(
            (select recipe from public.menu_items where id = line_item_id),
            '[]'::jsonb
          )
        )
      loop
        ingredient_id := nullif(recipe_line->>'ingredientId', '');
        ingredient_amount := coalesce((recipe_line->>'amount')::numeric, 0) * line_qty;
        if ingredient_id is not null and ingredient_amount > 0 then
          update public.insumos
          set quantity = quantity - ingredient_amount, updated_at = now()
          where id = ingredient_id and quantity >= ingredient_amount;

          if not found then
            raise exception 'insufficient raw material %', ingredient_id
              using errcode = '23514';
          end if;
        end if;
      end loop;
    end if;
  end loop;

  insert into public.audit_logs(actor_id, action, entity_name, entity_id, payload)
  values (
    auth.uid(),
    'order.created',
    'orders',
    saved_order.id,
    jsonb_build_object('idempotency_key', p_idempotency_key, 'total', saved_order.total)
  );

  return saved_order;
end;
$$;

revoke all on function public.save_order_transaction(jsonb, text) from public;
grant execute on function public.save_order_transaction(jsonb, text) to authenticated;
grant execute on function public.save_order_transaction(jsonb, text) to service_role;

create or replace function public.record_order_payment(
  p_order_id text,
  p_amount numeric,
  p_method text,
  p_transaction_id text,
  p_discount numeric default 0,
  p_client_account_id text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders;
  ledger public.cash_ledger;
  credit_account public.client_accounts;
  already_paid numeric;
  method_cash numeric := 0;
  method_card numeric := 0;
  method_mp numeric := 0;
  collected_amount numeric := 0;
  transaction_payload jsonb;
begin
  if auth.uid() is null
    or not public.is_staff_role(array['administrador','dueño','cajero','mesero']) then
    raise exception 'billing role required' using errcode = '42501';
  end if;
  if p_amount <= 0
    or p_discount < 0
    or p_transaction_id is null
    or length(p_transaction_id) < 8 then
    raise exception 'invalid payment' using errcode = '22023';
  end if;
  if p_method not in (
    'Efectivo','Tarjeta','Tarjeta Débito','Tarjeta Crédito',
    'MercadoPago','Fiado / Cta Cte'
  ) then
    raise exception 'invalid payment method' using errcode = '22023';
  end if;

  select * into target_order
  from public.orders
  where id = p_order_id
  for update;
  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  insert into public.cash_ledger(id)
  values ('current')
  on conflict (id) do nothing;

  select * into ledger
  from public.cash_ledger
  where id = 'current'
  for update;
  if not ledger.is_open then
    raise exception 'cash shift is not open' using errcode = '23514';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(ledger.transactions, '[]'::jsonb)) tx
    where tx->>'id' = p_transaction_id
  ) then
    return target_order;
  end if;

  select coalesce(sum((tx->>'total')::numeric), 0)
  into already_paid
  from jsonb_array_elements(coalesce(ledger.transactions, '[]'::jsonb)) tx
  where tx->>'orderId' = p_order_id;

  if already_paid = 0 and p_discount > 0 then
    if p_discount >= target_order.total then
      raise exception 'invalid discount' using errcode = '23514';
    end if;
    update public.orders
    set
      discount = p_discount,
      total = total - p_discount,
      updated_at = now()
    where id = p_order_id
    returning * into target_order;
  elsif already_paid > 0 and abs(target_order.discount - p_discount) > 0.01 then
    raise exception 'discount cannot change after first payment' using errcode = '23514';
  end if;

  if already_paid + p_amount > target_order.total + 0.01 then
    raise exception 'payment exceeds outstanding balance' using errcode = '23514';
  end if;

  if p_method = 'Fiado / Cta Cte' then
    if p_client_account_id is null then
      raise exception 'client account required' using errcode = '22023';
    end if;
    select * into credit_account
    from public.client_accounts
    where id = p_client_account_id
    for update;
    if not found then
      raise exception 'client account not found' using errcode = 'P0002';
    end if;
    if abs(least(credit_account.balance - p_amount, 0)) > credit_account.credit_limit then
      raise exception 'client credit limit exceeded' using errcode = '23514';
    end if;
    update public.client_accounts
    set balance = balance - p_amount, updated_at = now()
    where id = p_client_account_id;
  end if;

  if p_method = 'Efectivo' then method_cash := p_amount;
  elsif p_method in ('Tarjeta','Tarjeta Débito','Tarjeta Crédito') then method_card := p_amount;
  elsif p_method = 'MercadoPago' then method_mp := p_amount;
  end if;
  if p_method <> 'Fiado / Cta Cte' then collected_amount := p_amount; end if;

  transaction_payload := jsonb_build_object(
    'id', p_transaction_id,
    'type', case when already_paid > 0 then 'Cobro Parcial' else 'Cobro' end,
    'orderId', p_order_id,
    'total', round(p_amount, 2),
    'method', p_method,
    'timestamp', now()
  );

  update public.cash_ledger
  set
    total_collected = total_collected + collected_amount,
    cash = cash + method_cash,
    card = card + method_card,
    mercadopago = mercadopago + method_mp,
    transactions = jsonb_build_array(transaction_payload) || coalesce(transactions, '[]'::jsonb),
    updated_at = now()
  where id = 'current';

  if already_paid + p_amount >= target_order.total
    and coalesce(target_order.payment_status, 'pendiente') <> 'pagado'
    and target_order.tip_amount > 0 then
    insert into public.system_settings(key, value, updated_at)
    values ('tip_pool', to_jsonb(target_order.tip_amount), now())
    on conflict (key) do update
    set
      value = to_jsonb(
        coalesce((public.system_settings.value #>> '{}')::numeric, 0)
        + target_order.tip_amount
      ),
      updated_at = now();
  end if;

  update public.orders
  set
    payment_method = p_method,
    payment_status = case
      when already_paid + p_amount >= total then 'pagado'
      else 'parcial'
    end,
    status = case
      when already_paid + p_amount >= total then 'Completado'
      else status
    end,
    updated_at = now()
  where id = p_order_id
  returning * into target_order;

  insert into public.audit_logs(actor_id, action, entity_name, entity_id, payload)
  values (
    auth.uid(),
    'payment.recorded',
    'orders',
    p_order_id,
    jsonb_build_object(
      'transaction_id', p_transaction_id,
      'amount', p_amount,
      'method', p_method
    )
  );
  return target_order;
end;
$$;

revoke all on function public.record_order_payment(text, numeric, text, text, numeric, text) from public;
grant execute on function public.record_order_payment(text, numeric, text, text, numeric, text) to authenticated;

create or replace function public.record_client_repayment(
  p_client_id text,
  p_amount numeric,
  p_transaction_id text
)
returns public.client_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  target_client public.client_accounts;
  ledger public.cash_ledger;
  transaction_payload jsonb;
begin
  if auth.uid() is null
    or not public.is_staff_role(array['administrador','dueño','cajero','mesero']) then
    raise exception 'billing role required' using errcode = '42501';
  end if;
  if p_amount <= 0 or p_transaction_id is null or length(p_transaction_id) < 8 then
    raise exception 'invalid repayment' using errcode = '22023';
  end if;

  select * into target_client
  from public.client_accounts
  where id = p_client_id
  for update;
  if not found then
    raise exception 'client account not found' using errcode = 'P0002';
  end if;
  if target_client.balance >= 0 or target_client.balance + p_amount > 0.01 then
    raise exception 'repayment exceeds debt' using errcode = '23514';
  end if;

  insert into public.cash_ledger(id) values ('current')
  on conflict (id) do nothing;
  select * into ledger
  from public.cash_ledger
  where id = 'current'
  for update;
  if not ledger.is_open then
    raise exception 'cash shift is not open' using errcode = '23514';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(coalesce(ledger.transactions, '[]'::jsonb)) tx
    where tx->>'id' = p_transaction_id
  ) then
    return target_client;
  end if;

  update public.client_accounts
  set balance = balance + p_amount, updated_at = now()
  where id = p_client_id
  returning * into target_client;

  transaction_payload := jsonb_build_object(
    'id', p_transaction_id,
    'type', 'Abono Cta Cte',
    'orderId', 'CTA-' || p_client_id,
    'total', round(p_amount, 2),
    'method', 'Efectivo',
    'timestamp', now()
  );
  update public.cash_ledger
  set
    total_collected = total_collected + p_amount,
    cash = cash + p_amount,
    transactions = jsonb_build_array(transaction_payload) || coalesce(transactions, '[]'::jsonb),
    updated_at = now()
  where id = 'current';

  insert into public.audit_logs(actor_id, action, entity_name, entity_id, payload)
  values (
    auth.uid(),
    'client.repayment',
    'client_accounts',
    p_client_id,
    jsonb_build_object('transaction_id', p_transaction_id, 'amount', p_amount)
  );
  return target_client;
end;
$$;

revoke all on function public.record_client_repayment(text, numeric, text) from public;
grant execute on function public.record_client_repayment(text, numeric, text) to authenticated;

create or replace function public.open_cash_shift()
returns public.cash_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  ledger public.cash_ledger;
begin
  if auth.uid() is null
    or not public.is_staff_role(array['administrador','dueño','cajero']) then
    raise exception 'cashier role required' using errcode = '42501';
  end if;
  insert into public.cash_ledger(id) values ('current')
  on conflict (id) do nothing;
  select * into ledger from public.cash_ledger where id = 'current' for update;
  if ledger.is_open then
    raise exception 'cash shift is already open' using errcode = '23505';
  end if;
  update public.cash_ledger
  set
    total_collected = 0,
    cash = 0,
    card = 0,
    mercadopago = 0,
    transactions = '[]'::jsonb,
    is_open = true,
    opened_at = now(),
    opened_by = auth.uid(),
    updated_at = now()
  where id = 'current'
  returning * into ledger;
  insert into public.audit_logs(actor_id, action, entity_name, entity_id)
  values (auth.uid(), 'cash.shift_opened', 'cash_ledger', 'current');
  return ledger;
end;
$$;

create or replace function public.close_cash_shift(
  p_declared_cash numeric,
  p_notes text default null
)
returns public.cash_closures
language plpgsql
security definer
set search_path = public
as $$
declare
  ledger public.cash_ledger;
  closure public.cash_closures;
  staff_name text;
begin
  if auth.uid() is null
    or not public.is_staff_role(array['administrador','dueño','cajero']) then
    raise exception 'cashier role required' using errcode = '42501';
  end if;
  if p_declared_cash < 0 then
    raise exception 'invalid declared cash' using errcode = '22023';
  end if;
  select * into ledger from public.cash_ledger where id = 'current' for update;
  if not found or not ledger.is_open then
    raise exception 'cash shift is not open' using errcode = '23514';
  end if;
  select name into staff_name
  from public.users_accounts
  where auth_user_id = auth.uid()
  limit 1;
  insert into public.cash_closures(
    id,
    user_id,
    user_name,
    opened_at,
    closed_at,
    sales_total,
    declared_cash,
    difference,
    notes,
    transactions
  )
  values (
    'cls-' || gen_random_uuid()::text,
    auth.uid(),
    coalesce(staff_name, 'Usuario autenticado'),
    ledger.opened_at,
    now(),
    ledger.total_collected,
    p_declared_cash,
    p_declared_cash - ledger.total_collected,
    nullif(trim(p_notes), ''),
    ledger.transactions
  )
  returning * into closure;
  update public.cash_ledger
  set
    total_collected = 0,
    cash = 0,
    card = 0,
    mercadopago = 0,
    transactions = '[]'::jsonb,
    is_open = false,
    opened_at = null,
    opened_by = null,
    updated_at = now()
  where id = 'current';
  insert into public.audit_logs(actor_id, action, entity_name, entity_id, payload)
  values (
    auth.uid(),
    'cash.shift_closed',
    'cash_closures',
    closure.id,
    jsonb_build_object('sales_total', closure.sales_total, 'difference', closure.difference)
  );
  return closure;
end;
$$;

revoke all on function public.open_cash_shift() from public;
revoke all on function public.close_cash_shift(numeric, text) from public;
grant execute on function public.open_cash_shift() to authenticated;
grant execute on function public.close_cash_shift(numeric, text) to authenticated;

create or replace function public.adjust_inventory_stock(
  p_insumo_id text,
  p_delta numeric,
  p_reason text default null,
  p_estimated_cost numeric default 0
)
returns public.insumos
language plpgsql
security definer
set search_path = public
as $$
declare
  target_insumo public.insumos;
  next_quantity numeric;
  movement_kind text;
  staff_name text;
begin
  if auth.uid() is null
    or not public.is_staff_role(array['administrador','dueño','barista']) then
    raise exception 'inventory role required' using errcode = '42501';
  end if;
  if p_delta = 0 or abs(p_delta) > 1000000 then
    raise exception 'invalid inventory delta' using errcode = '22023';
  end if;
  if coalesce(p_estimated_cost, 0) < 0 then
    raise exception 'invalid estimated cost' using errcode = '22023';
  end if;

  select * into target_insumo
  from public.insumos
  where id = p_insumo_id
  for update;
  if not found then
    raise exception 'inventory item not found' using errcode = 'P0002';
  end if;

  next_quantity := round(target_insumo.quantity + p_delta, 3);
  if next_quantity < 0 then
    raise exception 'insufficient inventory stock' using errcode = '23514';
  end if;

  update public.insumos
  set quantity = next_quantity, updated_at = now()
  where id = p_insumo_id
  returning * into target_insumo;

  movement_kind := case
    when p_delta > 0 then 'entry'
    when coalesce(trim(p_reason), '') <> '' then 'waste'
    else 'adjustment'
  end;
  select name into staff_name
  from public.users_accounts
  where auth_user_id = auth.uid()
  limit 1;

  insert into public.inventory_movements(
    insumo_id,
    item_name,
    unit,
    movement_type,
    quantity,
    stock_before,
    stock_after,
    estimated_cost,
    reason,
    actor_id,
    actor_name
  )
  values (
    p_insumo_id,
    target_insumo.name,
    target_insumo.unit,
    movement_kind,
    abs(p_delta),
    target_insumo.quantity - p_delta,
    target_insumo.quantity,
    coalesce(p_estimated_cost, 0),
    nullif(trim(p_reason), ''),
    auth.uid(),
    staff_name
  );

  insert into public.audit_logs(actor_id, action, entity_name, entity_id, payload)
  values (
    auth.uid(),
    'inventory.adjusted',
    'insumos',
    p_insumo_id,
    jsonb_build_object(
      'delta', p_delta,
      'stock_after', target_insumo.quantity,
      'reason', nullif(trim(p_reason), '')
    )
  );
  return target_insumo;
end;
$$;

revoke all on function public.adjust_inventory_stock(text, numeric, text, numeric) from public;
grant execute on function public.adjust_inventory_stock(text, numeric, text, numeric) to authenticated;

create or replace function public.record_staff_attendance(
  p_staff_id text,
  p_action text,
  p_latitude numeric,
  p_longitude numeric,
  p_location_address text,
  p_gps_accuracy numeric
)
returns public.staff_attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  target_staff public.users_accounts;
  attendance public.staff_attendance;
  normalized_action text := upper(trim(p_action));
  hours_value numeric;
begin
  select * into target_staff
  from public.users_accounts
  where id = p_staff_id and active = true;
  if not found then
    raise exception 'active staff profile not found' using errcode = 'P0002';
  end if;
  if auth.uid() is null or (
    target_staff.auth_user_id <> auth.uid()
    and not public.is_staff_role(array['administrador','dueño'])
  ) then
    raise exception 'attendance permission denied' using errcode = '42501';
  end if;
  if normalized_action not in ('INGRESO','EGRESO') then
    raise exception 'invalid attendance action' using errcode = '22023';
  end if;
  if p_latitude is null or p_longitude is null
    or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180 then
    raise exception 'invalid GPS coordinates' using errcode = '22023';
  end if;

  if normalized_action = 'INGRESO' then
    if exists (
      select 1 from public.staff_attendance
      where staff_id = p_staff_id and check_in_time is not null and check_out_time is null
    ) then
      raise exception 'staff already has an open shift' using errcode = '23505';
    end if;
    insert into public.staff_attendance(
      staff_id,
      staff_name,
      date,
      check_in_time,
      status,
      latitude,
      longitude,
      location_address,
      gps_accuracy
    )
    values (
      p_staff_id,
      target_staff.name,
      current_date,
      now(),
      'presente',
      p_latitude,
      p_longitude,
      nullif(trim(p_location_address), ''),
      greatest(coalesce(p_gps_accuracy, 0), 0)
    )
    returning * into attendance;
  else
    select * into attendance
    from public.staff_attendance
    where staff_id = p_staff_id and check_in_time is not null and check_out_time is null
    order by check_in_time desc
    limit 1
    for update;
    if not found then
      raise exception 'staff has no open shift' using errcode = 'P0002';
    end if;
    hours_value := round(extract(epoch from (now() - attendance.check_in_time)) / 3600.0, 2);
    update public.staff_attendance
    set
      check_out_time = now(),
      hours_worked = greatest(hours_value, 0),
      overtime_hours = greatest(hours_value - 8, 0),
      daily_total = greatest(hours_value, 0) * hourly_rate,
      status = 'finalizado',
      latitude = p_latitude,
      longitude = p_longitude,
      location_address = nullif(trim(p_location_address), ''),
      gps_accuracy = greatest(coalesce(p_gps_accuracy, 0), 0)
    where id = attendance.id
    returning * into attendance;
  end if;

  insert into public.audit_logs(actor_id, action, entity_name, entity_id, payload)
  values (
    auth.uid(),
    'attendance.' || lower(normalized_action),
    'staff_attendance',
    attendance.id,
    jsonb_build_object('staff_id', p_staff_id, 'latitude', p_latitude, 'longitude', p_longitude)
  );
  return attendance;
end;
$$;

revoke all on function public.record_staff_attendance(text, text, numeric, numeric, text, numeric) from public;
grant execute on function public.record_staff_attendance(text, text, numeric, numeric, text, numeric) to authenticated;

create or replace function public.distribute_tip_pool(p_staff_ids text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  setting public.system_settings;
  pool_amount numeric;
  staff_count integer;
  amount_per_staff numeric;
begin
  if auth.uid() is null
    or not public.is_staff_role(array['administrador','dueño']) then
    raise exception 'admin role required' using errcode = '42501';
  end if;
  if p_staff_ids is null or cardinality(p_staff_ids) = 0 then
    raise exception 'at least one staff member is required' using errcode = '22023';
  end if;
  select count(*) into staff_count
  from public.users_accounts
  where id = any(p_staff_ids) and active = true;
  if staff_count <> cardinality(p_staff_ids) then
    raise exception 'invalid or duplicated staff selection' using errcode = '22023';
  end if;

  insert into public.system_settings(key, value)
  values ('tip_pool', '0'::jsonb)
  on conflict (key) do nothing;
  select * into setting
  from public.system_settings
  where key = 'tip_pool'
  for update;
  pool_amount := coalesce((setting.value #>> '{}')::numeric, 0);
  if pool_amount <= 0 then
    raise exception 'tip pool is empty' using errcode = '23514';
  end if;
  amount_per_staff := round(pool_amount / staff_count, 2);

  update public.system_settings
  set value = '0'::jsonb, updated_at = now()
  where key = 'tip_pool';
  insert into public.audit_logs(actor_id, action, entity_name, entity_id, payload)
  values (
    auth.uid(),
    'tips.distributed',
    'system_settings',
    'tip_pool',
    jsonb_build_object(
      'total', pool_amount,
      'amount_per_staff', amount_per_staff,
      'staff_ids', to_jsonb(p_staff_ids)
    )
  );
  return jsonb_build_object(
    'total', pool_amount,
    'amountPerStaff', amount_per_staff,
    'staffCount', staff_count
  );
end;
$$;

revoke all on function public.distribute_tip_pool(text[]) from public;
grant execute on function public.distribute_tip_pool(text[]) to authenticated;

-- --------------------------------------------------------------------------
-- Strict RLS
-- --------------------------------------------------------------------------

alter table public.business_profile enable row level security;
alter table public.daily_menu enable row level security;
alter table public.menu_items enable row level security;
alter table public.product_images enable row level security;
alter table public.insumos enable row level security;
alter table public.suppliers enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.inventory_audits enable row level security;
alter table public.client_accounts enable row level security;
alter table public.users_accounts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reservations enable row level security;
alter table public.waiter_calls enable row level security;
alter table public.cash_ledger enable row level security;
alter table public.cash_closures enable row level security;
alter table public.barista_calibrations enable row level security;
alter table public.system_settings enable row level security;
alter table public.staff_attendance enable row level security;
alter table public.audit_logs enable row level security;
alter table public.fiscal_invoices enable row level security;
alter table public.public_order_rate_limits enable row level security;

revoke all on table
  public.business_profile,
  public.daily_menu,
  public.menu_items,
  public.product_images,
  public.insumos,
  public.suppliers,
  public.restaurant_tables,
  public.inventory_movements,
  public.inventory_audits,
  public.client_accounts,
  public.users_accounts,
  public.orders,
  public.order_items,
  public.reservations,
  public.waiter_calls,
  public.cash_ledger,
  public.cash_closures,
  public.barista_calibrations,
  public.system_settings,
  public.staff_attendance,
  public.audit_logs,
  public.fiscal_invoices,
  public.public_order_rate_limits
from anon;

grant select on public.business_profile, public.daily_menu, public.menu_items, public.product_images, public.restaurant_tables to anon;

grant select, insert, update, delete on table
  public.business_profile,
  public.daily_menu,
  public.menu_items,
  public.product_images,
  public.insumos,
  public.suppliers,
  public.restaurant_tables,
  public.inventory_movements,
  public.inventory_audits,
  public.client_accounts,
  public.users_accounts,
  public.orders,
  public.order_items,
  public.reservations,
  public.waiter_calls,
  public.cash_ledger,
  public.cash_closures,
  public.barista_calibrations,
  public.system_settings,
  public.staff_attendance
to authenticated;
grant select on public.audit_logs, public.fiscal_invoices to authenticated;
grant usage, select on all sequences in schema public to authenticated;

do $$
declare
  target_table text;
  policy_name text;
begin
  for target_table in
    select unnest(array[
      'business_profile','daily_menu','menu_items','product_images','insumos',
      'suppliers','restaurant_tables','inventory_movements','inventory_audits','client_accounts','users_accounts','orders','order_items',
      'reservations','waiter_calls','cash_ledger','cash_closures','barista_calibrations','system_settings',
      'staff_attendance','audit_logs','fiscal_invoices'
    ])
  loop
    for policy_name in
      select polname from pg_policy
      where polrelid = format('public.%I', target_table)::regclass
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, target_table);
    end loop;
  end loop;
end
$$;

create policy business_profile_public_read
  on public.business_profile for select using (true);
create policy business_profile_admin_write
  on public.business_profile for all to authenticated
  using (public.is_staff_role(array['administrador','dueño']))
  with check (public.is_staff_role(array['administrador','dueño']));

create policy daily_menu_public_read
  on public.daily_menu for select using (active = true or auth.uid() is not null);
create policy daily_menu_admin_write
  on public.daily_menu for all to authenticated
  using (public.is_staff_role(array['administrador','dueño']))
  with check (public.is_staff_role(array['administrador','dueño']));

create policy menu_items_public_read
  on public.menu_items for select using (is_available = true or auth.uid() is not null);
create policy menu_items_staff_write
  on public.menu_items for all to authenticated
  using (public.is_staff_role(array['administrador','dueño','barista']))
  with check (public.is_staff_role(array['administrador','dueño','barista']));

create policy product_images_public_read
  on public.product_images for select using (true);
create policy product_images_staff_write
  on public.product_images for all to authenticated
  using (public.is_staff_role(array['administrador','dueño']))
  with check (public.is_staff_role(array['administrador','dueño']));

create policy insumos_staff_access
  on public.insumos for all to authenticated
  using (public.is_staff_role(array['administrador','dueño','barista']))
  with check (public.is_staff_role(array['administrador','dueño','barista']));

create policy suppliers_staff_access
  on public.suppliers for all to authenticated
  using (public.is_staff_role(array['administrador','dueño','barista']))
  with check (public.is_staff_role(array['administrador','dueño','barista']));

create policy restaurant_tables_public_read
  on public.restaurant_tables for select using (active = true or auth.uid() is not null);
create policy restaurant_tables_admin_write
  on public.restaurant_tables for all to authenticated
  using (public.is_staff_role(array['administrador','dueño']))
  with check (public.is_staff_role(array['administrador','dueño']));

create policy inventory_movements_staff_read
  on public.inventory_movements for select to authenticated
  using (public.is_staff_role(array['administrador','dueño','barista']));

create policy inventory_audits_staff_read
  on public.inventory_audits for select to authenticated
  using (public.is_staff_role(array['administrador','dueño','barista']));
create policy inventory_audits_staff_insert
  on public.inventory_audits for insert to authenticated
  with check (
    public.is_staff_role(array['administrador','dueño'])
    or auditor_id in (select id from public.users_accounts where auth_user_id = auth.uid())
  );
create policy inventory_audits_admin_modify
  on public.inventory_audits for update to authenticated
  using (public.is_staff_role(array['administrador','dueño']))
  with check (public.is_staff_role(array['administrador','dueño']));
create policy inventory_audits_admin_delete
  on public.inventory_audits for delete to authenticated
  using (public.is_staff_role(array['administrador','dueño']));

create policy clients_staff_access
  on public.client_accounts for all to authenticated
  using (public.is_staff_role(array['administrador','dueño','cajero','mesero']))
  with check (public.is_staff_role(array['administrador','dueño','cajero','mesero']));

create policy users_own_or_admin_read
  on public.users_accounts for select to authenticated
  using (
    auth_user_id = auth.uid()
    or public.is_staff_role(array['administrador','dueño'])
  );
create policy users_admin_update
  on public.users_accounts for update to authenticated
  using (public.is_staff_role(array['administrador','dueño']))
  with check (public.is_staff_role(array['administrador','dueño']));

create policy orders_staff_access
  on public.orders for all to authenticated
  using (public.is_staff_role(array['administrador','dueño','cajero','barista','mesero']))
  with check (public.is_staff_role(array['administrador','dueño','cajero','barista','mesero']));

create policy order_items_staff_access
  on public.order_items for all to authenticated
  using (public.is_staff_role(array['administrador','dueño','cajero','barista','mesero']))
  with check (public.is_staff_role(array['administrador','dueño','cajero','barista','mesero']));

create policy reservations_staff_access
  on public.reservations for all to authenticated
  using (public.is_staff_role(array['administrador','dueño','cajero','mesero']))
  with check (public.is_staff_role(array['administrador','dueño','cajero','mesero']));

create policy waiter_calls_staff_access
  on public.waiter_calls for all to authenticated
  using (public.is_staff_role(array['administrador','dueño','cajero','mesero']))
  with check (public.is_staff_role(array['administrador','dueño','cajero','mesero']));

create policy cash_ledger_staff_access
  on public.cash_ledger for all to authenticated
  using (public.is_staff_role(array['administrador','dueño','cajero']))
  with check (public.is_staff_role(array['administrador','dueño','cajero']));

create policy cash_closures_staff_access
  on public.cash_closures for all to authenticated
  using (public.is_staff_role(array['administrador','dueño','cajero']))
  with check (public.is_staff_role(array['administrador','dueño','cajero']));

create policy calibrations_staff_access
  on public.barista_calibrations for all to authenticated
  using (public.is_staff_role(array['administrador','dueño','barista']))
  with check (public.is_staff_role(array['administrador','dueño','barista']));

create policy settings_admin_access
  on public.system_settings for all to authenticated
  using (public.is_staff_role(array['administrador','dueño']))
  with check (public.is_staff_role(array['administrador','dueño']));

create policy attendance_own_or_admin_read
  on public.staff_attendance for select to authenticated
  using (
    staff_id in (
      select id from public.users_accounts where auth_user_id = auth.uid()
    )
    or public.is_staff_role(array['administrador','dueño'])
  );
create policy attendance_own_insert
  on public.staff_attendance for insert to authenticated
  with check (
    staff_id in (
      select id from public.users_accounts where auth_user_id = auth.uid()
    )
    or public.is_staff_role(array['administrador','dueño'])
  );
create policy attendance_admin_update
  on public.staff_attendance for update to authenticated
  using (public.is_staff_role(array['administrador','dueño']))
  with check (public.is_staff_role(array['administrador','dueño']));

create policy audit_admin_read
  on public.audit_logs for select to authenticated
  using (public.is_staff_role(array['administrador','dueño']));

create policy fiscal_admin_cashier_read
  on public.fiscal_invoices for select to authenticated
  using (public.is_staff_role(array['administrador','dueño','cajero']));

-- Storage: public product images, authenticated admin writes.
insert into storage.buckets(id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists product_images_storage_public_read on storage.objects;
drop policy if exists product_images_storage_admin_insert on storage.objects;
drop policy if exists product_images_storage_admin_update on storage.objects;
drop policy if exists product_images_storage_admin_delete on storage.objects;

create policy product_images_storage_public_read
  on storage.objects for select
  using (bucket_id = 'product-images');
create policy product_images_storage_admin_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and public.is_staff_role(array['administrador','dueño'])
  );
create policy product_images_storage_admin_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_staff_role(array['administrador','dueño'])
  )
  with check (
    bucket_id = 'product-images'
    and public.is_staff_role(array['administrador','dueño'])
  );
create policy product_images_storage_admin_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_staff_role(array['administrador','dueño'])
  );

-- Realtime publication, idempotently.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reservations'
  ) then
    alter publication supabase_realtime add table public.reservations;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'waiter_calls'
  ) then
    alter publication supabase_realtime add table public.waiter_calls;
  end if;
end
$$;

commit;
