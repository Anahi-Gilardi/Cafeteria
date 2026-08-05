-- Reafirma el límite público/privado ante cambios manuales o drift del proyecto remoto.
-- La carta pública usa tablas explícitamente públicas y las altas anónimas pasan por Edge Functions.
begin;

alter table public.insumos enable row level security;
alter table public.suppliers enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.inventory_audits enable row level security;
alter table public.client_accounts enable row level security;
alter table public.users_accounts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.archived_orders enable row level security;
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
  public.insumos,
  public.suppliers,
  public.inventory_movements,
  public.inventory_audits,
  public.client_accounts,
  public.users_accounts,
  public.orders,
  public.order_items,
  public.archived_orders,
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

commit;
