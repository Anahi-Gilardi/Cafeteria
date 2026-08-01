-- ==============================================================================
-- CASTAÑO RESTO BAR — SCRIPT DE OPTIMIZACIÓN DE BASE DE DATOS SUPABASE (SQL)
-- ==============================================================================

-- 1. Índices Compuestos para Consulta y Filtrado de Comandas en Tiempo Real (< 15ms)
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at 
  ON public.orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_active_tables 
  ON public.orders (table_number, status) 
  WHERE status != 'Completado';

CREATE INDEX IF NOT EXISTS idx_orders_order_type 
  ON public.orders (order_type, created_at DESC);

-- 2. Índices para Alertas de Stock Mínimo e Insumos Críticos
CREATE INDEX IF NOT EXISTS idx_insumos_stock_alert 
  ON public.insumos (quantity, min_limit) 
  WHERE quantity <= min_limit;

-- 3. Índices para Cuentas de Usuarios y Perfiles de Personal
CREATE INDEX IF NOT EXISTS idx_users_accounts_auth_active 
  ON public.users_accounts (auth_user_id, active);

-- 4. Índice para Reservas del Día por Estado
CREATE INDEX IF NOT EXISTS idx_table_reservations_date_status 
  ON public.table_reservations (date, time_slot, status);

-- 5. Comentario de Confirmación
COMMENT ON INDEX idx_orders_status_created_at IS 'Acelera el filtrado de comandas activas e historial en el KDS de cocina';
