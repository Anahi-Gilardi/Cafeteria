import { supabase } from "../lib/supabase";
import { Order } from "../types";

export class SupabaseSyncService {
  /**
   * Upserts an order to Supabase, logging errors clearly and returning success status.
   */
  public static async saveOrder(order: Order): Promise<{ success: boolean; error?: string }> {
    try {
      const orderPayload = {
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
        fiscal: order.fiscal || null
      };

      const { error } = await supabase.from("orders").upsert(orderPayload);
      if (error) {
        console.error("❌ Error de Supabase al guardar comanda:", error);
        return { success: false, error: `${error.message} (Código: ${error.code})` };
      }
      return { success: true };
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
   * Full database SQL script to initialize or repair Supabase tables
   */
  public static getFullSetupSQL(): string {
    return `-- ==============================================================================
-- RESTO BAR DEL TEATRO - SCRIPT COMPLETO DE BASE DE DATOS PARA SUPABASE
-- Copia y pega este script en: Supabase Dashboard -> SQL Editor -> Run
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

-- 2. Tabla de Carta & Menú (menu_items)
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
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
  recipe JSONB
);

-- 3. Tabla de Cuentas Corrientes (client_accounts)
CREATE TABLE IF NOT EXISTS client_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cuit TEXT,
  phone TEXT,
  balance NUMERIC DEFAULT 0,
  credit_limit NUMERIC DEFAULT 20000
);

-- 4. Tabla de Reservas (reservations)
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

-- 5. Tabla de Insumos & Stock (insumos)
CREATE TABLE IF NOT EXISTS insumos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  current_stock NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 5,
  cost_per_unit NUMERIC DEFAULT 0,
  supplier TEXT
);

-- 6. Tabla de Caja Diaria (cash_ledger)
CREATE TABLE IF NOT EXISTS cash_ledger (
  id TEXT PRIMARY KEY,
  cash NUMERIC DEFAULT 0,
  card NUMERIC DEFAULT 0,
  mercadopago NUMERIC DEFAULT 0,
  total_collected NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Deshabilitar RLS o permitir acceso a la terminal POS anon
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE insumos DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_ledger DISABLE ROW LEVEL SECURITY;
`;
  }
}
