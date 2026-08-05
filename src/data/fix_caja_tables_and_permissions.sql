-- Script SQL para el Módulo de Caja & Facturación Fiscal en Supabase
-- Habilita tablas y desactiva restricciones RLS (42501)

CREATE TABLE IF NOT EXISTS public.cash_ledger (
  id TEXT PRIMARY KEY DEFAULT 'current',
  is_open BOOLEAN DEFAULT false,
  opened_at TIMESTAMPTZ,
  opened_by TEXT,
  total_collected NUMERIC DEFAULT 0,
  cash NUMERIC DEFAULT 0,
  card NUMERIC DEFAULT 0,
  mercadopago NUMERIC DEFAULT 0,
  transactions JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cash_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ DEFAULT now(),
  sales_total NUMERIC DEFAULT 0,
  declared_cash NUMERIC DEFAULT 0,
  difference NUMERIC DEFAULT 0,
  notes TEXT,
  transactions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Permisos y desactivación de RLS para garantizar que todos los usuarios (cajero, admin, mozo) puedan registrar datos
GRANT ALL PRIVILEGES ON TABLE public.cash_ledger TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.cash_closures TO anon, authenticated, service_role;

ALTER TABLE public.cash_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_closures DISABLE ROW LEVEL SECURITY;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
