-- Keep order revisions, item snapshots and inventory in one transaction.
-- Also publish catalog changes so every terminal receives price/stock updates.

begin;

create or replace function public.persist_order_transaction(
  p_order jsonb,
  p_idempotency_key text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders;
  saved_order public.orders;
  line jsonb;
  recipe_line jsonb;
  line_item_id text;
  line_qty numeric;
  line_price numeric;
  ingredient_id text;
  ingredient_amount numeric;
  items_changed boolean;
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
  if nullif(p_order->>'id', '') is null then
    raise exception 'order id is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_order->'items') <> 'array' or jsonb_array_length(p_order->'items') = 0 then
    raise exception 'order items are required' using errcode = '22023';
  end if;

  select *
  into target_order
  from public.orders
  where id = p_order->>'id'
  for update;

  if not found then
    return public.save_order_transaction(p_order, p_idempotency_key);
  end if;

  items_changed := target_order.items is distinct from p_order->'items';
  if items_changed and coalesce(target_order.payment_status, 'pendiente') = 'pagado' then
    raise exception 'a paid order cannot change its items' using errcode = '23514';
  end if;

  if items_changed then
    -- Restore the previous reservation before applying the revised item list.
    for line in select value from jsonb_array_elements(coalesce(target_order.items, '[]'::jsonb))
    loop
      line_item_id := nullif(line->>'itemId', '');
      line_qty := coalesce((line->>'quantity')::numeric, 0);

      if line_item_id is not null and line_qty > 0 then
        update public.menu_items
        set stock = stock + line_qty, updated_at = now()
        where id = line_item_id;

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
          end if;
        end loop;
      end if;
    end loop;

    delete from public.order_items where order_id = target_order.id;

    -- Reserve the revised quantities and recreate the relational line items.
    for line in select value from jsonb_array_elements(p_order->'items')
    loop
      line_item_id := nullif(line->>'itemId', '');
      line_qty := coalesce((line->>'quantity')::numeric, 0);
      line_price := coalesce((line->>'price')::numeric, 0);

      if line_item_id is null or line_qty <= 0 or line_price < 0 then
        raise exception 'invalid order item' using errcode = '22023';
      end if;

      update public.menu_items
      set stock = stock - line_qty, updated_at = now()
      where id = line_item_id and is_available = true and stock >= line_qty;

      if not found then
        raise exception 'insufficient or unavailable stock for item %', line_item_id
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

      insert into public.order_items (
        order_id, item_id, item_name, quantity, unit_price, subtotal,
        customization_summary, destination
      ) values (
        target_order.id,
        line_item_id,
        line->>'name',
        line_qty,
        line_price,
        round(line_qty * line_price, 2),
        line->>'customizationSummary',
        line->>'destination'
      );
    end loop;
  end if;

  update public.orders
  set
    order_type = coalesce(p_order->>'order_type', target_order.order_type),
    table_number = p_order->>'table_number',
    client_name = coalesce(p_order->>'client_name', target_order.client_name),
    client_phone = p_order->>'client_phone',
    client_address = p_order->>'client_address',
    waiter_name = p_order->>'waiter_name',
    items = p_order->'items',
    status = coalesce(p_order->>'status', target_order.status),
    payment_method = coalesce(p_order->>'payment_method', target_order.payment_method),
    subtotal = case
      when coalesce(target_order.payment_status, 'pendiente') = 'pagado' then target_order.subtotal
      else coalesce((p_order->>'subtotal')::numeric, target_order.subtotal)
    end,
    tax = case
      when coalesce(target_order.payment_status, 'pendiente') = 'pagado' then target_order.tax
      else coalesce((p_order->>'tax')::numeric, target_order.tax)
    end,
    total = case
      when coalesce(target_order.payment_status, 'pendiente') = 'pagado' then target_order.total
      else coalesce((p_order->>'total')::numeric, target_order.total)
    end,
    price_list = coalesce(p_order->>'price_list', target_order.price_list),
    type = coalesce(p_order->>'type', target_order.type),
    fiscal = coalesce(p_order->'fiscal', target_order.fiscal),
    coupon_number = coalesce(p_order->>'coupon_number', target_order.coupon_number),
    client_account_name = coalesce(p_order->>'client_account_name', target_order.client_account_name),
    tip_amount = case
      when coalesce(target_order.payment_status, 'pendiente') = 'pagado' then target_order.tip_amount
      else coalesce((p_order->>'tip_amount')::numeric, target_order.tip_amount)
    end,
    delivery_fee = case
      when coalesce(target_order.payment_status, 'pendiente') = 'pagado' then target_order.delivery_fee
      else coalesce((p_order->>'delivery_fee')::numeric, target_order.delivery_fee)
    end,
    updated_at = now()
  where id = target_order.id
  returning * into saved_order;

  insert into public.audit_logs(actor_id, action, entity_name, entity_id, payload)
  values (
    auth.uid(),
    'order.updated',
    'orders',
    saved_order.id,
    jsonb_build_object(
      'items_changed', items_changed,
      'status_before', target_order.status,
      'status_after', saved_order.status,
      'total_before', target_order.total,
      'total_after', saved_order.total
    )
  );

  return saved_order;
end;
$$;

revoke all on function public.persist_order_transaction(jsonb, text) from public;
grant execute on function public.persist_order_transaction(jsonb, text) to authenticated;
grant execute on function public.persist_order_transaction(jsonb, text) to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'menu_items'
  ) then
    alter publication supabase_realtime add table public.menu_items;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'product_images'
  ) then
    alter publication supabase_realtime add table public.product_images;
  end if;
end
$$;

commit;
