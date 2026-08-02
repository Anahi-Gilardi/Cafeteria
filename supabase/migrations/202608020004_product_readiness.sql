-- Product readiness: distinguish recipes that are not required and prevent
-- partially enabled fiscal catalog rows.

begin;

alter table public.menu_items
  add column if not exists recipe_required boolean not null default true;

alter table public.menu_items
  drop constraint if exists menu_items_fiscal_configuration_check;

alter table public.menu_items
  add constraint menu_items_fiscal_configuration_check
  check (
    fiscal_enabled = false
    or (
      vat_rate in (0, 10.5, 21, 27)
      and nullif(btrim(arca_item_code), '') is not null
      and nullif(btrim(arca_unit_code), '') is not null
    )
  );

comment on column public.menu_items.recipe_required is
  'False only for finished goods that do not consume raw materials through a technical recipe.';

comment on column public.menu_items.fiscal_enabled is
  'Enables ARCA billing only when VAT, item code and unit code are all configured.';

commit;
