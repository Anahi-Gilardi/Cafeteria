import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { MenuItem, MenuItemCustomization, CartItem, Reservation, Order, OrderStatusType, ClientAccount } from "./types";
import Navbar from "./components/Navbar";
import InteractiveMenu from "./components/InteractiveMenu";
import TableReservation from "./components/TableReservation";
import CartDrawer from "./components/CartDrawer";
import OrderStatus from "./components/OrderStatus";
import HistoryHub from "./components/HistoryHub";
import Dashboard from "./components/Dashboard";
import CartaDigital from "./components/CartaDigital";
import { PublicDigitalMarquee } from "./components/PublicDigitalMarquee";
import { PublicLandingPage } from "./components/PublicLandingPage";
import WhatsAppOrderService from "./services/WhatsAppOrderService";
import { Coffee, ArrowRight, Sparkles, BookOpen, Clock, Heart, Star, Phone, MapPin, X, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "./lib/supabase";
import { SupabaseSyncService } from "./services/SupabaseSyncService";
import LoginScreen from "./components/LoginScreen";
import KitchenDisplay from "./components/KitchenDisplay";
import SalonMap from "./components/SalonMap";
import RestoBarLogo from "./components/RestoBarLogo";
import { AuthService, UserRoleProfile } from "./services/AuthService";
import { offlineQueueService } from "./services/OfflineQueueService";
import ErrorBoundary from "./components/ErrorBoundary";
import { OrderPersistenceService } from "./services/OrderPersistenceService";
import PasswordSetupScreen from "./components/PasswordSetupScreen";
import { MenuSyncService } from "./services/MenuSyncService";

const AdminHub = lazy(() => import("./components/AdminHub"));
const BaristaAI = lazy(() => import("./components/BaristaAI"));
const ManualPuglia = lazy(() => import("./components/ManualPuglia"));
const TicketPreviewModal = lazy(() => import("./components/TicketPreviewModal"));

const ModuleFallback = () => (
  <div className="min-h-[240px] flex items-center justify-center text-sm font-bold text-[#D4AF37]">
    Cargando módulo…
  </div>
);

interface ToastNotification {
  id: string;
  message: string;
  type: "success" | "info" | "warning";
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserRoleProfile | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("reset-password") === "1"
  );

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Live dynamic menu items catalog synced with Supabase
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    try {
      const cached = localStorage.getItem("castano_menu_cache");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isMenuLoading, setIsMenuLoading] = useState(true);

  // Global notification toast states
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  // Function to spawn rich custom toast alerts
  const showNotification = (message: string, type: "success" | "info" | "warning" = "info") => {
    const id = "toast-" + Date.now() + Math.random().toString(36).substring(2, 5);
    setNotifications((prev) => [...prev, { id, message, type }]);
    
    // Auto-dismiss after 2.8 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((toast) => toast.id !== id));
    }, 2800);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((toast) => toast.id !== id));
  };

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
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem("resto_bar_orders");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const ordersRef = useRef<Order[]>(orders);
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

  // Supabase Auth is the only source of truth for staff sessions.
  useEffect(() => {
    let active = true;
    void AuthService.getCurrentUser().then((profile) => {
      if (active) setCurrentUser(profile);
    });
    const unsubscribe = AuthService.onAuthStateChange((profile) => {
      if (active) setCurrentUser(profile);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Keep the public catalog aligned across every device and terminal.
  useEffect(() => {
    let active = true;
    const refreshMenu = async () => {
      setIsMenuLoading(true);
      const result = await MenuSyncService.fetchCanonicalMenu();
      if (!active) return;
      if (result.error) {
        console.error("No se pudo actualizar la carta desde Supabase:", result.error);
        setIsMenuLoading(false);
        return;
      }
      if (result.imageWarning) {
        console.warn("La carta se cargó sin algunas imágenes personalizadas:", result.imageWarning);
      }
      setMenuItems(result.items);
      try {
        localStorage.setItem("castano_menu_cache", JSON.stringify(result.items));
      } catch {}
      setIsMenuLoading(false);
    };

    void refreshMenu();
    const unsubscribe = MenuSyncService.subscribe(
      () => void refreshMenu(),
      (status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("El canal realtime de la carta perdió la conexión.");
        }
      }
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Load private operational data only after Supabase Auth resolves.
  useEffect(() => {
    const loadSupabaseData = async () => {
      if (!currentUser) return;
      try {

        // 1. Fetch Client Accounts
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
          setClientAccounts([]);
        }

        // 2. Fetch Reservations
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

        // 3. Supabase is canonical. Local data is only an offline fallback.
        const { orders: remoteOrders, error: fetchErr } = await SupabaseSyncService.fetchOrders();
        if (!fetchErr) {
          setOrders(remoteOrders);
          try {
            localStorage.setItem("resto_bar_orders", JSON.stringify(remoteOrders));
          } catch {}
        } else {
          console.warn("⚠️ Advertencia al consultar comandas en Supabase:", fetchErr);
        }

      } catch (err) {
        console.error("Error loading data from Supabase:", err);
      }
    };

    loadSupabaseData();
  }, [currentUser]);

  // Sync active tracked order
  useEffect(() => {
    const active = orders.find(o => o.status !== "Completado");
    setActiveTrackedOrder(active || null);
    ordersRef.current = orders;
  }, [orders]);

  // Keep authenticated staff screens aligned with changes made by other terminals.
  useEffect(() => {
    if (!currentUser) return;

    let active = true;
    const refreshOrders = async () => {
      const result = await SupabaseSyncService.fetchOrders();
      if (!active || result.error) return;
      
      setOrders(() => {
        try {
          localStorage.setItem("resto_bar_orders", JSON.stringify(result.orders));
        } catch {}
        return result.orders;
      });
    };

    void refreshOrders();
    const unsubscribe = SupabaseSyncService.subscribeToOrders(
      () => void refreshOrders(),
      (status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("El canal realtime de comandas perdió la conexión.");
        }
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [currentUser]);

  // Retry queued orders when connectivity returns and once on application start.
  useEffect(() => {
    const syncQueue = async () => {
      const result = await offlineQueueService.syncPendingQueue();
      if (result.synced > 0) {
        const remote = await SupabaseSyncService.fetchOrders();
        if (!remote.error) setOrders(remote.orders);
        showNotification(
          `☁️ ${result.synced} pedido${result.synced === 1 ? "" : "s"} pendiente${result.synced === 1 ? "" : "s"} sincronizado${result.synced === 1 ? "" : "s"}.`,
          "success"
        );
      }
    };
    const onOnline = () => void syncQueue();
    window.addEventListener("online", onOnline);
    void syncQueue();
    return () => window.removeEventListener("online", onOnline);
  }, []);

  // Handle adding an item to the cart
  const handleAddToBag = (item: MenuItem, customization: MenuItemCustomization) => {
    if (item.isAvailable === false) {
      showNotification(`⚠️ '${item.name}' no está disponible para la venta.`, "warning");
      return;
    }
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

  // Persist checkout atomically; enqueue only when the remote write fails.
  const handleCheckoutComplete = async (newOrder: Order) => {
    const result = await SupabaseSyncService.saveOrder(newOrder);
    const persistedOrder = result.order || newOrder;
    if (!result.success) {
      offlineQueueService.enqueueOrder(newOrder, result.error);
      showNotification(
        "⚠️ Pedido guardado en la cola local. Se sincronizará al recuperar la conexión.",
        "warning"
      );
    } else {
      showNotification("🚀 Pedido sincronizado y enviado a cocina.", "success");
    }

    setOrders((prev) => [persistedOrder, ...prev.filter((order) => order.id !== persistedOrder.id)]);
    setCartItems([]); // Clear cart
    setOrderToPreview(persistedOrder);
    setIsPreviewOpen(true);
    setActiveTab("historial"); // Switch to Orders view
  };

  // Confirm booking
  const handleConfirmReservation = async (newBooking: Reservation) => {
    const { error } = await supabase.from("reservations").insert({
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
    if (error) {
      console.error("Error creating reservation on Supabase:", error);
      showNotification("⚠️ No se pudo confirmar la reserva en la nube.", "warning");
      return false;
    }
    setBookings((prev) => [newBooking, ...prev]);
    showNotification(`📅 ¡Mesa reservada! ${newBooking.tableName} para el ${newBooking.date} a las ${newBooking.timeSlot}. Cód: ${newBooking.referenceCode}`, "success");
    return true;
  };

  // Cancel booking
  const handleCancelBooking = async (bookingId: string) => {
    const b = bookings.find((bk) => bk.id === bookingId);
    const { error } = await supabase.from("reservations").delete().eq("id", bookingId);
    if (error) {
      console.error("Error deleting reservation from Supabase:", error);
      showNotification("⚠️ No se pudo cancelar la reserva en la nube.", "warning");
      return;
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
    const result = await SupabaseSyncService.updateOrderStatus(orderId, "Completado");
    if (!result.success) {
      console.error("Error updating order status on Supabase:", result.error);
      showNotification("⚠️ El estado no pudo sincronizarse. Intente nuevamente.", "warning");
      return;
    }
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "Completado" as OrderStatusType } : o))
    );
    showNotification("☕ ¡Su pedido ya fue entregado y disfrutado!", "success");
  };

  // Direct backend comanda status modifier for Admin Panel & KDS
  const handleOrderStatusUpdate = async (orderId: string, status: OrderStatusType) => {
    // 1. Optimistic Local State & Cache Update (Guarantees instant UI column shift in KDS)
    setOrders((prev) => {
      const updated = prev.map((o) => (o.id === orderId ? { ...o, status } : o));
      try {
        localStorage.setItem("resto_bar_orders", JSON.stringify(updated));
      } catch (e) {}
      const targetOrder = updated.find((o) => o.id === orderId);
      if (targetOrder && status === "Listo") {
        WhatsAppOrderService.notifyOrderReady(targetOrder);
      }
      return updated;
    });

    // 2. Async Network Sync with Supabase (Graceful fallback if unauthenticated or offline)
    try {
      const result = await SupabaseSyncService.updateOrderStatus(orderId, status);
      if (!result.success) {
        console.warn("Supabase status sync pending:", result.error);
        const currentOrder = orders.find(o => o.id === orderId);
        if (currentOrder) {
          offlineQueueService.enqueueStatusUpdate(orderId, status, result.error);
        }
        showNotification(`📋 Estado de comanda #${orderId} actualizado localmente.`, "info");
      } else {
        showNotification(`📋 Pedido #${orderId} actualizado a estado: '${status}'.`, "success");
      }
    } catch (err) {
      console.warn("Error in handleOrderStatusUpdate sync:", err);
      showNotification(`📋 Estado de comanda #${orderId} actualizado localmente.`, "info");
    }
  };

  const handleArchiveOrder = async (orderId: string): Promise<boolean> => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) {
      showNotification(`No se encontró la comanda #${orderId}.`, "warning");
      return false;
    }

    try {
      const result = await SupabaseSyncService.archiveOrder(orderId, targetOrder);
      if (!result.success) {
        console.error("Error archiving order on Supabase:", result.error);
        showNotification(`No se pudo archivar la comanda #${orderId}. Intente nuevamente.`, "warning");
        return false;
      }
      setOrders((prev) => {
        const updated = prev.map((order) =>
          order.id === orderId ? { ...order, status: "Completado" as OrderStatusType } : order
        );
        try {
          localStorage.setItem("resto_bar_orders", JSON.stringify(updated));
        } catch {}
        return updated;
      });
      showNotification(`Comanda #${orderId} guardada en el archivo de Supabase.`, "success");
      return true;
    } catch (err) {
      console.error("Archive error:", err);
      showNotification(`No se pudo archivar la comanda #${orderId}. Intente nuevamente.`, "warning");
      return false;
    }
  };

  const handleDeleteOrder = async (orderId: string): Promise<boolean> => {
    const targetOrder = ordersRef.current.find((order) => order.id === orderId);
    if (!targetOrder) {
      showNotification(`No se encontró la comanda #${orderId}.`, "warning");
      return false;
    }

    const result = await SupabaseSyncService.deleteOrder(orderId);
    if (!result.success) {
      showNotification(result.error || `No se pudo eliminar la comanda #${orderId}.`, "warning");
      return false;
    }

    const updatedOrders = ordersRef.current.filter((order) => order.id !== orderId);
    ordersRef.current = updatedOrders;
    setOrders(updatedOrders);
    try {
      localStorage.setItem("resto_bar_orders", JSON.stringify(updatedOrders));
    } catch {}

    showNotification(
      result.inventoryRestored
        ? `Comanda #${orderId} eliminada. El stock y los insumos fueron restaurados.`
        : `Comanda #${orderId} eliminada correctamente.`,
      "success"
    );
    return true;
  };

  const handleUpdateOrdersWithPersist = (newOrdersOrUpdater: Order[] | ((prev: Order[]) => Order[])) => {
    const previousOrders = ordersRef.current;
    const nextOrders = typeof newOrdersOrUpdater === "function"
      ? newOrdersOrUpdater(previousOrders)
      : newOrdersOrUpdater;

    ordersRef.current = nextOrders;
    setOrders(nextOrders);
    try {
      localStorage.setItem("resto_bar_orders", JSON.stringify(nextOrders));
    } catch {}

    void OrderPersistenceService.persistChanges(previousOrders, nextOrders).then((report) => {
      if (report.failedOrderIds.length > 0) {
        showNotification(
          `⚠️ ${report.failedOrderIds.length} cambio de comanda quedó pendiente de sincronización.`,
          "warning"
        );
      }
    });
  };

  const handleLogout = () => {
    void AuthService.logout()
      .catch(() => {
        showNotification(
          "⚠️ La sesión local se cerró, pero Supabase no respondió.",
          "warning"
        );
      })
      .finally(() => {
        setCurrentUser(null);
        setActiveTab("dashboard");
        showNotification("👋 Sesión cerrada correctamente.", "info");
      });
  };

  const renderNotificationStack = () => (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 max-w-[320px] w-full pointer-events-none">
      <AnimatePresence>
        {notifications.slice(-3).map((toast) => {
          const isSuccess = toast.type === "success";
          const isWarning = toast.type === "warning";
          const Icon = isSuccess ? CheckCircle : isWarning ? AlertTriangle : Info;
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 0.95, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border backdrop-blur-md shadow-2xl transition-all ${
                isSuccess
                  ? "bg-[#1A110B]/90 border-emerald-500/50 text-emerald-300"
                  : isWarning
                  ? "bg-[#1A110B]/90 border-amber-500/50 text-amber-300"
                  : "bg-[#1A110B]/90 border-[#D4AF37]/50 text-[#FFDF00]"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Icon className={`h-4 w-4 shrink-0 ${
                  isSuccess ? "text-emerald-400" : isWarning ? "text-amber-400" : "text-[#FFDF00]"
                }`} />
                <span className="text-[11px] font-bold text-[#FDFBF7] line-clamp-2 leading-tight">
                  {toast.message}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeNotification(toast.id)}
                className="p-1 hover:bg-white/10 rounded-lg transition-all cursor-pointer text-[#FDFBF7]/60 hover:text-white shrink-0 border-none bg-transparent"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  const finishPasswordRecovery = (showSuccess: boolean) => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("reset-password");
      url.searchParams.delete("code");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
    setIsPasswordRecovery(false);
    if (showSuccess) {
      showNotification("✅ Contraseña actualizada correctamente.", "success");
    }
  };

  const availableMenuItems = menuItems.filter((item) => item.isAvailable !== false);

  if (isPasswordRecovery) {
    return (
      <ErrorBoundary>
        <PasswordSetupScreen
          onCompleted={() => finishPasswordRecovery(true)}
          onCancel={() => finishPasswordRecovery(false)}
        />
        {renderNotificationStack()}
      </ErrorBoundary>
    );
  }

  if (activeTab === "public_menu") {
    return (
      <ErrorBoundary>
        <PublicDigitalMarquee
          menuItems={availableMenuItems}
          onShowNotification={showNotification}
        />
      </ErrorBoundary>
    );
  }

  if (!currentUser) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-[#F3E7DB] font-sans text-[#332424] selection:bg-[#843747] selection:text-white">
        <PublicLandingPage
          menuItems={availableMenuItems}
          isMenuLoading={isMenuLoading}
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
        
        {renderNotificationStack()}
      </div>
      </ErrorBoundary>
    );
  }

  if (activeTab === "admin") {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-[#F3E7DB] font-sans text-[#332424] selection:bg-[#843747] selection:text-white">
          <Suspense fallback={<ModuleFallback />}>
            <AdminHub
              orders={orders}
              onOrderStatusUpdate={handleOrderStatusUpdate}
              onArchiveOrder={handleArchiveOrder}
              onDeleteOrder={handleDeleteOrder}
              onUpdateOrders={handleUpdateOrdersWithPersist}
              menuItems={menuItems}
              onUpdateMenu={setMenuItems}
              onShowNotification={showNotification}
              clientAccounts={clientAccounts}
              onUpdateClientAccounts={setClientAccounts}
              onClosePanel={() => setActiveTab("dashboard")}
              currentUser={currentUser}
              bookings={bookings}
            />
          </Suspense>
          {renderNotificationStack()}
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3E7DB] font-sans text-[#332424] selection:bg-[#843747] selection:text-white">
      <Suspense fallback={<ModuleFallback />}>
        <AdminHub
          orders={orders}
          onOrderStatusUpdate={handleOrderStatusUpdate}
          onArchiveOrder={handleArchiveOrder}
          onDeleteOrder={handleDeleteOrder}
          onUpdateOrders={handleUpdateOrdersWithPersist}
          menuItems={menuItems}
          onUpdateMenu={setMenuItems}
          onShowNotification={showNotification}
          clientAccounts={clientAccounts}
          onUpdateClientAccounts={setClientAccounts}
          onClosePanel={handleLogout}
          currentUser={currentUser}
          bookings={bookings}
        />
      </Suspense>

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
                <InteractiveMenu onAddToBag={handleAddToBag} menuItems={availableMenuItems} />
              </motion.div>
            )}

            {activeTab === "carta-digital" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key="carta-digital-tab-content"
              >
                <CartaDigital menuItems={availableMenuItems} onAddToBag={handleAddToBag} onShowNotification={showNotification} />
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
                <Suspense fallback={<ModuleFallback />}>
                  <ManualPuglia />
                </Suspense>
              </motion.div>
            )}

            {activeTab === "barista-ia" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key="barista-tab-content"
              >
                <Suspense fallback={<ModuleFallback />}>
                  <BaristaAI onAddToBag={handleAddToBag} menuItems={availableMenuItems} />
                </Suspense>
              </motion.div>
            )}

            {activeTab === "admin" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key="admin-tab-content"
              >
                <Suspense fallback={<ModuleFallback />}>
              <AdminHub
                orders={orders}
                onOrderStatusUpdate={handleOrderStatusUpdate}
                onArchiveOrder={handleArchiveOrder}
                onDeleteOrder={handleDeleteOrder}
                    onUpdateOrders={handleUpdateOrdersWithPersist}
                    menuItems={menuItems}
                    onUpdateMenu={setMenuItems}
                    onShowNotification={showNotification}
                    clientAccounts={clientAccounts}
                    onUpdateClientAccounts={setClientAccounts}
                    onClosePanel={() => setActiveTab("dashboard")}
                    currentUser={currentUser}
                    bookings={bookings}
                  />
                </Suspense>
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
                  onArchiveOrder={handleArchiveOrder}
                  onDeleteOrder={handleDeleteOrder}
                  canDeleteOrders={["administrador", "dueño"].includes(currentUser.role)}
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

      {/* Castaño Footer */}
      <footer className="bg-[#E8D4C3] text-[#332424] border-t border-[#D1AD95] py-10 px-4 mt-auto">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          {/* Brand Info */}
          <div>
            <div className="flex items-center justify-center md:justify-start mb-3">
              <RestoBarLogo size="md" />
            </div>
            <p className="text-xs text-[#6F5A55] leading-relaxed max-w-xs mx-auto md:mx-0">
              Gastronomía de Autor, Menú Ejecutivo y Cafetería en Río Cuarto. Una propuesta única frente al Teatro Municipal con excelencia y calidez.
            </p>
          </div>

          {/* Opening Hours */}
          <div className="flex flex-col items-center md:items-start text-xs font-medium">
            <h4 className="text-[#843747] font-bold uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[#843747]" /> Horarios de Atención
            </h4>
            <div className="space-y-1 text-[#332424]">
              <p>Lunes a Viernes: <span className="font-semibold">07:30 - 00:30 hs</span></p>
              <p>Sábados y Domingos: <span className="font-semibold">08:30 - 02:00 hs</span></p>
              <p className="text-[10px] text-[#843747] mt-2 font-bold uppercase tracking-wider">Menú Ejecutivo del Día: $12.500 (Incluye Entrada, Principal, Bebida y Postre)</p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="flex flex-col items-center md:items-start text-xs font-medium">
            <h4 className="text-[#843747] font-bold uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[#843747]" /> Ubicación & Contacto
            </h4>
            <div className="space-y-1 text-[#332424]">
              <p>Constitución 944 (Frente al Teatro Municipal)</p>
              <p>Río Cuarto, Provincia de Córdoba, Argentina</p>
              <p>Teléfono / Reservas: 358 5042311 / 4651847</p>
              <p>Instagram: @castano_restobar</p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl border-t border-[#D1AD95] mt-8 pt-4 text-center text-[10px] text-[#6F5A55] font-semibold tracking-wider uppercase">
          © 2026 Castaño — Resto Bar. Todos los derechos reservados.
        </div>
      </footer>
      </div>
    </div>

      {/* Interactive Ticket & AFIP Invoice Preview Modal */}
      <Suspense fallback={null}>
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
      </Suspense>

      {renderNotificationStack()}
    </div>
  );
}
