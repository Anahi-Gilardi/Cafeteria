-- Durable, queryable archive for completed kitchen orders.
-- The canonical order remains in public.orders; this table stores an immutable-style
-- operational snapshot so archiving never means deleting business history.

create table if not exists public.archived_orders (
  order_id text primary key references public.orders(id) on delete restrict,
  archived_at timestamptz not null default now(),
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text not null default 'kds_completed',
  original_created_at timestamptz not null,
  source text not null,
  table_number text,
  client_name text,
  waiter_name text,
  payment_method text,
  total numeric(12,2) not null check (total >= 0),
  order_snapshot jsonb not null
);

create index if not exists archived_orders_archived_at_idx
  on public.archived_orders(archived_at desc);
create index if not exists archived_orders_original_created_at_idx
  on public.archived_orders(original_created_at desc);
create index if not exists archived_orders_table_number_idx
  on public.archived_orders(table_number);

create or replace function public.capture_completed_order_archive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_items jsonb;
begin
  if new.status <> 'Completado' then
    return new;
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(order_line) order by order_line.created_at, order_line.id),
    '[]'::jsonb
  )
  into normalized_items
  from public.order_items as order_line
  where order_line.order_id = new.id;

  insert into public.archived_orders (
    order_id,
    archived_at,
    archived_by,
    archive_reason,
    original_created_at,
    source,
    table_number,
    client_name,
    waiter_name,
    payment_method,
    total,
    order_snapshot
  ) values (
    new.id,
    now(),
    auth.uid(),
    case when tg_op = 'INSERT' then 'completed_on_create' else 'kds_completed' end,
    new.created_at,
    new.source,
    new.table_number,
    new.client_name,
    new.waiter_name,
    new.payment_method,
    new.total,
    to_jsonb(new) || jsonb_build_object('order_items', normalized_items)
  )
  on conflict (order_id) do update
  set
    archived_at = excluded.archived_at,
    archived_by = coalesce(excluded.archived_by, public.archived_orders.archived_by),
    archive_reason = excluded.archive_reason,
    original_created_at = excluded.original_created_at,
    source = excluded.source,
    table_number = excluded.table_number,
    client_name = excluded.client_name,
    waiter_name = excluded.waiter_name,
    payment_method = excluded.payment_method,
    total = excluded.total,
    order_snapshot = excluded.order_snapshot;

  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.audit_logs(actor_id, action, entity_name, entity_id, payload)
    values (
      auth.uid(),
      'order.archived',
      'archived_orders',
      new.id,
      jsonb_build_object('previous_status', case when tg_op = 'UPDATE' then old.status else null end)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists archive_completed_order_trigger on public.orders;
create trigger archive_completed_order_trigger
after insert or update of status on public.orders
for each row
when (new.status = 'Completado')
execute function public.capture_completed_order_archive();

create or replace function public.archive_order(p_order_id text)
returns public.archived_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders;
  archived_order public.archived_orders;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if not public.is_staff_role(array['administrador','dueño','cajero','barista','mesero']) then
    raise exception 'staff role required' using errcode = '42501';
  end if;

  select *
  into target_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;
  if target_order.status not in ('Listo', 'Completado') then
    raise exception 'only ready orders can be archived' using errcode = '23514';
  end if;

  -- Updating even an already completed order makes the operation idempotently repair
  -- a missing or stale archive snapshot through the trigger.
  update public.orders
  set status = 'Completado', updated_at = now()
  where id = p_order_id;

  select *
  into archived_order
  from public.archived_orders
  where order_id = p_order_id;

  return archived_order;
end;
$$;

revoke all on function public.archive_order(text) from public;
grant execute on function public.archive_order(text) to authenticated;

alter table public.archived_orders enable row level security;
revoke all on table public.archived_orders from anon;
revoke insert, update, delete on table public.archived_orders from authenticated;
grant select on table public.archived_orders to authenticated;

drop policy if exists archived_orders_staff_read on public.archived_orders;
create policy archived_orders_staff_read
  on public.archived_orders for select to authenticated
  using (
    public.is_staff_role(array['administrador','dueño','cajero','barista','mesero'])
  );

-- Backfill all historic completed orders without modifying or deleting their source rows.
insert into public.archived_orders (
  order_id,
  archived_at,
  archived_by,
  archive_reason,
  original_created_at,
  source,
  table_number,
  client_name,
  waiter_name,
  payment_method,
  total,
  order_snapshot
)
select
  existing_order.id,
  coalesce(existing_order.updated_at, existing_order.created_at),
  null,
  'migration_backfill',
  existing_order.created_at,
  existing_order.source,
  existing_order.table_number,
  existing_order.client_name,
  existing_order.waiter_name,
  existing_order.payment_method,
  existing_order.total,
  to_jsonb(existing_order) || jsonb_build_object(
    'order_items',
    coalesce(
      (
        select jsonb_agg(to_jsonb(order_line) order by order_line.created_at, order_line.id)
        from public.order_items as order_line
        where order_line.order_id = existing_order.id
      ),
      '[]'::jsonb
    )
  )
from public.orders as existing_order
where existing_order.status = 'Completado'
on conflict (order_id) do nothing;

do $$
begin
  alter publication supabase_realtime add table public.archived_orders;
exception
  when duplicate_object then null;
end
$$;
