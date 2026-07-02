export interface MenuItem {
  id: string;
  name: string;
  price: number; // Base price (usually Salon)
  takeawayPrice?: number; // Discounted for takeaway
  deliveryPrice?: number; // Marked up for third-party apps
  description: string;
  category: "coffee" | "traditional" | "cold" | "bakery" | "brunch";
  tags: string[]; // e.g. "Vegano", "Sin Gluten", "Especial"
  image: string;
  customizable: boolean;
  nutrition: {
    calories: number;
    allergens: string[];
  };
  stock?: number; // Live stock counter
  isOffer?: boolean; // Promotional flag
  offerPrice?: number; // Discounted promotional price
  recipe?: {
    ingredientId: string;
    amount: number; // e.g. grams or ml
  }[];
}

export interface MenuItemCustomization {
  size?: "M" | "L" | "XL";
  milk?: "Regular" | "Almendra" | "Avena" | "Deslactosada";
  sweetness?: "0%" | "50%" | "100%";
  warmed?: boolean;
  extras?: string[];
  priceList?: "Salon" | "Takeaway" | "Delivery"; // Selected price list channel
}

export interface CartItem {
  id: string; // Unique instance id
  menuItem: MenuItem;
  customization: MenuItemCustomization;
  quantity: number;
}

export interface Table {
  id: string;
  name: string;
  capacity: number;
  type: "window" | "sofa" | "bar" | "terrace" | "reading";
  description: string;
  coordX: number; // For rendering physical layout
  coordY: number; // For rendering physical layout
  status: "Libre" | "Ocupada" | "Esperando" | "Cuenta"; // State in salon
  activeOrderId?: string;
}

export type BookingTimeSlot = "Desayuno" | "Media Mañana" | "Almuerzo" | "Tarde" | "Cena";

export interface Reservation {
  id: string;
  tableId: string;
  tableName: string;
  date: string;
  timeSlot: BookingTimeSlot;
  guests: number;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  referenceCode: string;
}

export type OrderStatusType = "Recibido" | "Preparando" | "Listo" | "Completado";

export interface FiscalDetails {
  invoiceType: "A" | "B" | "C" | "No Fiscal";
  invoiceNumber: string;
  cae: string;
  caeExpiration: string;
  neto: number;
  iva21: number;
  iva105: number;
  customerCuit?: string;
  customerName?: string;
}

export interface Order {
  id: string;
  items: {
    name: string;
    quantity: number;
    customizationSummary: string;
    price: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  type: "Llevar" | "Mesa";
  priceList: "Salon" | "Takeaway" | "Delivery";
  tableReservationId?: string; // If dining in
  tableNumber?: string; // Linked table if dining in
  status: OrderStatusType;
  createdAt: string;
  estimatedMinutes: number;
  paymentMethod?: "Efectivo" | "Tarjeta" | "MercadoPago" | "Fiado / Cta Cte";
  couponNumber?: string; // POS Coupon ID if card
  clientAccountName?: string; // Account owner if fiado
  tipAmount?: number;
  fiscal?: FiscalDetails;
}

export interface ClientAccount {
  id: string;
  name: string;
  cuit: string;
  phone: string;
  balance: number; // negative is money owed to cafe
  creditLimit: number;
}

export interface MermaLog {
  id: string;
  ingredientId: string;
  ingredientName: string;
  amount: number;
  unit: string;
  reason: string;
  timestamp: string;
}

