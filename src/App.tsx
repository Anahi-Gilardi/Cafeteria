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
import Dashboard from "./components/Dashboard";
import CartaDigital from "./components/CartaDigital";
import TicketPreviewModal from "./components/TicketPreviewModal";
import ManualPuglia from "./components/ManualPuglia";
import { Coffee, ArrowRight, Sparkles, BookOpen, Clock, Heart, Star, Phone, MapPin, X, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "./lib/supabase";
import LoginScreen from "./components/LoginScreen";
import KitchenDisplay from "./components/KitchenDisplay";
import SalonMap from "./components/SalonMap";
import RestoBarLogo from "./components/RestoBarLogo";

interface ToastNotification {
  id: string;
  message: string;
  type: "success" | "info" | "warning";
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("origen_current_user");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<string>("dashboard");
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Ticket Preview States
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [orderToPreview, setOrderToPreview] = useState<Order | null>(null);

  // Sync cartItems to local storage (individual customer state)
  useEffect(() => {
    localStorage.setItem("origen_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  // Sync currentUser to local storage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("origen_current_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("origen_current_user");
    }
  }, [currentUser]);

  // Load and seed initial data from Supabase
  useEffect(() => {
    const loadSupabaseData = async () => {
      try {
        // 1. Fetch & Seed Menu Items
        const { data: menuData } = await supabase.from("menu_items").select("*");
        let customImages: any[] = [];
        try {
          const { data: imgData } = await supabase.from("product_images").select("*");
          if (imgData) customImages = imgData;
        } catch (imgErr) {
          console.error("Error fetching product_images:", imgErr);
        }

        if (menuData && menuData.length > 0) {
          const mapped = menuData.map(mapDbToMenuItem);
          customImages.forEach((img: any) => {
            const match = mapped.find(item => item.id === img.product_id);
            if (match) {
              match.image = img.image_base64;
            }
          });
          setMenuItems(mapped);
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

        // 5. Fetch & Seed User Accounts
        const { data: userData } = await supabase.from("users_accounts").select("*");
        if (!userData || userData.length === 0) {
          const defaultUsers = [
            { id: "usr-1", name: "Pablo Madina (Administrador)", email: "pablo@cafepuglia.com", password: "pablo123", role: "administrador", pin: "1111" },
            { id: "usr-2", name: "Rami Madina (Barista)", email: "rami@cafepuglia.com", password: "barista123", role: "barista", pin: "2222" },
            { id: "usr-3", name: "Silvana Madina (Mesero)", email: "silvana@cafepuglia.com", password: "mesero123", role: "mesero", pin: "3333" }
          ];
          await supabase.from("users_accounts").insert(defaultUsers);
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

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab("dashboard");
    showNotification("👋 Sesión cerrada correctamente.", "info");
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-paper font-sans text-espresso selection:bg-caramel selection:text-white flex flex-col justify-between">
        <LoginScreen
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            if (user.role === "barista") {
              setActiveTab("cocina");
            } else {
              setActiveTab("dashboard");
            }
          }}
          onShowNotification={showNotification}
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

  if (activeTab === "admin") {
    return (
      <div className="min-h-screen bg-[#0F0A07] font-sans text-[#FDFBF7] selection:bg-[#D4AF37] selection:text-[#1C120C]">
        <AdminHub
          orders={orders}
          onOrderStatusUpdate={handleOrderStatusUpdate}
          onUpdateOrders={setOrders}
          menuItems={menuItems}
          onUpdateMenu={setMenuItems}
          onShowNotification={showNotification}
          clientAccounts={clientAccounts}
          onUpdateClientAccounts={setClientAccounts}
          onClosePanel={() => setActiveTab("dashboard")}
          currentUser={currentUser}
          bookings={bookings}
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
    <div className="min-h-screen bg-[#0F0A07] font-sans text-[#FDFBF7] selection:bg-[#D4AF37] selection:text-[#1C120C]">
      <AdminHub
        orders={orders}
        onOrderStatusUpdate={handleOrderStatusUpdate}
        onUpdateOrders={setOrders}
        menuItems={menuItems}
        onUpdateMenu={setMenuItems}
        onShowNotification={showNotification}
        clientAccounts={clientAccounts}
        onUpdateClientAccounts={setClientAccounts}
        onClosePanel={handleLogout}
        currentUser={currentUser}
        bookings={bookings}
      />

      <div className="hidden">
        {/* Sidebar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cartItems.reduce((acc, curr) => acc + curr.quantity, 0)}
        onCartClick={() => setIsCartOpen(true)}
        onLogout={handleLogout}
        currentUser={currentUser}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? "md:pl-80" : "pl-0"}`}>
        <div className="flex-1">
          {/* Sliding Bag Drawer */}
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            cartItems={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onCheckout={handleCheckoutComplete}
            activeBookings={bookings}
            clientAccounts={clientAccounts}
          />

          {/* Content routing based on activeTab */}
          <main className="pb-24">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <Dashboard
                onGoToCaja={() => setActiveTab("admin")}
                onGoToInventario={() => setActiveTab("admin")}
                onShowNotification={showNotification}
                orders={orders}
                menuItems={menuItems}
              />
            )}

            {activeTab === "salon" && (
              <SalonMap
                orders={orders}
                activeBookings={bookings}
                onSelectTableForOrder={(tableNumber) => {
                  setActiveTab("menu");
                  setIsCartOpen(true);
                }}
                onShowNotification={showNotification}
              />
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
                <CartaDigital menuItems={menuItems} onAddToBag={handleAddToBag} onShowNotification={showNotification} />
              </motion.div>
            )}

            {activeTab === "reservas" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key="reservas-tab-content"
              >
                <TableReservation bookings={bookings} onConfirmReservation={handleConfirmReservation} />
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
                  onClosePanel={() => setActiveTab("dashboard")}
                  currentUser={currentUser}
                  bookings={bookings}
                />
              </motion.div>
            )}

            {activeTab === "cocina" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key="cocina-tab-content"
              >
                <KitchenDisplay
                  orders={orders}
                  menuItems={menuItems}
                  onOrderStatusUpdate={handleOrderStatusUpdate}
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

      {/* Resto Bar Del Teatro Footer */}
      <footer className="bg-[#2C1810] text-paper/70 border-t border-[#C2956E]/20 py-12 px-4 mt-auto">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-10 text-center md:text-left">
          {/* Brand Info */}
          <div>
            <div className="flex items-center justify-center md:justify-start mb-3">
              <RestoBarLogo size="md" />
            </div>
            <p className="text-xs text-paper/60 leading-relaxed max-w-xs mx-auto md:mx-0">
              Gastronomía de Autor, Menú Ejecutivo y Cafetería en Río Cuarto. Una propuesta única frente al Teatro Municipal con excelencia y calidez.
            </p>
          </div>

          {/* Opening Hours */}
          <div className="flex flex-col items-center md:items-start text-xs font-medium">
            <h4 className="text-[#F59E0B] font-bold uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[#F59E0B]" /> Horarios de Atención
            </h4>
            <div className="space-y-1 text-white/80">
              <p>Lunes a Viernes: <span className="text-white font-semibold">07:30 - 00:30 hs</span></p>
              <p>Sábados y Domingos: <span className="text-white font-semibold">08:30 - 02:00 hs</span></p>
              <p className="text-[10px] text-[#F59E0B] mt-2 font-bold uppercase tracking-wider">Menú Ejecutivo del Día: $8.000 (Incluye Entrada, Principal, Bebida y Postre)</p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="flex flex-col items-center md:items-start text-xs font-medium">
            <h4 className="text-[#F59E0B] font-bold uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[#F59E0B]" /> Ubicación & Contacto
            </h4>
            <div className="space-y-1 text-white/80">
              <p>📍 Constitución 944 (Frente al Teatro Municipal)</p>
              <p>📍 Río Cuarto, Provincia de Córdoba, Argentina</p>
              <p>📞 Teléfono / Reservas: 358 5042311 / 4651847</p>
              <p>📸 Instagram: @restobardelteatro_rio4</p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl border-t border-white/10 mt-10 pt-6 text-center text-[10px] text-paper/40 font-semibold tracking-wider uppercase">
          © 2026 Resto Bar Del Teatro. Todos los derechos reservados.
        </div>
      </footer>
      </div>
    </div>

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
