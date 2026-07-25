-- ============================================================================
-- RESTO BAR DEL TEATRO (Constitución 944, Río Cuarto)
-- SCRIPT COMPLETO DE DDBB Y STORAGE PARA SUPABASE (ANTI-GRAVITY ARCHITECTURE)
-- ============================================================================

-- 1. TABLA DE MATERIAS PRIMAS Y INSUMOS (supplies / insumos)
CREATE TABLE IF NOT EXISTS insumos (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  quantity NUMERIC NOT NULL DEFAULT 0,
  min_limit NUMERIC NOT NULL DEFAULT 5,
  cost_per_unit NUMERIC DEFAULT 0,
  provider TEXT DEFAULT 'Distribuidora Sur',
  expiration_date DATE DEFAULT '2026-12-31',
  status TEXT DEFAULT 'OK'
);

-- Alias/Tabla secundaria supplies para retrocompatibilidad
CREATE TABLE IF NOT EXISTS supplies (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  current_stock NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 5,
  cost_per_unit NUMERIC DEFAULT 0,
  provider TEXT DEFAULT 'Distribuidora Sur',
  expiration_date DATE DEFAULT '2026-12-31',
  status TEXT DEFAULT 'OK'
);

-- 2. TABLA DE MENÚ Y PRODUCTOS (menu_items / products)
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  takeaway_price NUMERIC,
  delivery_price NUMERIC,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[],
  image TEXT,
  customizable BOOLEAN DEFAULT TRUE,
  calories INTEGER DEFAULT 180,
  allergens TEXT[],
  stock INTEGER DEFAULT 50,
  is_offer BOOLEAN DEFAULT FALSE,
  recipe JSONB DEFAULT '[]'::jsonb
);

-- Alias products para retrocompatibilidad
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  takeaway_price NUMERIC,
  delivery_price NUMERIC,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  image TEXT,
  stock INTEGER DEFAULT 50,
  recipe JSONB DEFAULT '[]'::jsonb
);

-- 3. TABLA DE COMANDAS Y PEDIDOS (orders)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  order_type TEXT NOT NULL DEFAULT 'salon', -- 'salon', 'retiro', 'delivery'
  table_number TEXT,
  client_name TEXT NOT NULL DEFAULT 'Cliente Salón',
  waiter_name TEXT DEFAULT 'Mozo Asignado',
  status TEXT NOT NULL DEFAULT 'Recibido', -- 'Recibido', 'Preparando', 'Listo', 'Completado'
  payment_method TEXT DEFAULT 'Efectivo',
  payment_status TEXT DEFAULT 'pendiente', -- 'pendiente', 'cobrado'
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  tip NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  observations TEXT,
  driver_name TEXT,
  delivery_address TEXT,
  delivery_fee NUMERIC DEFAULT 0
);

-- 4. TABLA DE ÍTEMS DE COMANDA (order_items)
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  notes TEXT
);

-- 5. TABLA DE CUENTAS CORRIENTES / FIADO (client_accounts)
CREATE TABLE IF NOT EXISTS client_accounts (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  phone TEXT,
  dni_cuit TEXT,
  credit_limit NUMERIC DEFAULT 50000,
  current_balance NUMERIC DEFAULT 0,
  notes TEXT
);

-- 6. TABLA DE ASISTENCIA DE PERSONAL (staff_attendance)
CREATE TABLE IF NOT EXISTS staff_attendance (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  employee_name TEXT NOT NULL,
  action TEXT NOT NULL, -- 'INGRESO', 'EGRESO'
  timestamp TEXT NOT NULL,
  location_address TEXT
);

-- 7. TABLA DE IMÁGENES DE PRODUCTOS (product_images - Base64 fallback)
CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  image_base64 TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DESBLOQUEO TOTAL DE SEGURIDAD RLS (ANTI-GRAVITY AUTONOMOUS MODE)
-- ============================================================================
ALTER TABLE insumos DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplies DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;

-- SEED DATA DE RESTO BAR DEL TEATRO (Constitución 944, Río Cuarto)
INSERT INTO insumos (id, name, unit, quantity, min_limit, cost_per_unit, provider)
VALUES 
  ('ins-1', 'Queso Muzzarella Trozada', 'kg', 25.5, 8.0, 4800, 'Lácteos San Martin'),
  ('ins-2', 'Café en Grano Especialidad Blend Teatro', 'kg', 12.0, 4.0, 18500, 'Roaster Sur'),
  ('ins-3', 'Harina 0000 Masa Madre', 'kg', 45.0, 15.0, 950, 'Molino Río Cuarto'),
  ('ins-4', 'Papas Rústicas Selección', 'kg', 60.0, 20.0, 650, 'Verdulería Don Pedro'),
  ('ins-5', 'Bife de Chorizo Premium 400g', 'un', 30.0, 10.0, 3800, 'Frigorífico Central')
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (id, name, price, takeaway_price, delivery_price, category, description, stock)
VALUES 
  ('prod-piz-1', 'Pizza Cinco Quesos Teatral', 16500, 14850, 18500, 'pizzas_focaccias', 'Blend de Muzzarella 200g, Queso Azul 60g, Provolone 60g, Fynbo y Reggianito 20g perfumado con hilos de pesto.', 25),
  ('prod-foc-1', 'Focaccia de Milanesa Completa', 11500, 10350, 12900, 'pizzas_focaccias', 'Base de focaccia de masa madre con milanesa tierna de carne 170g, jamón horneado, muzzarella, papas, tomate, lechuga y huevo frito.', 18),
  ('prod-car-1', 'Bife de Chorizo a las Brasas con Papas', 18500, 16650, 20900, 'minutas_carnes', 'Corte premium de bife de chorizo de 400g a las brasas con papas fritas rústicas.', 20)
ON CONFLICT (id) DO NOTHING;
