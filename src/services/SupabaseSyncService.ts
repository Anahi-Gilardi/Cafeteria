import { supabase } from "../lib/supabase";
import { Order } from "../types";

export class SupabaseSyncService {
  /**
   * Upserts an order to Supabase, with automatic fallback and clear error diagnostics for RLS and missing columns.
   */
  public static async saveOrder(order: Order): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Try full payload with all extended columns
      const fullPayload = {
        id: order.id,
        created_at: order.createdAt || new Date().toISOString(),
        order_type: order.priceList === "Delivery" || order.fulfillmentType === "delivery" ? "delivery" : order.priceList === "Takeaway" || order.type === "Llevar" ? "takeaway" : "salon",
        table_number: order.tableNumber || null,
        client_name: order.clientAccountName || order.customerName || "Consumidor Final",
        client_phone: order.customerPhone || order.clientPhone || null,
        client_address: order.deliveryAddress ? `${order.deliveryAddress.street} ${order.deliveryAddress.number || ""}`.trim() : null,
        waiter_name: order.tableNumber ? "Enzo" : null,
        items: order.items,
        status: order.status,
        payment_method: order.paymentMethod || null,
        subtotal: order.subtotal || order.total,
        discount: 0,
        total: order.total,
        price_list: order.priceList || "Salon",
        type: order.type || "Mesa",
        fiscal: order.fiscal || null,
        coupon_number: order.couponNumber || null,
        client_account_name: order.clientAccountName || order.customerName || null,
        tip_amount: order.tipAmount || 0
      };

      const { error: fullError } = await supabase.from("orders").upsert(fullPayload);
      if (!fullError) {
        return { success: true };
      }

      // 2. If column error (PGRST204), try basic core payload
      if (fullError.code === "PGRST204") {
        console.warn("⚠️ Columna faltante en tabla orders de Supabase, intentando payload básico...");
        const basicPayload = {
          id: order.id,
          created_at: order.createdAt || new Date().toISOString(),
          items: order.items,
          status: order.status,
          subtotal: order.subtotal || order.total,
          tax: order.tax || 0,
          total: order.total,
          type: order.type || "Mesa",
          price_list: order.priceList || "Salon",
          payment_method: order.paymentMethod || null,
          table_number: order.tableNumber || null,
          client_account_name: order.clientAccountName || order.customerName || null
        };

        const { error: basicError } = await supabase.from("orders").upsert(basicPayload);
        if (!basicError) {
          return { success: true };
        }

        if (basicError.code === "42501") {
          return {
            success: false,
            error: "⚠️ Supabase Bloqueado por RLS (Error 42501): Ejecuta 'ALTER TABLE orders DISABLE ROW LEVEL SECURITY;' en Supabase SQL Editor."
          };
        }

        return { success: false, error: `${basicError.message} (Código: ${basicError.code})` };
      }

      if (fullError.code === "42501") {
        return {
          success: false,
          error: "⚠️ Supabase Bloqueado por RLS (Error 42501): Ejecuta 'ALTER TABLE orders DISABLE ROW LEVEL SECURITY;' en Supabase SQL Editor."
        };
      }

      return { success: false, error: `${fullError.message} (Código: ${fullError.code})` };
    } catch (err: any) {
      console.error("❌ Excepción al guardar comanda en Supabase:", err);
      return { success: false, error: err.message || "Error de conexión con Supabase" };
    }
  }

  /**
   * Fetches all orders from Supabase table 'orders'.
   */
  public static async fetchOrders(): Promise<{ orders: Order[]; error?: string }> {
    try {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) {
        console.error("❌ Error de Supabase al consultar comandas:", error);
        return { orders: [], error: `${error.message} (Código: ${error.code})` };
      }
      if (!data) return { orders: [] };

      const mapped: Order[] = data.map((o: any) => ({
        id: o.id,
        items: typeof o.items === "string" ? JSON.parse(o.items) : (o.items || []),
        subtotal: Number(o.subtotal || o.total),
        tax: Number(o.tax || 0),
        total: Number(o.total),
        type: (o.type || (o.order_type === "takeaway" ? "Llevar" : "Mesa")) as any,
        priceList: (o.price_list || (o.order_type === "delivery" ? "Delivery" : o.order_type === "takeaway" ? "Takeaway" : "Salon")) as any,
        tableReservationId: o.table_reservation_id || undefined,
        tableNumber: o.table_number || undefined,
        status: o.status as any,
        createdAt: o.created_at,
        estimatedMinutes: o.estimated_minutes || 15,
        paymentMethod: (o.payment_method || o.paymentMethod) as any,
        couponNumber: o.coupon_number || undefined,
        clientAccountName: o.client_account_name || o.client_name || o.customerName || undefined,
        customerName: o.client_name || o.client_account_name || o.customerName || undefined,
        customerPhone: o.client_phone || o.customerPhone || undefined,
        deliveryAddress: typeof o.client_address === "object" ? o.client_address : o.client_address ? { street: o.client_address, number: "" } : undefined,
        tipAmount: o.tip_amount ? Number(o.tip_amount) : undefined,
        fiscal: o.fiscal || undefined
      }));

      return { orders: mapped };
    } catch (err: any) {
      console.error("❌ Excepción al consultar comandas en Supabase:", err);
      return { orders: [], error: err.message };
    }
  }

  /**
   * Full database SQL script to initialize or repair Supabase tables and RLS policies
   */
  public static getFullSetupSQL(): string {
    return `-- ==============================================================================
-- RESTO BAR DEL TEATRO - SCRIPT DESBLOQUEO Y MIGRACIÓN COMPLETA PARA SUPABASE
-- Copia este código ➔ Ve a tu Dashboard de Supabase ➔ SQL Editor ➔ New Query ➔ RUN
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

-- Asegurar columnas si la tabla orders ya existía previamente
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'salon';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT 'Consumidor Final';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiter_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_list TEXT DEFAULT 'Salon';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fiscal JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_account_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tip_amount NUMERIC DEFAULT 0;

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

-- 4. Tabla de Cuentas Corrientes (client_accounts)
CREATE TABLE IF NOT EXISTS client_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cuit TEXT,
  phone TEXT,
  balance NUMERIC DEFAULT 0,
  credit_limit NUMERIC DEFAULT 20000
);

-- 5. Tabla de Reservas (reservations)
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

-- 6. Tabla de Usuarios (users_accounts)
CREATE TABLE IF NOT EXISTS users_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'mesero',
  pin TEXT DEFAULT '1234',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabla de Insumos (insumos)
CREATE TABLE IF NOT EXISTS insumos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'u',
  current_stock NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 5,
  cost_per_unit NUMERIC DEFAULT 0,
  supplier TEXT
);

-- 8. Tabla de Caja Diaria (cash_ledger)
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
-- PASO CLAVE: DESHABILITAR DESBLOQUEO RLS PARA PERMITIR GUARDAR DESDE EL POS
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

-- DATOS INICIALES
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
`;
  }
}
