-- ==============================================================================
-- RESTO BAR DEL TEATRO - Supabase DB Migration Script for Orders Table
-- Run this in the Supabase Dashboard -> SQL Editor
-- ==============================================================================

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  order_type TEXT DEFAULT 'salon', -- 'salon', 'takeaway', 'delivery'
  table_number TEXT,
  client_name TEXT DEFAULT 'Consumidor Final',
  client_phone TEXT,
  client_address TEXT,
  waiter_name TEXT,
  items JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'Recibido',
  payment_method TEXT,
  subtotal NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  price_list TEXT DEFAULT 'Salon',
  type TEXT DEFAULT 'Mesa',
  fiscal JSONB,
  coupon_number TEXT,
  client_account_name TEXT,
  tip_amount NUMERIC DEFAULT 0
);

-- Enable RLS (Row Level Security) with open public policy for POS operation
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all public access to orders" ON orders
  FOR ALL USING (true) WITH CHECK (true);
