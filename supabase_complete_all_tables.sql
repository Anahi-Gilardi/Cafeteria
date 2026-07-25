-- ==============================================================================
-- RESTO BAR DEL TEATRO - SCRIPT COMPLETO DE ESTRUCTURA Y TABLAS DE SUPABASE
-- Ejecuta este script en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Tabla de Pedidos / Comandas (orders)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  order_type TEXT DEFAULT 'salon',
  table_number TEXT,
  client_name TEXT DEFAULT 'Consumidor Final',
  client_phone TEXT,
  client_address TEXT,
  waiter_name TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
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

-- 2. Tabla de Carta & Productos (menu_items)
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  takeaway_price NUMERIC,
  delivery_price NUMERIC,
  description TEXT,
  category TEXT NOT NULL,
  tags TEXT[],
  image TEXT,
  customizable BOOLEAN DEFAULT false,
  calories NUMERIC,
  allergens TEXT[],
  stock NUMERIC DEFAULT 50,
  is_offer BOOLEAN DEFAULT false,
  offer_price NUMERIC,
  recipe JSONB DEFAULT '[]'::jsonb
);

-- 3. Tabla de Imágenes Base64 de Productos (product_images)
CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  image_base64 TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Cuentas Corrientes de Clientes (client_accounts)
CREATE TABLE IF NOT EXISTS client_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cuit TEXT,
  phone TEXT,
  balance NUMERIC DEFAULT 0,
  credit_limit NUMERIC DEFAULT 20000
);

-- 5. Tabla de Reservas de Mesas (reservations)
CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  table_id TEXT,
  table_name TEXT,
  date TEXT,
  time_slot TEXT,
  guests NUMERIC,
  customer_name TEXT,
  customer_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reference_code TEXT
);

-- 6. Tabla de Usuarios & Personal (users_accounts)
CREATE TABLE IF NOT EXISTS users_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'mesero',
  pin TEXT DEFAULT '1234',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabla de Insumos e Inventario (insumos)
CREATE TABLE IF NOT EXISTS insumos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'u',
  current_stock NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 5,
  cost_per_unit NUMERIC DEFAULT 0,
  supplier TEXT
);

-- 8. Tabla de Flujo de Caja Diaria (cash_ledger)
CREATE TABLE IF NOT EXISTS cash_ledger (
  id TEXT PRIMARY KEY,
  cash NUMERIC DEFAULT 0,
  card NUMERIC DEFAULT 0,
  mercadopago NUMERIC DEFAULT 0,
  total_collected NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabla de Fichajes y Asistencia (staff_attendance)
CREATE TABLE IF NOT EXISTS staff_attendance (
  id TEXT PRIMARY KEY,
  staff_id TEXT,
  staff_name TEXT NOT NULL,
  date TEXT NOT NULL,
  check_in_time TEXT,
  check_out_time TEXT,
  hours_worked NUMERIC DEFAULT 0,
  overtime_hours NUMERIC DEFAULT 0,
  hourly_rate NUMERIC DEFAULT 0,
  daily_total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'presente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Tabla de Ajustes de Sistema (system_settings)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Tabla de Calibración Barista (barista_calibrations)
CREATE TABLE IF NOT EXISTS barista_calibrations (
  id SERIAL PRIMARY KEY,
  gramos_in NUMERIC,
  mililitros_out NUMERIC,
  tiempo NUMERIC,
  temperatura NUMERIC,
  clima TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- DESHABILITAR DESBLOQUEO RLS PARA PERMITIR OPERACIÓN DESDE TERMINAL POS
-- ==============================================================================
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE insumos DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE barista_calibrations DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- DATOS INICIALES POR DEFECTO (USUARIOS Y CUENTAS)
-- ==============================================================================
INSERT INTO users_accounts (id, name, email, password, role, pin)
VALUES 
  ('usr-1', 'Pablo Madina (Administrador)', 'pablo@cafepuglia.com', 'pablo123', 'administrador', '1111'),
  ('usr-2', 'Rami Madina (Barista)', 'rami@cafepuglia.com', 'barista123', 'barista', '2222'),
  ('usr-3', 'Silvana Madina (Mesero)', 'silvana@cafepuglia.com', 'mesero123', 'mesero', '3333')
ON CONFLICT (id) DO NOTHING;

INSERT INTO client_accounts (id, name, cuit, phone, balance, credit_limit)
VALUES 
  ('cli-1', 'Mariano Closs', '20-33445566-9', '11-4567-8901', -450.00, 20000),
  ('cli-2', 'Estela de Carlotto', '27-05556667-1', '11-9876-5432', 0.00, 50000),
  ('cli-3', 'Enzo Francescoli', '20-99887766-3', '11-2345-6789', -1200.00, 30000)
ON CONFLICT (id) DO NOTHING;
