-- Controlled deletion for ready kitchen orders.
-- Archiving remains the default historical action. Permanent deletion is limited
-- to owners/admins, rejects financially relevant orders, and reverses inventory
-- only when the original order was created by the atomic inventory transaction.

create or replace function public.delete_order_transaction(
  p_order_id text,
  p_reason text default 'Eliminacion manual desde Cocina y Chef'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders;
  line jsonb;
  line_item_id text;
  line_qty numeric;
  recipe_line jsonb;
  ingredient_id text;
  ingredient_amount numeric;
  normalized_reason text := trim(coalesce(p_reason, ''));
  inventory_was_consumed boolean := false;
  fiscal_record_exists boolean := false;
  payment_record_exists boolean := false;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if not public.is_staff_role(array['administrador','dueño']) then
    raise exception 'administrator or owner role required' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_order_id, '')), '') is null then
    raise exception 'order id is required' using errcode = '22023';
  end if;
  if length(normalized_reason) < 5 or length(normalized_reason) > 250 then
    raise exception 'deletion reason must contain between 5 and 250 characters'
      using errcode = '22023';
  end if;

  select *
  into target_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;
  if target_order.status <> 'Listo' then
    raise exception 'only ready, unarchived orders can be deleted' using errcode = '23514';
  end if;
  if coalesce(target_order.payment_status, 'pendiente') <> 'pendiente'
    or target_order.payment_method is not null then
    raise exception 'paid or partially paid orders cannot be deleted' using errcode = '23514';
  end if;
  if target_order.fiscal is not null and target_order.fiscal <> 'null'::jsonb then
    raise exception 'fiscal orders cannot be deleted' using errcode = '23514';
  end if;

  select exists (
    select 1
    from public.fiscal_invoices
    where order_id = p_order_id
  ) into fiscal_record_exists;

  if fiscal_record_exists then
    raise exception 'orders with fiscal records cannot be deleted' using errcode = '23514';
  end if;

  select exists (
    select 1
    from public.cash_ledger ledger,
      lateral jsonb_array_elements(coalesce(ledger.transactions, '[]'::jsonb)) transaction_row
    where transaction_row->>'orderId' = p_order_id
  ) into payment_record_exists;

  if payment_record_exists then
    raise exception 'orders with cash ledger transactions cannot be deleted' using errcode = '23514';
  end if;

  select exists (
    select 1
    from public.audit_logs
    where entity_name = 'orders'
      and entity_id = p_order_id
      and action = 'order.created'
  ) into inventory_was_consumed;

  if inventory_was_consumed then
    for line in select value from jsonb_array_elements(coalesce(target_order.items, '[]'::jsonb))
    loop
      line_item_id := nullif(line->>'itemId', '');
      line_qty := coalesce((line->>'quantity')::numeric, 0);

      if line_item_id is not null and line_qty > 0 then
        update public.menu_items
        set stock = stock + line_qty, updated_at = now()
        where id = line_item_id;

        if not found then
          raise exception 'menu item % no longer exists; inventory was not restored', line_item_id
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
            set quantity = quantity + ingredient_amount, updated_at = now()
            where id = ingredient_id;

            if not found then
              raise exception 'raw material % no longer exists; inventory was not restored', ingredient_id
                using errcode = '23514';
            end if;
          end if;
        end loop;
      end if;
    end loop;
  end if;

  insert into public.audit_logs(actor_id, action, entity_name, entity_id, payload)
  values (
    auth.uid(),
    'order.deleted',
    'orders',
    target_order.id,
    jsonb_build_object(
      'reason', normalized_reason,
      'status', target_order.status,
      'total', target_order.total,
      'payment_status', target_order.payment_status,
      'inventory_restored', inventory_was_consumed,
      'order_snapshot', to_jsonb(target_order)
    )
  );

  -- Defensive cleanup for an inconsistent/stale archive record. A valid ready
  -- order should not normally have one, but the operation must remain atomic.
  delete from public.archived_orders where order_id = p_order_id;
  delete from public.orders where id = p_order_id;

  return jsonb_build_object(
    'deleted', true,
    'order_id', p_order_id,
    'inventory_restored', inventory_was_consumed
  );
end;
$$;

revoke all on function public.delete_order_transaction(text, text) from public;
grant execute on function public.delete_order_transaction(text, text) to authenticated;

