-- ==========================================
-- SCRIPT DE MIGRACIÓN Y SEMILLA PARA SUPABASE
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

-- 9. Tabla de Usuarios y Roles (Autenticación y Privacidad)
CREATE TABLE IF NOT EXISTS users_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'mesero',
    pin TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- DESACTIVAR RLS (ROW LEVEL SECURITY)
-- ==========================================
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE insumos DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE barista_calibrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE users_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- ELIMINAR REGISTROS PREVIOS (Para evitar duplicados si se vuelve a correr)
-- ==========================================
TRUNCATE TABLE users_accounts CASCADE;
TRUNCATE TABLE insumos CASCADE;
TRUNCATE TABLE client_accounts CASCADE;
TRUNCATE TABLE cash_ledger CASCADE;
TRUNCATE TABLE system_settings CASCADE;
TRUNCATE TABLE menu_items CASCADE;

-- ==========================================
-- INSERCIÓN DE DATOS INICIALES (SEMILLA / SEED)
-- ==========================================

-- 1. Cuentas de Personal y Accesos
INSERT INTO users_accounts (id, name, email, password, role, pin) VALUES
('usr-1', 'Pablo Madina (Administrador)', 'pablo@cafepuglia.com', 'pablo123', 'administrador', '1111'),
('usr-2', 'Rami Madina (Barista)', 'rami@cafepuglia.com', 'barista123', 'barista', '2222'),
('usr-3', 'Silvana Madina (Mesero)', 'silvana@cafepuglia.com', 'mesero123', 'mesero', '3333');

-- 2. Insumos Críticos
INSERT INTO insumos (id, name, quantity, unit, min_limit, provider, expiration_date) VALUES
('ins-cafe', 'Café Tostado Especialidad', 15.5, 'kg', 2.0, 'Moinho Alegre', '2026-12-31'),
('ins-leche', 'Leche Entera de Campo', 45.0, 'L', 10.0, 'Lácteos del Campo', '2026-07-15'),
('ins-chocolate', 'Chocolate Bariloche Amargo', 30.0, 'kg', 5.0, 'Distribuidora Sur', '2026-10-30'),
('ins-yerba', 'Yerba Mate Orgánica Premium', 20.0, 'kg', 3.0, 'Mayorista Altiplano', '2027-01-30'),
('ins-ddl', 'Dulce de Leche Repostero', 25.0, 'kg', 4.0, 'Lácteos del Campo', '2026-09-15');

-- 3. Clientes Cuentas Corrientes (Fiados)
INSERT INTO client_accounts (id, name, cuit, phone, balance, credit_limit) VALUES
('cli-1', 'Mariano Closs', '20-33445566-9', '11-4567-8901', -450.00, 20000),
('cli-2', 'Estela de Carlotto', '27-05556667-1', '11-9876-5432', 0.00, 50000),
('cli-3', 'Enzo Francescoli', '20-99887766-3', '11-2345-6789', -1200.00, 30000);

-- 4. Registro Inicial de Caja Abierta
INSERT INTO cash_ledger (id, total_collected, cash, card, mercadopago, transactions) VALUES
('current', 0, 0, 0, 0, '[]'::jsonb);

-- 5. Ajustes del Sistema (Propinas iniciales en 0)
INSERT INTO system_settings (key, value) VALUES
('tip_pool', '0'::jsonb);

-- 6. Catálogo de Menú Completo
INSERT INTO menu_items (id, name, price, takeaway_price, delivery_price, description, category, tags, image, customizable, calories, allergens, stock, is_offer, offer_price, recipe) VALUES
-- Especialidades Porteñas
('arg-submarino', 'Submarino de Chocolate Bariloche', 4.50, 4.05, 5.20, 'Una de las tradiciones más queridas de Argentina: una jarrita de leche entera de campo bien caliente, servida con una barra entera de chocolate artesanal de Bariloche para sumergir y derretir pacientemente.', 'coffee', '{"Especial", "Artesanal"}', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=600', true, 290, '{"Lácteos"}', 25, false, null, '[{"ingredientId": "ins-leche", "amount": 0.25}, {"ingredientId": "ins-chocolate", "amount": 1.0}]'),
('arg-lagrima-portena', 'Lágrima Porteña de Autor', 3.80, 3.40, 4.40, 'Un clásico porteño para los amantes de la leche cremosa: jarrito lleno de leche vaporizada de textura aterciopelada con apenas unas gotitas (una ''lágrima'') de nuestro espresso de especialidad.', 'coffee', '{"Recomendado"}', 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&q=80&w=600', true, 120, '{"Lácteos"}', 35, false, null, '[{"ingredientId": "ins-leche", "amount": 0.20}, {"ingredientId": "ins-cafe", "amount": 0.005}]'),
('arg-cafecito-jarrito', 'Café en Jarrito Doble', 2.90, 2.60, 3.35, 'El alma de Buenos Aires. Espresso doble corto de nuestra selección de granos tostados artesanalmente, servido en el tradicional jarrito de vidrio templado porteño, con una crema dorada impecable.', 'coffee', '{"Especial"}', 'https://images.unsplash.com/photo-1510972527409-cef6e4a4d64e?auto=format&fit=crop&q=80&w=600', true, 10, '{}', 50, false, null, '[{"ingredientId": "ins-cafe", "amount": 0.015}]'),
('arg-capuchino-italiano', 'Capuchino con Cacao y Canela', 3.90, 3.50, 4.50, 'La receta porteña del tradicional capuchino: espresso doble, leche vaporizada muy espumosa, espolvoreado con canela molida fina y ralladura de chocolate amargo.', 'coffee', '{"Clásico"}', 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&q=80&w=600', true, 160, '{"Lácteos"}', 30, false, null, '[{"ingredientId": "ins-leche", "amount": 0.15}, {"ingredientId": "ins-cafe", "amount": 0.015}, {"ingredientId": "ins-chocolate", "amount": 0.15}]'),
('arg-cafe-crema', 'Café Vienés Porteño (con Crema)', 4.10, 3.70, 4.70, 'Café de filtro doble intenso coronado con una generosa copa de crema chantilly batida artesanalmente a mano y decorado con hilos de dulce de leche.', 'coffee', '{"Especial"}', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=600', true, 220, '{"Lácteos"}', 20, false, null, '[{"ingredientId": "ins-cafe", "amount": 0.015}, {"ingredientId": "ins-leche", "amount": 0.05}]'),

-- Clásicos
('arg-cortado', 'Café Cortado en Jarrito', 3.20, 2.90, 3.70, 'Un espresso doble ''cortado'' con un chorrito fino de leche caliente vaporizada, servido en vasito de vidrio. Acompañado con soda fría de cortesía, tal como se sirve en nuestra casa.', 'traditional', '{"Recomendado"}', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600', true, 60, '{"Lácteos"}', 45, false, null, '[{"ingredientId": "ins-cafe", "amount": 0.015}, {"ingredientId": "ins-leche", "amount": 0.05}]'),
('arg-cafe-leche', 'Café con Leche Clásico', 3.50, 3.15, 4.05, 'El compañero ineludible de la merienda nacional. Espresso doble estirado combinado en partes iguales con leche vaporizada bien caliente, servido en taza de loza clásica de café notable.', 'traditional', '{}', 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=600', true, 140, '{"Lácteos"}', 40, false, null, '[{"ingredientId": "ins-cafe", "amount": 0.015}, {"ingredientId": "ins-leche", "amount": 0.15}]'),
('arg-mate-mesa', 'Mate Tradicional en Mesa', 4.80, 4.30, 5.50, 'Servicio completo para vivir el ritual: termo de agua caliente con temperatura exacta, mate de calabaza forrado en cuero, bombilla de alpaca y yerba mate orgánica premium a elección (suave o con notas de campo).', 'traditional', '{"Especial", "Vegano"}', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=600', false, 10, '{}', 12, false, null, '[{"ingredientId": "ins-yerba", "amount": 0.05}]'),

-- Bebidas Frías
('arg-iced-dulce-leche', 'Iced Latte de Dulce de Leche', 4.50, 4.05, 5.20, 'Espresso doble de especialidad vertido sobre leche cremosa bien fría con abundante hielo, fusionado con dulce de leche repostero artesanal de primera calidad.', 'cold', '{"Recomendado", "Especial"}', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=600', true, 240, '{"Lácteos"}', 25, false, null, '[{"ingredientId": "ins-cafe", "amount": 0.015}, {"ingredientId": "ins-leche", "amount": 0.20}, {"ingredientId": "ins-ddl", "amount": 0.03}]'),
('arg-pomelo-tonica', 'Espresso Tónica de Pomelo Pampeano', 4.20, 3.80, 4.80, 'La frescura del campo argentino: café extraído en frío mezclado con agua tónica premium, almíbar artesanal de pomelo rosado pampeano y una rodaja fresca.', 'cold', '{"Vegano", "Sin Gluten"}', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=600', false, 85, '{}', 15, false, null, '[]'),
('arg-mate-cocido-helado', 'Mate Cocido Helado con Limón y Menta', 3.80, 3.40, 4.45, 'Infusión helada de yerba mate orgánica premium seleccionada, endulzada ligeramente con miel de San Luis, rodajas de limón y menta fresca del huerto.', 'cold', '{"Vegano", "Sin Gluten", "Artesanal"}', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=600', false, 50, '{}', 20, false, null, '[]'),

-- Pastelería
('arg-medialuna-manteca', 'Trío de Medialunas de Manteca', 3.60, 3.25, 4.15, 'Hojaldre artesanal premium elaborado con manteca de primera calidad, horneadas cada mañana hasta quedar doradas y pintadas generosamente con almíbar de cítricos secretos.', 'bakery', '{"Artesanal", "Recomendado"}', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=600', true, 320, '{"Gluten", "Lácteos", "Huevo"}', 60, false, null, '[]'),
('arg-medialuna-grasa', 'Trío de Medialunas de Grasa', 3.60, 3.25, 4.15, 'La versión salada y crocante del clásico rioplatense. Masa hojaldrada fina con grasa vacuna refinada, de sabor suavemente salado y textura increíblemente crujiente.', 'bakery', '{"Artesanal"}', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600', true, 290, '{"Gluten"}', 45, false, null, '[]'),
('arg-alfajor-maicena', 'Alfajor de Maicena Tradicional', 2.80, 2.50, 3.20, 'Auténtico alfajor artesanal de almidón de maíz que se desarma en la boca, relleno de abundante dulce de leche repostero y rebozado suavemente en coco rallado.', 'bakery', '{"Artesanal", "Recomendado"}', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&q=80&w=600', false, 260, '{"Gluten", "Lácteos", "Huevo"}', 30, false, null, '[]'),
('arg-alfajor-marplatense', 'Alfajor Marplatense de Chocolate', 3.20, 2.90, 3.70, 'Inspirado en los famosos alfajores de la Costa Atlántica. Dos tapitas húmedas de cacao rellenas con dulce de leche artesanal, bañadas en chocolate semiamargo belga.', 'bakery', '{"Especial"}', 'https://images.unsplash.com/photo-1581798459219-318e76aeec7b?auto=format&fit=crop&q=80&w=600', false, 310, '{"Gluten", "Lácteos", "Huevo", "Soja"}', 25, false, null, '[]'),
('arg-pastafrola', 'Porción de Pastafrola de Membrillo', 3.40, 3.05, 3.90, 'Tarta tradicional argentina de masa quebrada dulce, perfumada con vainilla y ralladura de limón, rellena de dulce de membrillo derretido y decorada con el clásico enrejado.', 'bakery', '{"Artesanal"}', 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&q=80&w=600', true, 340, '{"Gluten", "Huevo"}', 15, false, null, '[]'),
('arg-chocotorta', 'Chocotorta Porteña del Barrio', 4.50, 4.05, 5.20, 'El postre favorito de los cumpleaños y meriendas argentinas. Capas de galletitas Chocolinas remojadas en café expreso intenso, intercaladas con una crema adictiva de dulce de leche y queso crema batido.', 'bakery', '{"Especial", "Recomendado"}', 'https://images.unsplash.com/photo-1508737027454-e6454ef45afd?auto=format&fit=crop&q=80&w=600', false, 420, '{"Gluten", "Lácteos", "Soja"}', 12, false, null, '[]'),
('arg-torta-rogel', 'Milhojas Rogel de Autor', 4.80, 4.30, 5.50, 'La cumbre de la repostería criolla. Ocho capas finas e increíblemente crocantes de masa de yemas unidas por dulce de leche repostero puro, cubiertas con un suntuoso merengue italiano flameado.', 'bakery', '{"Artesanal"}', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&q=80&w=600', false, 460, '{"Gluten", "Lácteos", "Huevo"}', 10, false, null, '[]'),
('arg-torta-balcarce', 'Torta Balcarce Tradicional', 4.60, 4.15, 5.30, 'Porción de la clásica torta bonaerense: bizcochuelo húmedo relleno de dulce de leche, crema de vainilla chantilly, castañas en almíbar, merenguitos secos crocantes y espolvoreado con coco rallado.', 'bakery', '{"Clásico"}', 'https://images.unsplash.com/photo-1535141192574-5d4897c13636?auto=format&fit=crop&q=80&w=600', false, 440, '{"Gluten", "Lácteos", "Huevo", "Frutos Secos"}', 8, false, null, '[]'),

-- Brunch y Tostados
('arg-tostado-mixto', 'Tostado Mixto en Pan de Miga', 6.90, 6.20, 7.90, 'El inconfundible ''tostado'' argentino de las cafeterías notables. Finas capas de pan de miga untadas con manteca, rellenas de abundante jamón cocido natural y queso dambo derretido a la plancha.', 'brunch', '{"Recomendado"}', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=600', false, 450, '{"Gluten", "Lácteos"}', 30, false, null, '[]'),
('arg-tostado-carlitos', 'Tostado ''Carlitos'' con Salsa Golf', 7.20, 6.50, 8.25, 'Homenaje al rey de la noche porteña: tostado de jamón y queso dambo en pan de miga doble, aderezado con un toque sutil de manteca y salsa golf criolla casera antes de pasar por la plancha caliente.', 'brunch', '{"Especial"}', 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&q=80&w=600', false, 490, '{"Gluten", "Lácteos", "Huevo"}', 20, false, null, '[]'),
('arg-empanada-carne', 'Dúo de Empanadas de Carne Cortada a Cuchillo', 4.80, 4.30, 5.50, 'Dos empanadas tradicionales jugosas rellenas de bola de lomo cortada a cuchillo, salteada con cebolla de verdeo, huevo duro picado, aceituna verde y el toque justo de pimentón dulce y comino.', 'brunch', '{"Especial", "Artesanal"}', 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&q=80&w=600', true, 380, '{"Gluten", "Huevo"}', 40, false, null, '[]'),
('arg-empanada-jyq', 'Dúo de Empanadas de Jamón y Queso Hojaldradas', 4.60, 4.15, 5.30, 'Dos empanadas de masa de hojaldre casera rellenas con cubos de jamón cocido seleccionado y mezcla cremosa de quesos derretidos dambo y mozzarella.', 'brunch', '{"Artesanal"}', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=600', true, 360, '{"Gluten", "Lácteos"}', 35, false, null, '[]'),
('arg-pascualina', 'Pascualina de Espinaca Notable', 5.50, 4.95, 6.30, 'Porción de la clásica tarta alta hogareña, rellena de abundante espinaca fresca salteada con nuez moscada, ligada con queso parmesano y crema, con rodajas de huevo duro incrustadas en su interior.', 'brunch', '{"Clásico"}', 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&q=80&w=600', true, 390, '{"Gluten", "Lácteos", "Huevo"}', 15, false, null, '[]'),
('arg-tostadas-campo', 'Tostadas de Campo con Queso y Dulce', 4.50, 4.05, 5.15, 'Dos rebanadas gruesas de pan de campo casero de masa madre, tostadas a la leña, servidas con queso crema batido de campo y abundante dulce de leche repostero o mermelada patagónica.', 'brunch', '{"Recomendado"}', 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&q=80&w=600', false, 360, '{"Gluten", "Lácteos"}', 25, false, null, '[]'),

-- Ofertas Promocionales Especiales
('offer-promo-portena', 'PROMO: Café con Leche + 3 Medialunas', 6.20, 5.55, 7.10, 'El ritual porteño absoluto con precio promocional especial. Un tazón de café con leche clásico caliente acompañado de tres medialunas de manteca recién horneadas y pintadas con almíbar.', 'coffee', '{"OFERTA", "Recomendado"}', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600', true, 460, '{"Gluten", "Lácteos", "Huevo"}', 50, true, 5.20, '[]'),
('offer-merienda-puglia', 'OFERTA MERIENDA: Submarino + Alfajor de Maicena', 6.80, 6.10, 7.80, 'El combo perfecto para entibiar el alma. Una taza de leche bien caliente con barra de chocolate Bariloche y un auténtico alfajor de maicena relleno de dulce de leche con coco.', 'coffee', '{"OFERTA", "Especial"}', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=600', true, 550, '{"Gluten", "Lácteos", "Huevo"}', 25, true, 5.90, '[]'),
('offer-almuerzo-ejecutivo', 'PROMO MEDIODÍA: Tostado Mixto + Mate Cocido Helado', 9.80, 8.80, 11.25, 'Almuerzo rápido, clásico y porteño. Tostado de jamón y queso caliente en pan de miga extra fino de manteca acompañado de un refrescante vaso de mate cocido helado de menta y limón.', 'brunch', '{"OFERTA"}', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=600', false, 500, '{"Gluten", "Lácteos"}', 20, true, 8.50, '[]');

-- 8. Tabla de Fotos de Productos Locales
CREATE TABLE IF NOT EXISTS product_images (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    image_base64 TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
