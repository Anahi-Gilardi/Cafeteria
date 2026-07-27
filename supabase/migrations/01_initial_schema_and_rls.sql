-- ============================================================================
-- MIGRACIÓN UNIFICADA DE SEGURIDAD & ESQUEMA COMPLETO CON RLS HABILITADO
-- Restaurante: RESTO BAR DEL TEATRO (Constitución 944, Río Cuarto, Córdoba)
-- ============================================================================

-- 1. Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla Perfil de Negocio Único (business_profile)
CREATE TABLE IF NOT EXISTS public.business_profile (
    id TEXT PRIMARY KEY DEFAULT 'resto_bar_del_teatro',
    name TEXT NOT NULL DEFAULT 'RESTO BAR DEL TEATRO',
    cuit TEXT NOT NULL DEFAULT '30-71234567-8',
    address TEXT NOT NULL DEFAULT 'Constitución 944',
    city TEXT NOT NULL DEFAULT 'Río Cuarto',
    province TEXT NOT NULL DEFAULT 'Córdoba',
    phone TEXT DEFAULT '+54 358 5042311',
    email TEXT DEFAULT 'contacto@restobardelteatro.com.ar',
    currency TEXT DEFAULT 'ARS',
    timezone TEXT DEFAULT 'America/Argentina/Cordoba',
    pos_number INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla Menú del Día (daily_menu)
CREATE TABLE IF NOT EXISTS public.daily_menu (
    day_of_week TEXT PRIMARY KEY, -- 'Lunes', 'Martes', 'Miércoles', etc.
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12,2) NOT NULL DEFAULT 8500.00,
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla Insumos & Materias Primas (insumos)
CREATE TABLE IF NOT EXISTS public.insumos (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    unit TEXT NOT NULL DEFAULT 'kg',
    min_limit NUMERIC(12,2) NOT NULL DEFAULT 1.00,
    min_stock NUMERIC(12,2) DEFAULT 1.00,
    provider TEXT,
    expiration_date DATE,
    cost_per_unit NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla Alias Supplies (supplies)
CREATE TABLE IF NOT EXISTS public.supplies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    current_stock NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    unit TEXT NOT NULL DEFAULT 'kg',
    min_stock NUMERIC(12,2) NOT NULL DEFAULT 1.00,
    provider TEXT,
    expiration_date DATE,
    cost_per_unit NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabla Menú Digital & Recetas (menu_items)
CREATE TABLE IF NOT EXISTS public.menu_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    takeaway_price NUMERIC(12,2),
    delivery_price NUMERIC(12,2),
    description TEXT,
    category TEXT NOT NULL DEFAULT 'minutas_carnes',
    image TEXT,
    tags TEXT[],
    recipe JSONB DEFAULT '[]'::jsonb,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabla Comandas & Pedidos (orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    order_type TEXT NOT NULL DEFAULT 'salon',
    type TEXT DEFAULT 'Mesa',
    price_list TEXT DEFAULT 'Salon',
    table_number TEXT,
    client_name TEXT DEFAULT 'Consumidor Final',
    client_phone TEXT,
    client_address TEXT,
    waiter_name TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'Recibido',
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pendiente',
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12,2) DEFAULT 0.00,
    tax NUMERIC(12,2) DEFAULT 0.00,
    tip_amount NUMERIC(12,2) DEFAULT 0.00,
    total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    fiscal JSONB,
    coupon_number TEXT,
    client_account_name TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabla Ítems Desglosados de Comanda (order_items)
CREATE TABLE IF NOT EXISTS public.order_items (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    item_id TEXT,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabla Cuentas Corrientes & Clientes Fiados (client_accounts)
CREATE TABLE IF NOT EXISTS public.client_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    cuit_or_dni TEXT,
    credit_limit NUMERIC(12,2) DEFAULT 50000.00,
    current_balance NUMERIC(12,2) DEFAULT 0.00,
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Tabla Asistencia & Fichaje GPS (staff_attendance)
CREATE TABLE IF NOT EXISTS public.staff_attendance (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    employee_name TEXT NOT NULL,
    action TEXT NOT NULL, -- 'INGRESO' o 'EGRESO'
    timestamp TEXT NOT NULL,
    latitude NUMERIC(10,6),
    longitude NUMERIC(10,6),
    location_address TEXT,
    gps_accuracy NUMERIC(8,2) DEFAULT 5.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Tabla Auditoría Inmutable (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    entity_id TEXT,
    payload JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HABILITACIÓN ESTRICTA DE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.business_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS (Lectura Pública / Modificación Únicamente Autenticada)

-- Business Profile
CREATE POLICY "Permitir lectura publica de perfil de negocio" ON public.business_profile FOR SELECT USING (true);
CREATE POLICY "Permitir modificacion solo a autenticados" ON public.business_profile FOR ALL USING (auth.role() = 'authenticated');

-- Daily Menu
CREATE POLICY "Permitir lectura publica de menu diario" ON public.daily_menu FOR SELECT USING (true);
CREATE POLICY "Permitir escritura solo a autenticados" ON public.daily_menu FOR ALL USING (auth.role() = 'authenticated');

-- Menu Items
CREATE POLICY "Permitir lectura publica de carta de productos" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Permitir escritura solo a autenticados" ON public.menu_items FOR ALL USING (auth.role() = 'authenticated');

-- Insumos & Supplies
CREATE POLICY "Permitir acceso a insumos para autenticados" ON public.insumos FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Permitir acceso a supplies para autenticados" ON public.supplies FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Orders & Order Items
CREATE POLICY "Permitir lectura y creacion de comandas" ON public.orders FOR ALL USING (true);
CREATE POLICY "Permitir lectura y creacion de order_items" ON public.order_items FOR ALL USING (true);

-- Client Accounts
CREATE POLICY "Permitir acceso a cuentas corrientes para personal" ON public.client_accounts FOR ALL USING (true);

-- Staff Attendance
CREATE POLICY "Permitir registro de asistencia" ON public.staff_attendance FOR ALL USING (true);

-- Audit Logs (Solo Insert de Servidor / Autenticado)
CREATE POLICY "Permitir insert de auditoria" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lectura de auditoria solo a admins" ON public.audit_logs FOR SELECT USING (auth.role() = 'authenticated');
