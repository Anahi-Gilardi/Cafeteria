-- ====================================================================
-- SEEDERS INICIALES - RESTO BAR DEL TEATRO (CONSTITUCIÓN 944, RÍO CUARTO)
-- ====================================================================

-- 1. ROLES INICIALES
INSERT INTO roles (id, name, description) VALUES
('r-11111111-1111-1111-1111-111111111111', 'administrador', 'Acceso total y configuración de ERP'),
('r-22222222-2222-2222-2222-222222222222', 'cajero', 'Caja, Facturación ARCA y arqueos'),
('r-33333333-3333-3333-3333-333333333333', 'mozo', 'Toma de pedidos en salón y comandero'),
('r-44444444-4444-4444-4444-444444444444', 'barista', 'Pantalla KDS de Barra y bebidas'),
('r-55555555-5555-5555-5555-555555555555', 'cocina', 'Pantalla KDS de Cocina y Parrilla')
ON CONFLICT (name) DO NOTHING;

-- 2. USUARIO ADMINISTRADOR POR DEFECTO (admin / 1998)
INSERT INTO users (id, role_id, username, email, password_hash, full_name, pin_code) VALUES
('u-admin1998-1111-1111-1111-111111111111', 'r-11111111-1111-1111-1111-111111111111', 'admin', 'admin@restobardelteatro.com', '$2a$10$w1998hash...', 'Administrador General', '1998')
ON CONFLICT (username) DO NOTHING;

-- 3. MESAS DE SALÓN, BARRA Y TERRAZA
INSERT INTO tables (table_number, sector, capacity, shape, status, x_pos, y_pos) VALUES
('Mesa 1', 'Salon Principal', 2, 'square', 'Libre', 10, 20),
('Mesa 2', 'Salon Principal', 4, 'round', 'Libre', 30, 20),
('Mesa 3', 'Salon Principal', 4, 'square', 'Libre', 50, 20),
('Mesa 4', 'Salon Principal', 6, 'round', 'Libre', 70, 20),
('Mesa 5', 'Salon Principal', 2, 'square', 'Libre', 10, 50),
('Mesa 6 (Box VIP)', 'Salon Principal', 6, 'square', 'Libre', 30, 50),
('Barra 1', 'Barra Alta', 1, 'bar', 'Libre', 80, 70),
('Barra 2', 'Barra Alta', 1, 'bar', 'Libre', 85, 70),
('Terraza 1', 'Terraza Exterior', 4, 'round', 'Libre', 10, 80),
('Terraza 2', 'Terraza Exterior', 2, 'round', 'Libre', 30, 80)
ON CONFLICT (table_number) DO NOTHING;

-- 4. INSUMOS Y MATERIAS PRIMAS (SUPPLIES)
INSERT INTO supplies (id, name, stock_quantity, min_limit, unit, unit_cost, provider_name) VALUES
('s-cafe', 'Café Tostado de Especialidad', 15.000, 3.000, 'kg', 14000.00, 'Cafés de Origen S.A.'),
('s-leche', 'Leche Entera de Campo', 80.000, 15.000, 'L', 1200.00, 'Lácteos del Campo'),
('s-chocolate', 'Chocolate Bariloche Amargo', 10.000, 2.000, 'kg', 25000.00, 'Chocolates del Sur'),
('s-carne-bife', 'Bife de Chorizo Premium', 25.000, 5.000, 'kg', 16000.00, 'Frigorífico Río Cuarto'),
('s-pan', 'Pan Casero Artesanal', 50.000, 10.000, 'unidades', 500.00, 'Panadería Central')
ON CONFLICT DO NOTHING;

-- 5. PRODUCTOS DEL MENÚ Y CARTA
INSERT INTO products (id, name, category, price, takeaway_price, delivery_price, description, kds_station) VALUES
('p-submarino', 'Submarino de Chocolate Bariloche', 'coffee', 4500.00, 4050.00, 5200.00, 'Jarrita de leche caliente con barra entera de chocolate artesanal.', 'barra'),
('p-bife-chorizo', 'Bife de Chorizo a las Brasas', 'mains', 13500.00, 12150.00, 15500.00, 'Bife de chorizo de 400g a las brasas con papas rústicas.', 'parrilla'),
('p-menu-ejecutivo', 'Menú Ejecutivo del Día', 'executive', 8000.00, 8000.00, 9200.00, 'Combo 4 tiempos: Entrada + Principal + Bebida + Postre.', 'cocina')
ON CONFLICT DO NOTHING;

-- 6. FICHA TÉCNICA / RECETAS (RELACIÓN PRODUCTO <-> INSUMO)
INSERT INTO recipes (product_id, supply_id, amount_required) VALUES
('p-submarino', 's-leche', 0.2500),
('p-submarino', 's-chocolate', 0.0500),
('p-bife-chorizo', 's-carne-bife', 0.4000)
ON CONFLICT DO NOTHING;
