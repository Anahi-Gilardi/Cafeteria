-- Atomic multi-method payments. Every entry succeeds or the complete batch rolls back.
create or replace function public.record_order_payment_batch(
  p_order_id text,
  p_payments jsonb,
  p_discount numeric default 0,
  p_client_account_id text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  payment jsonb;
  payment_count integer;
  transaction_count integer;
  target_order public.orders;
begin
  if auth.uid() is null
    or not public.is_staff_role(array['administrador','dueño','cajero','mesero']) then
    raise exception 'billing role required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_payments) <> 'array' then
    raise exception 'payments must be an array' using errcode = '22023';
  end if;

  payment_count := jsonb_array_length(p_payments);
  if payment_count < 1 or payment_count > 4 then
    raise exception 'invalid payment count' using errcode = '22023';
  end if;

  select count(distinct item->>'transaction_id')
  into transaction_count
  from jsonb_array_elements(p_payments) item;

  if transaction_count <> payment_count then
    raise exception 'duplicate transaction id in batch' using errcode = '22023';
  end if;

  for payment in select value from jsonb_array_elements(p_payments)
  loop
    if payment->>'transaction_id' is null
      or payment->>'method' is null
      or payment->>'amount' is null then
      raise exception 'incomplete payment entry' using errcode = '22023';
    end if;

    target_order := public.record_order_payment(
      p_order_id,
      (payment->>'amount')::numeric,
      payment->>'method',
      payment->>'transaction_id',
      p_discount,
      p_client_account_id
    );
  end loop;

  return target_order;
end;
$$;

revoke all on function public.record_order_payment_batch(text, jsonb, numeric, text) from public;
grant execute on function public.record_order_payment_batch(text, jsonb, numeric, text) to authenticated;
