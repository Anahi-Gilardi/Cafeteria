-- Cash shifts must only change through the audited transactional RPCs.
revoke insert, update, delete on table public.cash_ledger from authenticated;
revoke insert, update, delete on table public.cash_closures from authenticated;
grant select on table public.cash_ledger, public.cash_closures to authenticated;

drop policy if exists cash_ledger_staff_access on public.cash_ledger;
create policy cash_ledger_staff_read
  on public.cash_ledger for select to authenticated
  using (public.is_staff_role(array['administrador','dueño','cajero']));

drop policy if exists cash_closures_staff_access on public.cash_closures;
create policy cash_closures_staff_read
  on public.cash_closures for select to authenticated
  using (public.is_staff_role(array['administrador','dueño','cajero']));

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

  select * into ledger
  from public.cash_ledger
  where id = 'current'
  for update;

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
  ) values (
    'cls-' || gen_random_uuid()::text,
    auth.uid(),
    coalesce(staff_name, 'Usuario autenticado'),
    ledger.opened_at,
    now(),
    ledger.total_collected,
    p_declared_cash,
    p_declared_cash - ledger.cash,
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
    jsonb_build_object(
      'sales_total', closure.sales_total,
      'cash_expected', ledger.cash,
      'declared_cash', closure.declared_cash,
      'difference', closure.difference
    )
  );

  return closure;
end;
$$;

revoke all on function public.close_cash_shift(numeric, text) from public;
grant execute on function public.close_cash_shift(numeric, text) to authenticated;
