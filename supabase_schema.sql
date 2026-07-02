-- ==========================================
-- SCRIPT DE MIGRACIÓN PARA SUPABASE
-- Café Puglia - La Plata, Argentina
-- Ejecute este script completo en el Editor SQL de Supabase
-- ==========================================

-- 1. Tabla de Catálogo de Productos (Menu)
CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    takeaway_price NUMERIC,
    delivery_price NUMERIC,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}'::text[],
    image TEXT NOT NULL,
    customizable BOOLEAN NOT NULL DEFAULT false,
    calories INTEGER,
    allergens TEXT[] DEFAULT '{}'::text[],
    stock INTEGER,
    is_offer BOOLEAN DEFAULT false,
    offer_price NUMERIC,
    recipe JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de Insumos / Materias Primas
CREATE TABLE IF NOT EXISTS insumos (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    min_limit NUMERIC NOT NULL DEFAULT 0,
    provider TEXT,
    expiration_date TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de Comandas (Orders)
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    type TEXT NOT NULL,
    price_list TEXT NOT NULL DEFAULT 'Salon',
    table_reservation_id TEXT,
    table_number TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    estimated_minutes INTEGER NOT NULL DEFAULT 10,
    payment_method TEXT,
    coupon_number TEXT,
    client_account_name TEXT,
    tip_amount NUMERIC DEFAULT 0,
    fiscal JSONB,
    db_created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabla de Cuentas Corrientes (Fiado / Client Accounts)
CREATE TABLE IF NOT EXISTS client_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cuit TEXT NOT NULL,
    phone TEXT NOT NULL,
    balance NUMERIC NOT NULL DEFAULT 0,
    credit_limit NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabla de Reservas de Mesas
CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    table_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    guests INTEGER NOT NULL DEFAULT 1,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    created_at TEXT NOT NULL,
    reference_code TEXT NOT NULL,
    db_created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabla de Calibración Diaria de Café (Barista)
CREATE TABLE IF NOT EXISTS barista_calibrations (
    id SERIAL PRIMARY KEY,
    gramos_in NUMERIC NOT NULL,
    mililitros_out NUMERIC NOT NULL,
    tiempo INTEGER NOT NULL,
    temperatura NUMERIC NOT NULL,
    clima TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Tabla de Caja Registradora (Cash Ledger)
CREATE TABLE IF NOT EXISTS cash_ledger (
    id TEXT PRIMARY KEY DEFAULT 'current',
    total_collected NUMERIC NOT NULL DEFAULT 0,
    cash NUMERIC NOT NULL DEFAULT 0,
    card NUMERIC NOT NULL DEFAULT 0,
    mercadopago NUMERIC NOT NULL DEFAULT 0,
    transactions JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Tabla para Ajustes Globales (Propinas, Configs Clave-Valor)
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- DESACTIVAR RLS (ROW LEVEL SECURITY)
-- Para simplificar la conexión en redes internas de administración.
-- ==========================================
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE insumos DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE barista_calibrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;
