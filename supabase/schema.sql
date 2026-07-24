-- ====================================================================
-- RESTO BAR DEL TEATRO - BASE DE DATOS POSTGRESQL / SUPABASE SCHEMA
-- Arquitectura de Alto Rendimiento, Triggers de Stock & Control ARCA
-- ====================================================================

-- 1. EXTENSIONES POSTGRESQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE ROLES
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DE USUARIOS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID REFERENCES roles(id) ON DELETE RESTRICT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    pin_code VARCHAR(4) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA DE MESAS Y MAPA DE SALÓN
CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_number VARCHAR(20) UNIQUE NOT NULL,
    sector VARCHAR(50) NOT NULL CHECK (sector IN ('Salon Principal', 'Barra Alta', 'Terraza Exterior')),
    capacity INT NOT NULL DEFAULT 2,
    shape VARCHAR(20) DEFAULT 'square' CHECK (shape IN ('square', 'round', 'bar')),
    status VARCHAR(30) DEFAULT 'Libre' CHECK (status IN ('Libre', 'Ocupada', 'Esperando Comida', 'Servida', 'Cuenta Pedida', 'Cerrada')),
    x_pos INT DEFAULT 0,
    y_pos INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA DE PRODUCTOS Y CARTA
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('executive', 'mains', 'starters', 'desserts', 'drinks', 'coffee', 'bakery', 'traditional', 'cold', 'brunch')),
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    takeaway_price DECIMAL(12, 2),
    delivery_price DECIMAL(12, 2),
    description TEXT,
    image_url TEXT,
    visibility_start TIME DEFAULT '00:00:00',
    visibility_end TIME DEFAULT '23:59:59',
    kds_station VARCHAR(30) DEFAULT 'cocina' CHECK (kds_station IN ('barra', 'cocina', 'parrilla', 'cocina_fria', 'barra_tragos')),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLA DE INSUMOS Y MATERIAS PRIMAS (SUPPLIES)
CREATE TABLE IF NOT EXISTS supplies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    stock_quantity DECIMAL(12, 4) NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    min_limit DECIMAL(12, 4) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL, -- 'kg', 'L', 'unidades'
    unit_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
    provider_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABLA DE FICHA TÉCNICA / RECETAS (RELACIÓN N:M)
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    supply_id UUID REFERENCES supplies(id) ON DELETE RESTRICT,
    amount_required DECIMAL(12, 4) NOT NULL CHECK (amount_required > 0),
    CONSTRAINT unique_product_supply UNIQUE (product_id, supply_id)
);

-- 8. TABLA DE COMANDAS / PEDIDOS
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code VARCHAR(20) UNIQUE NOT NULL,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    table_number VARCHAR(20),
    waiter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'Recibido' CHECK (status IN ('Recibido', 'Preparando', 'Listo', 'Completado')),
    fulfillment_type VARCHAR(20) DEFAULT 'salon' CHECK (fulfillment_type IN ('salon', 'takeaway', 'delivery')),
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    delivery_fee DECIMAL(12, 2) DEFAULT 0,
    delivery_address JSONB,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. DETALLE DE ÍTEMS DE COMANDA
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL,
    modifiers JSONB DEFAULT '[]'::jsonb, -- e.g. ["Sin sal", "Punto jugoso"]
    kds_station VARCHAR(30) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. PAGOS Y DESGLOSE SPLIT-BILL
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('Efectivo', 'Tarjeta', 'MercadoPago', 'Fiado / Cta Cte')),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. COMPROBANTES FISCALES ARCA / AFIP
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    invoice_type VARCHAR(10) NOT NULL CHECK (invoice_type IN ('A', 'B', 'C', 'No Fiscal')),
    pos_number INT DEFAULT 1,
    invoice_number VARCHAR(30) UNIQUE NOT NULL,
    cae VARCHAR(14) NOT NULL,
    cae_expiration DATE NOT NULL,
    neto_amount DECIMAL(12, 2) NOT NULL,
    vat_21_amount DECIMAL(12, 2) NOT NULL,
    vat_105_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    customer_cuit VARCHAR(20),
    customer_name VARCHAR(100),
    qr_payload TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. AUDITORÍA DE MOVIMIENTOS DE STOCK (STOCK LOGS)
CREATE TABLE IF NOT EXISTS stock_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supply_id UUID REFERENCES supplies(id) ON DELETE CASCADE,
    movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('Venta', 'Devolución', 'Merma', 'Reabastecimiento', 'Ajuste Auditoría')),
    quantity DECIMAL(12, 4) NOT NULL,
    previous_stock DECIMAL(12, 4) NOT NULL,
    new_stock DECIMAL(12, 4) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- ÍNDICES OPTIMIZADOS PARA ALTA CONCURRENCIA
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_kds_station ON order_items(kds_station);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_recipes_product_id ON recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_supplies_stock_quantity ON supplies(stock_quantity);

-- ====================================================================
-- TRIGGER DE VALIDACIÓN PREVENTIVA DE STOCK
-- ====================================================================
CREATE OR REPLACE FUNCTION check_stock_before_order()
RETURNS TRIGGER AS $$
DECLARE
    rec RECORD;
    current_supply_stock DECIMAL(12, 4);
    needed DECIMAL(12, 4);
BEGIN
    -- Recorrer la receta del producto que se intenta comandar
    FOR rec IN SELECT supply_id, amount_required FROM recipes WHERE product_id = NEW.product_id LOOP
        needed := rec.amount_required * NEW.quantity;
        SELECT stock_quantity INTO current_supply_stock FROM supplies WHERE id = rec.supply_id;

        IF current_supply_stock IS NULL OR (current_supply_stock - needed) < 0 THEN
            RAISE EXCEPTION 'Stock insuficiente para el insumo ID % (Requerido: %, Disponible: %)', rec.supply_id, needed, COALESCE(current_supply_stock, 0);
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_check_stock_before_order
BEFORE INSERT ON order_items
FOR EACH ROW EXECUTE FUNCTION check_stock_before_order();
