import { useState, useEffect } from "react";
import { MenuItem, MenuItemCustomization, CartItem, Reservation, Order, OrderStatusType, ClientAccount } from "./types";
import { MENU_ITEMS } from "./data/menu";
import Navbar from "./components/Navbar";
import InteractiveMenu from "./components/InteractiveMenu";
import TableReservation from "./components/TableReservation";
import CartDrawer from "./components/CartDrawer";
import OrderStatus from "./components/OrderStatus";
import BaristaAI from "./components/BaristaAI";
import HistoryHub from "./components/HistoryHub";
import AdminHub from "./components/AdminHub";
import CartaDigital from "./components/CartaDigital";
import TicketPreviewModal from "./components/TicketPreviewModal";
import ManualPuglia from "./components/ManualPuglia";
import { Coffee, ArrowRight, Sparkles, BookOpen, Clock, Heart, Star, Phone, MapPin, X, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "./lib/supabase";

interface ToastNotification {
  id: string;
  message: string;
  type: "success" | "info" | "warning";
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("inicio");
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Live dynamic menu items catalog synced with Supabase
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);

  // Global notification toast states
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  // Function to spawn rich custom toast alerts
  const showNotification = (message: string, type: "success" | "info" | "warning" = "info") => {
    const id = "toast-" + Date.now() + Math.random().toString(36).substring(2, 5);
    setNotifications((prev) => [...prev, { id, message, type }]);
    
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Helper mappers for Supabase
  const mapDbToMenuItem = (db: any): MenuItem => ({
    id: db.id,
    name: db.name,
    price: Number(db.price),
    takeawayPrice: db.takeaway_price ? Number(db.takeaway_price) : undefined,
    deliveryPrice: db.delivery_price ? Number(db.delivery_price) : undefined,
    description: db.description,
    category: db.category as any,
    tags: db.tags || [],
    image: db.image,
    customizable: db.customizable,
    nutrition: {
      calories: db.calories || 0,
      allergens: db.allergens || []
    },
    stock: db.stock !== null ? Number(db.stock) : undefined,
    isOffer: db.is_offer,
    offerPrice: db.offer_price ? Number(db.offer_price) : undefined,
    recipe: db.recipe || []
  });

  const mapMenuItemToDb = (item: MenuItem) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    takeaway_price: item.takeawayPrice ?? null,
    delivery_price: item.deliveryPrice ?? null,
    description: item.description,
    category: item.category,
    tags: item.tags,
    image: item.image,
    customizable: item.customizable,
    calories: item.nutrition?.calories ?? null,
    allergens: item.nutrition?.allergens ?? [],
    stock: item.stock ?? null,
    is_offer: item.isOffer ?? false,
    offer_price: item.offerPrice ?? null,
    recipe: item.recipe || []
  });

  // Core synchronized persistent states
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("origen_cart");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [bookings, setBookings] = useState<Reservation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTrackedOrder, setActiveTrackedOrder] = useState<Order | null>(null);
  const [clientAccounts, setClientAccounts] = useState<ClientAccount[]>([]);

  // Ticket Preview States
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [orderToPreview, setOrderToPreview] = useState<Order | null>(null);

  // Sync cartItems to local storage (individual customer state)
  useEffect(() => {
    localStorage.setItem("origen_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  // Load and seed initial data from Supabase
  useEffect(() => {
    const loadSupabaseData = async () => {
      try {
        // 1. Fetch & Seed Menu Items
        const { data: menuData } = await supabase.from("menu_items").select("*");
        if (menuData && menuData.length > 0) {
          setMenuItems(menuData.map(mapDbToMenuItem));
        } else {
          // Seed default menu items
          await supabase.from("menu_items").insert(MENU_ITEMS.map(mapMenuItemToDb));
          setMenuItems(MENU_ITEMS);
        }

        // 2. Fetch & Seed Client Accounts
        const { data: clientData } = await supabase.from("client_accounts").select("*");
        if (clientData && clientData.length > 0) {
          setClientAccounts(clientData.map(c => ({
            id: c.id,
            name: c.name,
            cuit: c.cuit,
            phone: c.phone,
            balance: Number(c.balance),
            creditLimit: Number(c.credit_limit)
          })));
        } else {
          const defaultClients = [
            { id: "cli-1", name: "Mariano Closs", cuit: "20-33445566-9", phone: "11-4567-8901", balance: -450.00, creditLimit: 20000 },
            { id: "cli-2", name: "Estela de Carlotto", cuit: "27-05556667-1", phone: "11-9876-5432", balance: 0.00, creditLimit: 50000 },
            { id: "cli-3", name: "Enzo Francescoli", cuit: "20-99887766-3", phone: "11-2345-6789", balance: -1200.00, creditLimit: 30000 }
          ];
          await supabase.from("client_accounts").insert(defaultClients.map(c => ({
            id: c.id,
            name: c.name,
            cuit: c.cuit,
            phone: c.phone,
            balance: c.balance,
            credit_limit: c.creditLimit
          })));
          setClientAccounts(defaultClients);
        }

        // 3. Fetch Reservations
        const { data: bookingsData } = await supabase.from("reservations").select("*");
        if (bookingsData) {
          setBookings(bookingsData.map(b => ({
            id: b.id,
            tableId: b.table_id,
            tableName: b.table_name,
            date: b.date,
            timeSlot: b.time_slot as any,
            guests: b.guests,
            customerName: b.customer_name,
            customerPhone: b.customer_phone,
            createdAt: b.created_at,
            referenceCode: b.reference_code
          })));
        }

        // 4. Fetch Orders
        const { data: ordersData } = await supabase.from("orders").select("*");
        if (ordersData) {
          const mappedOrders: Order[] = ordersData.map(o => ({
            id: o.id,
            items: o.items,
            subtotal: Number(o.subtotal),
            tax: Number(o.tax),
            total: Number(o.total),
            type: o.type as any,
            priceList: o.price_list as any,
            tableReservationId: o.table_reservation_id || undefined,
            tableNumber: o.table_number || undefined,
            status: o.status as any,
            createdAt: o.created_at,
            estimatedMinutes: o.estimated_minutes,
            paymentMethod: o.payment_method as any,
            couponNumber: o.coupon_number || undefined,
            clientAccountName: o.client_account_name || undefined,
            tipAmount: o.tip_amount ? Number(o.tip_amount) : undefined,
            fiscal: o.fiscal || undefined
          }));
          setOrders(mappedOrders);
        }
      } catch (err) {
        console.error("Error loading data from Supabase:", err);
      }
    };

    loadSupabaseData();
  }, []);

  // Sync menuItems changes to Supabase
  useEffect(() => {
    const syncMenu = async () => {
      if (menuItems.length === 0) return;
      await supabase.from("menu_items").upsert(menuItems.map(mapMenuItemToDb));
    };
    syncMenu();
  }, [menuItems]);

  // Sync clientAccounts changes to Supabase
  useEffect(() => {
    const syncClients = async () => {
      if (clientAccounts.length === 0) return;
      await supabase.from("client_accounts").upsert(clientAccounts.map(c => ({
        id: c.id,
        name: c.name,
        cuit: c.cuit,
        phone: c.phone,
        balance: c.balance,
        credit_limit: c.creditLimit
      })));
    };
    syncClients();
  }, [clientAccounts]);

  // Sync active tracked order
  useEffect(() => {
    const active = orders.find(o => o.status !== "Completado");
    setActiveTrackedOrder(active || null);
  }, [orders]);

  // Handle adding an item to the cart
  const handleAddToBag = (item: MenuItem, customization: MenuItemCustomization) => {
    // Check if item is in stock
    if (item.stock !== undefined && item.stock <= 0) {
      showNotification(`⚠️ Lo sentimos, '${item.name}' está agotado temporalmente.`, "warning");
      return;
    }

    const cartItemId = "cart-item-" + Date.now() + Math.random().toString(36).substring(2, 5);
    const newCartItem: CartItem = {
      id: cartItemId,
      menuItem: item,
      customization,
      quantity: 1
    };

    setCartItems((prev) => [...prev, newCartItem]);
    setIsCartOpen(true); // Open cart drawer on add
    showNotification(`🛒 ¡Añadido! '${item.name}' listo en su bandeja.`, "success");
  };

  const handleUpdateQuantity = (cartItemId: string, newQty: number) => {
    const item = cartItems.find((i) => i.id === cartItemId);
    if (!item) return;

    if (newQty <= 0) {
      handleRemoveItem(cartItemId);
      return;
    }

    // Verify stock availability
    if (item.menuItem.stock !== undefined && newQty > item.menuItem.stock) {
      showNotification(`⚠️ Stock insuficiente: Solo quedan ${item.menuItem.stock} unidades de '${item.menuItem.name}'.`, "warning");
      return;
    }

    setCartItems((prev) =>
      prev.map((item) => (item.id === cartItemId ? { ...item, quantity: newQty } : item))
    );
  };

  const handleRemoveItem = (cartItemId: string) => {
    const item = cartItems.find((i) => i.id === cartItemId);
    setCartItems((prev) => prev.filter((item) => item.id !== cartItemId));
    if (item) {
      showNotification(`🗑️ Ha quitado '${item.menuItem.name}' de su bandeja.`, "info");
    }
  };

  // Complete checkout with live inventory deduction
  const handleCheckoutComplete = async (newOrder: Order) => {
    try {
      // Save order to Supabase
      await supabase.from("orders").insert({
        id: newOrder.id,
        items: newOrder.items,
        subtotal: newOrder.subtotal,
        tax: newOrder.tax,
        total: newOrder.total,
        type: newOrder.type,
        price_list: newOrder.priceList,
        table_reservation_id: newOrder.tableReservationId || null,
        table_number: newOrder.tableNumber || null,
        status: newOrder.status,
        created_at: newOrder.createdAt,
        estimated_minutes: newOrder.estimatedMinutes,
        payment_method: newOrder.paymentMethod || null,
        coupon_number: newOrder.couponNumber || null,
        client_account_name: newOrder.clientAccountName || null,
        tip_amount: newOrder.tipAmount || 0,
        fiscal: newOrder.fiscal || null
      });

      // Deduct stock levels from our dynamic state
      const updatedMenu = menuItems.map((m) => {
        const orderedItem = newOrder.items.find((item) => item.name === m.name);
        if (orderedItem && m.stock !== undefined) {
          const updatedStock = Math.max(0, m.stock - orderedItem.quantity);
          if (updatedStock === 0) {
            showNotification(`⚠️ El producto '${m.name}' se ha agotado en stock.`, "warning");
          } else if (updatedStock <= 3) {
            showNotification(`⚠️ Stock crítico: Quedan solo ${updatedStock} unidades de '${m.name}'.`, "warning");
          }
          return { ...m, stock: updatedStock };
        }
        return m;
      });
      setMenuItems(updatedMenu); // This triggers the useEffect which upserts to Supabase

      // Deduct raw materials (insumos) stock by recipe in Supabase
      const { data: insList } = await supabase.from("insumos").select("*");
      if (insList) {
        const updates = insList.map(async (ins: any) => {
          let consumedAmount = 0;
          newOrder.items.forEach((orderedItem) => {
            const menuItem = menuItems.find(m => m.name === orderedItem.name);
            if (menuItem && menuItem.recipe) {
              const recipeItem = menuItem.recipe.find(r => r.ingredientId === ins.id);
              if (recipeItem) {
                const isKgOrLiters = ins.unit === "kg" || ins.unit === "litros" || ins.unit === "L";
                const divisor = isKgOrLiters ? 1000 : 1;
                consumedAmount += (recipeItem.amount / divisor) * orderedItem.quantity;
              }
            }
          });

          if (consumedAmount > 0) {
            const newQty = Math.max(0, parseFloat((Number(ins.quantity) - consumedAmount).toFixed(2)));
            if (newQty <= ins.min_limit && ins.quantity > ins.min_limit) {
              showNotification(`⚠️ Insumo crítico: '${ins.name}' quedó por debajo de su stock de seguridad.`, "warning");
            }
            await supabase.from("insumos").update({ quantity: newQty }).eq("id", ins.id);
          }
        });
        await Promise.all(updates);
      }
    } catch (err) {
      console.error("Error writing checkout data to Supabase:", err);
    }

    setOrders((prev) => [newOrder, ...prev]);
    setCartItems([]); // Clear cart
    setOrderToPreview(newOrder);
    setIsPreviewOpen(true);
    showNotification("🚀 ¡Pedido realizado con éxito! La cocina ya está preparando su café.", "success");
    setActiveTab("historial"); // Switch to Orders view
  };

  // Confirm booking
  const handleConfirmReservation = async (newBooking: Reservation) => {
    try {
      await supabase.from("reservations").insert({
        id: newBooking.id,
        table_id: newBooking.tableId,
        table_name: newBooking.tableName,
        date: newBooking.date,
        time_slot: newBooking.timeSlot,
        guests: newBooking.guests,
        customer_name: newBooking.customerName,
        customer_phone: newBooking.customerPhone,
        created_at: newBooking.createdAt,
        reference_code: newBooking.referenceCode
      });
    } catch (err) {
      console.error("Error creating reservation on Supabase:", err);
    }
    setBookings((prev) => [newBooking, ...prev]);
    showNotification(`📅 ¡Mesa reservada! ${newBooking.tableName} para el ${newBooking.date} a las ${newBooking.timeSlot}. Cód: ${newBooking.referenceCode}`, "success");
  };

  // Cancel booking
  const handleCancelBooking = async (bookingId: string) => {
    const b = bookings.find((bk) => bk.id === bookingId);
    try {
      await supabase.from("reservations").delete().eq("id", bookingId);
    } catch (err) {
      console.error("Error deleting reservation from Supabase:", err);
    }
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    showNotification(`🛑 Reserva cancelada con éxito para la ${b?.tableName || "Mesa"}.`, "info");
  };

  // Re-order past order (Hydrates cart)
  const handleReorder = (orderItems: { name: string; quantity: number; customizationSummary: string }[]) => {
    const newCartItems: CartItem[] = [];
    orderItems.forEach((ordItem) => {
      const menuItem = menuItems.find((m) => m.name === ordItem.name);
      if (menuItem) {
        // Check stock
        if (menuItem.stock !== undefined && menuItem.stock <= 0) {
          showNotification(`⚠️ '${menuItem.name}' se encuentra agotado y no pudo ser reordenado.`, "warning");
          return;
        }

        const custom: MenuItemCustomization = {};
        const summary = ordItem.customizationSummary;

        if (summary.includes("Size: L")) custom.size = "L";
        else if (summary.includes("Size: XL")) custom.size = "XL";
        else if (summary.includes("Size: M")) custom.size = "M";

        if (summary.includes("Almendra")) custom.milk = "Almendra";
        else if (summary.includes("Avena")) custom.milk = "Avena";
        else if (summary.includes("Deslactosada")) custom.milk = "Deslactosada";
        else if (summary.includes("Entera") || summary.includes("Regular")) custom.milk = "Regular";

        if (summary.includes("Dulce: 0%")) custom.sweetness = "0%";
        else if (summary.includes("Dulce: 50%")) custom.sweetness = "50%";
        else if (summary.includes("Dulce: 100%")) custom.sweetness = "100%";

        if (summary.includes("Caliente")) custom.warmed = true;

        const extras: string[] = [];
        if (summary.includes("Extra Espresso Shot")) extras.push("Extra Espresso Shot");
        if (summary.includes("Sirope de Caramelo")) extras.push("Sirope de Caramelo");
        if (summary.includes("Crema Batida")) extras.push("Crema Batida");
        if (extras.length > 0) custom.extras = extras;

        newCartItems.push({
          id: "cart-reorder-" + Date.now() + Math.random().toString(36).substring(2, 6),
          menuItem,
          customization: custom,
          quantity: Math.min(ordItem.quantity, menuItem.stock !== undefined ? menuItem.stock : 99)
        });
      }
    });

    setCartItems((prev) => [...prev, ...newCartItems]);
    setIsCartOpen(true);
    showNotification("🔁 Hemos copiado su pedido anterior a la bandeja actual.", "success");
  };

  // Update order status if completed in order Status tracker component
  const handleOrderStatusCompleted = async (orderId: string) => {
    try {
      await supabase.from("orders").update({ status: "Completado" }).eq("id", orderId);
    } catch (err) {
      console.error("Error updating order status on Supabase:", err);
    }
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "Completado" as OrderStatusType } : o))
    );
    showNotification("☕ ¡Su pedido ya fue entregado y disfrutado!", "success");
  };

  // Direct backend comanda status modifier for Admin Panel
  const handleOrderStatusUpdate = async (orderId: string, status: OrderStatusType) => {
    try {
      await supabase.from("orders").update({ status }).eq("id", orderId);
    } catch (err) {
      console.error("Error updating order status on Supabase:", err);
    }
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    showNotification(`📋 Pedido actualizado a estado: '${status}'.`, "info");
  };

  if (activeTab === "admin") {
    return (
      <div className="min-h-screen bg-paper font-sans text-espresso selection:bg-caramel selection:text-white">
        <AdminHub
          orders={orders}
          onOrderStatusUpdate={handleOrderStatusUpdate}
          onUpdateOrders={setOrders}
          menuItems={menuItems}
          onUpdateMenu={setMenuItems}
          onShowNotification={showNotification}
          clientAccounts={clientAccounts}
          onUpdateClientAccounts={setClientAccounts}
          onClosePanel={() => setActiveTab("inicio")}
        />
        
        {/* Floating Interactive Toast Notifications Overlay Stack */}
        <div className="fixed top-6 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
          <AnimatePresence>
            {notifications.map((toast) => {
              const isSuccess = toast.type === "success";
              const isWarning = toast.type === "warning";
              const Icon = isSuccess ? CheckCircle : isWarning ? AlertTriangle : Info;
              return (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, x: 50, y: -10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg ${
                    isSuccess
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : isWarning
                      ? "bg-amber-50 border-amber-200 text-amber-900"
                      : "bg-blue-50 border-blue-200 text-blue-900"
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${
                    isSuccess ? "text-emerald-700" : isWarning ? "text-amber-700" : "text-blue-700"
                  }`} />
                  <div className="flex-1 text-xs font-semibold leading-relaxed">
                    {toast.message}
                  </div>
                  <button
                    onClick={() => removeNotification(toast.id)}
                    className="p-0.5 hover:bg-stone-200/50 rounded transition-all cursor-pointer text-stone-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper font-sans text-espresso selection:bg-caramel selection:text-white flex flex-col justify-between">
      <div>
        {/* Navbar Header */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          cartCount={cartItems.reduce((acc, curr) => acc + curr.quantity, 0)}
          onCartClick={() => setIsCartOpen(true)}
        />

        {/* Sliding Bag Drawer */}
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onCheckout={handleCheckoutComplete}
          activeBookings={bookings}
        />

        {/* Content routing based on activeTab */}
        <main className="pb-24">
          <AnimatePresence mode="wait">
            {activeTab === "inicio" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-16"
              >
                {/* Visual Grand Hero Section */}
                <section className="relative overflow-hidden bg-espresso text-paper py-24 sm:py-32 px-6">
                  {/* Background overlay image of espresso pouring */}
                  <div className="absolute inset-0 z-0 opacity-30">
                    <img
                      src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=1200"
                      alt="Cafetería de Especialidad"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-linear-to-r from-espresso via-espresso/80 to-transparent z-0" />

                  <div className="relative z-10 mx-auto max-w-7xl">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-caramel block mb-3 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" /> Cafés de Especialidad & Repostería Artesanal
                    </span>
                    <h1 className="font-serif text-4xl font-extrabold tracking-tight sm:text-6xl max-w-3xl leading-tight italic">
                      El Ritual del Café con Alma de Especialidad
                    </h1>
                    <p className="mt-4 text-base sm:text-lg text-paper/80 max-w-xl leading-relaxed">
                      En <strong className="text-caramel font-serif">Café Puglia</strong> fusionamos la devoción por el café de especialidad de excelencia con la calidez del encuentro familiar. Venga a disfrutar de nuestra repostería artesanal producida en el día y viva un ritual único en la ciudad de La Plata.
                    </p>

                    <div className="mt-8 flex flex-col sm:flex-row gap-4">
                      <button
                        id="hero-go-menu-btn"
                        onClick={() => setActiveTab("menu")}
                        className="rounded-full bg-caramel hover:bg-caramel/90 text-white font-bold px-8 py-3.5 text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <span>Explorar el Menú</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>

                      <button
                        id="hero-go-bookings-btn"
                        onClick={() => setActiveTab("reservas")}
                        className="rounded-full border border-paper/30 bg-white/10 hover:bg-white/15 text-paper font-bold px-8 py-3.5 text-sm transition-all cursor-pointer"
                      >
                        Reservar Mesa Física
                      </button>
                    </div>
                  </div>
                </section>

                {/* Café Origen Experience Highlights */}
                <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                  <div className="text-center max-w-2xl mx-auto mb-12">
                    <h2 className="font-serif text-3xl font-bold text-espresso tracking-tight">La Experiencia Café Puglia</h2>
                    <p className="text-xs text-espresso/60 mt-2">La calidez de nuestro equipo y la devoción por el buen café inspiran cada rincón de nuestra casa.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Feature 1 */}
                    <div className="rounded-2xl border border-coffee bg-white p-6 shadow-xs flex flex-col justify-between hover:border-caramel transition-all">
                      <div>
                        <div className="h-10 w-10 rounded-xl bg-caramel/10 text-caramel flex items-center justify-center mb-4">
                          <Coffee className="h-5 w-5" />
                        </div>
                        <h3 className="font-serif font-bold text-lg text-espresso">Menú Digital Interactivo</h3>
                        <p className="text-xs text-espresso/70 mt-2 leading-relaxed">
                          Filtre por preferencias alimentarias, explore alérgenos y caliente sus postres favoritos o personalice su tipo de leche de avena o almendras.
                        </p>
                      </div>
                      <button
                        id="feature-btn-menu"
                        onClick={() => setActiveTab("menu")}
                        className="text-xs font-bold text-caramel hover:text-espresso flex items-center gap-1 mt-5 cursor-pointer"
                      >
                        <span>Pedir ahora</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Feature 2 */}
                    <div className="rounded-2xl border border-coffee bg-white p-6 shadow-xs flex flex-col justify-between hover:border-caramel transition-all">
                      <div>
                        <div className="h-10 w-10 rounded-xl bg-caramel/10 text-caramel flex items-center justify-center mb-4">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <h3 className="font-serif font-bold text-lg text-espresso">Plano de Mesas Interactivo</h3>
                        <p className="text-xs text-espresso/70 mt-2 leading-relaxed">
                          Elija su ambiente ideal desde el plano de distribución en 2D: rincón de lectura íntimo, mesa ventana con luz natural, o la terraza exterior.
                        </p>
                      </div>
                      <button
                        id="feature-btn-reservas"
                        onClick={() => setActiveTab("reservas")}
                        className="text-xs font-bold text-caramel hover:text-espresso flex items-center gap-1 mt-5 cursor-pointer"
                      >
                        <span>Elegir mi mesa</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Feature 3 */}
                    <div className="rounded-2xl border border-coffee bg-white p-6 shadow-xs flex flex-col justify-between hover:border-caramel transition-all">
                      <div>
                        <div className="h-10 w-10 rounded-xl bg-caramel/10 text-caramel flex items-center justify-center mb-4">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <h3 className="font-serif font-bold text-lg text-espresso">Asesor Barista IA</h3>
                        <p className="text-xs text-espresso/70 mt-2 leading-relaxed">
                          Responde a las preguntas de nuestro Barista Virtual para recibir una recomendación de maridaje de café y repostería personalizada.
                        </p>
                      </div>
                      <button
                        id="feature-btn-barista"
                        onClick={() => setActiveTab("barista-ia")}
                        className="text-xs font-bold text-caramel hover:text-espresso flex items-center gap-1 mt-5 cursor-pointer"
                      >
                        <span>Consultar barista</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </section>

                {/* Promotional Banner (Featured Specials Showcase) */}
                <section className="bg-white border-y border-coffee py-16 px-4">
                  <div className="mx-auto max-w-7xl">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
                      <div className="max-w-md lg:max-w-lg">
                        <span className="text-[10px] font-bold tracking-widest text-caramel uppercase block mb-2">Recomendaciones Especiales</span>
                        <h3 className="font-serif text-3xl font-extrabold text-espresso leading-tight italic">Submarino con Medialunas de Manteca</h3>
                        <p className="text-xs text-espresso/70 mt-3 leading-relaxed">
                          La experiencia porteña definitiva. Sumerja la barra de chocolate puro de Bariloche en la leche espumosa caliente y acompáñela con una medialuna calentita pintada con almíbar cítrico casero.
                        </p>
                        <div className="flex items-center gap-6 mt-6">
                          <div className="text-center">
                            <span className="text-2xl font-extrabold text-espresso">$4.50</span>
                            <span className="text-[9px] text-espresso/50 block font-bold">Precio Especial</span>
                          </div>
                          <button
                            id="promo-order-submarino"
                            onClick={() => {
                              const item = menuItems.find(m => m.id === "arg-submarino")!;
                              handleAddToBag(item, { size: "M", milk: "Regular", sweetness: "100%" });
                            }}
                            className="rounded-full bg-espresso hover:bg-caramel text-paper font-bold text-xs px-6 py-3 shadow-md flex items-center space-x-1.5 transition-all cursor-pointer"
                          >
                            <span>Pedir Ahora</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Right showcase image card */}
                      <div className="w-full max-w-sm shrink-0 rounded-2xl overflow-hidden shadow-lg border border-coffee bg-white">
                        <img
                          src="https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=500"
                          alt="Submarino de Chocolate"
                          className="h-64 w-full object-cover"
                        />
                        <div className="p-4 border-t border-coffee flex justify-between items-center bg-paper">
                          <div>
                            <h4 className="font-serif font-bold text-sm text-espresso">Submarino de Chocolate Bariloche</h4>
                            <span className="text-[10px] text-espresso/60">Leche de Campo Caliente • Chocolate de Autor</span>
                          </div>
                          <div className="flex items-center gap-1 bg-caramel/10 px-2 py-1 rounded text-caramel font-bold text-[10px]">
                            <Star className="h-3.5 w-3.5 fill-caramel text-caramel" />
                            <span>Tradiciones</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === "menu" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key="menu-tab-content"
              >
                <InteractiveMenu onAddToBag={handleAddToBag} menuItems={menuItems} />
              </motion.div>
            )}

            {activeTab === "carta-digital" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key="carta-digital-tab-content"
              >
                <CartaDigital onAddToBag={handleAddToBag} onShowNotification={showNotification} />
              </motion.div>
            )}

            {activeTab === "reservas" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key="reservas-tab-content"
              >
                <TableReservation onConfirmReservation={handleConfirmReservation} />
              </motion.div>
            )}

            {activeTab === "manual" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key="manual-tab-content"
              >
                <ManualPuglia />
              </motion.div>
            )}

            {activeTab === "barista-ia" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key="barista-tab-content"
              >
                <BaristaAI onAddToBag={handleAddToBag} menuItems={menuItems} />
              </motion.div>
            )}

            {activeTab === "admin" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key="admin-tab-content"
              >
                <AdminHub
                  orders={orders}
                  onOrderStatusUpdate={handleOrderStatusUpdate}
                  onUpdateOrders={setOrders}
                  menuItems={menuItems}
                  onUpdateMenu={setMenuItems}
                  onShowNotification={showNotification}
                  clientAccounts={clientAccounts}
                  onUpdateClientAccounts={setClientAccounts}
                  onClosePanel={() => setActiveTab("inicio")}
                />
              </motion.div>
            )}

            {activeTab === "historial" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key="history-tab-content"
                className="space-y-8"
              >
                {/* Active Tracking Status (if any) */}
                {activeTrackedOrder && (
                  <section className="bg-paper border-b border-coffee py-6">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                      <div className="text-center mb-4">
                        <h3 className="font-serif text-xl font-bold text-espresso">Seguimiento de su pedido actual</h3>
                        <p className="text-xs text-espresso/60 mt-1">Siga el estado de preparación de su café en tiempo real.</p>
                      </div>
                      <OrderStatus
                        activeOrder={activeTrackedOrder}
                        onOrderCompleted={handleOrderStatusCompleted}
                      />
                    </div>
                  </section>
                )}

                {/* History Lists */}
                <HistoryHub
                  bookings={bookings}
                  orders={orders}
                  onCancelBooking={handleCancelBooking}
                  onReorder={handleReorder}
                  onViewTicket={(order) => {
                    setOrderToPreview(order);
                    setIsPreviewOpen(true);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Persistent Live Order Tracking Notification Bar (Floating at bottom if order is not completed) */}
      <AnimatePresence>
        {activeTrackedOrder && activeTab !== "historial" && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-4 inset-x-4 md:left-auto md:right-4 md:w-96 z-30"
          >
            <div 
              onClick={() => setActiveTab("historial")}
              className="bg-espresso border border-coffee text-paper rounded-2xl p-4 shadow-xl hover:scale-101 cursor-pointer transition-all flex items-center justify-between gap-4"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-caramel text-paper flex items-center justify-center shrink-0">
                  <Coffee className="h-4.5 w-4.5 animate-bounce" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-caramel tracking-wider">Pedido en preparación</p>
                  <h4 className="text-xs font-bold truncate">Estado: {activeTrackedOrder.status}</h4>
                </div>
              </div>
              <button
                id="floating-tracker-go-btn"
                className="text-xs font-bold text-espresso bg-paper px-3.5 py-1.5 rounded-full hover:bg-white shrink-0 shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <span>Ver mapa</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Café Origen Footer */}
      <footer className="bg-espresso text-paper/70 border-t border-white/10 py-12 px-4 mt-auto">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-10 text-center md:text-left">
          {/* Brand Info */}
          <div>
            <div className="flex items-center justify-center md:justify-start space-x-2 mb-3">
              <div className="h-8 w-8 rounded-full bg-caramel flex items-center justify-center text-white">
                <Coffee className="h-4.5 w-4.5" />
              </div>
              <span className="font-serif text-lg font-bold text-white">Café Puglia</span>
            </div>
            <p className="text-xs text-paper/50 leading-relaxed max-w-xs mx-auto md:mx-0">
              Café de Especialidad y Pastelería Artesanal en La Plata. Ofrecemos una experiencia única basada en el respeto, la excelencia y la devoción por el café de alta gama.
            </p>
          </div>

          {/* Opening Hours */}
          <div className="flex flex-col items-center md:items-start text-xs font-medium">
            <h4 className="text-white font-bold uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-caramel" /> Horarios de Apertura
            </h4>
            <div className="space-y-1">
              <p>Lunes a Viernes: <span className="text-paper font-semibold">7:30 - 22:30</span></p>
              <p>Sábados y Domingos: <span className="text-paper font-semibold">8:30 - 23:30</span></p>
              <p className="text-[10px] text-paper/40 mt-2">Nuestra pastelería artesanal se hornea fresca cada mañana.</p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="flex flex-col items-center md:items-start text-xs font-medium">
            <h4 className="text-white font-bold uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-caramel" /> Ubicación & Contacto
            </h4>
            <div className="space-y-1 text-paper/70">
              <p>📍 Calle 50 nro 600, La Plata, Buenos Aires, Argentina</p>
              <p>📞 Teléfono: +54 221 423-0000</p>
              <p>✉️ Email: contacto@cafepuglia.com.ar</p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl border-t border-white/10 mt-10 pt-6 text-center text-[10px] text-paper/40 font-semibold tracking-wider uppercase">
          © 2026 Café Puglia. Todos los derechos reservados.
        </div>
      </footer>

      {/* Interactive Ticket & AFIP Invoice Preview Modal */}
      <TicketPreviewModal
        order={orderToPreview}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setOrderToPreview(null);
        }}
        clientAccounts={clientAccounts}
        onUpdateClientAccounts={setClientAccounts}
        onShowNotification={showNotification}
      />

      {/* Floating Interactive Toast Notifications Overlay Stack */}
      <div className="fixed top-24 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {notifications.map((toast) => {
            const isSuccess = toast.type === "success";
            const isWarning = toast.type === "warning";
            const Icon = isSuccess ? CheckCircle : isWarning ? AlertTriangle : Info;
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 50, y: -10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg ${
                  isSuccess
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : isWarning
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-blue-50 border-blue-200 text-blue-900"
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${
                  isSuccess ? "text-emerald-700" : isWarning ? "text-amber-700" : "text-blue-700"
                }`} />
                <div className="flex-1 text-xs font-semibold leading-relaxed">
                  {toast.message}
                </div>
                <button
                  onClick={() => removeNotification(toast.id)}
                  className="p-0.5 hover:bg-stone-200/50 rounded transition-all cursor-pointer text-stone-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
