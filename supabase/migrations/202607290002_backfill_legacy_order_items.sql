-- Normalize historical order lines that were stored only in orders.items.
-- The order-level NOT EXISTS guard makes this safe to rerun after a partial legacy import.

insert into public.order_items (
  order_id,
  item_id,
  item_name,
  quantity,
  unit_price,
  subtotal,
  customization_summary,
  destination,
  created_at
)
select
  o.id,
  mi.id,
  btrim(line.value->>'name'),
  parsed.quantity,
  parsed.unit_price,
  round(parsed.quantity * parsed.unit_price, 2),
  nullif(btrim(line.value->>'customizationSummary'), ''),
  nullif(btrim(line.value->>'destination'), ''),
  o.created_at
from public.orders o
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(o.items) = 'array' then o.items else '[]'::jsonb end
) with ordinality as line(value, position)
cross join lateral (
  select
    case
      when coalesce(line.value->>'quantity', '') ~ '^[0-9]+([.][0-9]+)?$'
        and (line.value->>'quantity')::numeric > 0
      then (line.value->>'quantity')::numeric
      else 1::numeric
    end as quantity,
    case
      when coalesce(line.value->>'price', '') ~ '^[0-9]+([.][0-9]+)?$'
      then (line.value->>'price')::numeric
      else 0::numeric
    end as unit_price
) parsed
left join public.menu_items mi
  on mi.id = coalesce(line.value->>'itemId', line.value->>'id')
where nullif(btrim(line.value->>'name'), '') is not null
  and not exists (
    select 1
    from public.order_items existing
    where existing.order_id = o.id
  );
