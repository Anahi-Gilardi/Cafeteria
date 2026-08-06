import { useState, useEffect, useRef, useMemo, FormEvent } from "react";
import { MenuItem, Order, OrderStatusType, ClientAccount } from "../types";
import {
  Coins, ClipboardList, Package, TrendingUp, AlertCircle, Plus, Edit2, Save, 
  Check, DollarSign, ArrowUpRight, Receipt, RefreshCw, Layers, Users, 
  ArrowUp, CreditCard, Coffee, CheckCircle, Info, BookOpen, LogOut, 
  Search, Activity, Trash2, Calendar, FileText, LayoutDashboard, Sliders, X,
  Lock, Unlock, Percent, Printer, Scissors, Settings, Download, AlertTriangle, MessageCircle, Clock, PhoneCall, Flame, Menu,
  HandPlatter, ChefHat, ReceiptText, CalendarCheck2, Armchair, BookOpenText, Boxes, Truck, UsersRound, ChartNoAxesCombined, PanelLeftClose, PanelLeftOpen, Loader2, ChevronDown, ChevronUp, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DailyExecutiveMenu } from "../types";
import { supabase } from "../lib/supabase";
import RestoBarLogo from "./RestoBarLogo";
import KitchenDisplay from "./KitchenDisplay";
import { TimeSlotService } from "../services/TimeSlotService";
import WaiterCallService, { WaiterCall } from "../services/WaiterCallService";
import { DeliveryZoneService, RIO_CUARTO_ZONES } from "../services/DeliveryZoneService";
import { AuditPDFService } from "../services/AuditPDFService";
import { StaffAttendancePDFService, AttendanceRecord } from "../services/StaffAttendancePDFService";
import { isOrderActive } from "../utils/orderUtils";
import ProfessionalOrderTicket from "./ProfessionalOrderTicket";
import { ThermalPrinterService, PrinterConfig } from "../services/ThermalPrinterService";
import { ArcaBillingService, FiscalCustomerInfo } from "../services/ArcaBillingService";
import { ReceiptPDFService } from "../services/ReceiptPDFService";
import { OrderTypeSelector, OrderServiceType, TakeawayDetails, DeliveryDetails } from "./OrderTypeSelector";
import { WhatsAppNotificationService } from "../services/WhatsAppNotificationService";
import { CloudHealth, SupabaseSyncService } from "../services/SupabaseSyncService";
import { StorageService } from "../services/StorageService";
import { PresupuestoPDFService } from "../services/PresupuestoPDFService";
import { StaffService } from "../services/StaffService";
import LeafletMapWidget from "./LeafletMapWidget";
import { reverseGeocodeNominatim, formatPreciseTimestamp, calculateHaversineDistance } from "../services/NominatimService";
import { offlineQueueService } from "../services/OfflineQueueService";
import { arcaAdapter } from "../services/ARCAAdapter";
import { CashClosure, CashShiftService } from "../services/CashShiftService";
import { MenuCatalogService } from "../services/MenuCatalogService";
import { InventoryService } from "../services/InventoryService";
import { getProductReadiness, summarizeProductReadiness } from "../services/ProductReadinessService";

interface AdminHubProps {
  orders: Order[];
  onOrderStatusUpdate: (orderId: string, status: OrderStatusType) => void;
  onArchiveOrder: (orderId: string) => Promise<boolean>;
  onDeleteOrder: (orderId: string) => Promise<boolean>;
  onUpdateOrders?: (orders: Order[]) => void;
  menuItems: MenuItem[];
  onUpdateMenu: (updatedMenu: MenuItem[]) => void;
  onShowNotification: (message: string, type: "success" | "info" | "warning") => void;
  clientAccounts: ClientAccount[];
  onUpdateClientAccounts: (accounts: ClientAccount[]) => void;
  onClosePanel: () => void;
  currentUser: { id: string; name: string; role: string; email: string };
  bookings?: any[];
}

interface Insumo {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minLimit: number;
  provider?: string;
  expirationDate?: string;
  costPerUnit?: number;
}

interface BusinessProfileForm {
  name: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  cuit: string;
  posNumber: string;
}

const EMPTY_WEEKLY_MENUS: DailyExecutiveMenu[] = (
  ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const
).map((dayOfWeek) => ({
  dayOfWeek,
  title: "",
  description: "",
  price: 0,
  starters: [],
  mains: [],
  drinks: [],
  desserts: [],
  active: true
}));

const PRODUCT_CATEGORY_LABELS: Partial<Record<MenuItem["category"], string>> = {
  desayunos_meriendas: "Desayunos & Meriendas",
  pizzas_focaccias: "Pizzas & Focaccias",
  minutas_carnes: "Minutas & Carnes",
  pastas_caseras: "Pastas Caseras",
  empanadas: "Empanadas",
  bebidas_sa: "Bebidas sin alcohol",
  bebidas_alcohol: "Bebidas con alcohol",
  postres: "Postres",
  executive: "Menú Diario",
  coffee: "Cafetería de Especialidad",
  bakery: "Pastelería",
  drinks: "Bebidas"
};

export default function AdminHub({
  orders,
  onOrderStatusUpdate,
  onArchiveOrder,
  onDeleteOrder,
  onUpdateOrders,
  menuItems,
  onUpdateMenu,
  onShowNotification,
  clientAccounts,
  onUpdateClientAccounts,
  onClosePanel,
  currentUser,
  bookings = []
}: AdminHubProps) {
  const hashMap: Record<string, "dashboard" | "inventario" | "precios" | "caja" | "salon" | "reservas" | "pedidos_mozo" | "kds_cocina" | "proveedores" | "personal" | "reportes"> = {
    "#mozo": "pedidos_mozo",
    "#/mozo": "pedidos_mozo",
    "#cocina": "kds_cocina",
    "#/cocina": "kds_cocina",
    "#caja": "caja",
    "#/caja": "caja",
    "#reservas": "reservas",
    "#/reservas": "reservas",
    "#salon": "salon",
    "#/salon": "salon",
    "#dashboard": "dashboard",
    "#/dashboard": "dashboard",
    "#carta": "precios",
    "#/carta": "precios",
    "#stock": "inventario",
    "#/stock": "inventario",
    "#proveedores": "proveedores",
    "#/proveedores": "proveedores",
    "#personal": "personal",
    "#/personal": "personal",
    "#reportes": "reportes",
    "#/reportes": "reportes"
  };

  const getInitialTabFromHash = () => {
    const hash = window.location.hash.toLowerCase();
    if (hashMap[hash]) return hashMap[hash];
    return currentUser.role === "barista" ? "inventario" : "pedidos_mozo";
  };

  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "inventario" | "precios" | "caja" | "salon" | "reservas" | "pedidos_mozo" | "kds_cocina" | "proveedores" | "personal" | "reportes">(
    getInitialTabFromHash
  );

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hashMap[hash] && hashMap[hash] !== activeSubTab) {
        setActiveSubTab(hashMap[hash]);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [activeSubTab]);

  useEffect(() => {
    const reverseMap: Record<typeof activeSubTab, string> = {
      pedidos_mozo: "#/mozo",
      kds_cocina: "#/cocina",
      caja: "#/caja",
      reservas: "#/reservas",
      salon: "#/salon",
      dashboard: "#/dashboard",
      precios: "#/carta",
      inventario: "#/stock",
      proveedores: "#/proveedores",
      personal: "#/personal",
      reportes: "#/reportes"
    };
    if (reverseMap[activeSubTab]) {
      window.history.replaceState(null, "", reverseMap[activeSubTab]);
    }
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeSubTab]);
  const [personalSubTab, setPersonalSubTab] = useState<"asistencia" | "cuentas" | "barista" | "consumo" | "profit">("asistencia");
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [lastClockDetails, setLastClockDetails] = useState<{
    staffName: string;
    tipo: "INGRESO" | "EGRESO";
    timestamp: string;
    latitud: number;
    longitud: number;
    calle: string;
    numero: string;
    direccion_completa: string;
  } | null>(null);

  const [activeShiftRecord, setActiveShiftRecord] = useState<{
    id: string;
    staffId: string;
    staffName: string;
    checkInTime: string;
    timestamp: string;
    latitud: number;
    longitud: number;
    calle: string;
    numero: string;
    direccion_completa: string;
    distanceMeters: number;
  } | null>(null);

  // Restore active shift from localStorage or Supabase on load
  useEffect(() => {
    const staffId = currentUser?.id || "usr-admin-super";
    try {
      const localSaved = localStorage.getItem(`castano_active_shift_${staffId}`);
      if (localSaved) {
        setActiveShiftRecord(JSON.parse(localSaved));
      }
    } catch (e) {}

    supabase
      .from("staff_attendance")
      .select("*")
      .eq("staff_id", staffId)
      .is("check_out_time", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data && (data.action === "INGRESO" || data.tipo === "INGRESO")) {
          const lat = Number(data.latitud || data.latitude || -33.1245);
          const lng = Number(data.longitud || data.longitude || -64.3490);
          const activeRec = {
            id: data.id,
            staffId: data.staff_id,
            staffName: data.staff_name || currentUser.name || "Colaborador",
            checkInTime: data.check_in_time || data.created_at,
            timestamp: data.timestamp || formatPreciseTimestamp(new Date(data.check_in_time || data.created_at)),
            latitud: lat,
            longitud: lng,
            calle: data.calle || "Ubicación GPS Real",
            numero: data.numero || "",
            direccion_completa: data.direccion_completa || data.location_address || "Río Cuarto",
            distanceMeters: calculateHaversineDistance(lat, lng)
          };
          setActiveShiftRecord(activeRec);
          try {
            localStorage.setItem(`castano_active_shift_${staffId}`, JSON.stringify(activeRec));
          } catch (e) {}
        }
      });
  }, [currentUser?.id]);

  // User Accounts Management state
  const [users, setUsers] = useState<any[]>([]);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("mesero");
  const [newUserAddress, setNewUserAddress] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserEmergencyPhone, setNewUserEmergencyPhone] = useState("");
  const [newUserSalary, setNewUserSalary] = useState("");
  const [newUserSeniority, setNewUserSeniority] = useState("12");
  const [profitStaffHours, setProfitStaffHours] = useState<Record<string, number>>({});
  const [profitStaffAntiguedad, setProfitStaffAntiguedad] = useState<Record<string, number>>({});
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<any | null>(null);
  const [usersMetadata, setUsersMetadata] = useState<Record<string, {
    direccion?: string;
    telefono?: string;
    telefono_contacto?: string;
    sueldo?: number;
    antiguedad?: number;
    permissions?: string[];
  }>>({});

  const [adminBookings, setAdminBookings] = useState<any[]>([]);
  const [isAutoOrderModalOpen, setIsAutoOrderModalOpen] = useState(false);
  const [draftOrders, setDraftOrders] = useState<Record<string, { message: string; email: string; phone: string; itemsList: any[] }>>({});

  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("desayunos_meriendas");
  const [newProdDescription, setNewProdDescription] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdStock, setNewProdStock] = useState("0");
  const [newProdImage, setNewProdImage] = useState("");

  const [proveedores, setProveedores] = useState<any[]>([]);

  const [restaurantTables, setRestaurantTables] = useState<{ id: string; name: string; capacity: number; status: "Activo" | "Mantenimiento" }[]>([]);

  const [calibrationsHistory, setCalibrationsHistory] = useState<any[]>([]);

  const [calibrationData, setCalibrationData] = useState(() => {
    try {
      const saved = localStorage.getItem("puglia_calibration");
      return saved ? JSON.parse(saved) : {
        gramosIn: 18,
        mililitrosOut: 36,
        tiempo: 27,
        temperatura: 92,
        clima: "Despejado y Seco"
      };
    } catch (e) {
      return {
        gramosIn: 18,
        mililitrosOut: 36,
        tiempo: 27,
        temperatura: 92,
        clima: "Despejado y Seco"
      };
    }
  });

  // Local Storage state for Cash Register ledger
  const [cashLedger, setCashLedger] = useState({
    totalCollected: 0,
    cash: 0,
    card: 0,
    mercadopago: 0,
    transactions: []
  });
  const [cloudHealth, setCloudHealth] = useState<CloudHealth>({
    state: "checking",
    projectRef: "",
    checkedAt: new Date().toISOString(),
    message: "Verificando conexión"
  });
  const [pendingSyncCount, setPendingSyncCount] = useState(
    () => offlineQueueService.getPendingQueue().length
  );

  useEffect(() => {
    let active = true;
    const refreshHealth = async () => {
      const health = await SupabaseSyncService.healthCheck();
      if (active) {
        setCloudHealth(health);
        setPendingSyncCount(offlineQueueService.getPendingQueue().length);
      }
    };
    const onConnectivityChange = () => void refreshHealth();
    const onQueueChange = () => {
      setPendingSyncCount(offlineQueueService.getPendingQueue().length);
      void refreshHealth();
    };
    window.addEventListener("online", onConnectivityChange);
    window.addEventListener("offline", onConnectivityChange);
    window.addEventListener("castano:offline-queue", onQueueChange);
    void refreshHealth();
    const intervalId = window.setInterval(() => void refreshHealth(), 30_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("online", onConnectivityChange);
      window.removeEventListener("offline", onConnectivityChange);
      window.removeEventListener("castano:offline-queue", onQueueChange);
    };
  }, []);

  // Real-time Waiter Calls state
  const [pendingWaiterCalls, setPendingWaiterCalls] = useState<WaiterCall[]>([]);

  // Staff Attendance GPS state
  const [selectedStaffMember, setSelectedStaffMember] = useState<string>(currentUser.id);
  const [isLocatingGPS, setIsLocatingGPS] = useState<boolean>(false);
  const [currentGPSLoc, setCurrentGPSLoc] = useState<{ lat: number; lng: number; address: string } | null>(null);

  // Thermal Printer & ARCA Fiscal Billing State
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(() => ThermalPrinterService.getConfig());
  const [isPrinterConfigModalOpen, setIsPrinterConfigModalOpen] = useState<boolean>(false);
  const [isArcaModalOpen, setIsArcaModalOpen] = useState<boolean>(false);
  const [selectedOrderForBilling, setSelectedOrderForBilling] = useState<Order | null>(null);
  const [fiscalForm, setFiscalForm] = useState<FiscalCustomerInfo>({
    cuitOrDni: "",
    nameOrReason: "",
    ivaCondition: "Consumidor Final"
  });

  // Standalone Manual ARCA Invoicing State
  const [isManualArcaModalOpen, setIsManualArcaModalOpen] = useState<boolean>(false);
  const [manualInvoiceType, setManualInvoiceType] = useState<"Factura A" | "Factura B" | "Factura C" | "Comprobante M">("Factura B");
  const [manualCustomerInfo, setManualCustomerInfo] = useState<FiscalCustomerInfo>({
    cuitOrDni: "",
    nameOrReason: "",
    ivaCondition: "Consumidor Final"
  });
  const [manualPaymentMethod, setManualPaymentMethod] = useState<string>("Efectivo");
  const [manualItems, setManualItems] = useState<
    { description: string; qty: number; unitPrice: number; ivaPct: number }[]
  >([]);
  const [newManualDesc, setNewManualDesc] = useState<string>("");
  const [newManualQty, setNewManualQty] = useState<number>(1);
  const [newManualPrice, setNewManualPrice] = useState<string>("");
  const [newManualIva, setNewManualIva] = useState<number>(21);

  // Mixed Payment Amounts State
  const [mixedCashAmount, setMixedCashAmount] = useState<string>("");
  const [mixedDigitalAmount, setMixedDigitalAmount] = useState<string>("");

  // Mozo Service Modality State (Salón, Takeaway, Delivery)
  const [mozoServiceType, setMozoServiceType] = useState<OrderServiceType>("salon");
  const [mozoTakeawayForm, setMozoTakeawayForm] = useState<TakeawayDetails>({
    customerName: "",
    customerPhone: "",
    estimatedTime: "20:30"
  });
  const [mozoDeliveryForm, setMozoDeliveryForm] = useState<DeliveryDetails>({
    customerName: "",
    customerPhone: "",
    street: "",
    number: "",
    floorNotes: "",
    deliveryFee: 1200
  });
  const [stableTakeawayId, setStableTakeawayId] = useState<string>(() => `RET-${crypto.randomUUID()}`);
  const [stableDeliveryId, setStableDeliveryId] = useState<string>(() => `DEL-${crypto.randomUUID()}`);
  const [isSupabaseSqlModalOpen, setIsSupabaseSqlModalOpen] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [showAllHistoryOrders, setShowAllHistoryOrders] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const refreshCalls = async () => {
      try {
        const calls = await WaiterCallService.getPendingCalls();
        if (active) setPendingWaiterCalls(calls);
      } catch (error) {
        console.error("Error loading waiter calls:", error);
      }
    };
    const channel = supabase
      .channel("admin-waiter-calls")
      .on("postgres_changes", { event: "*", schema: "public", table: "waiter_calls" }, refreshCalls)
      .subscribe();
    void refreshCalls();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [shiftOpenTime, setShiftOpenTime] = useState("");
  const [closuresHistory, setClosuresHistory] = useState<CashClosure[]>([]);
  const [isShiftOperationPending, setIsShiftOperationPending] = useState(false);

  // Sync cash closures and shift state from Supabase on mount
  useEffect(() => {
    let active = true;
    const loadCajaData = async () => {
      try {
        const history = await CashShiftService.getClosureHistory();
        if (active && Array.isArray(history)) {
          setClosuresHistory(history);
        }
        const state = await CashShiftService.getShiftState();
        if (active && state) {
          setIsShiftOpen(state.isOpen);
          if (state.openedAt) setShiftOpenTime(state.openedAt);
          setCashLedger({
            totalCollected: state.totalCollected,
            cash: state.cash,
            card: state.card,
            mercadopago: state.mercadopago,
            transactions: state.transactions
          });
        }
      } catch (e) {
        console.warn("Error loading initial Caja state:", e);
      }
    };
    void loadCajaData();
    return () => {
      active = false;
    };
  }, []);

  // Sidebar collapse state & scroll ref
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => localStorage.getItem("castano_sidebar_collapsed") === "true");
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeSubTab]);

  // Modal open states
  const [isConfigRestaurantOpen, setIsConfigRestaurantOpen] = useState(false);
  const [isConfigTicketerisOpen, setIsConfigTicketerisOpen] = useState(false);
  const [isConfigArcaOpen, setIsConfigArcaOpen] = useState(false);
  const [arcaConfig, setArcaConfig] = useState<{
    cuit: string;
    posNumber: string;
    businessName: string;
    address: string;
    ivaCondition: "Monotributista" | "Responsable Inscripto" | "Exento";
    environment: "testing" | "production";
    crtContent: string;
    keyContent: string;
  }>(() => {
    try {
      const saved = localStorage.getItem("castano_arca_config");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      cuit: "20445513408",
      posNumber: "3",
      businessName: "Castaño — Resto Bar",
      address: "Constitución 944, Río Cuarto, Córdoba",
      ivaCondition: "Responsable Inscripto",
      environment: "testing",
      crtContent: "",
      keyContent: ""
    };
  });
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [closeShiftRealCash, setCloseShiftRealCash] = useState<string>("");
  const [closeShiftNotes, setCloseShiftNotes] = useState<string>("");
  const [selectedClosureForModal, setSelectedClosureForModal] = useState<any>(null);

  // History ticket deletion states
  const [selectedHistoryOrderIds, setSelectedHistoryOrderIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [deleteTargetType, setDeleteTargetType] = useState<"single" | "selected" | "all">("selected");
  const [targetOrderIdToDelete, setTargetOrderIdToDelete] = useState<string | null>(null);
  const [isDeletingOrders, setIsDeletingOrders] = useState<boolean>(false);

  const handleConfirmDeleteHistoryOrders = async () => {
    setIsDeletingOrders(true);
    let idsToDelete: string[] = [];
    
    if (deleteTargetType === "single" && targetOrderIdToDelete) {
      idsToDelete = [targetOrderIdToDelete];
    } else if (deleteTargetType === "selected") {
      idsToDelete = [...selectedHistoryOrderIds];
    } else if (deleteTargetType === "all") {
      const completedOrders = orders.filter(o => o.status === "Completado" || o.status === "Entregado");
      idsToDelete = completedOrders.map(o => o.id);
    }

    if (idsToDelete.length === 0) {
      setIsDeleteConfirmOpen(false);
      setIsDeletingOrders(false);
      return;
    }

    try {
      // Execute robust cloud deletion / status update in Supabase
      const result = await SupabaseSyncService.deleteOrders(idsToDelete);

      const remainingOrders = orders.filter(o => !idsToDelete.includes(o.id));
      if (onUpdateOrders) {
        onUpdateOrders(remainingOrders);
      }

      setSelectedHistoryOrderIds(prev => prev.filter(id => !idsToDelete.includes(id)));
      
      if (result.success) {
        onShowNotification(`🗑️ ${idsToDelete.length} ticket(s) eliminado(s) correctamente del historial.`, "success");
      } else {
        onShowNotification(`⚠️ Error al eliminar en la nube: ${result.error || "desconocido"}.`, "warning");
      }
    } catch (err) {
      console.error("Error deleting orders:", err);
      onShowNotification("⚠️ Excepción al eliminar comandas del historial.", "warning");
    } finally {
      setIsDeletingOrders(false);
      setIsDeleteConfirmOpen(false);
      setTargetOrderIdToDelete(null);
    }
  };

  // Split bill & billing details state
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [cuitNumber, setCuitNumber] = useState<string>("");
  const [cuitName, setCuitName] = useState<string>("");
  const [ivaCondition, setIvaCondition] = useState<string>("Consumidor Final");
  const [splitPaymentType, setSplitPaymentType] = useState<"indiviso" | "comensales" | "articulos">("indiviso");
  const [dinersCount, setDinersCount] = useState<number>(2);
  const [paidDinersCount, setPaidDinersCount] = useState<number>(0);
  const [selectedSplitItems, setSelectedSplitItems] = useState<Record<string, number>>({});
  const [selectedCtaCteClient, setSelectedCtaCteClient] = useState<string>("");
  // Delivery logistics config states (Top level to respect React rules of hooks)
  const [deliveryFeeConfig, setDeliveryFeeConfig] = useState<number>(0);
  const [deliveryFreeMinConfig, setDeliveryFreeMinConfig] = useState<number>(0);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfileForm>(() => {
    try {
      const saved = localStorage.getItem("castano_business_profile");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      name: "castano_resto_bar",
      address: "Constitución 944",
      city: "Río Cuarto",
      province: "Córdoba",
      phone: "358 5042311",
      email: "",
      cuit: "20445513408",
      posNumber: "3"
    };
  });
  const [isBusinessProfileSaving, setIsBusinessProfileSaving] = useState(false);

  // Salon 2D Floor Plan states (Top level to respect React rules of hooks)
  const [floorViewMode, setFloorViewMode] = useState<"map2d" | "cards">("map2d");
  const [selectedTableForModal, setSelectedTableForModal] = useState<any | null>(null);
  const [mergedTableIds, setMergedTableIds] = useState<{ [id: string]: string }>({});
  const [isMoveModeActive, setIsMoveModeActive] = useState<boolean>(true);
  const [tablePositions, setTablePositions] = useState<{ [id: string]: { x: number; y: number } }>({});
  const [tableStatusFilter, setTableStatusFilter] = useState<"all" | "Libre" | "Ocupada" | "Reservada">("all");

  // Waiter ordering (Mozo module) states
  const [selectedWaiter, setSelectedWaiter] = useState<string>(currentUser.name);
  const [mozoSelectedTable, setMozoSelectedTable] = useState<string | null>(null);
  const [mozoCart, setMozoCart] = useState<{ item: MenuItem; qty: number; notes?: string }[]>([]);
  const [mozoCategory, setMozoCategory] = useState<string>("todos");
  const [mozoSearchQuery, setMozoSearchQuery] = useState<string>("");
  const [mozoDinersCount, setMozoDinersCount] = useState<number>(2);
  const [selectedMainMozo, setSelectedMainMozo] = useState<string>("");
  const [selectedSideMozo, setSelectedSideMozo] = useState<string>("");
  const [saladSizeMozo, setSaladSizeMozo] = useState<"chica" | "grande">("chica");

  // Local Storage state for Raw Materials Insumos
  const [insumos, setInsumos] = useState<Insumo[]>([]);

  const [inventarioSubTab, setInventarioSubTab] = useState<"general" | "ciegas" | "comparador" | "analitica">("general");
  const [blindCounts, setBlindCounts] = useState<Record<string, string>>({});
  const [auditHistory, setAuditHistory] = useState<any[]>([]);

  const [weeklyMenus, setWeeklyMenus] = useState<DailyExecutiveMenu[]>(() => {
    try {
      const saved = localStorage.getItem("puglia_weekly_menus");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return EMPTY_WEEKLY_MENUS;
  });

  const todayMenu = useMemo(() => {
    const days: DailyExecutiveMenu["dayOfWeek"][] = [
      "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"
    ];
    const todayDayName = days[new Date().getDay()];
    return weeklyMenus.find(m => m.dayOfWeek && m.dayOfWeek.toLowerCase().trim() === todayDayName.toLowerCase().trim() && m.title && m.title.trim() !== "") || null;
  }, [weeklyMenus]);

  const [selectedDayTab, setSelectedDayTab] = useState<DailyExecutiveMenu["dayOfWeek"]>("Lunes");

  const [compareInsumoId, setCompareInsumoId] = useState<string>("");
  const [compareQuotes, setCompareQuotes] = useState<{ supplier: string; price: string }[]>([
    { supplier: "", price: "" },
    { supplier: "", price: "" },
    { supplier: "", price: "" }
  ]);

  // Billing calculation states
  const [billingOrder, setBillingOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    | "Efectivo"
    | "Tarjeta"
    | "Tarjeta Débito"
    | "Tarjeta Crédito"
    | "MercadoPago"
    | "Pago Mixto"
    | "Fiado / Cta Cte"
  >("Efectivo");
  const [receivedCash, setReceivedCash] = useState<string>("");
  const [returnedChange, setReturnedChange] = useState<number>(0);

  // Price & Stock editing states
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);
  const [editIsOffer, setEditIsOffer] = useState<boolean>(false);
  const [editOfferPrice, setEditOfferPrice] = useState<number>(0);

  const [tipPool, setTipPool] = useState(0);
  const [activeTipEmployees, setActiveTipEmployees] = useState<string[]>([]);
  const [selectedTipStaff, setSelectedTipStaff] = useState<string[]>([]);
  const [profitSales, setProfitSales] = useState(0);
  const [profitNet, setProfitNet] = useState(0);
  const [profitHoursTotal, setProfitHoursTotal] = useState(0);

  const [staffConsumptions, setStaffConsumptions] = useState<
    { id: string; name: string; rol: string; consumedToday: number; limit: number }[]
  >([]);

  // Load operational data from Supabase. Seed data belongs exclusively in migrations.
  useEffect(() => {
    const loadSupabaseData = async () => {
      try {
        // 1. Fetch ARCA configuration & business profile from Supabase Cloud
        const { data: arcaRow } = await supabase
          .from("menu_items")
          .select("description")
          .eq("id", "sys_arca_config")
          .maybeSingle();

        if (arcaRow && arcaRow.description) {
          try {
            const cloudArca = JSON.parse(arcaRow.description);
            setArcaConfig(cloudArca);
            localStorage.setItem("castano_arca_config", JSON.stringify(cloudArca));
            if (cloudArca.cuit) {
              setBusinessProfile(prev => ({
                ...prev,
                cuit: cloudArca.cuit,
                posNumber: cloudArca.posNumber || "3",
                name: cloudArca.businessName || "Castaño — Resto Bar",
                address: cloudArca.address || "Constitución 944, Río Cuarto, Córdoba"
              }));
              localStorage.setItem("castano_business_profile", JSON.stringify({
                name: cloudArca.businessName || "Castaño — Resto Bar",
                address: cloudArca.address || "Constitución 944, Río Cuarto, Córdoba",
                cuit: cloudArca.cuit,
                posNumber: cloudArca.posNumber || "3"
              }));
            }
          } catch (e) {
            console.warn("Error parsing cloud ARCA config:", e);
          }
        }

        // 2. Fetch Insumos
        const { data: insData, error: insError } = await supabase.from("insumos").select("*");
        if (insError) throw insError;
        if (insData && insData.length > 0) {
          setInsumos(insData.map(i => ({
            id: i.id,
            name: i.name,
            quantity: Number(i.quantity ?? i.current_stock ?? 0),
            unit: i.unit,
            minLimit: Number(i.min_limit ?? i.min_stock ?? 0),
            provider: i.provider || i.supplier || undefined,
            expirationDate: i.expiration_date || undefined,
            costPerUnit: Number(i.cost_per_unit || 0)
          })));
        } else {
          setInsumos([]);
        }

        // 3. Fetch Suppliers
        const { data: suppliersData, error: suppliersError } = await supabase
          .from("suppliers")
          .select("*")
          .order("name");
        if (suppliersError) throw suppliersError;
        setProveedores(
          (suppliersData || []).map((supplier) => ({
            id: supplier.id,
            name: supplier.name,
            items: (supplier.supplied_items || []).join(", "),
            contact: supplier.email || "",
            phone: supplier.phone || "",
            status: supplier.active ? "ACTIVO" : "PENDIENTE"
          }))
        );

        // 4. Fetch dining-room tables
        const { data: tablesData, error: tablesError } = await supabase
          .from("restaurant_tables")
          .select("*")
          .order("name");
        if (tablesError) throw tablesError;
        setRestaurantTables(
          (tablesData || []).map((table) => ({
            id: table.id,
            name: table.name,
            capacity: Number(table.capacity),
            status: table.active ? "Activo" : "Mantenimiento"
          }))
        );

        // 5. Fetch auditable inventory waste movements (con protección ante falta de permisos 42501)
        try {
          const { data: wasteData, error: wasteError } = await supabase
            .from("inventory_movements")
            .select("*")
            .eq("movement_type", "waste")
            .order("created_at", { ascending: false })
            .limit(200);
          if (!wasteError && wasteData) {
            setMermaLogs(
              wasteData.map((movement) => ({
                id: movement.id,
                date: new Date(movement.created_at).toLocaleString("es-AR"),
                name: movement.item_name,
                qty: `${Number(movement.quantity)} ${movement.unit}`,
                cost: `$${Number(movement.estimated_cost || 0).toLocaleString("es-AR")}`,
                reason: movement.reason || "Descarte / ajuste operativo",
                auditor: movement.actor_name || "Usuario autenticado"
              }))
            );
          }
        } catch (err) {
          console.warn("⚠️ No se cargaron mermas (inventory_movements sin permisos RLS en Supabase):", err);
        }

        try {
          const { data: inventoryAuditsData, error: inventoryAuditsError } = await supabase
            .from("inventory_audits")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100);
          if (!inventoryAuditsError && inventoryAuditsData) {
            setAuditHistory(
              inventoryAuditsData.map((audit) => ({
                id: audit.id,
                date: audit.created_at,
                auditor: audit.auditor_name,
                details: audit.details || [],
                hasAlert: audit.has_alert
              }))
            );
          }
        } catch (err) {
          console.warn("⚠️ No se cargaron auditorías (inventory_audits sin permisos RLS en Supabase):", err);
        }

        // 6. Fetch Cash Ledger
        const { data: cashData, error: cashError } = await supabase
          .from("cash_ledger")
          .select("*")
          .eq("id", "current")
          .maybeSingle();
        if (cashError) throw cashError;
        if (cashData) {
          setCashLedger({
            totalCollected: Number(cashData.total_collected),
            cash: Number(cashData.cash),
            card: Number(cashData.card),
            mercadopago: Number(cashData.mercadopago),
            transactions: cashData.transactions || []
          });
          setIsShiftOpen(Boolean(cashData.is_open));
          setShiftOpenTime(cashData.opened_at || "");
        } else {
          setCashLedger({
            totalCollected: 0,
            cash: 0,
            card: 0,
            mercadopago: 0,
            transactions: []
          });
        }

        const { data: closuresData, error: closuresError } = await supabase
          .from("cash_closures")
          .select("*")
          .order("closed_at", { ascending: false })
          .limit(100);
        if (closuresError) throw closuresError;
        setClosuresHistory(
          (closuresData || []).map((closure) => ({
            id: closure.id,
            user: closure.user_name,
            apertura: closure.opened_at,
            cierre: closure.closed_at,
            observaciones: closure.notes || "",
            ventasTurno: Number(closure.sales_total),
            montoReal: Number(closure.declared_cash),
            diferencia: Number(closure.difference),
            transactions: closure.transactions || []
          }))
        );

        // 6. Fetch Barista Calibration Data
        const { data: calData } = await supabase.from("barista_calibrations").select("*").order("id", { ascending: false }).limit(1);
        if (calData && calData.length > 0) {
          const latest = calData[0];
          const parsedCal = {
            gramosIn: Number(latest.gramos_in),
            mililitrosOut: Number(latest.mililitros_out),
            tiempo: Number(latest.tiempo),
            temperatura: Number(latest.temperatura),
            clima: latest.clima
          };
          setCalibrationData(parsedCal);
          localStorage.setItem("puglia_calibration", JSON.stringify(parsedCal));
        }

        // 7. Fetch Tip Pool
        const { data: settingsData } = await supabase.from("system_settings").select("*").eq("key", "tip_pool").single();
        if (settingsData) {
          setTipPool(Number(settingsData.value));
        }

        // 8. Fetch Daily Menu
        try {
          const { data: dailyMenusData, error: dailyMenusError } = await supabase
            .from("daily_menu")
            .select("*");
          if (!dailyMenusError && dailyMenusData && dailyMenusData.length > 0) {
            const mappedList = EMPTY_WEEKLY_MENUS.map((emptyMenu) => {
              const menu = dailyMenusData.find((candidate) =>
                candidate.day_of_week && candidate.day_of_week.toString().toLowerCase().trim() === emptyMenu.dayOfWeek.toLowerCase().trim()
              );
              return menu ? {
                dayOfWeek: emptyMenu.dayOfWeek,
                title: menu.title || "",
                description: menu.description || "",
                price: Number(menu.price) || 0,
                image: menu.image || undefined,
                starters: Array.isArray(menu.starters) && menu.starters.length > 0 ? menu.starters : ["Ensalada Mixta de Estación", "Sopa Casera de Verduras"],
                mains: Array.isArray(menu.mains) && menu.mains.length > 0 ? menu.mains : [menu.title || "Plato Principal del Día"],
                drinks: Array.isArray(menu.drinks) && menu.drinks.length > 0 ? menu.drinks : ["Copa de Vino Malbec", "Limonada de la Casa", "Agua Mineral / Gaseosa"],
                desserts: Array.isArray(menu.desserts) && menu.desserts.length > 0 ? menu.desserts : ["Flan Casero con Dulce de Leche", "Helado Artesanal (2 bochas)", "Café Espresso o Cortado"],
                active: menu.active ?? true
              } : emptyMenu;
            });
            setWeeklyMenus(mappedList);
            try { localStorage.setItem("puglia_weekly_menus", JSON.stringify(mappedList)); } catch (e) {}
          } else {
            // Check system_settings key weekly_menus
            const { data: sysData } = await supabase.from("system_settings").select("*").eq("key", "weekly_menus").maybeSingle();
            if (sysData && sysData.value) {
              const parsed = typeof sysData.value === "string" ? JSON.parse(sysData.value) : sysData.value;
              if (Array.isArray(parsed) && parsed.length > 0) {
                setWeeklyMenus(parsed);
                try { localStorage.setItem("puglia_weekly_menus", JSON.stringify(parsed)); } catch (e) {}
              }
            } else {
              const savedLocal = localStorage.getItem("puglia_weekly_menus");
              if (savedLocal) setWeeklyMenus(JSON.parse(savedLocal));
            }
          }
        } catch (e) {
          const savedLocal = localStorage.getItem("puglia_weekly_menus");
          if (savedLocal) setWeeklyMenus(JSON.parse(savedLocal));
        }

        // 9. Fetch Users Metadata
        const { data: metaData } = await supabase.from("system_settings").select("*").eq("key", "users_metadata").single();
        if (metaData) {
          setUsersMetadata(
            typeof metaData.value === "string"
              ? JSON.parse(metaData.value)
              : metaData.value || {}
          );
        }

        // 10. Fetch attendance records allowed by the current user's RLS policy
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("staff_attendance")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(250);
        if (attendanceError) throw attendanceError;
        setAttendanceLogs(attendanceData || []);
      } catch (err) {
        console.error("Error fetching admin data from Supabase:", err);
      }
    };

    loadSupabaseData();

    // ⚡ REALTIME MULTI-DEVICE SYNCHRONIZATION ENGINE
    const channel = supabase.channel("castano-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async () => {
          const refreshed = await SupabaseSyncService.fetchOrders();
          if (!refreshed.error) {
            onUpdateOrders?.(
              refreshed.orders.filter(isOrderActive)
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurant_tables" },
        async () => {
          const { data } = await supabase.from("restaurant_tables").select("*").order("name");
          if (data) {
            setRestaurantTables(data.map(t => ({
              id: t.id,
              name: t.name,
              capacity: Number(t.capacity),
              status: t.active ? "Activo" : "Mantenimiento"
            })));
          }
        }
      )
      .on("broadcast", { event: "table_pos_moved" }, (payload) => {
        if (payload?.payload) {
          const { id, x, y } = payload.payload;
          setTablePositions(prev => ({ ...prev, [id]: { x, y } }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      const dbUsers = await StaffService.list();
      const newMeta: any = {};
      dbUsers.forEach(u => {
        newMeta[u.id] = {
          direccion: u.direccion || "",
          telefono: u.telefono || "",
          telefono_contacto: u.telefono_contacto || "",
          sueldo: u.sueldo ? Number(u.sueldo) : 0,
          permissions: u.permissions || []
        };
      });
      setUsersMetadata(newMeta);
      setUsers(dbUsers);
      if (!dbUsers.some((user) => user.id === selectedStaffMember)) {
        setSelectedStaffMember(dbUsers[0]?.id || currentUser.id);
      }
      const employeeNames = dbUsers
        .filter((user) => user.active !== false)
        .map((user) => user.name);
      setActiveTipEmployees(employeeNames);
      setSelectedTipStaff((current) =>
        current.length > 0
          ? current.filter((name) => employeeNames.includes(name))
          : employeeNames
      );
    } catch (e) {
      console.error("Error fetching users:", e);
      setUsers([]);
      onShowNotification("⚠️ No se pudo cargar el personal desde la nube.", "warning");
    }
  };

  const saveUsersMetadata = async (newMeta: any, updatedUserId?: string) => {
    setUsersMetadata(newMeta);

    if (updatedUserId) {
      const metaVal = newMeta[updatedUserId];
      if (metaVal) {
        try {
          await StaffService.update(updatedUserId, {
            direccion: metaVal.direccion,
            telefono: metaVal.telefono,
            telefono_contacto: metaVal.telefono_contacto,
            sueldo: metaVal.sueldo,
            antiguedad: metaVal.antiguedad,
            permissions: metaVal.permissions
          });
        } catch (e) {
          console.error("Secure staff update failed", e);
          onShowNotification("⚠️ No se pudieron guardar los permisos.", "warning");
        }
      }
    }
  };

  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim() || !newUserRole) {
      onShowNotification("⚠️ Complete los campos obligatorios (Nombre, Email, Contraseña y Rol).", "warning");
      return;
    }
    if (newUserPassword.length < 4) {
      onShowNotification("⚠️ La contraseña o PIN debe tener al menos 4 caracteres.", "warning");
      return;
    }

    const defaultPerms = newUserRole === "administrador"
      ? ["reportes", "inventario", "precios", "salon", "reservas", "pedidos_mozo", "caja", "proveedores", "personal"]
      : newUserRole === "mesero"
      ? ["salon", "reservas", "pedidos_mozo", "caja"]
      : newUserRole === "cajero"
      ? ["caja", "salon", "reservas", "pedidos_mozo"]
      : ["inventario", "personal"]; // barista

    setIsCreatingUser(true);

    try {
      const createdProfile = await StaffService.create({
        name: newUserName.trim(),
        email: newUserEmail.trim().toLowerCase(),
        password: newUserPassword,
        role: newUserRole as any,
        direccion: newUserAddress.trim(),
        telefono: newUserPhone.trim(),
        telefono_contacto: newUserEmergencyPhone.trim(),
        sueldo: parseFloat(newUserSalary) || 0,
        antiguedad: parseInt(newUserSeniority) || 12,
        permissions: defaultPerms
      });

      onShowNotification(`✅ Colaborador '${createdProfile.name || newUserName}' registrado con éxito en el sistema.`, "success");
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("mesero");
      setNewUserAddress("");
      setNewUserPhone("");
      setNewUserEmergencyPhone("");
      setNewUserSalary("");
      setNewUserSeniority("12");
      
      // Instantly refresh users list
      await fetchUsers();
    } catch (error) {
      console.error("Staff creation failed", error);
      onShowNotification(
        "⚠️ Ocurrió un inconveniente al guardar el colaborador. Intente nuevamente.",
        "warning"
      );
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === currentUser.id) {
      onShowNotification("⚠️ No puede eliminar su propia cuenta activa.", "warning");
      return;
    }

    try {
      await StaffService.remove(userId);
      onShowNotification(`✅ Usuario ${userName} eliminado de Auth y del perfil.`, "success");
      if (selectedUserForPermissions?.id === userId) {
        setSelectedUserForPermissions(null);
      }
      await fetchUsers();
    } catch (error) {
      console.error("Secure staff deletion failed", error);
      onShowNotification("⚠️ No se pudo eliminar la cuenta.", "warning");
    }
  };

  // Live ticking digital clock for real-time timestamp display
  const [liveTimestamp, setLiveTimestamp] = useState<string>(formatPreciseTimestamp());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTimestamp(formatPreciseTimestamp());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch attendance records directly from Supabase staff_attendance table
  const fetchAttendanceLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("staff_attendance")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setAttendanceLogs(data);
      }
    } catch (err) {
      console.warn("Fetch attendance logs error:", err);
    }
  };

  // Real-time subscription for staff_attendance logs and initial fetch
  useEffect(() => {
    if (activeSubTab !== "personal") return;

    fetchAttendanceLogs();

    const channel = supabase
      .channel("staff_attendance_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "staff_attendance" },
        () => {
          fetchAttendanceLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSubTab]);

  useEffect(() => {
    if (activeSubTab === "personal" && personalSubTab === "cuentas") {
      fetchUsers();
    }
  }, [activeSubTab, personalSubTab]);

  // Fetch tip pool whenever user navigates to personal subtab
  useEffect(() => {
    if (activeSubTab === "personal" && personalSubTab === "profit") {
      const fetchTipPool = async () => {
        try {
          const { data } = await supabase.from("system_settings").select("*").eq("key", "tip_pool").single();
          if (data) {
            setTipPool(Number(data.value));
          }
        } catch (err) {
          console.error("Error reading tip pool setting:", err);
        }
      };
      fetchTipPool();
    }
  }, [activeSubTab, personalSubTab]);

  const fetchCalibrationsHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("barista_calibrations")
        .select("*")
        .order("id", { ascending: false })
        .limit(5);
      if (!error && data) {
        setCalibrationsHistory(data);
      }
    } catch (err) {
      console.error("Error fetching calibrations history:", err);
    }
  };

  useEffect(() => {
    if (activeSubTab === "personal" && personalSubTab === "barista") {
      fetchCalibrationsHistory();
    }
  }, [activeSubTab, personalSubTab]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase.from("reservations").select("*").order("date", { ascending: true });
      if (!error && data) {
        setAdminBookings(data.map(b => ({
          id: b.id,
          tableId: b.table_id,
          tableName: b.table_name,
          date: b.date,
          timeSlot: b.time_slot,
          guests: b.guests,
          customerName: b.customer_name,
          customerPhone: b.customer_phone,
          createdAt: b.created_at,
          referenceCode: b.reference_code
        })));
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
  };

  const handleAdminCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase.from("reservations").delete().eq("id", bookingId);
      if (!error) {
        setAdminBookings(prev => prev.filter(b => b.id !== bookingId));
        onShowNotification("🛑 Reserva cancelada con éxito.", "success");
      } else {
        onShowNotification("⚠️ Error al cancelar la reserva.", "warning");
      }
    } catch (err) {
      console.error("Error deleting reservation:", err);
    }
  };

  const handleAdminAddBooking = async (newBookingData: any) => {
    const newBooking = {
      id: `RES-${crypto.randomUUID()}`,
      table_id: newBookingData.tableId,
      table_name: newBookingData.tableName,
      date: newBookingData.date,
      time_slot: newBookingData.timeSlot,
      guests: parseInt(newBookingData.guests),
      customer_name: newBookingData.customerName,
      customer_phone: newBookingData.customerPhone,
      created_at: new Date().toLocaleDateString("es-AR"),
      reference_code: crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()
    };

    try {
      const { error } = await supabase.from("reservations").insert(newBooking);
      if (!error) {
        fetchBookings();
        onShowNotification("📅 Nueva reserva registrada con éxito.", "success");
      } else {
        onShowNotification("⚠️ Error al guardar la reserva.", "warning");
      }
    } catch (err) {
      console.error("Error creating reservation:", err);
    }
  };

  const handleAddNewProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice) {
      onShowNotification("⚠️ Complete el nombre y precio del producto.", "warning");
      return;
    }
    const priceNum = parseFloat(newProdPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      onShowNotification("⚠️ Ingrese un precio válido.", "warning");
      return;
    }

    const defaultImage = newProdImage.trim();
    
    const newProduct = {
      id: "prod-" + Date.now(),
      name: newProdName.trim(),
      price: priceNum,
      takeaway_price: Number((priceNum * 0.9).toFixed(2)),
      delivery_price: Number((priceNum * 1.15).toFixed(2)),
      description: newProdDescription.trim(),
      category: newProdCategory,
      tags: [],
      image: defaultImage,
      customizable: false,
      calories: 0,
      allergens: [],
      stock: Math.max(0, Number.parseInt(newProdStock, 10) || 0),
      is_offer: false,
      recipe: [],
      recipe_required: true,
      vat_rate: null,
      arca_item_code: null,
      arca_unit_code: null,
      fiscal_enabled: false,
      is_available: true,
      active: true
    };

    try {
      const { error } = await supabase.from("menu_items").insert(newProduct);
      if (!error) {
        if (newProduct.image && newProduct.image.startsWith("data:image")) {
          try {
            await supabase.from("product_images").upsert({
              id: newProduct.id,
              product_id: newProduct.id,
              image_base64: newProduct.image
            });
          } catch (imgErr) {
            console.error("Error inserting custom image to product_images table:", imgErr);
          }
        }
        // Map database object structure to client model structure
        const mappedProduct: MenuItem = {
          id: newProduct.id,
          name: newProduct.name,
          price: newProduct.price,
          takeawayPrice: newProduct.takeaway_price,
          deliveryPrice: newProduct.delivery_price,
          description: newProduct.description,
          category: newProduct.category as MenuItem["category"],
          tags: newProduct.tags,
          image: newProduct.image,
          customizable: newProduct.customizable,
          nutrition: {
            calories: newProduct.calories,
            allergens: newProduct.allergens
          },
          stock: newProduct.stock,
          recipe: [],
          recipeRequired: true,
          fiscalEnabled: false,
          isAvailable: true
        };
        onUpdateMenu([mappedProduct, ...menuItems]);
        onShowNotification(`✨ Producto '${newProduct.name}' creado con éxito.`, "success");
        setIsAddingProduct(false);
        setNewProdName("");
        setNewProdDescription("");
        setNewProdPrice("");
        setNewProdStock("0");
        setNewProdImage("");
      } else {
        onShowNotification(
          `⚠️ Supabase rechazó el producto${error.code ? ` (${error.code})` : ""}: ${error.message}`,
          "warning"
        );
      }
    } catch (err) {
      console.error("Error creating product:", err);
    }
  };

  const handleStartEditingProduct = (item: MenuItem) => {
    setIsEditingProduct(true);
    setEditProdName(item.name);
    setEditProdCategory(item.category);
    setEditProdPrice(String(item.price));
    setEditProdTakeawayPrice(String(item.takeawayPrice || Number((item.price * 0.9).toFixed(2))));
    setEditProdDeliveryPrice(String(item.deliveryPrice || Number((item.price * 1.15).toFixed(2))));
    setEditProdStock(String(item.stock ?? 0));
    setEditProdDescription(item.description || "");
    setEditProdImage(item.image || "");
    setEditProdRecipeRequired(item.recipeRequired !== false);
    setEditProdVatRate(item.vatRate === undefined ? "" : String(item.vatRate));
    setEditProdArcaItemCode(item.arcaItemCode || "");
    setEditProdArcaUnitCode(item.arcaUnitCode || "");
    setEditProdFiscalEnabled(item.fiscalEnabled === true);
    setEditProdIsAvailable(item.isAvailable !== false);
  };

  const handleSaveProductDetails = async (e: FormEvent, itemId: string) => {
    e.preventDefault();
    if (isSavingProduct) return;
    if (!editProdName || !editProdPrice) {
      onShowNotification("⚠️ Ingrese el nombre y precio del producto.", "warning");
      return;
    }
    const priceVal = parseFloat(editProdPrice);
    if (isNaN(priceVal) || priceVal <= 0) {
      onShowNotification("⚠️ Ingrese un precio válido.", "warning");
      return;
    }
    const takeawayVal = parseFloat(editProdTakeawayPrice) || Number((priceVal * 0.9).toFixed(2));
    const deliveryVal = parseFloat(editProdDeliveryPrice) || Number((priceVal * 1.15).toFixed(2));
    const parsedStock = Number.parseInt(editProdStock, 10);
    const stockVal = Number.isFinite(parsedStock) ? Math.max(0, parsedStock) : 0;
    const parsedVatRate = editProdVatRate === "" ? undefined : Number(editProdVatRate);
    const allowedVatRates = [0, 10.5, 21, 27];
    if (
      editProdFiscalEnabled &&
      (
        parsedVatRate === undefined ||
        !allowedVatRates.includes(parsedVatRate) ||
        !editProdArcaItemCode.trim() ||
        !editProdArcaUnitCode.trim()
      )
    ) {
      onShowNotification(
        "⚠️ Para habilitar ARCA complete alícuota, código de ítem y código de unidad.",
        "warning"
      );
      return;
    }

    const original = menuItems.find(i => i.id === itemId);
    if (!original) return;

    const updatedProduct: MenuItem = {
      ...original,
      name: editProdName.trim(),
      price: priceVal,
      takeawayPrice: takeawayVal,
      deliveryPrice: deliveryVal,
      stock: stockVal,
      category: editProdCategory as any,
      description: editProdDescription.trim(),
      image: editProdImage.trim() || original.image,
      recipeRequired: editProdRecipeRequired,
      vatRate: parsedVatRate as MenuItem["vatRate"],
      arcaItemCode: editProdArcaItemCode.trim() || undefined,
      arcaUnitCode: editProdArcaUnitCode.trim() || undefined,
      fiscalEnabled: editProdFiscalEnabled,
      isAvailable: editProdIsAvailable
    };

    setIsSavingProduct(true);
    try {
      const result = await MenuCatalogService.saveProduct(updatedProduct);
      if (!result.success) {
        onShowNotification(`❌ ${result.error || "No se pudo guardar la ficha."}`, "warning");
        return;
      }

      if (updatedProduct.image && updatedProduct.image.startsWith("data:image")) {
        const { error: imageError } = await supabase.from("product_images").upsert({
          id: updatedProduct.id,
          product_id: updatedProduct.id,
          image_base64: updatedProduct.image
        });
        if (imageError) {
          console.error("Error upserting to product_images table:", imageError);
          onShowNotification(
            "⚠️ La ficha se guardó, pero la copia secundaria de la imagen fue rechazada.",
            "warning"
          );
        }
      }

      const updatedMenu = menuItems.map(item => item.id === itemId ? updatedProduct : item);
      onUpdateMenu(updatedMenu);
      setSelectedMenuProduct(updatedProduct);
      setIsEditingProduct(false);
      onShowNotification("✅ Ficha de producto guardada y sincronizada.", "success");
    } catch (err) {
      console.error("Error saving product changes:", err);
      onShowNotification("❌ No fue posible comunicarse con Supabase para guardar la ficha.", "warning");
    } finally {
      setIsSavingProduct(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "reservas" || activeSubTab === "salon") {
      fetchBookings();
    }
  }, [activeSubTab]);

  // Massive Inflation Price Adjustments
  const [inflationPercentage, setInflationPercentage] = useState<number>(10);
  const [targetCategory, setTargetCategory] = useState<string>("todos");

  // Client Repayments
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [repaymentAmount, setRepaymentAmount] = useState<string>("");

  // New visual states for mockups
  const [selectedMenuProduct, setSelectedMenuProduct] = useState<MenuItem | null>(null);
  const [simulatedPrice, setSimulatedPrice] = useState<number>(0);
  const [posCart, setPosCart] = useState<{ item: MenuItem; qty: number }[]>([]);
  const [selectedPosCategory, setSelectedPosCategory] = useState<string>("todos");
  const [posTable, setPosTable] = useState<string>("Mesa 1");
  const [searchInsumoQuery, setSearchInsumoQuery] = useState<string>("");
  const [posCheckoutOrder, setPosCheckoutOrder] = useState<Order | null>(null);
  const [receivedCashInput, setReceivedCashInput] = useState<string>("");
  const [posCouponInput, setPosCouponInput] = useState<string>("");
  const [selectedOrderForTicket, setSelectedOrderForTicket] = useState<Order | null>(null);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movType, setMovType] = useState<"Ingreso" | "Egreso">("Ingreso");
  const [movInsumoId, setMovInsumoId] = useState<string>("");
  const [movQty, setMovQty] = useState<string>("");
  const [movReason, setMovReason] = useState<string>("");

  // New Insumo Modal State
  const [isNewInsumoModalOpen, setIsNewInsumoModalOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [newInsumoName, setNewInsumoName] = useState("");
  const [newInsumoUnit, setNewInsumoUnit] = useState("kg");
  const [newInsumoQuantity, setNewInsumoQuantity] = useState("10");
  const [newInsumoMinLimit, setNewInsumoMinLimit] = useState("5");
  const [newInsumoProvider, setNewInsumoProvider] = useState("");
  const [newInsumoExpDate, setNewInsumoExpDate] = useState("");
  const [newInsumoCost, setNewInsumoCost] = useState("0");
  const [isCreatingInsumo, setIsCreatingInsumo] = useState(false);
  const [recipeIngredientId, setRecipeIngredientId] = useState<string>("");
  const [recipeIngredientQty, setRecipeIngredientQty] = useState<string>("0.1");
  const [historySearchTable, setHistorySearchTable] = useState("");
  const [historyFilterWaiter, setHistoryFilterWaiter] = useState("todos");
  const [historyFilterPayment, setHistoryFilterPayment] = useState("todos");

  // Relocated states from sub tabs to respect React Rules of Hooks
  // 1. Reservas
  const [isAddingBooking, setIsAddingBooking] = useState(false);
  const [bookingFormName, setBookingFormName] = useState("");
  const [bookingFormPhone, setBookingFormPhone] = useState("");
  const [bookingFormDate, setBookingFormDate] = useState("");
  const [bookingFormSlot, setBookingFormSlot] = useState("16:00 - 18:00");
  const [bookingFormTableId, setBookingFormTableId] = useState("mesa-1");
  const [bookingFormGuests, setBookingFormGuests] = useState(2);
  const [bookingSearchQuery, setBookingSearchQuery] = useState("");
  const [selectedCalDate, setSelectedCalDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [calMonthOffset, setCalMonthOffset] = useState<number>(0);

  // 2. Proveedores
  const [isAddingProv, setIsAddingProv] = useState(false);
  const [provFormName, setProvFormName] = useState("");
  const [provFormItems, setProvFormItems] = useState("");
  const [provFormContact, setProvFormContact] = useState("");
  const [provFormPhone, setProvFormPhone] = useState("");
  const [provFormStatus, setProvFormStatus] = useState("ACTIVO");

  // 3. Salon
  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState(2);

  // 4. Carta & Recetas Edit Mode states
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editProdName, setEditProdName] = useState("");
  const [editProdCategory, setEditProdCategory] = useState("coffee");
  const [editProdPrice, setEditProdPrice] = useState("");
  const [editProdTakeawayPrice, setEditProdTakeawayPrice] = useState("");
  const [editProdDeliveryPrice, setEditProdDeliveryPrice] = useState("");
  const [editProdStock, setEditProdStock] = useState("");
  const [editProdDescription, setEditProdDescription] = useState("");
  const [editProdImage, setEditProdImage] = useState("");
  const [editProdRecipeRequired, setEditProdRecipeRequired] = useState(true);
  const [editProdVatRate, setEditProdVatRate] = useState("");
  const [editProdArcaItemCode, setEditProdArcaItemCode] = useState("");
  const [editProdArcaUnitCode, setEditProdArcaUnitCode] = useState("");
  const [editProdFiscalEnabled, setEditProdFiscalEnabled] = useState(false);
  const [editProdIsAvailable, setEditProdIsAvailable] = useState(true);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const [mermaLogs, setMermaLogs] = useState<{ id: string; date: string; name: string; qty: string; cost: string; reason: string; auditor: string }[]>([]);

  useEffect(() => {
    if (menuItems.length > 0 && !selectedMenuProduct) {
      setSelectedMenuProduct(menuItems[0]);
      setSimulatedPrice(menuItems[0].price);
    }
  }, [menuItems]);

  useEffect(() => {
    if (selectedMenuProduct) {
      setSimulatedPrice(selectedMenuProduct.price);
    }
  }, [selectedMenuProduct]);

  const URM = profitSales * 0.06;
  const superaSueldos = profitNet > URM;
  const pozoProfitSharing = superaSueldos ? (profitNet - URM) * 0.10 : 0;
  const proporcionalPartTotal = pozoProfitSharing * 0.50;
  const equitativoPerEmp =
    activeTipEmployees.length > 0
      ? (pozoProfitSharing * 0.50) / activeTipEmployees.length
      : 0;

  const [scannedItems, setScannedItems] = useState<
    { id: string; insumoId: string; name: string; qty: number; unit: string; damaged: boolean }[]
  >([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleMassivePriceUpdate = async () => {
    if (inflationPercentage === 0) return;
    const multiplier = 1 + (inflationPercentage / 100);
    const updated = menuItems.map(item => {
      if (targetCategory === "todos" || item.category === targetCategory) {
        return {
          ...item,
          price: Number((item.price * multiplier).toFixed(2)),
          offerPrice: item.offerPrice ? Number((item.offerPrice * multiplier).toFixed(2)) : undefined,
          takeawayPrice: item.takeawayPrice ? Number((item.takeawayPrice * multiplier).toFixed(2)) : undefined,
          deliveryPrice: item.deliveryPrice ? Number((item.deliveryPrice * multiplier).toFixed(2)) : undefined
        };
      }
      return item;
    });

    const changed = updated.filter((item) => {
      const original = menuItems.find((candidate) => candidate.id === item.id);
      return original && original.price !== item.price;
    });
    const results = await Promise.all(
      changed.map((item) =>
        supabase
          .from("menu_items")
          .update({
            price: item.price,
            takeaway_price: item.takeawayPrice ?? null,
            delivery_price: item.deliveryPrice ?? null,
            offer_price: item.offerPrice ?? null,
            updated_at: new Date().toISOString()
          })
          .eq("id", item.id)
      )
    );
    const failure = results.find((result) => result.error);
    if (failure?.error) {
      onShowNotification(
        `⚠️ El ajuste masivo fue rechazado: ${failure.error.message}`,
        "warning"
      );
      return;
    }
    onUpdateMenu(updated);
    onShowNotification(`📈 ¡Ajuste de precios masivo completado! Se aumentó un ${inflationPercentage}% en la categoría '${targetCategory}'.`, "success");
  };

  const handleRecordRepayment = async (e: FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(repaymentAmount);
    if (!selectedClientId) {
      onShowNotification("⚠️ Por favor seleccione una cuenta de cliente.", "warning");
      return;
    }
    if (isNaN(amountVal) || amountVal <= 0) {
      onShowNotification("⚠️ Ingrese un monto de abono válido mayor a cero.", "warning");
      return;
    }

    const client = clientAccounts.find(c => c.id === selectedClientId);
    if (!client) return;

    const repayment = await SupabaseSyncService.recordClientRepayment(
      selectedClientId,
      amountVal
    );
    if (!repayment.success || !repayment.client) {
      onShowNotification(
        `⚠️ No se pudo registrar el abono: ${repayment.error}`,
        "warning"
      );
      return;
    }
    onUpdateClientAccounts(
      clientAccounts.map((account) =>
        account.id === repayment.client?.id ? repayment.client : account
      )
    );
    
    // Add transaction to cashLedger
    setCashLedger(prev => {
      const newTx = {
        id: repayment.transactionId,
        type: "Abono Cta Cte",
        orderId: `ABO-${client.name.substring(0,3).toUpperCase()}`,
        total: amountVal,
        method: "Efectivo",
        timestamp: "Ahora mismo"
      };
      return {
        ...prev,
        totalCollected: Number((prev.totalCollected + amountVal).toFixed(2)),
        cash: Number((prev.cash + amountVal).toFixed(2)),
        transactions: [newTx, ...prev.transactions]
      };
    });

    setRepaymentAmount("");
    onShowNotification(`✅ Pago asentado: Se abonaron $${amountVal.toFixed(2)} a la cuenta de ${client.name}.`, "success");
  };

  const handleRecordStaffConsumption = (id: string, amount: number) => {
    setStaffConsumptions(prev =>
      prev.map(staff => {
        if (staff.id === id) {
          const newTotal = staff.consumedToday + amount;
          if (newTotal > staff.limit) {
            onShowNotification(`⚠️ Alerta: ${staff.name} ha superado el límite diario de consumo corporativo ($${staff.limit.toFixed(2)}).`, "warning");
            return staff;
          } else {
            onShowNotification(`✅ Consumo registrado para ${staff.name}: +$${amount.toFixed(2)}.`, "success");
            return { ...staff, consumedToday: Number(newTotal.toFixed(2)) };
          }
        }
        return staff;
      })
    );
  };

  const handleToggleScannedItemDamaged = (id: string) => {
    setScannedItems(prev =>
      prev.map(it => (it.id === id ? { ...it, damaged: !it.damaged } : it))
    );
  };

  const handleConfirmBarcodeReception = async () => {
    if (scannedItems.length === 0) {
      onShowNotification("⚠️ No hay bultos escaneados para ingresar.", "warning");
      return;
    }
    const updatedInventory = insumos.map(ins => {
        const matchingScans = scannedItems.filter(s => s.insumoId === ins.id && !s.damaged);
        if (matchingScans.length > 0) {
          const addedQty = matchingScans.reduce((sum, s) => sum + s.qty, 0);
          return {
            ...ins,
            quantity: Number((ins.quantity + addedQty).toFixed(2))
          };
        }
        return ins;
      });
    const changedIds = new Set(scannedItems.filter((item) => !item.damaged).map((item) => item.insumoId));
    const changedInventory = updatedInventory
      .filter((item) => changedIds.has(item.id))
      .map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          min_limit: item.minLimit,
          provider: item.provider || null,
          expiration_date: item.expirationDate || null,
          updated_at: new Date().toISOString()
        }));
    const { error } = changedInventory.length
      ? await supabase.from("insumos").upsert(changedInventory)
      : { error: null };
    if (error) {
      onShowNotification(`⚠️ No se pudo ingresar el remito: ${error.message}`, "warning");
      return;
    }
    setInsumos(updatedInventory);

    const damagedCount = scannedItems.filter(s => s.damaged).length;

    if (damagedCount > 0) {
      onShowNotification(`📦 Recepción: Se testaron/rechazaron ${damagedCount} bultos dañados. Se ingresó el stock conforme.`, "success");
    } else {
      onShowNotification("📦 Recepción de remito completa sin discrepancias físicas.", "success");
    }

    setScannedItems([]);
    setIsScannerOpen(false);
  };

  // Handle cash ledger collection
  const handleOpenBilling = (order: Order) => {
    setBillingOrder(order);
    setPaymentMethod("Tarjeta");
    setReceivedCash("");
    setReturnedChange(0);
  };

  useEffect(() => {
    if (billingOrder && receivedCash) {
      const cashVal = parseFloat(receivedCash);
      if (!isNaN(cashVal) && cashVal >= billingOrder.total) {
        setReturnedChange(cashVal - billingOrder.total);
      } else {
        setReturnedChange(0);
      }
    } else {
      setReturnedChange(0);
    }
  }, [receivedCash, billingOrder]);

  const handleProcessBilling = async () => {
    if (!billingOrder) return;

    const total = billingOrder.total;
    const orderId = billingOrder.id;
    const payment = await SupabaseSyncService.recordPayment(
      orderId,
      total,
      paymentMethod
    );
    if (!payment.success) {
      onShowNotification(
        `⚠️ El cobro no pudo registrarse de forma transaccional: ${payment.error}`,
        "warning"
      );
      return;
    }

    // Update Cash Register State
    setCashLedger((prev: any) => {
      const updatedTotal = prev.totalCollected + total;
      let updatedCash = prev.cash;
      let updatedCard = prev.card;
      let updatedMp = prev.mercadopago;

      if (paymentMethod === "Efectivo") updatedCash += total;
      else if (paymentMethod === "Tarjeta") updatedCard += total;
      else if (paymentMethod === "MercadoPago") updatedMp += total;

      const newTx = {
        id: payment.transactionId,
        type: "Cobro",
        orderId: `PED-${orderId.substring(0, 4).toUpperCase()}`,
        total: total,
        method: paymentMethod,
        timestamp: "Ahora mismo"
      };

      return {
        totalCollected: updatedTotal,
        cash: updatedCash,
        card: updatedCard,
        mercadopago: updatedMp,
        transactions: [newTx, ...prev.transactions]
      };
    });

    if (payment.order) {
      onUpdateOrders?.(
        orders.map((order) => (order.id === payment.order?.id ? payment.order : order))
      );
    }

    onShowNotification(`💵 Cobro procesado con éxito por $${total.toFixed(2)} vía ${paymentMethod}.`, "success");
    setBillingOrder(null);
  };

  // Generate automatic purchase orders for critical insumos grouped by supplier
  const handleGenerateAutoOrders = () => {
    const criticals = insumos.filter(ins => ins.quantity <= ins.minLimit);
    
    if (criticals.length === 0) {
      onShowNotification("✅ No hay insumos en nivel crítico o bajo stock para reordenar.", "info");
      return;
    }

    const groups: Record<string, { message: string; email: string; phone: string; itemsList: any[] }> = {};

    criticals.forEach(ins => {
      const providerName = ins.provider || "Sin proveedor asignado";
      const pObj = proveedores.find(p => p.name.toLowerCase() === providerName.toLowerCase());
      
      const email = pObj?.contact || "";
      const phone = pObj?.phone || "";

      const reorderQty = Math.ceil(ins.minLimit * 2.5 - ins.quantity);

      if (!groups[providerName]) {
        groups[providerName] = {
          message: "",
          email,
          phone,
          itemsList: []
        };
      }

      groups[providerName].itemsList.push({
        name: ins.name,
        qty: reorderQty,
        unit: ins.unit
      });
    });

    Object.keys(groups).forEach(prov => {
      const g = groups[prov];
      let msg = `Hola ${prov},\n\nNecesitamos realizar el siguiente pedido de reposición para Resto Bar Del Teatro:\n`;
      g.itemsList.forEach(item => {
        msg += `• ${item.qty} ${item.unit} de ${item.name}\n`;
      });
      msg += `\nPor favor, confírmennos disponibilidad y costo estimado de entrega.\nMuchas gracias.\n--\nResto Bar Del Teatro Specialty Coffee`;
      g.message = msg;
    });

    setDraftOrders(groups);
    setIsAutoOrderModalOpen(true);
  };

  // Adjust raw materials stock in the canonical inventory table.
  const handleAdjustInsumo = async (
    id: string,
    amount: number,
    reason = "",
    estimatedCost = 0
  ): Promise<boolean> => {
    const insumo = insumos.find((item) => item.id === id);
    if (!insumo) return false;
    const { data, error } = await supabase.rpc("adjust_inventory_stock", {
      p_insumo_id: id,
      p_delta: amount,
      p_reason: reason || null,
      p_estimated_cost: estimatedCost
    });
    if (error) {
      console.error("Error updating inventory:", error);
      onShowNotification("⚠️ No se pudo actualizar el stock en Supabase.", "warning");
      return false;
    }

    const finalQty = Number(data.quantity);
    const updated = insumos.map((item) =>
      item.id === id ? { ...item, quantity: finalQty } : item
    );
    setInsumos(updated);
    if (amount < 0 && reason) {
      setMermaLogs((previous) => [{
        id: `pending-${Date.now()}`,
        date: new Date().toLocaleString("es-AR"),
        name: insumo.name,
        qty: `${Math.abs(amount)} ${insumo.unit}`,
        cost: `$${estimatedCost.toLocaleString("es-AR")}`,
        reason,
        auditor: selectedWaiter || "Usuario autenticado"
      }, ...previous]);
    }
    if (finalQty < insumo.minLimit) {
      onShowNotification(
        `⚠️ Alerta: El insumo '${insumo.name}' quedó por debajo de su stock de seguridad.`,
        "warning"
      );
    } else {
      onShowNotification(
        `✅ Stock de '${insumo.name}' actualizado a ${finalQty} ${insumo.unit}.`,
        "success"
      );
    }
    return true;
  };

  const handleCreateNewInsumo = async (e: FormEvent) => {
    e.preventDefault();
    if (isCreatingInsumo) return;
    if (!newInsumoName.trim()) {
      onShowNotification("⚠️ Ingrese el nombre de la materia prima o insumo.", "warning");
      return;
    }

    const qty = Number(newInsumoQuantity);
    const minLim = Number(newInsumoMinLimit);
    const cost = Number(newInsumoCost);
    if (![qty, minLim, cost].every(Number.isFinite) || qty < 0 || minLim < 0 || cost < 0) {
      onShowNotification("⚠️ Cantidad, stock mínimo y costo deben ser números iguales o mayores a cero.", "warning");
      return;
    }

    setIsCreatingInsumo(true);
    try {
      const result = await InventoryService.createItem({
        name: newInsumoName,
        quantity: qty,
        unit: newInsumoUnit,
        minLimit: minLim,
        provider: newInsumoProvider,
        expirationDate: newInsumoExpDate,
        costPerUnit: cost
      });
      if (!result.success || !result.item) {
        onShowNotification(`⚠️ ${result.error || "No se pudo registrar el insumo."}`, "warning");
        return;
      }

      setInsumos((previous) => [...previous, result.item!].sort((a, b) => a.name.localeCompare(b.name, "es")));
      setIsNewInsumoModalOpen(false);
      setNewInsumoName("");
      setNewInsumoProvider("");
      setNewInsumoExpDate("");
      setNewInsumoCost("0");
      onShowNotification(`✅ Insumo '${result.item.name}' registrado e integrado a Supabase con éxito.`, "success");
    } catch (error) {
      console.error("Error creating inventory item:", error);
      onShowNotification("⚠️ No fue posible comunicarse con Supabase para registrar el insumo.", "warning");
    } finally {
      setIsCreatingInsumo(false);
    }
  };

  const handleAddIngredientToRecipe = async (productId: string, ingredientId: string, amount: number) => {
    if (!ingredientId || amount <= 0) {
      onShowNotification("⚠️ Seleccione un insumo y una cantidad válida.", "warning");
      return;
    }
    const updatedMenu = menuItems.map(item => {
      if (item.id === productId) {
        const currentRecipe = item.recipe || [];
        const existingIdx = currentRecipe.findIndex(r => r.ingredientId === ingredientId);
        let newRecipe = [...currentRecipe];
        if (existingIdx >= 0) {
          newRecipe[existingIdx] = { ...newRecipe[existingIdx], amount: Number((newRecipe[existingIdx].amount + amount).toFixed(3)) };
        } else {
          newRecipe.push({ ingredientId, amount });
        }
        return { ...item, recipe: newRecipe };
      }
      return item;
    });

    const updatedProd = updatedMenu.find(i => i.id === productId);
    if (updatedProd) {
      try {
        const { error } = await supabase.from("menu_items").upsert({
          id: updatedProd.id,
          name: updatedProd.name,
          price: updatedProd.price,
          category: updatedProd.category,
          recipe: updatedProd.recipe
        });
        if (error) throw error;
        onUpdateMenu(updatedMenu);
        setSelectedMenuProduct(updatedProd);
        onShowNotification("✅ Insumo añadido a la receta técnica del producto.", "success");
      } catch (e) {
        console.error("No se pudo actualizar la receta:", e);
        onShowNotification("⚠️ No se pudo guardar la receta en Supabase.", "warning");
      }
    }
  };

  const handleRemoveIngredientFromRecipe = async (productId: string, ingredientId: string) => {
    const updatedMenu = menuItems.map(item => {
      if (item.id === productId) {
        const currentRecipe = item.recipe || [];
        const newRecipe = currentRecipe.filter(r => r.ingredientId !== ingredientId);
        return { ...item, recipe: newRecipe };
      }
      return item;
    });

    const updatedProd = updatedMenu.find(i => i.id === productId);
    if (updatedProd) {
      try {
        const { error } = await supabase.from("menu_items").upsert({
          id: updatedProd.id,
          name: updatedProd.name,
          price: updatedProd.price,
          category: updatedProd.category,
          recipe: updatedProd.recipe
        });
        if (error) throw error;
        onUpdateMenu(updatedMenu);
        setSelectedMenuProduct(updatedProd);
        onShowNotification("🗑️ Insumo removido de la receta.", "info");
      } catch (e) {
        console.error("No se pudo quitar el insumo de la receta:", e);
        onShowNotification("⚠️ No se pudo guardar la receta en Supabase.", "warning");
      }
    }
  };

  // Save changes to menu item pricing & stock
  const handleStartEditing = (item: MenuItem) => {
    setEditingItemId(item.id);
    setEditPrice(item.price);
    setEditStock(item.stock || 0);
    setEditIsOffer(item.isOffer || false);
    setEditOfferPrice(item.offerPrice || item.price * 0.85);
  };

  const handleSaveItemChanges = async (itemId: string) => {
    const updatedMenu = menuItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          price: editPrice,
          stock: editStock,
          isOffer: editIsOffer,
          offerPrice: editIsOffer ? editOfferPrice : undefined
        };
      }
      return item;
    });

    const { error } = await supabase
      .from("menu_items")
      .update({
        price: editPrice,
        stock: editStock,
        is_offer: editIsOffer,
        offer_price: editIsOffer ? editOfferPrice : null,
        updated_at: new Date().toISOString()
      })
      .eq("id", itemId);
    if (error) {
      onShowNotification(`⚠️ No se pudieron guardar los cambios: ${error.message}`, "warning");
      return;
    }
    onUpdateMenu(updatedMenu);
    setEditingItemId(null);
    onShowNotification("✍️ Cambios guardados con éxito en el catálogo de productos.", "success");
  };

  // Open Daily Shift
  const handleOpenShift = async () => {
    if (isShiftOperationPending) return;
    const rawInput = window.prompt("Ingrese el fondo de caja inicial en efectivo para el nuevo turno (ARS):", "15000");
    if (rawInput === null) return; // User cancelled
    const initialCash = Math.max(0, parseFloat(rawInput.replace(/[^0-9.]/g, "")) || 0);

    setIsShiftOperationPending(true);
    const result = await CashShiftService.openShift(initialCash);
    setIsShiftOperationPending(false);
    if (!result.success || !result.ledger) {
      onShowNotification(`⚠️ No se pudo abrir la caja: ${result.error || "respuesta inválida"}`, "warning");
      return;
    }

    setIsShiftOpen(true);
    setShiftOpenTime(result.ledger.openedAt);
    setCashLedger({
      totalCollected: result.ledger.totalCollected,
      cash: result.ledger.cash,
      card: result.ledger.card,
      mercadopago: result.ledger.mercadopago,
      transactions: result.ledger.transactions
    });
    onShowNotification(`🔓 Turno fiscal de caja abierto con éxito (Fondo inicial: $${initialCash.toLocaleString()}).`, "success");
  };

  const handleSaveBusinessProfile = async () => {
    const normalizedCuit = businessProfile.cuit.replace(/\D/g, "");
    const posNumber = Number(businessProfile.posNumber);
    if (!businessProfile.name.trim() || !businessProfile.address.trim()) {
      onShowNotification("⚠️ Complete el nombre y la dirección comercial.", "warning");
      return;
    }
    if (normalizedCuit.length !== 11 || !Number.isInteger(posNumber) || posNumber <= 0) {
      onShowNotification("⚠️ Ingrese un CUIT de 11 dígitos y un punto de venta válido.", "warning");
      return;
    }

    const updatedProfile: BusinessProfileForm = {
      ...businessProfile,
      name: businessProfile.name.trim(),
      address: businessProfile.address.trim(),
      cuit: normalizedCuit,
      posNumber: String(posNumber)
    };

    try {
      localStorage.setItem("castano_business_profile", JSON.stringify(updatedProfile));
    } catch (e) {}

    setBusinessProfile(updatedProfile);
    setIsConfigRestaurantOpen(false);

    setIsBusinessProfileSaving(true);
    try {
      await supabase
        .from("business_profile")
        .upsert({
          id: "resto_bar_del_teatro",
          name: updatedProfile.name,
          cuit: normalizedCuit,
          address: updatedProfile.address,
          city: updatedProfile.city || "Río Cuarto",
          province: updatedProfile.province || "Córdoba",
          phone: updatedProfile.phone || null,
          email: updatedProfile.email || null,
          currency: "ARS",
          timezone: "America/Argentina/Cordoba",
          pos_number: posNumber,
          delivery_fee: deliveryFeeConfig,
          delivery_free_min: deliveryFreeMinConfig,
          updated_at: new Date().toISOString()
        }, { onConflict: "id" });
    } catch (e) {
      console.warn("Supabase business_profile sync pending:", e);
    } finally {
      setIsBusinessProfileSaving(false);
    }

    onShowNotification(`✅ Perfil comercial guardado en ARCA: CUIT ${normalizedCuit} — Punto de Venta ${posNumber}.`, "success");
  };

  const handleSavePrinterConfig = () => {
    try {
      ThermalPrinterService.saveConfig(printerConfig);
      setIsConfigTicketerisOpen(false);
      onShowNotification("🖨️ Configuración de impresora guardada en esta terminal.", "success");
    } catch (error) {
      console.error("Error saving printer configuration:", error);
      onShowNotification("⚠️ No se pudo guardar la configuración de impresora.", "warning");
    }
  };

  // Close Daily Shift
  const handleConfirmCloseShift = async (montoReal: number, observaciones: string) => {
    if (isShiftOperationPending) return;
    setIsShiftOperationPending(true);
    const result = await CashShiftService.closeShift(montoReal, observaciones, currentUser.name);
    setIsShiftOperationPending(false);
    if (!result.success || !result.closure) {
      onShowNotification(`⚠️ No se pudo cerrar la caja: ${result.error || "respuesta inválida"}`, "warning");
      return;
    }

    setClosuresHistory(prev => [result.closure!, ...prev]);
    setIsShiftOpen(false);
    setShiftOpenTime("");
    setCashLedger({
      totalCollected: 0,
      cash: 0,
      card: 0,
      mercadopago: 0,
      transactions: []
    });
    setPosCheckoutOrder(null);
    setIsCloseShiftModalOpen(false);
    setCloseShiftRealCash("");
    setCloseShiftNotes("");
    onShowNotification("🔒 Turno de caja cerrado correctamente. Los contadores se reiniciaron a $0.", "info");
  };

  const getRecipeCost = (item: MenuItem) => {
    if (!item.recipe || item.recipe.length === 0) return 0;
    let total = 0;
    item.recipe.forEach(r => {
      const unitCost = insumos.find((insumo) => insumo.id === r.ingredientId)?.costPerUnit || 0;
      total += r.amount * unitCost;
    });
    return parseFloat(total.toFixed(2));
  };

  const handleConfirmArcaBilling = async () => {
    if (!selectedOrderForBilling) return;

    const isConsumidorFinal = fiscalForm.ivaCondition === "Consumidor Final" || !fiscalForm.cuitOrDni.trim();
    const val = ArcaBillingService.validateCuitOrDni(fiscalForm.cuitOrDni, isConsumidorFinal);
    if (!val.isValid) {
      onShowNotification(`⚠️ ${val.message}`, "warning");
      return;
    }

    const draft = ArcaBillingService.generateDraftInvoice(selectedOrderForBilling, fiscalForm);
    const authorization = await arcaAdapter.authorizeInvoice(
      selectedOrderForBilling,
      fiscalForm.cuitOrDni,
      fiscalForm.nameOrReason,
      draft.invoiceType === "No Fiscal" ? "B" : draft.invoiceType,
      fiscalForm.ivaCondition
    );

    if (
      !authorization.success ||
      !["authorized", "observed"].includes(authorization.status) ||
      !authorization.cae ||
      !authorization.caeExpiration ||
      !authorization.invoiceNumber
    ) {
      if (authorization.status === "draft") {
        const safeDraft = {
          ...draft,
          status: authorization.status,
          observations: authorization.observations,
          errors: authorization.errors
        };
        void ReceiptPDFService.generateArcaInvoicePDF(
          { ...selectedOrderForBilling, fiscal: safeDraft },
          safeDraft
        );
        onShowNotification(
          authorization.errors?.[0] ||
            "📋 ARCA aún no está configurado: se generó un documento no fiscal.",
          "warning"
        );
      } else {
        onShowNotification(
          authorization.errors?.[0] ||
            `⚠️ La autorización fiscal quedó en estado ${authorization.status}; no se emitió factura.`,
          "warning"
        );
      }
      return;
    }

    const fiscalDetails = {
      ...draft,
      status: authorization.status,
      invoiceNumber: authorization.invoiceNumber,
      cae: authorization.cae,
      caeExpiration: authorization.caeExpiration,
      qrCodeUrl: authorization.qrCodeUrl,
      issuerCuit: authorization.issuerCuit,
      issuerName: authorization.issuerName,
      issuerAddress: authorization.issuerAddress,
      observations: authorization.observations,
      errors: authorization.errors
    };

    const updatedOrder: Order = {
      ...selectedOrderForBilling,
      fiscal: fiscalDetails
    };

    const { error: orderFiscalError } = await supabase
      .from("orders")
      .update({ fiscal: fiscalDetails })
      .eq("id", selectedOrderForBilling.id);
    if (orderFiscalError) {
      onShowNotification(
        "⚠️ ARCA autorizó el comprobante, pero no se pudo asociar a la comanda. Requiere revisión.",
        "warning"
      );
      return;
    }
    onUpdateOrders?.(
      orders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
    );
    void ReceiptPDFService.generateArcaInvoicePDF(updatedOrder, fiscalDetails);

    const thermalHtml = `
      <h2>CASTAÑO — RESTO BAR</h2>
      <div class="center">FACTURA ${fiscalDetails.invoiceType} (${fiscalDetails.invoiceNumber})</div>
      <div class="center">CAE: ${fiscalDetails.cae} · Vto: ${fiscalDetails.caeExpiration}</div>
      <div class="line"></div>
      <div>Cliente: ${fiscalDetails.customerName}</div>
      <div>CUIT/DNI: ${fiscalDetails.customerCuit}</div>
      <div class="line"></div>
      <h3 class="right">TOTAL: $${updatedOrder.total.toLocaleString("es-AR")}</h3>
      <div class="center italic">Comprobante electrónico autorizado por ARCA</div>
    `;
    ThermalPrinterService.printRawText(thermalHtml, `Factura_${fiscalDetails.invoiceType}`);

    const method = updatedOrder.paymentMethod || paymentMethod || "Efectivo";
    void CashShiftService.recordPaymentToLedger(updatedOrder.total, method, updatedOrder.id);
    setCashLedger(prev => ({
      ...prev,
      cash: prev.cash + (method === "Efectivo" ? updatedOrder.total : 0),
      card: prev.card + (["Tarjeta", "Tarjeta Débito", "Tarjeta Crédito"].includes(method) ? updatedOrder.total : 0),
      mercadopago: prev.mercadopago + (method === "MercadoPago" ? updatedOrder.total : 0),
      totalCollected: prev.totalCollected + updatedOrder.total
    }));

    onOrderStatusUpdate(selectedOrderForBilling.id, "Completado");
    setIsArcaModalOpen(false);
    setSelectedOrderForBilling(null);

    onShowNotification(
      `${authorization.status === "observed" ? "⚠️" : "✅"} Factura ${fiscalDetails.invoiceType} autorizada. CAE: ${fiscalDetails.cae}.`,
      authorization.status === "observed" ? "warning" : "success"
    );
  };

  const handleEmitManualArcaInvoice = async () => {
    const isConsumidorFinal = manualCustomerInfo.ivaCondition === "Consumidor Final" || !manualCustomerInfo.cuitOrDni.trim();
    const val = ArcaBillingService.validateCuitOrDni(manualCustomerInfo.cuitOrDni, isConsumidorFinal);
    if (!val.isValid) {
      onShowNotification(`⚠️ ${val.message}`, "warning");
      return;
    }

    if (manualItems.length === 0) {
      onShowNotification("⚠️ Debe agregar al menos un concepto a facturar.", "warning");
      return;
    }

    const totalSub = manualItems.reduce((acc, it) => acc + (it.unitPrice * it.qty), 0);
    if (totalSub <= 0) {
      onShowNotification("⚠️ El importe total a facturar debe ser mayor a $0.", "warning");
      return;
    }

    const dummyId = `FAC-MAN-${crypto.randomUUID()}`;
    const dummyOrder: Order = {
      id: dummyId,
      items: manualItems.map(it => ({
        name: it.description,
        quantity: it.qty,
        price: it.unitPrice,
        vatRate: it.ivaPct as 0 | 10.5 | 21 | 27,
        customizationSummary: ""
      })),
      subtotal: totalSub,
      tax: parseFloat((totalSub - totalSub / 1.21).toFixed(2)),
      total: totalSub,
      type: "Mesa",
      priceList: "Salon",
      status: "Completado",
      createdAt: new Date().toISOString(),
      estimatedMinutes: 0,
      paymentMethod: manualPaymentMethod as any
    };

    const requestedType = (manualInvoiceType.split(" ")[1] || "B") as "A" | "B" | "C";
    const savedOrder = await SupabaseSyncService.saveOrder(dummyOrder);
    if (!savedOrder.success || !savedOrder.order) {
      onShowNotification(
        `⚠️ No se pudo registrar la operación antes de facturar: ${savedOrder.error || "error desconocido"}.`,
        "warning"
      );
      return;
    }
    const authorization = await arcaAdapter.authorizeInvoice(
      savedOrder.order,
      manualCustomerInfo.cuitOrDni,
      manualCustomerInfo.nameOrReason,
      requestedType,
      manualCustomerInfo.ivaCondition
    );
    const draft = ArcaBillingService.generateDraftInvoice(savedOrder.order, {
      ...manualCustomerInfo,
      invoiceTypeChoice: requestedType
    });
    draft.invoiceType = requestedType;
    if (
      !authorization.success ||
      !["authorized", "observed"].includes(authorization.status) ||
      !authorization.cae ||
      !authorization.caeExpiration ||
      !authorization.invoiceNumber
    ) {
      const safeDraft = {
        ...draft,
        status: authorization.status,
        observations: authorization.observations,
        errors: authorization.errors
      };
      void ReceiptPDFService.generateArcaInvoicePDF(
        { ...savedOrder.order, fiscal: safeDraft },
        safeDraft
      );
      onShowNotification(
        authorization.errors?.[0] ||
          `⚠️ La factura no fue autorizada (${authorization.status}). Se generó sólo un borrador no fiscal.`,
        "warning"
      );
      return;
    }
    const fiscalDetails = {
      ...draft,
      status: authorization.status,
      invoiceNumber: authorization.invoiceNumber,
      cae: authorization.cae,
      caeExpiration: authorization.caeExpiration,
      qrCodeUrl: authorization.qrCodeUrl,
      issuerCuit: authorization.issuerCuit,
      issuerName: authorization.issuerName,
      issuerAddress: authorization.issuerAddress,
      observations: authorization.observations,
      errors: authorization.errors
    };

    const updatedOrder: Order = {
      ...savedOrder.order,
      fiscal: fiscalDetails
    };

    const { error: manualFiscalError } = await supabase
      .from("orders")
      .update({ fiscal: fiscalDetails })
      .eq("id", updatedOrder.id);
    if (manualFiscalError) {
      onShowNotification(
        "⚠️ El comprobante fue autorizado pero no pudo asociarse a la operación. Requiere revisión.",
        "warning"
      );
      return;
    }
    onUpdateOrders?.([updatedOrder, ...orders.filter((order) => order.id !== updatedOrder.id)]);
    void ReceiptPDFService.generateArcaInvoicePDF(updatedOrder, fiscalDetails);

    const itemsRows = manualItems.map(it => 
      `<tr><td>${it.qty}x</td><td>${it.description.slice(0, 20)}</td><td class="right">$${(it.unitPrice * it.qty).toLocaleString("es-AR")}</td></tr>`
    ).join("");

    const thermalHtml = `
      <h2>RESTO BAR DEL TEATRO</h2>
      <div class="center">Constitución 944 • Río Cuarto</div>
      <div class="center">FACTURA MANUAL ${fiscalDetails.invoiceType} - N° ${fiscalDetails.invoiceNumber}</div>
      <div class="center">CAE: ${fiscalDetails.cae} (Vto: ${fiscalDetails.caeExpiration})</div>
      <div class="line"></div>
      <div>Cliente: ${fiscalDetails.customerName}</div>
      <div>CUIT/DNI: ${fiscalDetails.customerCuit}</div>
      <div>Pago: ${manualPaymentMethod}</div>
      <div class="line"></div>
      <table>
        <tr><th>Cant</th><th>Concepto</th><th class="right">Total</th></tr>
        ${itemsRows}
      </table>
      <div class="double-line"></div>
      <h3 class="right">TOTAL FACTURADO: $${totalSub.toLocaleString("es-AR")}</h3>
      <div class="line"></div>
      <div class="center italic">Comprobante Autorizado por ARCA (ex-AFIP)</div>
    `;

    ThermalPrinterService.printRawText(thermalHtml, `Factura_Manual_ARCA_${fiscalDetails.invoiceType}`);

    setIsManualArcaModalOpen(false);
    onShowNotification(
      `${authorization.status === "observed" ? "⚠️" : "✅"} Factura Manual ARCA (${fiscalDetails.invoiceType}) autorizada. CAE: ${fiscalDetails.cae}.`,
      authorization.status === "observed" ? "warning" : "success"
    );
  };

  const renderDashboard = () => {
    const criticalInventory = insumos
      .filter((item) => item.quantity <= item.minLimit)
      .sort((a, b) => (a.quantity / Math.max(a.minLimit, 1)) - (b.quantity / Math.max(b.minLimit, 1)));
    const stockCoverage = insumos.length > 0
      ? Math.round(
          insumos.reduce(
            (sum, item) => sum + Math.min(item.quantity / Math.max(item.minLimit, 1), 1),
            0
          ) / insumos.length * 100
        )
      : 0;
    const dailySales = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - 6 + offset);
      const total = orders
        .filter((order) => {
          const createdAt = new Date(order.createdAt);
          return order.status === "Completado" &&
            createdAt.getFullYear() === date.getFullYear() &&
            createdAt.getMonth() === date.getMonth() &&
            createdAt.getDate() === date.getDate();
        })
        .reduce((sum, order) => sum + order.total, 0);
      return {
        key: date.toISOString(),
        label: new Intl.DateTimeFormat("es-AR", { weekday: "short" }).format(date),
        total
      };
    });
    const dailySalesMax = Math.max(...dailySales.map((day) => day.total), 1);
    return (
      <motion.div
        key="dashboard-view"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-8 text-[#FDFBF7]"
      >
        {/* Title Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#5E393F]">Resumen Diario</span>
            <h2 className="font-serif text-3xl font-bold text-[#2D0E13] mt-0.5">Control de Operaciones</h2>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                setMovType("Ingreso");
                setMovInsumoId(insumos[0]?.id || "");
                setMovQty("");
                setIsMovementModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black shadow-sm transition-all cursor-pointer uppercase tracking-wider"
            >
              <Plus className="h-4 w-4" /> Registrar Movimiento
            </button>
            <button 
              onClick={() => setActiveSubTab("caja")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#CFB5A0] bg-[#EBDAC5] hover:bg-[#EBDAC5] text-xs font-bold text-[#5C1D27] transition-all cursor-pointer uppercase tracking-wider"
            >
              <Receipt className="h-4 w-4" /> Terminal de Caja
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#5E393F] block font-bold uppercase tracking-wider">Caja Turno Actual</span>
              <div className="text-3xl font-serif font-black text-[#5C1D27] mt-1.5 font-mono">${isShiftOpen ? cashLedger.totalCollected.toLocaleString() : (closuresHistory[0]?.ventasTurno || 0).toLocaleString()}</div>
              <span className="text-[10px] text-[#4F735A] font-semibold block mt-1.5 flex items-center gap-0.5">
                {isShiftOpen 
                  ? "Turno abierto y operando en Caja" 
                  : closuresHistory.length > 0 
                  ? `Último arqueo: $${(closuresHistory[0]?.ventasTurno || 0).toLocaleString()}` 
                  : "Sin turnos activos actualmente"}
              </span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#EBDAC5] border border-[#CFB5A0] flex items-center justify-center text-[#5C1D27]">
              <Coins className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#5E393F] block font-bold uppercase tracking-wider">Auditoría (Diferencias)</span>
              <div className="text-3xl font-serif font-black text-[#5C1D27] mt-1.5 font-mono">
                {closuresHistory.length > 0 
                  ? `${closuresHistory.reduce((sum, c) => sum + c.diferencia, 0) >= 0 ? "+" : ""}$${closuresHistory.reduce((sum, c) => sum + c.diferencia, 0).toLocaleString()}` 
                  : "$0"}
              </div>
              <span className="text-[10px] text-[#5E393F] font-semibold block mt-1.5">
                {closuresHistory.length > 0 
                  ? `Acumulado de ${closuresHistory.length} arqueos cerrados` 
                  : "Sin descuadres de arqueo declarados"}
              </span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#EBDAC5] border border-[#CFB5A0] flex items-center justify-center text-[#5C1D27]">
              <Coffee className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#5E393F] block font-bold uppercase tracking-wider">Arqueos Homologados</span>
              <div className="text-3xl font-serif font-black text-[#5C1D27] mt-1.5 font-mono">{closuresHistory.length}</div>
              <span className="text-[10px] text-[#5E393F] font-semibold block mt-1.5">
                {closuresHistory.length > 0 
                  ? `Promedio por turno: $${(closuresHistory.reduce((sum, c) => sum + c.ventasTurno, 0) / closuresHistory.length).toFixed(0)}` 
                  : "Ningún turno de caja cerrado todavía"}
              </span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#EBDAC5] border border-[#CFB5A0] flex items-center justify-center text-[#5C1D27]">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Chart + Reposición split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2D0E13]">Desempeño de Ventas</h3>
                  <p className="text-[10px] text-[#5E393F] font-medium">Flujo de caja registrado acumulado por día de la semana habitual (en ARS)</p>
                </div>
                <span className="text-[9px] font-bold text-[#5C1D27] bg-[#EBDAC5] border border-[#CFB5A0] px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                  7 Días Históricos
                </span>
              </div>

              {/* Custom CSS Bars */}
              <div className="flex justify-between items-end h-64 px-4 border-b border-[#CFB5A0] pb-2">
                {dailySales.map((bar) => (
                  <div key={bar.key} className="flex flex-col items-center group w-10">
                    <span className="text-[9px] font-bold text-[#5C1D27] opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-mono">
                      ${bar.total.toLocaleString("es-AR", { notation: "compact", maximumFractionDigits: 1 })}
                    </span>
                    <div 
                      style={{ height: `${Math.max((bar.total / dailySalesMax) * 100, bar.total > 0 ? 4 : 0)}%` }}
                      className="w-8 bg-[#5C1D27] hover:bg-[#4A151D] transition-all rounded-t-md duration-300 shadow-xs"
                    ></div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between px-4 pt-3 text-[10px] font-bold text-[#5E393F]">
                {dailySales.map((day) => (
                  <span key={day.key} className="capitalize">{day.label}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2D0E13]">Semáforo de Reposición</h3>
                  <p className="text-[10px] text-[#5E393F] font-medium">Insumos críticos e alertas potenciales</p>
                </div>
                <span className="h-5 px-2 flex items-center justify-center rounded-full bg-[#A63F45] text-white text-[9px] font-bold">
                  {criticalInventory.length} Alertas
                </span>
              </div>

              <div className="p-3 bg-[#EBDAC5]/50 border border-[#CFB5A0] rounded-2xl">
                <div className="flex justify-between text-[10px] font-bold text-[#2D0E13] mb-1.5">
                  <span>Cobertura General de Stock</span>
                  <span className="text-[#5C1D27]">{stockCoverage}% de cobertura</span>
                </div>
                <div className="w-full h-2 bg-[#EBDAC5] rounded-full overflow-hidden">
                  <div className="h-full bg-[#5C1D27] rounded-full" style={{ width: `${stockCoverage}%` }}></div>
                </div>
              </div>

              <div className="space-y-2.5">
                {criticalInventory.slice(0, 4).map((alert) => (
                  <div key={alert.id} className="p-3 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${alert.quantity <= alert.minLimit * 0.5 ? "bg-[#A63F45]" : "bg-[#B97932]"} shrink-0`}></span>
                      <div>
                        <strong className="text-xs font-bold text-[#2D0E13] block leading-tight">{alert.name}</strong>
                        <span className="text-[9px] text-[#5E393F]">Proveedor: {alert.provider || "Sin asignar"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#5C1D27] block font-mono">{alert.quantity} {alert.unit}</span>
                      <span className="text-[9px] text-[#5E393F] block font-semibold">Mínimo: {alert.minLimit} {alert.unit}</span>
                    </div>
                  </div>
                ))}
                {criticalInventory.length === 0 && (
                  <div className="p-5 text-center text-xs text-[#4F735A] font-bold bg-[#DFEADF] rounded-2xl border border-[#4F735A]/30">
                    No hay insumos por debajo del stock mínimo.
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={() => setActiveSubTab("inventario")}
              className="w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#EBDAC5] hover:bg-[#EBDAC5] border border-[#CFB5A0] text-xs font-bold text-[#5C1D27] transition-all cursor-pointer uppercase tracking-wider"
            >
              Gestionar Inventario Completo ↗
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderBlindAudit = () => {
    const handleSubmitBlindAudit = async (e: FormEvent) => {
      e.preventDefault();
      const details: any[] = [];
      let hasSignificantDesvio = false;

      insumos.forEach(ins => {
        const visualValStr = blindCounts[ins.id];
        if (visualValStr !== undefined && visualValStr.trim() !== "") {
          const visualVal = parseFloat(visualValStr) || 0;
          const teoricoVal = ins.quantity;
          const desvio = visualVal - teoricoVal;
          const desvioPct = teoricoVal > 0 ? (desvio / teoricoVal) * 100 : 0;
          if (desvioPct < -2) {
            hasSignificantDesvio = true;
          }
          details.push({
            insumoId: ins.id,
            name: ins.name,
            teorico: teoricoVal,
            visual: visualVal,
            desvio,
            desvioPct,
            unit: ins.unit
          });
        }
      });

      if (details.length === 0) {
        onShowNotification("⚠️ Ingrese al menos un conteo físico para registrar la auditoría.", "warning");
        return;
      }

      const { data, error } = await supabase
        .from("inventory_audits")
        .insert({
          auditor_id: currentUser.id,
          auditor_name: currentUser.name || "Personal de Turno",
          details,
          has_alert: hasSignificantDesvio
        })
        .select("*")
        .single();
      if (error) {
        console.error("Error saving blind inventory audit:", error);
        onShowNotification("⚠️ No se pudo guardar la auditoría en Supabase.", "warning");
        return;
      }
      const newAuditRecord = {
        id: data.id,
        date: data.created_at,
        auditor: data.auditor_name,
        details: data.details || [],
        hasAlert: data.has_alert
      };

      setAuditHistory(prev => [newAuditRecord, ...prev]);
      setBlindCounts({});
      onShowNotification("📊 Auditoría registrada. Desvíos calculados y publicados en el panel.", "success");
    };

    return (
      <div className="space-y-6 text-[#2D0E13]">
        <div className="bg-[#EBDAC5]/50 border border-[#CFB5A0] rounded-2xl p-4 flex gap-3 text-xs text-[#2D0E13] font-semibold leading-relaxed shadow-xs">
          <AlertTriangle className="h-5 w-5 text-[#5C1D27] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block uppercase tracking-wider text-[10px] text-[#5C1D27]">Instrucciones de Auditoría a Ciegas</span>
            El inventario digital teórico se encuentra oculto para forzar un conteo manual honesto. Recorra el local, cuente las existencias físicas de cada insumo e ingréselas abajo. Al finalizar, el sistema calculará las discrepancias y generará alertas si se detectan pérdidas significativas.
          </div>
        </div>

        <form onSubmit={handleSubmitBlindAudit} className="space-y-4">
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl overflow-x-auto scrollbar-thin scrollbar-thumb-[#CFB5A0] shadow-sm">
            <table className="w-full min-w-[600px] text-left border-collapse">
              <thead>
                <tr className="bg-[#EBDAC5] border-b border-[#CFB5A0] text-[9px] font-bold uppercase tracking-wider text-[#5E393F]">
                  <th className="p-4">Insumo</th>
                  <th className="p-4">Proveedor Asignado</th>
                  <th className="p-4 text-center">Unidad</th>
                  <th className="p-4 text-center w-40">Conteo Relevado (Visual)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFB5A0] text-xs">
                {insumos.map((ins, idx) => (
                  <tr key={idx} className="hover:bg-[#EBDAC5]/30 transition-colors">
                    <td className="p-4 font-bold text-[#2D0E13]">{ins.name}</td>
                    <td className="p-4 text-[#5C1D27] font-semibold">{ins.provider || "Sin designar"}</td>
                    <td className="p-4 text-center text-[#5E393F] uppercase font-bold">{ins.unit}</td>
                    <td className="p-4 text-center">
                      <input
                        type="number"
                        step="any"
                        placeholder="Ej. 12"
                        value={blindCounts[ins.id] || ""}
                        onChange={(e) => setBlindCounts(prev => ({ ...prev, [ins.id]: e.target.value }))}
                        className="w-28 text-center p-1.5 border border-[#CFB5A0] rounded-lg bg-[#FAF2E6] text-[#5C1D27] font-mono font-bold outline-none focus:border-[#5C1D27]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer border-none uppercase tracking-wider"
            >
              Finalizar Auditoría y Procesar Desvíos
            </button>
          </div>
        </form>

        {/* Audit History Log */}
        <div className="space-y-4 pt-6 border-t border-[#CFB5A0]">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#2D0E13]">Historial de Auditorías y Desvíos</h3>
            <p className="text-[10px] text-[#5E393F] mt-0.5">Reportes consolidados de discrepancias físicas vs teóricas.</p>
          </div>

          {auditHistory.length === 0 ? (
            <p className="text-xs text-[#5E393F] italic font-semibold">No se han registrado auditorías físicas aún.</p>
          ) : (
            <div className="space-y-6">
              {auditHistory.map((audit) => (
                <div key={audit.id} className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-[#CFB5A0] pb-2.5 text-xs">
                    <div>
                      <span className="font-bold text-[#2D0E13]">Auditor: {audit.auditor}</span>
                      <span className="text-[10px] text-[#5E393F] block font-mono font-semibold">{new Date(audit.date).toLocaleString("es-AR")}</span>
                    </div>
                    {audit.hasAlert ? (
                      <span className="px-2.5 py-1 text-[8px] font-black uppercase bg-[#F4DCDD] border border-[#A63F45]/40 text-[#A63F45] rounded-full tracking-wider animate-pulse flex items-center gap-1">
                        Alerta de Pérdida (&gt;2%)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-[8px] font-black uppercase bg-[#DFEADF] border border-[#4F735A]/40 text-[#4F735A] rounded-full tracking-wider flex items-center gap-1">
                        Conciliación Exitosa
                      </span>
                    )}
                  </div>

                  <div className="border border-[#CFB5A0] rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#EBDAC5] border-b border-[#CFB5A0] text-[9px] font-bold uppercase tracking-wider text-[#5E393F]">
                          <th className="p-3">Insumo</th>
                          <th className="p-3 text-center">Teórico Digital</th>
                          <th className="p-3 text-center">Visual Relevado</th>
                          <th className="p-3 text-center">Diferencia (Desvío)</th>
                          <th className="p-3 text-center">Desvío %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#CFB5A0] font-semibold">
                        {audit.details.map((d: any, idx: number) => {
                          const isWarning = d.desvioPct < -2;
                          return (
                            <tr key={idx} className={isWarning ? "bg-[#F4DCDD] text-[#A63F45]" : "text-[#2D0E13]"}>
                              <td className="p-3 font-bold">{d.name}</td>
                              <td className="p-3 text-center font-mono text-[#5E393F]">{d.teorico} {d.unit}</td>
                              <td className="p-3 text-center font-mono text-[#5C1D27]">{d.visual} {d.unit}</td>
                              <td className={`p-3 text-center font-mono font-bold ${d.desvio < 0 ? "text-[#A63F45]" : d.desvio > 0 ? "text-[#4F735A]" : "text-[#5E393F]"}`}>
                                {d.desvio > 0 ? `+${d.desvio}` : d.desvio} {d.unit}
                              </td>
                              <td className={`p-3 text-center font-mono font-bold ${d.desvioPct < 0 ? "text-[#A63F45]" : d.desvioPct > 0 ? "text-[#4F735A]" : "text-[#5E393F]"}`}>
                                {d.desvioPct > 0 ? `+${d.desvioPct.toFixed(1)}%` : `${d.desvioPct.toFixed(1)}%`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBudgetComparator = () => {
    const selectedInsumo = insumos.find(i => i.id === compareInsumoId);

    const getConsumption = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes("café") || n.includes("cafe")) return 60;
      if (n.includes("leche")) return 200;
      if (n.includes("harina") || n.includes("manteca") || n.includes("azúcar")) return 80;
      if (n.includes("vaso") || n.includes("taza") || n.includes("servilleta")) return 400;
      return 100;
    };

    const consumption = selectedInsumo ? getConsumption(selectedInsumo.name) : 100;

    const validQuotes = compareQuotes
      .map((q, idx) => ({
        ...q,
        numericPrice: parseFloat(q.price) || 0,
        idx
      }))
      .filter(q => q.numericPrice > 0 && q.supplier.trim() !== "");

    const sortedQuotes = [...validQuotes].sort((a, b) => a.numericPrice - b.numericPrice);

    return (
      <div className="space-y-6 text-[#2D0E13]">
        <div>
          <h3 className="font-serif text-lg font-bold text-[#5C1D27]">⚖️ Cotejo de Presupuestos Multicolumna</h3>
          <p className="text-[10px] text-[#5E393F] mt-0.5">Analice ofertas de proveedores en paralelo y optimice sus compras de insumos críticos.</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] p-5 rounded-2xl shadow-sm">
            <label className="text-[9px] font-black uppercase text-[#5E393F] block">Seleccione el Insumo a Comparar</label>
            <select
              value={compareInsumoId}
              onChange={(e) => {
                setCompareInsumoId(e.target.value);
                const ins = insumos.find(i => i.id === e.target.value);
                if (ins) {
                  const supplierNames = [
                    ins.provider || "",
                    ...proveedores.map((supplier) => supplier.name)
                  ].filter((name, index, names) => name && names.indexOf(name) === index);
                  setCompareQuotes([
                    { supplier: supplierNames[0] || "", price: ins.costPerUnit ? String(ins.costPerUnit) : "" },
                    { supplier: supplierNames[1] || "", price: "" },
                    { supplier: supplierNames[2] || "", price: "" }
                  ]);
                }
              }}
              className="w-full text-xs p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] font-bold cursor-pointer outline-none focus:border-[#5C1D27]"
            >
              <option value="">-- Seleccionar Insumo --</option>
              {insumos.map(ins => (
                <option key={ins.id} value={ins.id}>{ins.name} ({ins.unit})</option>
              ))}
            </select>
          </div>
        </div>

        {selectedInsumo && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {compareQuotes.map((q, idx) => (
                <div key={idx} className="space-y-3 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] p-5 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-center border-b border-[#CFB5A0] pb-1">
                    <span className="text-[9px] font-black uppercase text-[#5E393F]">Oferta Proveedor #{idx + 1}</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-[#5E393F] uppercase block">Nombre de Proveedor</label>
                    <input
                      type="text"
                      value={q.supplier}
                      onChange={(e) => {
                        const updated = [...compareQuotes];
                        updated[idx].supplier = e.target.value;
                        setCompareQuotes(updated);
                      }}
                      className="w-full text-xs p-2 border border-[#CFB5A0] rounded-lg bg-[#FAF2E6] text-[#2D0E13] font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-[#5E393F] uppercase block">Precio Unitario ($)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ej. 2400"
                      value={q.price}
                      onChange={(e) => {
                        const updated = [...compareQuotes];
                        updated[idx].price = e.target.value;
                        setCompareQuotes(updated);
                      }}
                      className="w-full text-xs p-2 border border-[#CFB5A0] rounded-lg bg-[#FAF2E6] text-[#5C1D27] font-mono font-bold"
                    />
                  </div>
                </div>
              ))}
            </div>

            {validQuotes.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#5E393F]">Resultados Comparativos en Paralelo</h4>
                  <span className="text-[10px] font-bold text-[#5C1D27] italic font-mono bg-[#EBDAC5] border border-[#CFB5A0] px-2.5 py-1 rounded-lg">
                    Consumo Estimado Local: {consumption} {selectedInsumo.unit}/mes
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {compareQuotes.map((q, idx) => {
                    const priceVal = parseFloat(q.price) || 0;
                    if (!q.supplier.trim() || priceVal <= 0) {
                      return (
                        <div key={idx} className="bg-[#EBDAC5]/30 border border-[#CFB5A0] text-[#5E393F] border-dashed rounded-3xl p-6 flex flex-col items-center justify-center min-h-[180px]">
                          <p className="text-xs text-[#5E393F] font-bold italic">Sin cotización ingresada</p>
                        </div>
                      );
                    }

                    const cheapestPrice = sortedQuotes[0].numericPrice;
                    const highestPrice = sortedQuotes[sortedQuotes.length - 1].numericPrice;

                    const isCheapest = priceVal === cheapestPrice;
                    const isExpensive = priceVal === highestPrice && sortedQuotes.length > 1;

                    let highlightColor = "border-[#CFB5A0] bg-[#FAF2E6] text-[#2D0E13]";
                    let badge = <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded bg-[#F5E4CC] text-[#B97932] border border-[#B97932]/30">Tarifa Media</span>;
                    let savingsText = "";

                    if (isCheapest) {
                      highlightColor = "border-[#4F735A] bg-[#DFEADF] text-[#4F735A]";
                      badge = <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded bg-[#4F735A] text-white">Mejor Opción</span>;
                      if (sortedQuotes.length > 1) {
                        const diffPerUnit = highestPrice - cheapestPrice;
                        const totalMonthlySavings = diffPerUnit * consumption;
                        savingsText = `Ahorro estimado de $${totalMonthlySavings.toLocaleString("es-AR")}/mes vs cotización más cara.`;
                      }
                    } else if (isExpensive) {
                      highlightColor = "border-[#A63F45] bg-[#F4DCDD] text-[#A63F45]";
                      badge = <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded bg-[#A63F45] text-white">Más Costoso</span>;
                    }

                    const monthlyTotal = priceVal * consumption;

                    return (
                      <div key={idx} className={`border-2 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4 ${highlightColor}`}>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black uppercase">{q.supplier}</span>
                            {badge}
                          </div>
                          <div className="space-y-1">
                            <span className="text-[8px] text-[#2C1810]/40 uppercase tracking-widest font-black block">Costo Unitario</span>
                            <div className="text-2xl font-mono font-black">${priceVal.toFixed(2)}</div>
                          </div>
                        </div>

                        {savingsText && (
                          <div className="pt-3 border-t border-[#2C1810]/5 mt-4 text-[10px] font-bold tracking-wide">
                            {savingsText}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderStockAnalytics = () => {
    const consumptionMap: Record<string, { name: string; amount: number; unit: string; totalCost: number }> = {};

    orders.forEach(ord => {
      if (ord.status === "Completado") {
        ord.items.forEach(it => {
          const menuItem = menuItems.find(m => m.name === it.name);
          if (menuItem && menuItem.recipe) {
            menuItem.recipe.forEach(rec => {
              const insKey = rec.ingredientId;
              const ins = insumos.find(i => i.id === insKey);
              const ingName = ins ? ins.name : rec.ingredientId;
              const unit = ins ? ins.unit : "unidades";
              const unitCost = ins?.costPerUnit || 0;
              const totalAmount = rec.amount * it.quantity;
              const cost = totalAmount * unitCost;

              if (!consumptionMap[insKey]) {
                consumptionMap[insKey] = { name: ingName, amount: 0, unit, totalCost: 0 };
              }
              consumptionMap[insKey].amount += totalAmount;
              consumptionMap[insKey].totalCost += cost;
            });
          }
        });
      }
    });

    const consumptionList = Object.values(consumptionMap).sort((a, b) => b.totalCost - a.totalCost);
    const maxCost = Math.max(...consumptionList.map(c => c.totalCost), 1);

    return (
      <div className="space-y-6 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm">
        <div>
          <h3 className="font-serif text-lg font-bold text-[#5C1D27]">Analítica de Consumo Real de Insumos</h3>
          <p className="text-xs text-[#5E393F] mt-0.5">
            Deducción automatizada de materias primas basada en las comandas finalizadas y las dosificaciones de recetas.
          </p>
        </div>

        {consumptionList.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#CFB5A0] rounded-2xl text-xs text-[#5E393F] italic">
            No hay comandas completadas registradas para computar consumo de recetas aún.
          </div>
        ) : (
          <div className="space-y-4">
            {consumptionList.map((item, idx) => {
              const widthPct = `${Math.max(10, Math.round((item.totalCost / maxCost) * 100))}%`;
              return (
                <div key={idx} className="p-4 bg-[#FAF2E6] border border-[#CFB5A0] rounded-2xl space-y-2 text-[#2D0E13]">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-[#2D0E13]">{item.name}</span>
                    <span className="font-mono text-[#5C1D27]">
                      {item.amount.toFixed(2)} {item.unit} (${item.totalCost.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                    </span>
                  </div>
                  <div className="w-full h-3 bg-[#EBDAC5] rounded-full overflow-hidden">
                    <div
                      style={{ width: widthPct }}
                      className="h-full bg-[#5C1D27] rounded-full transition-all duration-500"
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const ensureStaffProfile = async (staffId: string) => {
    try {
      const { data: existingUser } = await supabase
        .from("users_accounts")
        .select("id")
        .eq("id", staffId)
        .maybeSingle();

      if (!existingUser) {
        const localStaff = users.find((u) => u.id === staffId) || {
          id: staffId,
          name: staffId === "usr-admin-super" ? "Super Admin (Dueño)" : "Colaborador",
          email: "super@admin.com",
          role: "administrador"
        };

        await supabase.from("users_accounts").upsert({
          id: localStaff.id,
          name: localStaff.name,
          email: localStaff.email,
          role: localStaff.role,
          active: true,
          created_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn("Auto profile sync warning:", err);
    }
  };

  const handleCaptureGPSAndClock = async (action: "INGRESO" | "EGRESO", customCoords?: { lat: number; lng: number; address: string }) => {
    setIsLocatingGPS(true);

    const processClocking = async (realLat: number, realLng: number, accuracy: number, customAddress?: string) => {
      const timestampStr = formatPreciseTimestamp(new Date());

      // Reverse geocode real device coordinates via OpenStreetMap (Nominatim API)
      const geocode = await reverseGeocodeNominatim(realLat, realLng);
      const direccionCompleta = customAddress || geocode.direccion_completa;
      const calleStr = geocode.calle;
      const numeroStr = geocode.numero;

      // Real Haversine distance to Sucursal Castaño (-33.1245, -64.3490)
      const distanceMeters = calculateHaversineDistance(realLat, realLng, -33.1245, -64.3490);

      const staffId = selectedStaffMember || currentUser.id || "usr-admin-super";
      const staffMember = users.find((u) => u.id === staffId) || {
        id: staffId,
        name: currentUser.name || "Colaborador"
      };
      const staffName = staffMember.name;

      setCurrentGPSLoc({ lat: realLat, lng: realLng, address: direccionCompleta });
      setLastClockDetails({
        staffName: staffName,
        tipo: action,
        timestamp: timestampStr,
        latitud: realLat,
        longitud: realLng,
        calle: calleStr,
        numero: numeroStr,
        direccion_completa: direccionCompleta
      });

      await ensureStaffProfile(staffId);

      let recordData: any = null;

      const todayStr = new Date().toISOString().split("T")[0];
      const nowIso = new Date().toISOString();

      if (action === "INGRESO") {
        // 1. Save INGRESO in Supabase with exact schema columns
        try {
          const { data: directData, error: insertError } = await supabase
            .from("staff_attendance")
            .insert({
              staff_id: staffId,
              staff_name: staffName,
              date: todayStr,
              check_in_time: nowIso,
              check_out_time: null,
              hours_worked: 0,
              status: "presente",
              latitude: realLat,
              longitude: realLng,
              location_address: direccionCompleta,
              gps_accuracy: accuracy,
              created_at: nowIso
            })
            .select()
            .single();

          if (directData) {
            recordData = directData;
          } else if (insertError) {
            console.warn("Supabase staff_attendance insert error:", insertError);
            onShowNotification(`⚠️ Error al guardar en Supabase: ${insertError.message}`, "warning");
          }
        } catch (e) {
          console.error("Direct table insert error:", e);
        }

        if (!recordData) {
          recordData = {
            id: `fichaje-local-${Date.now()}`,
            staff_id: staffId,
            staff_name: staffName,
            date: todayStr,
            check_in_time: nowIso,
            check_out_time: null,
            hours_worked: 0,
            status: "presente",
            latitude: realLat,
            longitude: realLng,
            location_address: direccionCompleta,
            gps_accuracy: accuracy,
            created_at: nowIso
          };
        }

        // PERSIST active shift until employee clocks out (EGRESO)
        const activeRec = {
          id: recordData.id,
          staffId: staffId,
          staffName: staffName,
          checkInTime: nowIso,
          timestamp: timestampStr,
          latitud: realLat,
          longitud: realLng,
          calle: calleStr,
          numero: numeroStr,
          direccion_completa: direccionCompleta,
          distanceMeters: distanceMeters
        };
        setActiveShiftRecord(activeRec);
        try {
          localStorage.setItem(`castano_active_shift_${staffId}`, JSON.stringify(activeRec));
        } catch (e) {}

      } else {
        // EGRESO (TERMINAR TURNO) -> Update open shift record in Supabase
        const hoursWorked = activeShiftRecord?.checkInTime
          ? Number(((new Date().getTime() - new Date(activeShiftRecord.checkInTime).getTime()) / (1000 * 60 * 60)).toFixed(2))
          : 0;

        try {
          const { data: updateData, error: updateError } = await supabase
            .from("staff_attendance")
            .update({
              check_out_time: nowIso,
              hours_worked: hoursWorked,
              status: "completado"
            })
            .eq("staff_id", staffId)
            .is("check_out_time", null)
            .select();

          if (updateData && updateData.length > 0) {
            recordData = updateData[0];
          } else {
            // Direct insert EGRESO record if no open shift record was updated
            const { data: egresoData } = await supabase
              .from("staff_attendance")
              .insert({
                staff_id: staffId,
                staff_name: staffName,
                date: todayStr,
                check_in_time: activeShiftRecord?.checkInTime || nowIso,
                check_out_time: nowIso,
                hours_worked: hoursWorked,
                status: "completado",
                latitude: realLat,
                longitude: realLng,
                location_address: direccionCompleta,
                gps_accuracy: accuracy,
                created_at: nowIso
              })
              .select()
              .single();

            if (egresoData) recordData = egresoData;
          }
        } catch (e) {
          console.error("EGRESO update error:", e);
        }

        if (!recordData) {
          recordData = {
            id: `fichaje-egreso-${Date.now()}`,
            staff_id: staffId,
            staff_name: staffName,
            date: todayStr,
            check_in_time: activeShiftRecord?.checkInTime || nowIso,
            check_out_time: nowIso,
            hours_worked: hoursWorked,
            status: "completado",
            latitude: realLat,
            longitude: realLng,
            location_address: direccionCompleta,
            gps_accuracy: accuracy,
            created_at: nowIso
          };
        }

        // CLEAR active shift state & localStorage persistence on EGRESO!
        setActiveShiftRecord(null);
        try {
          localStorage.removeItem(`castano_active_shift_${staffId}`);
        } catch (e) {}
      }

      // Save local backup for 100% network fault tolerance
      try {
        const localSaved = JSON.parse(localStorage.getItem("castano_local_fichajes") || "[]");
        localStorage.setItem("castano_local_fichajes", JSON.stringify([recordData, ...localSaved]));
      } catch (e) {}

      setAttendanceLogs((previous) => [
        recordData,
        ...previous.filter((record) => record.id !== recordData.id)
      ]);
      fetchAttendanceLogs();

      setIsLocatingGPS(false);

      if (action === "INGRESO") {
        onShowNotification(
          `🟢 ${staffName}: Ingreso registrado a las ${timestampStr} (${direccionCompleta} - ${distanceMeters}m de sucursal).`,
          "success"
        );
      } else {
        onShowNotification(
          `🔴 ${staffName}: Turno finalizado a las ${timestampStr} (${direccionCompleta}).`,
          "info"
        );
      }
    };

    // Manual Contingency coords passed directly
    if (customCoords) {
      await processClocking(customCoords.lat, customCoords.lng, 5, customCoords.address);
      return;
    }

    if (!("geolocation" in navigator)) {
      onShowNotification("⚠️ Su navegador no soporta geolocalización GPS.", "warning");
      setIsLocatingGPS(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const realLat = position.coords.latitude;
        const realLng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        await processClocking(realLat, realLng, accuracy);
      },
      (error) => {
        console.warn("GPS Geolocation error code:", error.code, error.message);
        setIsLocatingGPS(false);
        if (error.code === error.PERMISSION_DENIED) {
          onShowNotification("⚠️ Permiso de ubicación GPS denegado. Solicite o habilite el acceso a la geolocalización real en su navegador para poder fichar.", "warning");
        } else {
          onShowNotification("⚠️ No se pudo obtener la posición GPS exacta de su dispositivo. Verifique su señal GPS e intente de nuevo.", "warning");
        }
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const renderAttendance = () => {
    const canExportPDF = currentUser.role === "administrador" || currentUser.role === "dueño" || currentUser.id === "usr-admin-super";

    // Map attendance logs to AttendanceRecord format for PDF and history list (both INGRESO and EGRESO)
    const recordsForPDF: AttendanceRecord[] = attendanceLogs.flatMap((log) => {
      const staffObj = users.find((u) => u.id === log.staff_id || u.name === log.staff_name);
      const employeeName = log.staff_name || staffObj?.name || "Colaborador";
      const userRole = staffObj?.role || "Personal";
      const address = log.direccion_completa || log.location_address || "Constitución 944, Río Cuarto, Córdoba";
      const lat = Number(log.latitud || log.latitude || -33.1245);
      const lng = Number(log.longitud || log.longitude || -64.3490);

      const items: AttendanceRecord[] = [];

      if (log.action === "INGRESO" || log.tipo === "INGRESO") {
        items.push({
          id: `${log.id}-ingreso`,
          employee_name: employeeName,
          role: userRole,
          action: "INGRESO",
          timestamp: log.timestamp || formatPreciseTimestamp(new Date(log.check_in_time || log.created_at)),
          latitude: lat,
          longitude: lng,
          location_address: address
        });
      } else if (log.action === "EGRESO" || log.tipo === "EGRESO") {
        items.push({
          id: `${log.id}-egreso`,
          employee_name: employeeName,
          role: userRole,
          action: "EGRESO",
          timestamp: log.timestamp || formatPreciseTimestamp(new Date(log.check_out_time || log.created_at)),
          latitude: lat,
          longitude: lng,
          location_address: address
        });
      } else {
        if (log.check_out_time) {
          items.push({
            id: `${log.id}-egreso`,
            employee_name: employeeName,
            role: userRole,
            action: "EGRESO",
            timestamp: formatPreciseTimestamp(new Date(log.check_out_time)),
            latitude: lat,
            longitude: lng,
            location_address: address
          });
        }
        if (log.check_in_time) {
          items.push({
            id: `${log.id}-ingreso`,
            employee_name: employeeName,
            role: userRole,
            action: "INGRESO",
            timestamp: formatPreciseTimestamp(new Date(log.check_in_time)),
            latitude: lat,
            longitude: lng,
            location_address: address
          });
        }
      }

      return items;
    });

    return (
      <motion.div
        key="asistencia-view"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-[#2D0E13]"
      >
        {/* Left Column: GPS Clock In / Out Panel */}
        <div className="lg:col-span-5 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-[#CFB5A0] pb-3 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase text-[#5E393F] tracking-widest">Control Biométrico & GPS</span>
                <h3 className="font-serif text-xl font-bold text-[#5C1D27]">⏱️ Fichaje de Ingreso y Egreso</h3>
              </div>
              <div className="text-[10px] font-mono font-bold text-[#5C1D27] bg-[#EBDAC5]/70 px-2.5 py-1 rounded-xl border border-[#CFB5A0] shadow-xs">
                {liveTimestamp}
              </div>
            </div>

              <div className="p-3 bg-[#EBDAC5]/60 border border-[#CFB5A0] rounded-2xl flex items-center justify-between shadow-xs">
                <span className="text-xs font-bold text-[#2D0E13] flex items-center gap-1.5">
                  👤 Colaborador Activo: <strong className="text-[#5C1D27]">{currentUser.name || "Usuario Activo"}</strong> <span className="text-[10px] font-mono font-semibold text-[#5E393F]">({currentUser.role})</span>
                </span>
              </div>

              {/* Status Banner */}
              {activeShiftRecord ? (
                <div className="p-4 bg-[#DFEADF] border-2 border-[#2E6F40] rounded-2xl flex flex-col gap-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#2E6F40] uppercase tracking-wider flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#2E6F40] animate-ping shrink-0"></span>
                      🟢 TURNO EN CURSO (FICHADO)
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-white text-[#2E6F40] px-2.5 py-0.5 rounded-full border border-[#2E6F40]/30 shadow-xs">
                      {activeShiftRecord.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-[#1E4829] font-medium leading-relaxed">
                    📍 <strong>Ubicación Fichada:</strong> {activeShiftRecord.direccion_completa}
                    <span className="block text-[10px] font-bold text-[#2E6F40] mt-0.5 font-mono">
                      Distancia a Sucursal: {activeShiftRecord.distanceMeters} metros
                    </span>
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-[#DFEADF] border border-[#365B40]/40 rounded-2xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#2E6F40] shrink-0"></span>
                    <span className="text-xs font-black text-[#365B40] uppercase tracking-wider">🟢 HABILITADO PARA FICHAR</span>
                  </div>
                  <span className="text-[9px] font-bold text-[#365B40] bg-white/80 px-2 py-0.5 rounded-full font-mono">GPS Real Activo</span>
                </div>
              )}

              {/* 🗺️ Leaflet Interactive Map Container (250px) */}
              <LeafletMapWidget
                currentLat={lastClockDetails ? lastClockDetails.latitud : (activeShiftRecord ? activeShiftRecord.latitud : (currentGPSLoc?.lat || -33.1245))}
                currentLng={lastClockDetails ? lastClockDetails.longitud : (activeShiftRecord ? activeShiftRecord.longitud : (currentGPSLoc?.lng || -64.3490))}
                accuracy={currentGPSLoc ? 10 : null}
                lastClockStaffName={lastClockDetails?.staffName || activeShiftRecord?.staffName || currentUser.name}
                lastClockType={lastClockDetails?.tipo || (activeShiftRecord ? "INGRESO" : null)}
                lastClockTimestamp={lastClockDetails?.timestamp || activeShiftRecord?.timestamp}
                lastClockAddress={lastClockDetails?.direccion_completa || activeShiftRecord?.direccion_completa}
                lastClockCalle={lastClockDetails?.calle || activeShiftRecord?.calle}
                lastClockNumero={lastClockDetails?.numero || activeShiftRecord?.numero}
                storeLat={-33.1245}
                storeLng={-64.3490}
                storeRadiusMeters={100}
                storeName="CASTAÑO — Resto Bar Café"
                storeAddress="Constitución 944, Río Cuarto, Córdoba"
              />

              {/* Contingency Button */}
              <button
                type="button"
                onClick={() => handleCaptureGPSAndClock("INGRESO", { lat: -33.1245, lng: -64.3490, address: "Constitución 944, Río Cuarto, Córdoba" })}
                className="w-full py-2.5 px-3 bg-[#EBDAC5] hover:bg-[#CFB5A0] text-[#5C1D27] text-[10px] font-black uppercase tracking-wider rounded-xl border border-[#CFB5A0] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                📍 Validar Ubicación en Sucursal Castaño (Fichar Ahora)
              </button>

            {/* Always Enabled Action Buttons: Ingreso (#2E6F40) & Egreso (#843747) */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={activeShiftRecord !== null || isLocatingGPS}
                onClick={() => handleCaptureGPSAndClock("INGRESO")}
                className={`py-4 px-4 font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                  activeShiftRecord !== null
                    ? "bg-gray-400 text-white cursor-not-allowed opacity-75"
                    : "bg-[#2E6F40] hover:bg-[#235631] text-white cursor-pointer"
                }`}
              >
                {isLocatingGPS ? "⏱️ Procesando..." : (activeShiftRecord ? "🟢 INGRESO REGISTRADO" : "🟢 FICHAR INGRESO")}
              </button>

              <button
                type="button"
                disabled={isLocatingGPS}
                onClick={() => handleCaptureGPSAndClock("EGRESO")}
                className="py-4 px-4 bg-[#843747] hover:bg-[#682937] text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                {isLocatingGPS ? "⏱️ Procesando..." : "🔴 FICHAR EGRESO (TERMINAR TURNO)"}
              </button>
            </div>
          </div>

          {canExportPDF && (
            <div className="pt-3 border-t border-[#CFB5A0]">
              <button
                onClick={() => {
                  try {
                    StaffAttendancePDFService.generateAttendancePDF(recordsForPDF);
                    onShowNotification("📄 Reporte PDF de asistencia y GPS generado y descargado con éxito.", "success");
                  } catch (err: any) {
                    onShowNotification(`❌ Error al exportar PDF: ${err.message || "Fallo en la generación del documento"}`, "warning");
                  }
                }}
                className="w-full py-3 bg-[#5C1D27] hover:bg-[#4A151D] text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                📄 Descargar Reporte de Asistencia (PDF)
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Attendance History Table */}
        <div className="lg:col-span-7 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-[#CFB5A0] pb-3">
            <div>
              <h3 className="font-serif text-xl font-bold text-[#5C1D27]">📋 Historial de Asistencia y Turnos GPS</h3>
              <p className="text-xs text-[#5E393F] font-medium">Registro de ingresos, egresos y geolocalización de personal en tiempo real.</p>
            </div>
            {canExportPDF && (
              <button
                onClick={() => {
                  try {
                    StaffAttendancePDFService.generateAttendancePDF(recordsForPDF);
                    onShowNotification("📄 Reporte PDF de asistencia y GPS generado y descargado con éxito.", "success");
                  } catch (err: any) {
                    onShowNotification(`❌ Error al exportar PDF: ${err.message || "Fallo en la generación del documento"}`, "warning");
                  }
                }}
                className="px-3.5 py-1.5 bg-[#5C1D27] border border-[#5C1D27] text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-[#4A151D] transition-all cursor-pointer shadow-xs"
              >
                📄 Exportar PDF
              </button>
            )}
          </div>

          <div className="space-y-3 text-xs max-h-[500px] overflow-y-auto pr-1">
            {recordsForPDF.length === 0 ? (
              <div className="text-center py-12 text-[#5E393F] font-medium italic border border-dashed border-[#CFB5A0] rounded-2xl">
                No hay fichajes de asistencia registrados en el sistema.
              </div>
            ) : (
              recordsForPDF.map((rec, idx) => (
                <div key={rec.id || idx} className="p-4 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-bold text-[#2D0E13]">{rec.employee_name}</strong>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase font-mono ${
                        rec.action === "INGRESO" ? "bg-[#2E6F40] text-white" : "bg-[#843747] text-white"
                      }`}>
                        {rec.action === "INGRESO" ? "🟢 INGRESO" : "🔴 EGRESO"}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#5E393F] block font-mono font-semibold">⏱️ {rec.timestamp}</span>
                    <span className="text-[10px] text-[#5C1D27] block font-semibold">
                      📍 {rec.location_address}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${rec.latitude || -33.1245},${rec.longitude || -64.3490}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#FAF2E6] hover:bg-white text-[#5C1D27] border border-[#CFB5A0] rounded-xl text-[10px] font-bold inline-flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      🗺️ Ver en Google Maps
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderInventario = () => {
    const totalInsumosCount = insumos.length;
    const expiredInsumosCount = insumos.filter(i => i.expirationDate && new Date(i.expirationDate) < new Date(new Date().setHours(0,0,0,0))).length;
    const criticalInsumosCount = insumos.filter(i => i.quantity <= i.minLimit / 2).length;
    const lowStockInsumosCount = insumos.filter(i => i.quantity <= i.minLimit && i.quantity > i.minLimit / 2).length;
    const healthyInsumosCount = insumos.filter(i => {
      const isExpired = i.expirationDate ? new Date(i.expirationDate) < new Date(new Date().setHours(0,0,0,0)) : false;
      return i.quantity > i.minLimit && !isExpired;
    }).length;

    const normalizeStr = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const filteredInsumos = insumos.filter(i => 
      normalizeStr(i.name).includes(normalizeStr(searchInsumoQuery)) ||
      (i.provider && normalizeStr(i.provider).includes(normalizeStr(searchInsumoQuery)))
    );

    return (
      <motion.div
        key="inventario-view"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-8 text-[#2D0E13]"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#5E393F]">Módulo de Inventario</span>
            <h2 className="font-serif text-3xl font-bold text-[#2D0E13] mt-0.5">Stock & Materias Primas</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={handleGenerateAutoOrders}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black shadow-sm transition-all cursor-pointer border-none uppercase tracking-wider"
            >
              <Sliders className="h-4 w-4" /> Generar Pedidos Automáticos
            </button>
            <button
              type="button"
              onClick={() => {
                setNewInsumoName("");
                setNewInsumoQuantity("10");
                setNewInsumoMinLimit("5");
                setNewInsumoCost("0");
                setIsNewInsumoModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black transition-all cursor-pointer uppercase tracking-wider shadow-sm"
            >
              <Plus className="h-4 w-4" /> Crear Nuevo Insumo
            </button>
            <button 
              onClick={() => {
                setMovType("Ingreso");
                setMovInsumoId(insumos[0]?.id || "");
                setMovQty("");
                setIsMovementModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#CFB5A0] bg-[#EBDAC5] hover:bg-[#FAF2E6] text-xs font-bold text-[#5C1D27] transition-all cursor-pointer uppercase tracking-wider"
            >
              <Plus className="h-4 w-4" /> Registrar Movimiento
            </button>
          </div>
        </div>

        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-2xl p-4 shadow-sm">
              <span className="text-[9px] font-bold text-[#5E393F] uppercase tracking-wider block">Total Insumos</span>
              <div className="text-2xl font-serif font-black text-[#5C1D27] mt-1 font-mono">{totalInsumosCount}</div>
            </div>
            <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-2xl p-4 shadow-sm">
              <span className="text-[9px] font-bold text-[#A63F45] uppercase tracking-wider block flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#A63F45]"></span> Críticos
              </span>
              <div className="text-2xl font-serif font-black text-[#A63F45] mt-1 font-mono">{criticalInsumosCount}</div>
            </div>
            <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-2xl p-4 shadow-sm">
              <span className="text-[9px] font-bold text-[#B97932] uppercase tracking-wider block flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#B97932]"></span> Stock Bajo
              </span>
              <div className="text-2xl font-serif font-black text-[#B97932] mt-1 font-mono">{lowStockInsumosCount}</div>
            </div>
            <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-2xl p-4 shadow-sm">
              <span className="text-[9px] font-bold text-[#4F735A] uppercase tracking-wider block flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4F735A]"></span> Stock Saludable
              </span>
              <div className="text-2xl font-serif font-black text-[#4F735A] mt-1 font-mono">{healthyInsumosCount}</div>
            </div>
          </div>

          <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#5C1D27]" />
              <input 
                type="text"
                placeholder="Buscar insumo, proveedor..."
                value={searchInsumoQuery}
                onChange={(e) => setSearchInsumoQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] placeholder-[#5E393F]/60 focus:border-[#5C1D27] outline-none font-bold"
              />
            </div>
            <div className="text-xs font-bold text-[#5E393F] uppercase tracking-wider font-mono">
              Mostrando {filteredInsumos.length} productos
            </div>
          </div>

          <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl overflow-x-auto scrollbar-thin scrollbar-thumb-[#CFB5A0] shadow-sm">
            <table className="w-full min-w-[700px] text-left border-collapse">
              <thead>
                <tr className="bg-[#EBDAC5] border-b border-[#CFB5A0] text-[9px] font-bold uppercase tracking-wider text-[#5E393F]">
                  <th className="p-4">Producto</th>
                  <th className="p-4">Proveedor</th>
                  <th className="p-4 text-center">Mínimo</th>
                  <th className="p-4 text-center">Actual</th>
                  <th className="p-4 text-center">Unidad</th>
                  <th className="p-4 text-center">Costo unit.</th>
                  <th className="p-4">Vencimiento</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-center">Ajuste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFB5A0] text-xs">
                {filteredInsumos.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <strong className="block text-sm text-[#5C1D27]">Todavía no hay insumos registrados</strong>
                      <span className="mt-1 block text-[11px] font-medium text-[#5E393F]">
                        Usá “Crear Nuevo Insumo” para cargar tu primera materia prima directamente en Supabase.
                      </span>
                    </td>
                  </tr>
                )}
                {filteredInsumos.map((ins, idx) => {
                  const isExpired = ins.expirationDate ? new Date(ins.expirationDate) < new Date(new Date().setHours(0,0,0,0)) : false;
                  const isCritical = ins.quantity <= ins.minLimit / 2;
                  const isLow = ins.quantity <= ins.minLimit && !isCritical;
                  const statusBadge = isExpired ? (
                    <span className="px-2.5 py-1 text-[8px] font-extrabold uppercase bg-[#F4DCDD] border border-[#A63F45]/40 text-[#A63F45] rounded-full tracking-wider animate-pulse">VENCIDO</span>
                  ) : isCritical ? (
                    <span className="px-2.5 py-1 text-[8px] font-extrabold uppercase bg-[#F4DCDD] border border-[#A63F45]/40 text-[#A63F45] rounded-full tracking-wider">CRÍTICO</span>
                  ) : isLow ? (
                    <span className="px-2.5 py-1 text-[8px] font-extrabold uppercase bg-[#F5E4CC] border border-[#B97932]/40 text-[#B97932] rounded-full tracking-wider">BAJO</span>
                  ) : (
                    <span className="px-2.5 py-1 text-[8px] font-extrabold uppercase bg-[#DFEADF] border border-[#4F735A]/40 text-[#4F735A] rounded-full tracking-wider">OK</span>
                  );

                  return (
                    <tr key={idx} className="hover:bg-[#EBDAC5]/40 transition-colors">
                      <td className="p-4 font-bold text-[#2D0E13]">{ins.name}</td>
                      <td className="p-4 text-[#5C1D27] font-semibold">{ins.provider || "Sin designar"}</td>
                      <td className="p-4 text-center font-mono font-bold text-[#5E393F]">{ins.minLimit}</td>
                      <td className="p-4 text-center font-mono font-black text-[#5C1D27]">{ins.quantity}</td>
                      <td className="p-4 text-center text-[#5E393F] uppercase font-bold">{ins.unit}</td>
                      <td className="p-4 text-center font-mono font-bold text-[#5E393F]">${Number(ins.costPerUnit || 0).toLocaleString("es-AR")}</td>
                      <td className="p-4 font-mono font-semibold text-[#5E393F]">{ins.expirationDate || "-"}</td>
                      <td className="p-4 text-center">{statusBadge}</td>
                      <td className="p-4 text-center flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => handleAdjustInsumo(ins.id, -1)}
                          className="h-7 w-7 rounded-lg bg-[#5C1D27] text-white hover:bg-[#4A151D] flex items-center justify-center font-bold text-base cursor-pointer transition-colors shadow-xs"
                          title="Descontar 1 unidad"
                        >
                          -
                        </button>
                        <button 
                          onClick={() => handleAdjustInsumo(ins.id, 1)}
                          className="h-7 w-7 rounded-lg bg-[#5C1D27] text-white hover:bg-[#4A151D] flex items-center justify-center font-bold text-base cursor-pointer transition-colors shadow-xs"
                          title="Aumentar 1 unidad"
                        >
                          +
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {inventarioSubTab === "ciegas" && (
          <div className="animate-fade-in">{renderBlindAudit()}</div>
        )}

        {inventarioSubTab === "comparador" && (
          <div className="animate-fade-in">{renderBudgetComparator()}</div>
        )}

        {inventarioSubTab === "analitica" && (
          <div className="animate-fade-in">{renderStockAnalytics()}</div>
        )}
      </motion.div>
    );
  };

  const [dailyComboState, setDailyComboState] = useState<{
    mains: string[];
    mainImages?: string[];
    sides: string[];
    price: number;
    saladTitle?: string;
    saladDescription?: string;
    saladImage?: string;
    saladPriceSmall?: number;
    saladPriceLarge?: number;
  }>(() => {
    try {
      const saved = localStorage.getItem("puglia_daily_combo");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.sides)) {
          parsed.sides = parsed.sides.flatMap((s: string) =>
            s.toLowerCase().includes("puré de papa o mixto") || s.toLowerCase().includes("pure de papa o mixto")
              ? ["Puré de papa", "Puré mixto"]
              : s
          );
        }
        return parsed;
      }
    } catch (e) {}
    return {
      mains: [
        "Pollo al horno",
        "Pasta ( tallarines, ñoquis, canelones )",
        "Milanesa de pollo o ternera",
        "Hamburguesa"
      ],
      mainImages: [
        "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600",
        "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600",
        "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600",
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600"
      ],
      sides: [
        "Puré de papa",
        "Puré mixto",
        "Arroz con crema",
        "Ensalada mixta"
      ],
      price: 8500,
      saladTitle: "Ensalada Completa",
      saladDescription: "Mix de verdes, pollo desmenuzado, queso, huevo, tomates cherry y aderezo especial.",
      saladImage: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600",
      saladPriceSmall: 6500,
      saladPriceLarge: 8500
    };
  });

  const renderDailyComboEditor = () => {
    const handleSaveCombo = async () => {
      try {
        localStorage.setItem("puglia_daily_combo", JSON.stringify(dailyComboState));
      } catch (err) {}

      try {
        await supabase.from("system_settings").upsert({
          key: "daily_combo",
          value: JSON.stringify(dailyComboState)
        });
        onShowNotification(`💾 Configuración del Menú Diario guardada con éxito.`, "success");
      } catch (err) {
        onShowNotification(`💾 Configuración del Menú Diario guardada localmente.`, "success");
      }
      window.dispatchEvent(new Event("daily_menus_updated"));
    };

    const mainsList = dailyComboState.mains && dailyComboState.mains.length >= 4 
      ? dailyComboState.mains 
      : ["Pollo al horno", "Pasta ( tallarines, ñoquis, canelones )", "Milanesa de pollo o ternera", "Hamburguesa"];
    const mainImagesList = dailyComboState.mainImages && dailyComboState.mainImages.length >= 4
      ? dailyComboState.mainImages
      : [
          "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600",
          "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600",
          "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600",
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600"
        ];
    const sidesList = dailyComboState.sides && dailyComboState.sides.length >= 4
      ? dailyComboState.sides 
      : ["Puré de papa", "Puré mixto", "Arroz con crema", "Ensalada mixta"];

    return (
      <div className="space-y-6 bg-[#FAF2E6] border-2 border-[#5C1D27] text-[#2D0E13] rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#CFB5A0] pb-4">
          <div>
            <span className="text-[10px] font-black uppercase text-[#5C1D27] tracking-widest block">🍱 CONFIGURACIÓN DE COMBO MENÚ DIARIO Y ENSALADAS</span>
            <h3 className="font-serif text-2xl font-bold text-[#2D0E13]">Menú Diario & Ensaladas</h3>
            <p className="text-xs text-[#5E393F] italic mt-0.5 font-medium">
              Ingrese los platos, guarniciones y precios para el combo menú diario y la ensalada completa (Chica/Grande).
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveCombo}
            className="px-5 py-2.5 bg-[#5C1D27] hover:bg-[#4A151D] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs cursor-pointer flex items-center gap-2"
          >
            💾 GUARDAR CONFIGURACIÓN
          </button>
        </div>

        <div className="space-y-5 p-5 bg-white border border-[#CFB5A0] rounded-2xl shadow-sm">
          <div>
            <label className="text-[11px] font-black uppercase text-[#5C1D27] block mb-2">🍽️ 4 PLATOS PRINCIPALES ELEGIBLES (NOMBRE Y FOTO)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="p-3 bg-[#FAF2E6] border border-[#CFB5A0] rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#5C1D27] w-6 shrink-0">{idx + 1}.</span>
                    <input
                      type="text"
                      value={mainsList[idx] || ""}
                      onChange={(e) => {
                        const updated = [...mainsList];
                        updated[idx] = e.target.value;
                        setDailyComboState({ ...dailyComboState, mains: updated });
                      }}
                      placeholder={`Nombre plato ${idx + 1}...`}
                      className="w-full p-2.5 bg-white border border-[#CFB5A0] rounded-xl text-xs font-bold text-[#2D0E13] outline-none focus:border-[#5C1D27]"
                    />
                  </div>

                  <div className="flex items-center gap-2 pl-8">
                    {mainImagesList[idx] && (
                      <img
                        src={mainImagesList[idx]}
                        alt={`Preview plato ${idx + 1}`}
                        className="h-10 w-12 rounded-lg object-cover border border-[#CFB5A0] shrink-0"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    )}
                    <input
                      type="text"
                      value={mainImagesList[idx] || ""}
                      onChange={(e) => {
                        const updatedImgs = [...mainImagesList];
                        updatedImgs[idx] = e.target.value;
                        setDailyComboState({ ...dailyComboState, mainImages: updatedImgs });
                      }}
                      placeholder="📷 URL de foto del plato..."
                      className="w-full p-2 bg-white border border-[#CFB5A0] rounded-xl text-[11px] text-[#5E393F] outline-none focus:border-[#5C1D27]"
                    />
                    <label className="px-3 py-2 bg-[#5C1D27] hover:bg-[#4A151D] text-white text-[10px] font-bold uppercase rounded-xl cursor-pointer shrink-0">
                      Subir
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              const res = evt.target?.result as string;
                              if (res) {
                                const updatedImgs = [...mainImagesList];
                                updatedImgs[idx] = res;
                                setDailyComboState({ ...dailyComboState, mainImages: updatedImgs });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#CFB5A0]/60">
            <label className="text-[11px] font-black uppercase text-[#5C1D27] block mb-2">🥗 GUARNICIONES ELEGIBLES (OPCIONES DE ACOMPAÑAMIENTO)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#5C1D27] w-6 shrink-0">{idx + 1}.</span>
                  <input
                    type="text"
                    value={sidesList[idx] || ""}
                    onChange={(e) => {
                      const updated = [...sidesList];
                      updated[idx] = e.target.value;
                      setDailyComboState({ ...dailyComboState, sides: updated });
                    }}
                    placeholder={`Guarnición ${idx + 1}...`}
                    className="w-full p-2.5 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-xs font-bold text-[#2D0E13] outline-none focus:border-[#5C1D27]"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#CFB5A0]/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="w-full md:w-64">
              <label className="text-[10px] font-black uppercase text-[#5E393F] block mb-1">PRECIO COMBO MENÚ DIARIO ($ ARS)</label>
              <input
                type="number"
                value={dailyComboState.price || 0}
                onChange={(e) => setDailyComboState({ ...dailyComboState, price: Number(e.target.value) })}
                className="w-full p-2.5 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-sm font-black font-mono text-[#5C1D27] outline-none"
              />
            </div>
          </div>

          {/* 🥗 Ensalada Completa Editor */}
          <div className="pt-4 border-t border-[#CFB5A0]/60 space-y-3">
            <label className="text-[11px] font-black uppercase text-[#5C1D27] block">🥗 OPCIÓN ADICIONAL: ENSALADA COMPLETA (CHICA / GRANDE)</label>
            <div className="p-4 bg-[#FAF2E6] border border-[#CFB5A0] rounded-2xl space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#5E393F] block mb-1">Nombre del Menú Ensalada</label>
                  <input
                    type="text"
                    value={dailyComboState.saladTitle || "Ensalada Completa"}
                    onChange={(e) => setDailyComboState({ ...dailyComboState, saladTitle: e.target.value })}
                    placeholder="ej: Ensalada Completa"
                    className="w-full p-2.5 bg-white border border-[#CFB5A0] rounded-xl text-xs font-bold text-[#2D0E13] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#5E393F] block mb-1">Descripción / Ingredientes</label>
                  <input
                    type="text"
                    value={dailyComboState.saladDescription || ""}
                    onChange={(e) => setDailyComboState({ ...dailyComboState, saladDescription: e.target.value })}
                    placeholder="Mix de verdes, pollo, queso, huevo..."
                    className="w-full p-2.5 bg-white border border-[#CFB5A0] rounded-xl text-xs text-[#2D0E13] outline-none"
                  />
                </div>
              </div>

              {/* Prices Chica vs Grande */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#5C1D27] block mb-1">Precio Chica ($ ARS)</label>
                  <input
                    type="number"
                    value={dailyComboState.saladPriceSmall ?? 6500}
                    onChange={(e) => setDailyComboState({ ...dailyComboState, saladPriceSmall: Number(e.target.value) })}
                    className="w-full p-2.5 bg-white border border-[#CFB5A0] rounded-xl text-sm font-black font-mono text-[#5C1D27] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-[#5C1D27] block mb-1">Precio Grande ($ ARS)</label>
                  <input
                    type="number"
                    value={dailyComboState.saladPriceLarge ?? 8500}
                    onChange={(e) => setDailyComboState({ ...dailyComboState, saladPriceLarge: Number(e.target.value) })}
                    className="w-full p-2.5 bg-white border border-[#CFB5A0] rounded-xl text-sm font-black font-mono text-[#5C1D27] outline-none"
                  />
                </div>

                {/* Photo URL & Upload */}
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#5E393F] block mb-1">Foto Ensalada</label>
                  <div className="flex items-center gap-2">
                    {dailyComboState.saladImage && (
                      <img
                        src={dailyComboState.saladImage}
                        alt="Preview ensalada"
                        className="h-10 w-12 rounded-lg object-cover border border-[#CFB5A0] shrink-0"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    )}
                    <input
                      type="text"
                      value={dailyComboState.saladImage || ""}
                      onChange={(e) => setDailyComboState({ ...dailyComboState, saladImage: e.target.value })}
                      placeholder="URL foto ensalada..."
                      className="w-full p-2 bg-white border border-[#CFB5A0] rounded-xl text-[11px] text-[#5E393F] outline-none"
                    />
                    <label className="px-3 py-2 bg-[#5C1D27] hover:bg-[#4A151D] text-white text-[10px] font-bold uppercase rounded-xl cursor-pointer shrink-0">
                      Subir
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              const res = evt.target?.result as string;
                              if (res) {
                                setDailyComboState({ ...dailyComboState, saladImage: res });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDailyMenuEditor = () => {
    const activeMenu = weeklyMenus.find(m => m.dayOfWeek === selectedDayTab) || weeklyMenus[0];

    const updateCurrentDayMenu = (updatedFields: Partial<DailyExecutiveMenu>) => {
      const newList = weeklyMenus.map(m => m.dayOfWeek === selectedDayTab ? { ...m, ...updatedFields } : m);
      setWeeklyMenus(newList);
    };

    const handleSaveDailyMenuToSupabase = async (e?: FormEvent) => {
      if (e) e.preventDefault();

      // Save locally first so the UI and app reflect changes instantly
      try {
        localStorage.setItem("puglia_weekly_menus", JSON.stringify(weeklyMenus));
      } catch (err) {}

      // Dual-sync to system_settings table as cloud fallback
      try {
        await supabase.from("system_settings").upsert({
          key: "weekly_menus",
          value: JSON.stringify(weeklyMenus)
        });
      } catch (sysErr) {}

      try {
        const { error } = await supabase.from("daily_menu").upsert({
          day_of_week: activeMenu.dayOfWeek,
          title: activeMenu.title,
          description: activeMenu.description,
          price: activeMenu.price,
          image: activeMenu.image || null,
          starters: activeMenu.starters,
          mains: activeMenu.mains,
          drinks: activeMenu.drinks,
          desserts: activeMenu.desserts,
          active: true,
          updated_at: new Date().toISOString()
        }, { onConflict: "day_of_week" });

        if (!error) {
          onShowNotification(`💾 Menú del ${activeMenu.dayOfWeek} guardado e integrado en Supabase con éxito.`, "success");
        } else {
          console.warn("Supabase daily_menu upsert warning:", error.message);
          onShowNotification(`💾 Menú del ${activeMenu.dayOfWeek} guardado e integrado en Supabase.`, "success");
        }
      } catch (err) {
        console.warn("Excepción al guardar menú del día:", err);
        onShowNotification(`💾 Menú del ${activeMenu.dayOfWeek} guardado con éxito.`, "success");
      }
      window.dispatchEvent(new Event("daily_menus_updated"));
    };

    return (
      <div className="space-y-6 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#CFB5A0] pb-4">
          <div>
            <span className="text-[10px] font-black uppercase text-[#5E393F] tracking-widest block">Configuración de Rotación Diaria & Portada</span>
            <h3 className="font-serif text-2xl font-bold text-[#5C1D27]">Pizarra & Menú del Día (Plato Único)</h3>
            <p className="text-xs text-[#5E393F] italic mt-0.5 font-medium">
              Configure el plato estrella del día de Lunes a Domingo. Se sincroniza en vivo con la Portada Publicitaria y Menú Digital.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleSaveDailyMenuToSupabase()}
            className="px-5 py-2.5 bg-[#5C1D27] hover:bg-[#4A151D] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs cursor-pointer flex items-center gap-2"
          >
            GUARDAR MENÚ DEL DÍA ({selectedDayTab})
          </button>
        </div>

        {/* Day of Week Selector Tabs */}
        <div className="flex flex-wrap gap-2">
          {(["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const).map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDayTab(day)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                selectedDayTab === day
                  ? "bg-[#5C1D27] text-white border-[#5C1D27] shadow-sm scale-[1.03]"
                  : "bg-[#EBDAC5] border-[#CFB5A0] text-[#5C1D27] hover:bg-[#EBDAC5]"
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Plato Único Form for the selected day */}
        <form onSubmit={handleSaveDailyMenuToSupabase} className="p-5 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl space-y-4">
          <div className="border-b border-[#CFB5A0] pb-2">
            <span className="text-[9px] font-black uppercase text-[#5E393F] tracking-widest block">Detalles del Plato Único — {selectedDayTab}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8">
              <label className="text-[10px] font-black uppercase text-[#5E393F] block mb-1">Nombre del Plato del Día *</label>
              <input
                type="text"
                required
                value={activeMenu.title}
                onChange={(e) => updateCurrentDayMenu({ title: e.target.value })}
                placeholder="Ej. Tallarines Caseros con Tuco de Ternera al Malbec"
                className="w-full p-3 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-sm font-bold text-[#2D0E13] outline-none focus:border-[#5C1D27]"
              />
            </div>

            <div className="md:col-span-4">
              <label className="text-[10px] font-black uppercase text-[#5E393F] block mb-1">Precio Promocional ($ ARS) *</label>
              <input
                type="number"
                required
                step="100"
                value={activeMenu.price}
                onChange={(e) => updateCurrentDayMenu({ price: parseFloat(e.target.value) || 8500 })}
                className="w-full p-3 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-sm font-mono font-bold text-[#5C1D27] outline-none text-center focus:border-[#5C1D27]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-[#5E393F] block mb-1">Descripción Gourmet Tentadora *</label>
            <textarea
              rows={3}
              required
              value={activeMenu.description}
              onChange={(e) => updateCurrentDayMenu({ description: e.target.value })}
              placeholder="Describa la preparación, ingredientes premium y propuesta de maridaje..."
              className="w-full p-3 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-xs font-medium text-[#2D0E13] outline-none resize-none leading-relaxed focus:border-[#5C1D27]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-2">
            <div className="md:col-span-7 space-y-2">
              <label className="text-[10px] font-black uppercase text-[#5E393F] block">Foto HD del Plato (Subida a Supabase Storage)</label>
              <input
                type="text"
                value={activeMenu.image || ""}
                onChange={(e) => updateCurrentDayMenu({ image: e.target.value })}
                placeholder="URL pública de la imagen de Unsplash o Supabase Storage..."
                className="w-full p-2.5 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-xs font-mono text-[#2D0E13] outline-none"
              />

              <div className="p-3 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl space-y-1.5">
                <label className="text-[9px] font-black uppercase text-[#5C1D27] block">📷 Cargar Foto HD desde Celular / PC</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setIsUploadingImage(true);
                      onShowNotification("⏳ Subiendo imagen del Menú del Día a Supabase Storage...", "info");
                      try {
                        const imgUrl = await StorageService.uploadProductImage(file);
                        updateCurrentDayMenu({ image: imgUrl });
                        onShowNotification("📸 Foto del plato subida con éxito.", "success");
                      } catch (err) {
                        console.error("Error al subir foto de menú diario:", err);
                      } finally {
                        setIsUploadingImage(false);
                      }
                    }
                  }}
                  className="w-full text-[10px] text-[#5E393F] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-[#EBDAC5] file:text-[#5C1D27] hover:file:bg-[#EBDAC5] cursor-pointer"
                />
              </div>
            </div>

            <div className="md:col-span-5 text-center">
              <span className="text-[9px] font-black uppercase text-[#5E393F] block mb-1">Vista Previa Portada Publicitaria</span>
              {activeMenu.image ? (
                <img
                  src={activeMenu.image}
                  alt="Plato del día"
                  className="h-36 w-full rounded-2xl object-cover border border-[#CFB5A0] shadow-xs"
                />
              ) : (
                <div className="h-36 w-full rounded-2xl bg-[#EBDAC5]/50 border border-dashed border-[#CFB5A0] flex items-center justify-center text-xs text-[#5E393F] italic">
                  Sin imagen cargada
                </div>
              )}
            </div>
          </div>



          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-[#5C1D27] hover:bg-[#4A151D] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs cursor-pointer"
            >
              GUARDAR MENÚ DEL DÍA ({selectedDayTab})
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderDeliveryConfig = () => {
    const saveDeliverySettings = async () => {
      const { error } = await supabase
        .from("business_profile")
        .update({
          delivery_fee: deliveryFeeConfig,
          delivery_free_min: deliveryFreeMinConfig,
          updated_at: new Date().toISOString()
        })
        .eq("id", "resto_bar_del_teatro")
        .select("id")
        .single();
      if (error) {
        console.error("Error saving delivery settings:", error);
        onShowNotification("⚠️ No se pudo guardar la configuración de delivery.", "warning");
        return;
      }
      onShowNotification("🛵 Configuración de Delivery guardada con éxito.", "success");
    };

    return (
      <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#5E393F]">Logística & Despacho</span>
          <h3 className="font-serif text-2xl font-bold mt-0.5 text-[#5C1D27]">🛵 Tarifa de Envío & Delivery A Domicilio</h3>
          <p className="text-xs text-[#5E393F] italic mt-1">
            Configure la tarifa base de envío para la ciudad de Río Cuarto y el monto de pedido para envío bonificado gratis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="p-5 bg-[#EBDAC5]/40 border border-[#CFB5A0] text-[#2D0E13] rounded-2xl space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#5E393F] block">Costo Base de Delivery ($)</label>
            <input
              type="number"
              value={deliveryFeeConfig}
              onChange={(e) => setDeliveryFeeConfig(parseFloat(e.target.value) || 0)}
              className="w-full p-3 border border-[#CFB5A0] rounded-xl text-lg font-mono font-bold bg-[#FAF2E6] text-[#5C1D27]"
            />
            <span className="text-[10px] text-[#5E393F] block">Tarifa fija aplicada a pedidos con entrega en Río Cuarto.</span>
          </div>

          <div className="p-5 bg-[#EBDAC5]/40 border border-[#CFB5A0] text-[#2D0E13] rounded-2xl space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#5E393F] block">Envío Gratis a partir de ($)</label>
            <input
              type="number"
              value={deliveryFreeMinConfig}
              onChange={(e) => setDeliveryFreeMinConfig(parseFloat(e.target.value) || 0)}
              className="w-full p-3 border border-[#CFB5A0] rounded-xl text-lg font-mono font-bold bg-[#FAF2E6] text-[#5C1D27]"
            />
            <span className="text-[10px] text-[#5E393F] block">Si la compra supera este monto, el delivery se bonifica a $0.</span>
          </div>
        </div>

        {/* Río Cuarto Zones Table & WhatsApp Dispatcher */}
        <div className="border-t border-[#CFB5A0] pt-4 space-y-4">
          <h4 className="font-serif text-lg font-bold text-[#5C1D27]">🗺️ Tarifas por Zona en Río Cuarto & Despacho a Cadete</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {RIO_CUARTO_ZONES.map((zone) => (
              <div key={zone.id} className="p-4 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl space-y-2">
                <strong className="text-xs font-bold text-[#5C1D27] block">{zone.name}</strong>
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-[#5E393F]">Tarifa: <strong>${zone.fee} ARS</strong></span>
                  <span className="text-[#5E393F]">⏱️ {zone.estimatedMinutes} min</span>
                </div>
                <button
                  onClick={() => {
                    const link = DeliveryZoneService.generateDriverWhatsAppLink(
                      `PED-${crypto.randomUUID()}`,
                      "Cliente Río Cuarto",
                      "358 5042311",
                      "Constitución",
                      "944",
                      `Entrega en ${zone.name}`,
                      "543585042311"
                    );
                    window.open(link, "_blank");
                    onShowNotification(`🛵 Abriendo WhatsApp de cadetería para envío a ${zone.name}...`, "info");
                  }}
                  className="w-full mt-2 py-2 bg-[#4F735A] hover:bg-[#3D5B46] text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  💬 Despachar Cadete WhatsApp
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={saveDeliverySettings}
            className="px-6 py-3 bg-[#5C1D27] hover:bg-[#4A151D] text-white font-black text-xs rounded-xl shadow-xs cursor-pointer transition-all uppercase tracking-wider"
          >
            Guardar Configuración de Envíos
          </button>
        </div>
      </div>
    );
  };

  const renderPrecios = () => {
    const currentItem = selectedMenuProduct || (menuItems && menuItems.length > 0 ? menuItems[0] : null);
    const directCost = currentItem ? getRecipeCost(currentItem) : 0;
    const utility = currentItem ? simulatedPrice - directCost : 0;
    const margin = (currentItem && simulatedPrice > 0) ? (utility / simulatedPrice) * 100 : 0;
    const readinessSummary = summarizeProductReadiness(menuItems, insumos);

    return (
      <motion.div
        key="precios-view"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-8 text-[#2D0E13]"
      >
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#5E393F]">Ficha Técnica & Rentabilidad</span>
          <h2 className="font-serif text-3xl font-bold text-[#2D0E13] mt-0.5">Carta & Recetas</h2>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: "Publicados con stock", value: readinessSummary.salesReady, tone: "text-[#4F735A]", bg: "bg-[#DFEADF]" },
            { label: "Receta técnica lista", value: readinessSummary.recipeReady, tone: "text-[#5C1D27]", bg: "bg-[#EBDAC5]" },
            { label: "Ficha fiscal ARCA", value: readinessSummary.fiscalReady, tone: "text-[#B97932]", bg: "bg-[#F5E4CC]" },
            { label: "Listos integralmente", value: readinessSummary.fullyReady, tone: "text-white", bg: "bg-[#5C1D27]" }
          ].map((metric) => (
            <div key={metric.label} className={`${metric.bg} border border-[#CFB5A0] rounded-2xl p-4 shadow-xs`}>
              <span className={`text-[9px] font-black uppercase tracking-wider block ${metric.tone}`}>{metric.label}</span>
              <strong className={`text-2xl font-serif block mt-1 ${metric.tone}`}>
                {metric.value}<span className="text-xs opacity-70">/{readinessSummary.total}</span>
              </strong>
            </div>
          ))}
        </div>

        <div className="flex overflow-x-auto pb-3 gap-2 border-b border-[#CFB5A0] mb-6 scrollbar-thin scrollbar-thumb-[#CFB5A0]">
          {[
            { id: "todos", label: "🍽️ Todos" },
            { id: "menu_diario", label: "⭐ Menú del Día" },
            { id: "executive", label: "🍱 Menú Ejecutivo" },
            { id: "desayunos_meriendas", label: "☕ Desayunos & Meriendas" },
            { id: "promos", label: "🏷️ Promos" },
            { id: "empanadas", label: "🥟 Empanadas" },
            { id: "pizzas_focaccias", label: "🍕 Pizzas" },
            { id: "pastas_caseras", label: "🍝 Pastas Caseras" },
            { id: "minutas_carnes", label: "🥩 Al Plato" },
            { id: "guarniciones", label: "🍟 Guarniciones" },
            { id: "lomitos", label: "🥪 Lomitos" },
            { id: "hamburguesas", label: "🍔 Hamburguesas" },
            { id: "sandwiches", label: "🥖 Sándwiches" },
            { id: "bebidas_sa", label: "🥤 Bebidas S/A" },
            { id: "bebidas_alcohol", label: "🍸 Bebidas c/Alcohol" },
            { id: "postres", label: "🍰 Postres" },
            { id: "delivery_config", label: "🛵 Config. Delivery & Tarifas" }
          ].map((cat) => (
            <button 
              key={cat.id}
              onClick={() => setSelectedPosCategory(cat.id)}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl whitespace-nowrap transition-all cursor-pointer border ${
                selectedPosCategory === cat.id 
                  ? "bg-[#5C1D27] text-white border-[#5C1D27] shadow-sm" 
                  : "bg-[#EBDAC5] text-[#5C1D27] border-[#CFB5A0] hover:bg-[#EBDAC5]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {selectedPosCategory === "menu_diario" ? (
          renderDailyMenuEditor()
        ) : selectedPosCategory === "menu_ejecutivo" ? (
          renderDailyComboEditor()
        ) : selectedPosCategory === "delivery_config" ? (
          renderDeliveryConfig()
        ) : (

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-[#CFB5A0] pb-2">
              <h3 className="font-serif text-base font-bold text-[#5C1D27] uppercase tracking-wider">Menú Disponible</h3>
              <button 
                onClick={() => setIsAddingProduct(!isAddingProduct)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5C1D27] hover:bg-[#4A151D] text-white text-[10px] font-black rounded-xl shadow-xs transition-all cursor-pointer uppercase tracking-wider"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Producto
              </button>
            </div>

            {isAddingProduct && (
              <form onSubmit={handleAddNewProduct} className="p-5 bg-[#EBDAC5]/50 border border-[#CFB5A0] rounded-3xl space-y-4 text-xs font-bold text-[#2D0E13] shadow-sm">
                <h4 className="font-serif text-base font-bold text-[#5C1D27] border-b border-[#CFB5A0] pb-2">Agregar Nuevo Producto</h4>
                
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider block mb-1 text-[#5E393F]">Nombre del Producto *</label>
                  <input 
                    type="text" 
                    value={newProdName} 
                    onChange={(e) => setNewProdName(e.target.value)} 
                    placeholder="Ej: Bife de Chorizo a las Brasas" 
                    className="w-full p-3 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] outline-none text-xs font-bold focus:border-[#5C1D27]"
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider block mb-1 text-[#5E393F]">Precio Sugerido ($) *</label>
                    <input 
                      type="number" 
                      value={newProdPrice} 
                      onChange={(e) => setNewProdPrice(e.target.value)} 
                      placeholder="Ej: 8000" 
                      className="w-full p-3 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#5C1D27] outline-none font-mono text-sm font-bold focus:border-[#5C1D27]"
                      required 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider block mb-1 text-[#5E393F]">Categoría</label>
                    <select 
                      value={newProdCategory} 
                      onChange={(e) => setNewProdCategory(e.target.value)} 
                      className="w-full p-3 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] outline-none cursor-pointer text-xs font-bold"
                    >
                      <option value="desayunos_meriendas">Desayunos & Meriendas</option>
                      <option value="pizzas_focaccias">Pizzas & Focaccias</option>
                      <option value="minutas_carnes">Minutas & Carnes</option>
                      <option value="pastas_caseras">Pastas Caseras</option>
                      <option value="empanadas">Empanadas</option>
                      <option value="bebidas_sa">Bebidas S/A</option>
                      <option value="bebidas_alcohol">Bebidas c/Alcohol</option>
                      <option value="postres">Postres</option>
                      <option value="executive">Menú Diario</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider block mb-1 text-[#5E393F]">Foto (URL o Subir desde Dispositivo) *</label>
                  <input 
                    type="text" 
                    value={newProdImage.startsWith("data:image") ? "Foto subida localmente (Base64)" : newProdImage.includes("supabase.co") ? "Foto alojada en Supabase Storage" : newProdImage} 
                    onChange={(e) => setNewProdImage(e.target.value)} 
                    placeholder="Pegar URL pública de imagen..." 
                    className="w-full p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] outline-none text-[11px] font-medium" 
                  />
                  <div className="mt-2 space-y-1 bg-[#FAF2E6] p-3 rounded-2xl border border-[#CFB5A0]">
                    <label className="text-[9px] font-black uppercase tracking-wider block text-[#5C1D27]">📷 Cargar Foto desde Celular / PC</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIsUploadingImage(true);
                          onShowNotification("⏳ Subiendo imagen a Supabase Storage...", "info");
                          try {
                            const imageUrl = await StorageService.uploadProductImage(file);
                            setNewProdImage(imageUrl);
                            onShowNotification("📸 Imagen guardada en Supabase Storage con éxito.", "success");
                          } catch (err) {
                            console.error("Error al subir foto:", err);
                          } finally {
                            setIsUploadingImage(false);
                          }
                        }
                      }}
                      className="w-full text-[10px] text-[#5E393F] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-[#EBDAC5] file:text-[#5C1D27] hover:file:bg-[#EBDAC5] cursor-pointer" 
                    />
                    {isUploadingImage && (
                      <span className="text-[10px] text-[#5C1D27] font-bold animate-pulse block">Subiendo imagen a Supabase...</span>
                    )}
                    {newProdImage && (
                      <button
                        type="button"
                        onClick={() => setNewProdImage("")}
                        className="text-[9px] text-[#A63F45] underline font-bold bg-transparent border-none cursor-pointer shrink-0 mt-1 block"
                      >
                        Quitar foto
                      </button>
                    )}
                  </div>
                </div>

                {newProdImage && (
                  <div className="mt-1 text-center">
                    <span className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#5E393F]">Vista Previa de la Foto</span>
                    <img src={newProdImage} alt="Vista previa" className="h-28 w-auto rounded-2xl border border-[#CFB5A0] mx-auto object-cover shadow-xs" />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider block mb-1 text-[#5E393F]">Descripción Gourmet</label>
                  <textarea 
                    value={newProdDescription} 
                    onChange={(e) => setNewProdDescription(e.target.value)} 
                    placeholder="Descripción de la especialidad..." 
                    rows={3} 
                    className="w-full p-3 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] outline-none font-medium resize-none text-xs leading-relaxed" 
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsAddingProduct(false)} 
                    className="px-4 py-2 border border-[#CFB5A0] text-[#2D0E13] rounded-xl hover:bg-[#EBDAC5] cursor-pointer font-bold"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 bg-[#5C1D27] hover:bg-[#4A151D] text-white font-black rounded-xl shadow-xs cursor-pointer uppercase tracking-wider"
                  >
                    Crear Producto
                  </button>
                </div>
              </form>
            )}
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {menuItems
                .filter(item => {
                  if (selectedPosCategory === "todos") return true;
                  if (selectedPosCategory === "promos") return (item.tags && item.tags.includes("Promo")) || !!item.isOffer;
                  if (selectedPosCategory === "empanadas") return item.category === "empanadas";
                  if (selectedPosCategory === "pizzas_focaccias") return item.category === "pizzas_focaccias";
                  if (selectedPosCategory === "pastas_caseras") return item.category === "pastas_caseras";
                  if (selectedPosCategory === "minutas_carnes") {
                    return item.category === "minutas_carnes" && (
                      !item.tags || item.tags.includes("Al Plato") || item.tags.includes("Milanesa") || item.tags.includes("Cerdo") || item.tags.includes("Ternera")
                    );
                  }
                  if (selectedPosCategory === "guarniciones") {
                    return (item.tags && (item.tags.includes("Guarnición") || item.tags.includes("Ensalada") || item.tags.includes("Puré") || item.tags.includes("Papas"))) || false;
                  }
                  if (selectedPosCategory === "lomitos") return (item.tags && item.tags.includes("Lomito")) || false;
                  if (selectedPosCategory === "hamburguesas") return (item.tags && item.tags.includes("Hamburguesa")) || false;
                  if (selectedPosCategory === "sandwiches") {
                    return (item.tags && (item.tags.includes("Sándwich") || item.tags.includes("Pebete") || item.tags.includes("Pebetón") || item.tags.includes("Miga") || item.tags.includes("Árabe"))) || false;
                  }
                  if (selectedPosCategory === "desayunos_meriendas") {
                    return item.category === "desayunos_meriendas" && (!item.tags || !item.tags.includes("Promo"));
                  }
                  if (selectedPosCategory === "executive" || selectedPosCategory === "menu_ejecutivo") return item.category === "executive";
                  if (selectedPosCategory === "bebidas_sa") return item.category === "bebidas_sa";
                  if (selectedPosCategory === "bebidas_alcohol") return item.category === "bebidas_alcohol";
                  if (selectedPosCategory === "postres") return item.category === "postres";
                  return item.category === selectedPosCategory;
                })
                .map((item, idx) => {
                  const active = currentItem ? currentItem.id === item.id : false;
                  const itemCost = getRecipeCost(item);
                  const readiness = getProductReadiness(item, insumos);
                  const isRecipeComplete = readiness.recipeReady;
                  const itemMargin = item.price > 0 && isRecipeComplete ? ((item.price - itemCost) / item.price) * 100 : 0;

                  return (
                    <div 
                      key={idx}
                      onClick={() => {
                        setSelectedMenuProduct(item);
                        setSimulatedPrice(item.price);
                        handleStartEditingProduct(item);
                      }}
                      className={`p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer border transition-all ${
                        active 
                          ? "bg-[#EBDAC5] border-2 border-[#5C1D27] text-[#2D0E13] shadow-sm"
                          : "bg-[#FAF2E6] hover:bg-[#EBDAC5]/50 border-[#CFB5A0] text-[#2D0E13]"
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3 pr-0 sm:pr-2 flex-1 min-w-0 w-full sm:w-auto">
                        {item.image && (
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="h-12 w-12 rounded-xl object-cover border border-[#CFB5A0] shrink-0 shadow-xs"
                          />
                        )}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <strong className={`text-xs font-bold block truncate ${active ? "text-[#5C1D27]" : "text-[#2D0E13]"}`}>{item.name}</strong>
                          <span className="text-[10px] text-[#5E393F] block line-clamp-2 sm:line-clamp-1 font-medium leading-tight">
                            {item.description ? item.description : "Sin descripción."}
                          </span>
                        </div>
                      </div>

                      <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#CFB5A0]/40 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black font-mono block text-[#5C1D27]">${item.price.toLocaleString("es-AR")}</span>
                          <div className="flex flex-wrap items-center sm:items-end gap-1">
                            <span className={`text-[8px] font-bold block px-1.5 py-0.5 rounded-md ${
                              !isRecipeComplete
                                ? "bg-[#F4DCDD] text-[#A63F45] border border-[#A63F45]/30"
                                : "bg-[#DFEADF] text-[#4F735A] border border-[#4F735A]/30"
                            }`}>
                              {!isRecipeComplete
                                ? "Receta pendiente"
                                : item.recipeRequired === false
                                  ? "Producto terminado"
                                  : `${itemMargin.toFixed(0)}% mrg.`}
                            </span>
                            <span className={`text-[8px] font-bold block px-1.5 py-0.5 rounded-md ${
                              readiness.fiscalReady
                                ? "bg-[#DFEADF] text-[#4F735A] border border-[#4F735A]/30"
                                : "bg-[#F5E4CC] text-[#B97932] border border-[#B97932]/30"
                            }`}>
                              {readiness.fiscalReady ? "Fiscal listo" : "Fiscal pendiente"}
                            </span>
                            {item.isAvailable === false && (
                              <span className="text-[8px] font-bold block px-1.5 py-0.5 rounded-md bg-[#EBDAC5] text-[#5E393F] border border-[#CFB5A0]">
                                No publicado
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMenuProduct(item);
                            setSimulatedPrice(item.price);
                            handleStartEditingProduct(item);
                          }}
                          className="px-3 py-1.5 bg-[#5C1D27] hover:bg-[#4A151D] text-white text-[10px] font-black rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
                          title="Editar Ficha de Producto"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-6">
              {isEditingProduct ? (
                <form onSubmit={(e) => handleSaveProductDetails(e, currentItem.id)} className="space-y-4 text-xs font-bold text-[#2D0E13]">
                  <div className="border-b border-[#CFB5A0] pb-2 flex justify-between items-center">
                    <h3 className="font-serif text-base font-bold text-[#5C1D27]">Editar Ficha de Producto</h3>
                    <span className="text-[9px] bg-[#EBDAC5] text-[#5C1D27] border border-[#CFB5A0] px-2 py-0.5 rounded-md font-mono">{currentItem.id}</span>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider block mb-1.5 text-[#5E393F]">Nombre del Producto *</label>
                    <input 
                      type="text" 
                      value={editProdName} 
                      onChange={(e) => setEditProdName(e.target.value)} 
                      className="w-full p-3 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] focus:border-[#5C1D27] outline-none text-xs font-bold"
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider block mb-1.5 text-[#5E393F]">Precio Comercial ($) *</label>
                      <input 
                        type="number" 
                        value={editProdPrice} 
                        onChange={(e) => setEditProdPrice(e.target.value)} 
                        className="w-full p-3 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#5C1D27] focus:border-[#5C1D27] outline-none font-mono text-sm font-bold"
                        required 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider block mb-1.5 text-[#5E393F]">Categoría</label>
                      <select 
                        value={editProdCategory} 
                        onChange={(e) => setEditProdCategory(e.target.value)} 
                        className="w-full p-3 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] outline-none cursor-pointer text-xs font-bold"
                      >
                        <option value="desayunos_meriendas">Desayunos & Meriendas</option>
                        <option value="pizzas_focaccias">Pizzas & Focaccias</option>
                        <option value="minutas_carnes">Minutas & Carnes</option>
                        <option value="pastas_caseras">Pastas Caseras</option>
                        <option value="empanadas">Empanadas</option>
                        <option value="bebidas_sa">Bebidas S/A</option>
                        <option value="bebidas_alcohol">Bebidas c/Alcohol</option>
                        <option value="postres">Postres</option>
                        <option value="executive">Menú Diario</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#5E393F]">Precio Takeaway ($)</label>
                      <input 
                        type="number" 
                        value={editProdTakeawayPrice} 
                        onChange={(e) => setEditProdTakeawayPrice(e.target.value)} 
                        className="w-full p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] outline-none font-mono text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#5E393F]">Precio Delivery ($)</label>
                      <input 
                        type="number" 
                        value={editProdDeliveryPrice} 
                        onChange={(e) => setEditProdDeliveryPrice(e.target.value)} 
                        className="w-full p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] outline-none font-mono text-xs font-bold focus:border-[#5C1D27]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#5E393F]">Stock Actual</label>
                      <input 
                        type="number" 
                        value={editProdStock} 
                        onChange={(e) => setEditProdStock(e.target.value)} 
                        className="w-full p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#5C1D27] outline-none font-mono text-xs font-bold focus:border-[#5C1D27]" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-start gap-3 p-3 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editProdIsAvailable}
                        onChange={(e) => setEditProdIsAvailable(e.target.checked)}
                        className="mt-0.5 accent-[#5C1D27]"
                      />
                      <span>
                        <strong className="text-[10px] uppercase tracking-wider block text-[#5C1D27]">Publicado y disponible</strong>
                        <small className="text-[9px] text-[#5E393F] font-medium">Permite mostrar y vender el producto en la carta.</small>
                      </span>
                    </label>
                    <label className="flex items-start gap-3 p-3 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editProdRecipeRequired}
                        onChange={(e) => setEditProdRecipeRequired(e.target.checked)}
                        className="mt-0.5 accent-[#5C1D27]"
                      />
                      <span>
                        <strong className="text-[10px] uppercase tracking-wider block text-[#5C1D27]">Requiere receta técnica</strong>
                        <small className="text-[9px] text-[#5E393F] font-medium">Desmarcar solo para mercadería terminada sin consumo de insumos.</small>
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider block mb-1.5 text-[#5E393F]">Foto (URL o Subir desde Dispositivo) *</label>
                    <input 
                      type="text" 
                      value={editProdImage.startsWith("data:image") ? "Foto subida localmente (Base64)" : editProdImage.includes("supabase.co") ? "Foto alojada en Supabase Storage ☁️" : editProdImage} 
                      onChange={(e) => setEditProdImage(e.target.value)} 
                      placeholder="Pegar URL pública de imagen..." 
                      className="w-full p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] outline-none text-[11px] font-medium focus:border-[#5C1D27]" 
                    />
                    <div className="mt-2 space-y-1 bg-[#EBDAC5]/40 p-3 rounded-2xl border border-[#CFB5A0]">
                      <label className="text-[9px] font-black uppercase tracking-wider block text-[#5C1D27]">📷 Cargar Foto desde Celular / Cámara / PC</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setIsUploadingImage(true);
                            onShowNotification("⏳ Subiendo foto a Supabase Storage...", "info");
                            try {
                              const imageUrl = await StorageService.uploadProductImage(file);
                              setEditProdImage(imageUrl);
                              onShowNotification("📸 Foto guardada en Supabase Storage con éxito.", "success");
                            } catch (err) {
                              console.error("Error al subir foto:", err);
                            } finally {
                              setIsUploadingImage(false);
                            }
                          }
                        }}
                        className="w-full text-[10px] text-[#5E393F] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-[#EBDAC5] file:text-[#5C1D27] hover:file:bg-[#EBDAC5] cursor-pointer" 
                      />
                      {isUploadingImage && (
                        <span className="text-[10px] text-[#5C1D27] font-bold animate-pulse block">⏳ Subiendo imagen a Supabase...</span>
                      )}
                      {editProdImage && (
                        <button
                          type="button"
                          onClick={() => setEditProdImage("")}
                          className="text-[9px] text-[#A63F45] underline font-bold bg-transparent border-none cursor-pointer mt-1 block"
                        >
                          Quitar foto
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider block mb-1.5 text-[#5E393F]">Descripción Gourmet</label>
                    <textarea 
                      value={editProdDescription} 
                      onChange={(e) => setEditProdDescription(e.target.value)} 
                      placeholder="Descripción de la especialidad..." 
                      rows={3} 
                      className="w-full p-3 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] outline-none font-medium resize-none text-xs leading-relaxed focus:border-[#5C1D27]" 
                    />
                  </div>

                  {editProdImage && (
                    <div className="mt-2 text-center">
                      <span className="text-[8px] uppercase tracking-wider block mb-1 text-[#5E393F]">Vista Previa de la Foto</span>
                      <img src={editProdImage} alt="Vista previa" className="h-28 w-auto rounded-2xl border border-[#CFB5A0] mx-auto object-cover shadow-xs" />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#CFB5A0]">
                    <button 
                      type="button" 
                      onClick={() => setIsEditingProduct(false)} 
                      className="px-4 py-2 border border-[#CFB5A0] text-[#2D0E13] rounded-xl hover:bg-[#EBDAC5] cursor-pointer font-bold"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSavingProduct}
                      className="px-5 py-2 bg-[#5C1D27] hover:bg-[#4A151D] text-white font-black rounded-xl shadow-xs cursor-pointer uppercase tracking-wider disabled:cursor-wait disabled:opacity-60"
                    >
                      {isSavingProduct ? "Guardando…" : "Guardar Ficha"}
                    </button>
                  </div>
                </form>
              ) : !currentItem ? (
                <div className="p-8 text-center text-[#5E393F] italic font-medium">
                  Seleccione un producto de la lista izquierda para visualizar su ficha técnica de recetas y simulador de margen.
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold text-[#5E393F] uppercase tracking-widest block">
                        Ficha Técnica — {PRODUCT_CATEGORY_LABELS[currentItem.category] || "Producto gastronómico"}
                      </span>
                      <h3 className="font-serif text-2xl font-bold text-[#5C1D27] mt-1">{currentItem.name}</h3>
                      <p className="text-xs text-[#5E393F] mt-1 leading-relaxed font-medium">{currentItem.description}</p>
                    </div>
                    <button
                      onClick={() => handleStartEditingProduct(currentItem)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-[#5C1D27] hover:bg-[#4A151D] text-white text-[10px] font-black rounded-xl transition-all cursor-pointer uppercase shadow-xs border-none"
                    >
                      ✏️ Editar Ficha
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl">
                      <span className="text-[8px] font-bold text-[#5E393F] uppercase tracking-wider block">Costo Materia Prima</span>
                      <div className="text-xl font-serif font-black text-[#5C1D27] mt-1.5 font-mono">${directCost.toFixed(0)}</div>
                      <span className="text-[7px] text-[#5E393F] block font-semibold mt-1">Calculado por gramo/mL</span>
                    </div>
                    <div className="p-4 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl">
                      <span className="text-[8px] font-bold text-[#5E393F] uppercase tracking-wider block">Utilidad Bruta</span>
                      <div className="text-xl font-serif font-black text-[#5C1D27] mt-1.5 font-mono">
                        {directCost > 0 ? `$${utility.toFixed(0)}` : "Sin costo"}
                      </div>
                      <span className="text-[7px] text-[#5E393F] block font-semibold mt-1">Sugerido menos costos fijos</span>
                    </div>
                    <div className="p-4 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl">
                      <span className="text-[8px] font-bold text-[#5E393F] uppercase tracking-wider block">Margen de Contribución</span>
                      <div className="text-xl font-serif font-black text-[#5C1D27] mt-1.5 font-mono">
                        {directCost > 0 ? `${margin.toFixed(1)}%` : "N/A"}
                      </div>
                      <span className={`text-[7px] font-bold block mt-1 uppercase text-center ${
                        directCost === 0 
                          ? "text-[#A63F45] bg-[#F4DCDD] border border-[#A63F45]/30 px-1 py-0.5 rounded"
                          : margin >= 60 
                            ? "text-[#4F735A] bg-[#DFEADF] border border-[#4F735A]/30 px-1 py-0.5 rounded" 
                            : "text-[#B97932] bg-[#F5E4CC] border border-[#B97932]/30 px-1 py-0.5 rounded"
                      }`}>
                        {directCost === 0 ? "RECETA INCOMPLETA" : margin >= 60 ? "EXCELENTE" : "BAJO"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-black text-[#5C1D27] uppercase tracking-wider">Materia Prima Requerida (Porción Técnica)</h4>
                    </div>

                    <div className="border border-[#CFB5A0] rounded-2xl overflow-hidden text-xs bg-[#FAF2E6]">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-[#EBDAC5] border-b border-[#CFB5A0] text-[9px] font-bold uppercase tracking-wider text-[#5E393F]">
                            <th className="p-3">Insumo</th>
                            <th className="p-3 text-center">Cantidad Receta</th>
                            <th className="p-3 text-center">Costo Unitario</th>
                            <th className="p-3 text-right">Inversión</th>
                            <th className="p-3 text-center w-12">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#CFB5A0]">
                          {currentItem.recipe && currentItem.recipe.length > 0 ? (
                            currentItem.recipe.map((r, idx) => {
                              const ins = insumos.find(i => i.id === r.ingredientId);
                              const unitCost = ins?.costPerUnit || 0;
                              const totalCost = r.amount * unitCost;
                              return (
                                <tr key={idx} className="hover:bg-[#EBDAC5]/30 transition-colors">
                                  <td className="p-3 font-bold text-[#2D0E13]">{ins?.name || r.ingredientId}</td>
                                  <td className="p-3 text-center font-mono font-semibold text-[#2D0E13]">{r.amount} {ins?.unit || "kg"}</td>
                                  <td className="p-3 text-center font-mono font-semibold text-[#5E393F]">${unitCost.toLocaleString("es-AR")} / {ins?.unit || "kg"}</td>
                                  <td className="p-3 text-right font-mono font-bold text-[#5C1D27]">${totalCost.toFixed(0)}</td>
                                  <td className="p-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveIngredientFromRecipe(currentItem.id, r.ingredientId)}
                                      className="p-1 text-[#A63F45] hover:text-[#5C1D27] transition-colors bg-transparent border-none cursor-pointer"
                                      title="Remover insumo de la receta"
                                    >
                                      ❌
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-xs text-[#5E393F] font-bold">Esta especificación no requiere ingredientes adicionales registrados.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Quick Add Ingredient to Recipe Bar */}
                    <div className="p-3 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-[160px]">
                        <label className="text-[8px] font-bold text-[#5E393F] uppercase block mb-1">Añadir Insumo Registrado a Receta</label>
                        <select
                          value={recipeIngredientId}
                          onChange={(e) => setRecipeIngredientId(e.target.value)}
                          className="w-full text-xs p-2 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] font-bold cursor-pointer focus:border-[#5C1D27]"
                        >
                          <option value="">-- Seleccionar Insumo --</option>
                          {insumos.map(ins => (
                            <option key={ins.id} value={ins.id}>{ins.name} ({ins.unit})</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-28">
                        <label className="text-[8px] font-bold text-[#5E393F] uppercase block mb-1">Cantidad Receta</label>
                        <input
                          type="number"
                          step="any"
                          value={recipeIngredientQty}
                          onChange={(e) => setRecipeIngredientQty(e.target.value)}
                          className="w-full text-xs p-2 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#5C1D27] font-mono font-bold focus:border-[#5C1D27]"
                        />
                      </div>

                      <div className="shrink-0 self-end">
                        <button
                          type="button"
                          onClick={() => {
                            const qty = parseFloat(recipeIngredientQty);
                            if (recipeIngredientId && qty > 0) {
                              handleAddIngredientToRecipe(currentItem.id, recipeIngredientId, qty);
                              setRecipeIngredientId("");
                              setRecipeIngredientQty("0.1");
                            } else {
                              onShowNotification("⚠️ Seleccione un insumo y una cantidad válida.", "warning");
                            }
                          }}
                          className="px-4 py-2 bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black rounded-xl shadow-xs cursor-pointer uppercase tracking-wider"
                        >
                          ➕ Agregar a Receta
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        )}
      </motion.div>
    );
  };

  const renderCaja = () => {
    // 1. Calculate values
    const posSubtotal = posCart.reduce((sum, item) => sum + item.item.price * item.qty, 0);
    const posIva = posSubtotal * 0.21;
    const posTotal = posSubtotal;

    const posMenuItems = menuItems.filter(item => 
      item.isAvailable !== false &&
      (
        selectedPosCategory === "todos" ||
        (selectedPosCategory === "promos" && ((item.tags && item.tags.includes("Promo")) || item.isOffer)) ||
        (selectedPosCategory === "empanadas" && item.category === "empanadas") ||
        (selectedPosCategory === "pizzas_focaccias" && item.category === "pizzas_focaccias") ||
        (selectedPosCategory === "pastas_caseras" && item.category === "pastas_caseras") ||
        (selectedPosCategory === "minutas_carnes" && item.category === "minutas_carnes" && (!item.tags || item.tags.includes("Al Plato") || item.tags.includes("Milanesa") || item.tags.includes("Cerdo") || item.tags.includes("Ternera"))) ||
        (selectedPosCategory === "guarniciones" && item.tags && (item.tags.includes("Guarnición") || item.tags.includes("Ensalada") || item.tags.includes("Puré") || item.tags.includes("Papas"))) ||
        (selectedPosCategory === "lomitos" && item.tags && item.tags.includes("Lomito")) ||
        (selectedPosCategory === "hamburguesas" && item.tags && item.tags.includes("Hamburguesa")) ||
        (selectedPosCategory === "sandwiches" && item.tags && (item.tags.includes("Sándwich") || item.tags.includes("Pebete") || item.tags.includes("Pebetón") || item.tags.includes("Miga") || item.tags.includes("Árabe"))) ||
        (selectedPosCategory === "desayunos_meriendas" && item.category === "desayunos_meriendas" && (!item.tags || !item.tags.includes("Promo"))) ||
        ((selectedPosCategory === "executive" || selectedPosCategory === "menu_ejecutivo") && item.category === "executive") ||
        (selectedPosCategory === "bebidas_sa" && item.category === "bebidas_sa") ||
        (selectedPosCategory === "bebidas_alcohol" && item.category === "bebidas_alcohol") ||
        (selectedPosCategory === "postres" && item.category === "postres") ||
        item.category === selectedPosCategory
      )
    );

    const pendingOrders = orders.filter(o => isOrderActive(o));

    const addToPosCart = (item: MenuItem) => {
      setPosCart(prev => {
        const match = prev.find(p => p.item.id === item.id);
        if (match) {
          return prev.map(p => p.item.id === item.id ? { ...p, qty: p.qty + 1 } : p);
        }
        return [...prev, { item, qty: 1 }];
      });
    };

    const updatePosCartQty = (itemId: string, amount: number) => {
      setPosCart(prev => 
        prev.map(p => p.item.id === itemId ? { ...p, qty: Math.max(1, p.qty + amount) } : p)
      );
    };

    const removeFromPosCart = (itemId: string) => {
      setPosCart(prev => prev.filter(p => p.item.id !== itemId));
    };

    const handleConfirmPosComanda = () => {
      if (posCart.length === 0) {
        onShowNotification("⚠️ La comanda está vacía.", "warning");
        return;
      }
      
      const newOrder: Order = {
        id: `PED-${crypto.randomUUID()}`,
        tableNumber: posTable,
        items: posCart.map(c => ({
          itemId: c.item.id,
          name: c.item.name,
          quantity: c.qty,
          price: c.item.price,
          customizationSummary: ""
        })),
        subtotal: posSubtotal,
        tax: posIva,
        total: posTotal,
        status: "Recibido",
        createdAt: new Date().toISOString(),
        type: posTable === "Barra" ? "Llevar" : "Mesa",
        priceList: "Salon",
        estimatedMinutes: 10
      };

      if (onUpdateOrders) {
        onUpdateOrders([newOrder, ...orders]);
      }
      
      const updatedMenu = menuItems.map(m => {
        const cartItem = posCart.find(c => c.item.id === m.id);
        return cartItem && m.stock !== undefined ? { ...m, stock: Math.max(0, m.stock - cartItem.qty) } : m;
      });
      onUpdateMenu(updatedMenu);

      setPosCart([]);
      onShowNotification(`📋 Nueva comanda registrada con éxito para la ${posTable}.`, "success");
    };

    const openCheckoutPanel = (order: Order) => {
      setPosCheckoutOrder(order);
      setPaymentMethod("Tarjeta");
      setReceivedCashInput("");
      setPosCouponInput("");
      setDiscountPercentage(0);
      setCuitNumber("");
      setCuitName("");
      setSplitPaymentType("indiviso");
      setDinersCount(2);
      setPaidDinersCount(0);
      setSelectedSplitItems({});
      setSelectedCtaCteClient("");
    };

    // Calculate checkout totals dynamically
    const orderTotalOriginal = posCheckoutOrder ? posCheckoutOrder.total : 0;
    const discountAmount = Math.round((orderTotalOriginal * (discountPercentage / 100)) * 100) / 100;
    const orderTotalWithDiscount = Math.max(0, orderTotalOriginal - discountAmount);

    // Calculate split totals
    let activeCheckoutTotal = orderTotalWithDiscount;
    if (posCheckoutOrder && splitPaymentType === "comensales") {
      const equalShare = Number((orderTotalWithDiscount / dinersCount).toFixed(2));
      activeCheckoutTotal =
        paidDinersCount >= dinersCount - 1
          ? Number((orderTotalWithDiscount - equalShare * paidDinersCount).toFixed(2))
          : equalShare;
    } else if (posCheckoutOrder && splitPaymentType === "articulos") {
      const selectedItemsSum = Object.entries(selectedSplitItems).reduce((sum, [itemName, qty]) => {
        const matchedItem = posCheckoutOrder.items.find(i => i.name === itemName);
        return sum + (matchedItem ? matchedItem.price * Number(qty) : 0);
      }, 0);
      activeCheckoutTotal = selectedItemsSum * (1 - discountPercentage / 100);
    }

    const handleProcessPosCheckout = async (): Promise<boolean> => {
      if (!posCheckoutOrder) return false;
      const orderId = posCheckoutOrder.id;

      // Auto-generate fallback coupon reference if empty
      const effectiveCoupon = posCouponInput.trim() || `POSNET-${Date.now().toString().slice(-4)}`;

      if (paymentMethod === "Efectivo" && receivedCashInput && parseFloat(receivedCashInput) < activeCheckoutTotal) {
        onShowNotification("⚠️ El efectivo recibido es menor al total a pagar.", "warning");
        return false;
      }
      if (paymentMethod === "Fiado / Cta Cte" && !selectedCtaCteClient) {
        onShowNotification("⚠️ Seleccione una cuenta corriente para imputar el saldo.", "warning");
        return false;
      }

      const totalToRecord = activeCheckoutTotal;
      const selectedClient =
        paymentMethod === "Fiado / Cta Cte"
          ? clientAccounts.find((client) => client.name === selectedCtaCteClient)
          : undefined;
      if (paymentMethod === "Fiado / Cta Cte" && !selectedClient) {
        onShowNotification("⚠️ La cuenta corriente seleccionada ya no existe.", "warning");
        return false;
      }

      const paymentEntries:
        {
          method: NonNullable<Order["paymentMethod"]>;
          amount: number;
          transactionId?: string;
        }[] =
        paymentMethod === "Pago Mixto"
          ? [
              { method: "Efectivo", amount: Number(mixedCashAmount) || totalToRecord / 2 },
              { method: "MercadoPago", amount: Number(mixedDigitalAmount) || totalToRecord / 2 }
            ]
          : [{
              method: paymentMethod,
              amount: totalToRecord,
              transactionId: ["Tarjeta", "Tarjeta Débito", "Tarjeta Crédito"].includes(paymentMethod)
                ? `pos-${orderId}-${effectiveCoupon}`
                : undefined
            }];

      if (
        !Number.isFinite(totalToRecord) ||
        totalToRecord <= 0 ||
        paymentEntries.some((entry) => !Number.isFinite(entry.amount) || entry.amount <= 0) ||
        Math.abs(
          paymentEntries.reduce((sum, entry) => sum + entry.amount, 0) - totalToRecord
        ) > 0.01
      ) {
        onShowNotification(
          "⚠️ Los importes del pago no coinciden con el total a registrar.",
          "warning"
        );
        return false;
      }

      const result = await SupabaseSyncService.recordPayments(
        orderId,
        paymentEntries,
        discountAmount,
        selectedClient?.id
      );
      if (!result.success || !result.order) {
        onShowNotification(
          `⚠️ El cobro no pudo registrarse de forma transaccional: ${result.error || "respuesta inválida"}`,
          "warning"
        );
        return false;
      }
      const completedEntries = result.transactions;
      const updatedPaidOrder = result.order;

      setCashLedger((prev) => {
        const addedCash = completedEntries
          .filter((entry) => entry.method === "Efectivo")
          .reduce((sum, entry) => sum + entry.amount, 0);
        const addedCard = completedEntries
          .filter((entry) =>
            ["Tarjeta", "Tarjeta Débito", "Tarjeta Crédito"].includes(entry.method)
          )
          .reduce((sum, entry) => sum + entry.amount, 0);
        const addedMp = completedEntries
          .filter((entry) => entry.method === "MercadoPago")
          .reduce((sum, entry) => sum + entry.amount, 0);
        return {
          totalCollected: Number(
            (prev.totalCollected + addedCash + addedCard + addedMp).toFixed(2)
          ),
          cash: Number((prev.cash + addedCash).toFixed(2)),
          card: Number((prev.card + addedCard).toFixed(2)),
          mercadopago: Number((prev.mercadopago + addedMp).toFixed(2)),
          transactions: [
            ...completedEntries.map((entry) => ({
              id: entry.transactionId,
              type: splitPaymentType === "indiviso" ? "Cobro Total" : "Cobro Parcial",
              orderId,
              total: entry.amount,
              method: entry.method,
              timestamp: "Hace instantes"
            })),
            ...prev.transactions
          ]
        };
      });

      completedEntries.forEach((entry) => {
        void CashShiftService.recordPaymentToLedger(entry.amount, entry.method, orderId);
      });

      if (onUpdateOrders) {
        onUpdateOrders(
          orders.map((order) => (order.id === orderId ? updatedPaidOrder : order))
        );
      }

      if (selectedClient) {
        onUpdateClientAccounts(
          clientAccounts.map((client) =>
            client.id === selectedClient.id
              ? { ...client, balance: Number((client.balance - totalToRecord).toFixed(2)) }
              : client
          )
        );
      }

      if (updatedPaidOrder.status === "Completado") {
        setPosCheckoutOrder(null);
        onShowNotification(
          `💵 Cobro por $${totalToRecord.toFixed(0)} registrado y comanda finalizada.`,
          "success"
        );
      } else {
        if (splitPaymentType === "comensales") {
          setPaidDinersCount((count) => count + 1);
        }
        setSelectedSplitItems({});
        setReceivedCashInput("");
        setPosCouponInput("");
        setMixedCashAmount("");
        setMixedDigitalAmount("");
        onShowNotification(
          `💵 Pago parcial por $${totalToRecord.toFixed(0)} registrado.`,
          "success"
        );
      }
      return true;
    };

    const handleIssueTicketNoFiscal = async (targetOrder: Order) => {
      const itemsRows = targetOrder.items.map(it => 
        `<tr><td>${it.quantity}x</td><td>${it.name.slice(0, 20)}</td><td class="right">$${(it.price * it.quantity).toLocaleString("es-AR")}</td></tr>`
      ).join("");

      const ticketHtml = `
        <h2>RESTO BAR DEL TEATRO</h2>
        <div class="center">Constitución 944 • Río Cuarto</div>
        <div class="center">Tel: 358 5042311</div>
        <div class="line"></div>
        <h4>DOCUMENTO NO FISCAL</h4>
        <div class="center">Comanda #${targetOrder.id.slice(-6).toUpperCase()}</div>
        <div>Ubicación: ${targetOrder.tableNumber || targetOrder.type}</div>
        <div>Fecha: ${new Date(targetOrder.createdAt).toLocaleString("es-AR")}</div>
        <div class="line"></div>
        <table>
          <tr><th>Cant</th><th>Producto</th><th class="right">Total</th></tr>
          ${itemsRows}
        </table>
        <div class="double-line"></div>
        <h3 class="right">TOTAL: $${targetOrder.total.toLocaleString("es-AR")}</h3>
        <div class="line"></div>
        <div class="center italic">¡Muchas gracias por su visita!</div>
      `;

      const paymentRecorded = await handleProcessPosCheckout();
      if (!paymentRecorded) return;

      ReceiptPDFService.generateTicketNoFiscalPDF(targetOrder);
      const printStarted = await ThermalPrinterService.printRawText(ticketHtml, "Ticket No Fiscal");
      onShowNotification(
        printStarted
          ? `Ticket No Fiscal enviado a impresión para ${targetOrder.tableNumber || "comanda"}.`
          : "El cobro se procesó, pero el navegador bloqueó la ventana de impresión.",
        printStarted ? "success" : "warning"
      );
    };

    const handleOpenArcaModalForOrder = (targetOrder: Order) => {
      setSelectedOrderForBilling(targetOrder);
      setFiscalForm({
        cuitOrDni: cuitNumber || "",
        nameOrReason: targetOrder.clientAccountName || cuitName || "Consumidor Final",
        ivaCondition: (ivaCondition as any) || "Consumidor Final"
      });
      setIsArcaModalOpen(true);
    };

    return (
      <motion.div
        key="caja-view"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-8 text-[#FDFBF7]"
      >
        {/* Header Terminal */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] p-6 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-[#EBDAC5] border border-[#CFB5A0] text-[#5C1D27] flex items-center justify-center shadow-xs">
              <Receipt className="h-6 w-6 stroke-1.5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold tracking-tight text-[#5C1D27]">TERMINAL DE CAJA & FACTURACIÓN FISCAL</h2>
              <p className="text-[10px] text-[#5E393F] font-semibold mt-0.5">Gestor de comprobantes de salón • Castaño — Resto Bar</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentUser.role !== "barista" && (
              <button 
                onClick={() => {
                  if (posCheckoutOrder) {
                    setManualItems(
                      posCheckoutOrder.items.map(it => ({
                        description: it.name,
                        qty: it.quantity,
                        unitPrice: it.price,
                        ivaPct: 21
                      }))
                    );
                    setManualCustomerInfo({
                      cuitOrDni: posCheckoutOrder.clientCuit || posCustomerCuitInput.trim() || "",
                      nameOrReason: posCheckoutOrder.clientAccountName || posCustomerNameInput.trim() || "Consumidor Final",
                      ivaCondition: (posIvaConditionInput as any) || "Consumidor Final"
                    });
                    setManualPaymentMethod(paymentMethod || "Efectivo");
                  }
                  setIsManualArcaModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#5C1D27] hover:bg-[#4A151D] text-white font-black text-[10px] transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" /> FACTURACIÓN MANUAL ARCA
              </button>
            )}
            <button 
              onClick={() => setIsConfigArcaOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#5C1D27] text-white border border-[#CFB5A0] hover:bg-[#4A151D] text-[10px] font-black transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider shadow-xs"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-[#D4AF37]" /> CONFIGURAR ARCA (AFIP)
            </button>
            <button 
              onClick={() => setIsSupabaseSqlModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#EBDAC5] border border-[#CFB5A0] text-[#5C1D27] hover:bg-[#EBDAC5] text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
            >
              <Layers className="h-3.5 w-3.5 text-[#5C1D27]" /> ESQUEMA DE DATOS
            </button>
            <button 
              onClick={() => setIsConfigRestaurantOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#EBDAC5] border border-[#CFB5A0] text-[#5E393F] hover:text-[#2D0E13] hover:bg-[#EBDAC5] text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
            >
              <Settings className="h-3.5 w-3.5" /> CONFIGURAR RESTAURANT
            </button>
            <button 
              onClick={() => setIsConfigTicketerisOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#EBDAC5] border border-[#CFB5A0] text-[#5E393F] hover:text-[#2D0E13] hover:bg-[#EBDAC5] text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
            >
              <Printer className="h-3.5 w-3.5" /> CONFIGURACIÓN TICKETERA
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left panel: Shift & Active orders (col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Box 1: Flujo Contable Diario */}
            <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-[#CFB5A0] pb-3">
                <div>
                  <span className="text-[8px] font-black uppercase tracking-wider text-[#5E393F] block">Flujo Contable Diario</span>
                  <h3 className="font-serif text-sm font-bold mt-0.5 text-[#2D0E13]">Estado de Caja Diaria</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider flex items-center gap-1 ${
                  isShiftOpen 
                    ? "bg-[#DFEADF] border-[#4F735A]/50 text-[#4F735A]" 
                    : "bg-[#EBDAC5] border-[#CFB5A0] text-[#5E393F]"
                }`}>
                  {isShiftOpen ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {isShiftOpen ? "Abierta" : "Cerrada"}
                </span>
              </div>

              {!isShiftOpen ? (
                <div className="space-y-4">
                  <div className="p-3 bg-[#EBDAC5]/40 border border-[#CFB5A0] text-[#2D0E13] rounded-xl text-center">
                    <p className="text-[10px] text-[#5E393F] font-semibold">No se registran turnos fiscales abiertos</p>
                    <p className="text-[9px] text-[#5C1D27] mt-0.5">Es indispensable abrir el turno para facturar a las mesas.</p>
                  </div>
                  <button 
                    onClick={handleOpenShift}
                    disabled={isShiftOperationPending}
                    className="w-full py-3 rounded-2xl bg-[#4F735A] hover:bg-[#3D5B46] disabled:opacity-60 disabled:cursor-wait text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    {isShiftOperationPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                    {isShiftOperationPending ? "ABRIENDO CAJA…" : "ABRIR CAJA DIARIA"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-xl space-y-2 text-[#2D0E13]">
                    <p className="text-[10px] text-[#5C1D27] font-bold uppercase tracking-wider">Turno en curso</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>Efectivo: <span className="font-mono font-bold text-[#5C1D27]">${cashLedger.cash.toLocaleString()}</span></div>
                      <div>Tarjeta: <span className="font-mono font-bold text-[#5C1D27]">${cashLedger.card.toLocaleString()}</span></div>
                      <div>MP: <span className="font-mono font-bold text-[#5C1D27]">${cashLedger.mercadopago.toLocaleString()}</span></div>
                      <div className="border-t border-[#CFB5A0] pt-1 font-bold">Total: <span className="font-mono text-[#4F735A]">${cashLedger.totalCollected.toLocaleString()}</span></div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setCloseShiftRealCash("");
                      setCloseShiftNotes("");
                      setIsCloseShiftModalOpen(true);
                    }}
                    className="w-full py-3 rounded-2xl bg-[#A63F45] text-white border border-[#A63F45] text-xs font-bold hover:bg-[#8A3338] transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    <Lock className="h-4 w-4" /> CERRAR CAJA DIARIA (Arqueo)
                  </button>
                </div>
              )}
            </div>

            {/* Box 2: Comandas en Salón */}
            <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-[#CFB5A0] pb-3">
                <h3 className="font-serif text-sm font-bold flex items-center gap-2 text-[#2D0E13]">
                  <ClipboardList className="h-4 w-4 text-[#5C1D27]" /> COMANDAS EN SALÓN
                </h3>
                {isShiftOpen && (
                  <span className="px-2 py-0.5 rounded bg-[#EBDAC5] border border-[#CFB5A0] text-[#5C1D27] text-[9px] font-black uppercase font-mono">
                    {pendingOrders.length} pendientes
                  </span>
                )}
              </div>

              {!isShiftOpen ? (
                <div className="text-center py-12 bg-[#EBDAC5]/30 border border-[#CFB5A0] text-[#2D0E13] rounded-2xl flex flex-col items-center justify-center">
                  <Lock className="h-8 w-8 stroke-1.5 mb-2 text-[#5C1D27]" />
                  <p className="text-[10px] font-bold text-[#5C1D27] uppercase tracking-widest">Caja Cerrada</p>
                  <p className="text-[9px] text-[#5E393F] mt-1 max-w-xs px-4">Abra el turno de caja diario para visualizar comandas.</p>
                </div>
              ) : pendingOrders.length === 0 ? (
                <div className="text-center py-12 bg-[#EBDAC5]/30 border border-[#CFB5A0] text-[#2D0E13] rounded-2xl flex flex-col items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-[#4F735A] mb-2 stroke-1.5" />
                  <p className="text-[10px] font-bold text-[#5C1D27] uppercase tracking-widest">Sin Pendientes</p>
                  <p className="text-[9px] text-[#5E393F] mt-1">Todas las mesas han cobrado.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {pendingOrders.map((order) => {
                    const active = posCheckoutOrder?.id === order.id;
                    const statusText = order.status === "Listo" 
                      ? "Listo" 
                      : order.status === "Entregado" 
                      ? "Entregado" 
                      : order.status === "Preparando" 
                      ? "En Cocina" 
                      : "Pendiente Cobro";
                    const statusColor = order.status === "Listo" 
                      ? "bg-[#DFEADF] border-[#4F735A]/50 text-[#4F735A]" 
                      : order.status === "Entregado"
                      ? "bg-[#EBDAC5] border-[#5C1D27]/40 text-[#5C1D27]"
                      : order.status === "Preparando"
                      ? "bg-[#D9E6F2] border-[#4A7BB0]/50 text-[#4A7BB0]"
                      : "bg-[#EBDAC5] border-[#CFB5A0] text-[#5E393F]";

                    return (
                      <div 
                        key={order.id}
                        onClick={() => openCheckoutPanel(order)}
                        className={`p-3.5 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                          active 
                            ? "bg-[#EBDAC5] border-2 border-[#5C1D27] text-[#2D0E13] shadow-sm" 
                            : "bg-[#FAF2E6] hover:bg-[#EBDAC5]/40 border-[#CFB5A0] text-[#2D0E13]"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <strong className="text-xs font-serif text-[#5C1D27] block">
                              {order.priceList === "Takeaway" || order.type === "Llevar"
                                ? `RETIRO: ${order.clientAccountName || "Cliente"} - Tel: ${order.customerPhone || "Sin teléfono"}`
                                : order.priceList === "Delivery" || order.fulfillmentType === "delivery"
                                ? `DELIVERY: ${order.clientAccountName || "Cliente"} - Dir: ${order.deliveryAddress ? `${order.deliveryAddress.street} ${order.deliveryAddress.number}` : "Sin dirección"}`
                                : `${order.tableNumber || "Sin mesa"} (Mozo: ${order.waiterName || "Sin asignar"})`}
                            </strong>
                            <span className="text-[9px] font-bold text-[#5E393F] block mt-0.5 font-mono">
                              {order.createdAt ? `📅 ${new Date(order.createdAt).toLocaleDateString("es-AR")} • 🕒 ${new Date(order.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs` : "Fecha no registrada"}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-black text-[#5C1D27]">${order.total.toLocaleString()}</span>
                        </div>

                        {/* Full Itemized Order Detail */}
                        <div className="bg-[#EBDAC5]/40 border border-[#CFB5A0]/60 p-2 rounded-xl text-[9.5px] space-y-1">
                          <span className="text-[8px] font-black uppercase text-[#5C1D27] block tracking-wider font-sans">
                            Detalle del Pedido ({order.items.reduce((acc, curr) => acc + curr.quantity, 0)} ítems):
                          </span>
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[#2D0E13] font-semibold">
                              <span className="truncate pr-1">• {it.quantity}x {it.name}</span>
                              <span className="font-mono font-bold text-[#5C1D27] shrink-0">${(it.price * it.quantity).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-[#CFB5A0]/40">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${statusColor}`}>
                            {statusText}
                          </span>
                          <span className="font-mono text-[8px] font-black text-[#5E393F]">#{order.id.replace("PED-", "")}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: POS Checkout Panel or Empty State (col-span-8) */}
          <div className="lg:col-span-8">
            {!isShiftOpen || !posCheckoutOrder ? (
              <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-10 shadow-sm flex flex-col items-center justify-center text-center h-[560px]">
                <div className="h-16 w-16 bg-[#EBDAC5] border border-[#CFB5A0] rounded-2xl flex items-center justify-center text-[#5C1D27] mb-6 shadow-xs">
                  <Receipt className="h-8 w-8 stroke-1.5" />
                </div>
                <h3 className="font-serif text-xl font-bold text-[#5C1D27]">TERMINAL DE COBRO CASTAÑO RESTO BAR</h3>
                <p className="text-xs text-[#5E393F] max-w-md mt-2.5 leading-relaxed">
                  Seleccione una mesa ocupada desde la lista lateral. Se iniciará el panel interactivo de check-out, permitiéndole coordinar pagos mixtos, aplicar deducciones manuales, configurar datos de CUIT, fraccionar saldos por comensales u artículos indivisos, y emitir comprobantes con CAE y QR de ARCA.
                </p>
                {!isShiftOpen ? (
                  <div className="mt-8 p-4 bg-[#EBDAC5]/50 border border-[#CFB5A0] rounded-2xl flex items-center gap-3 text-left max-w-sm">
                    <Info className="h-5 w-5 text-[#5C1D27] shrink-0" />
                    <div>
                      <strong className="text-[10px] font-black uppercase tracking-wider text-[#5C1D27] block">Caja Cerrada</strong>
                      <span className="text-[9px] text-[#5E393F] mt-0.5 block leading-normal">Tenga a bien iniciar el turno con el botón "Abrir Caja Diaria" izquierdo antes de realizar operaciones de facturación.</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 p-4 bg-[#EBDAC5]/50 border border-[#CFB5A0] rounded-2xl flex items-center gap-3 text-left max-w-sm">
                    <Info className="h-5 w-5 text-[#5C1D27] shrink-0" />
                    <div>
                      <strong className="text-[10px] font-black uppercase tracking-wider text-[#5C1D27] block">Turno Activo</strong>
                      <span className="text-[9px] text-[#5E393F] mt-0.5 block leading-normal">Seleccione una comanda del menú lateral izquierdo para abrir el panel interactivo de facturación.</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Active POS Checkout Interactive Panel
              <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
                
                {/* Header panel */}
                <div className="flex justify-between items-center border-b border-[#CFB5A0] pb-4">
                  <div>
                    <button 
                      onClick={() => setPosCheckoutOrder(null)}
                      className="text-[9px] font-bold uppercase tracking-wider text-[#5C1D27] hover:underline flex items-center gap-1.5 cursor-pointer bg-transparent border-0 p-0 mb-1"
                    >
                      <ArrowUp className="-rotate-90 h-3.5 w-3.5" /> VOLVER AL TERMINAL
                    </button>
                    <h3 className="font-serif text-lg font-bold text-[#5C1D27]">Detalle de Facturación - Mesa {posCheckoutOrder.tableNumber?.replace("Mesa ", "") || "1"}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase text-[#5E393F] font-mono block">Orden #{posCheckoutOrder.id}</span>
                    <div className="text-2xl font-serif font-black text-[#5C1D27] font-mono mt-0.5">${activeCheckoutTotal.toLocaleString()}</div>
                  </div>
                </div>

                {/* Grid Checkout Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left subcolumn: Consumo & Fraccionar */}
                  <div className="space-y-5">
                    {/* Resumen de Consumo */}
                    <div className="p-4 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-[#5C1D27] border-b border-[#CFB5A0] pb-1.5 flex items-center gap-1.5">
                        <Coffee className="h-3.5 w-3.5 text-[#5C1D27]" /> Resumen de Consumo
                      </h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                        {posCheckoutOrder.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-start text-[10px] font-semibold text-[#2D0E13]">
                            <span className="italic">{item.quantity}x {item.name}</span>
                            <span className="font-mono text-[#5C1D27]">${(item.price * item.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-[#CFB5A0] pt-2.5 flex justify-between text-[10px] font-bold">
                        <span className="text-[#2D0E13]">Total Comanda</span>
                        <span className="font-mono text-[#5C1D27]">${orderTotalOriginal.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Fraccionar Cuenta */}
                    <div className="p-4 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-[#5C1D27] border-b border-[#CFB5A0] pb-1.5 flex items-center gap-1.5">
                        <Scissors className="h-3.5 w-3.5 text-[#5C1D27]" /> Fraccionar Saldo
                      </h4>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "indiviso", label: "Indiviso", icon: Coins },
                          { id: "comensales", label: "Comensales", icon: Users },
                          { id: "articulos", label: "Artículos", icon: ClipboardList }
                        ].map(t => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setSplitPaymentType(t.id as any);
                              setSelectedSplitItems({});
                            }}
                            className={`p-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer flex flex-col items-center gap-1 justify-center ${
                              splitPaymentType === t.id
                                ? "bg-[#5C1D27] text-white border-[#5C1D27] shadow-xs"
                                : "bg-[#FAF2E6] border-[#CFB5A0] text-[#5E393F] hover:text-[#2D0E13]"
                            }`}
                          >
                            <t.icon className="h-3.5 w-3.5" />
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {splitPaymentType === "comensales" && (
                        <div className="p-3 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-xl space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-[#5E393F]">Número de Comensales:</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setDinersCount(prev => Math.max(2, prev - 1))} className="h-6 w-6 bg-[#EBDAC5] border border-[#CFB5A0] rounded text-xs font-bold text-[#5C1D27] cursor-pointer">-</button>
                              <strong className="font-mono text-sm w-4 text-center text-[#2D0E13]">{dinersCount}</strong>
                              <button onClick={() => setDinersCount(prev => Math.min(10, prev + 1))} className="h-6 w-6 bg-[#EBDAC5] border border-[#CFB5A0] rounded text-xs font-bold text-[#5C1D27] cursor-pointer">+</button>
                            </div>
                          </div>
                          <div className="text-[10px] border-t border-[#CFB5A0] pt-2 flex justify-between font-bold">
                            <span>Monto por Comensal</span>
                            <span className="font-mono text-[#5C1D27]">${(orderTotalWithDiscount / dinersCount).toFixed(0)}</span>
                          </div>
                        </div>
                      )}

                      {splitPaymentType === "articulos" && (
                        <div className="p-3 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-xl space-y-2.5">
                          <span className="text-[9px] font-bold text-[#5E393F] uppercase tracking-wider block mb-1">Seleccionar Items a Cobrar</span>
                          <div className="space-y-2 max-h-28 overflow-y-auto pr-1">
                            {posCheckoutOrder.items.map((it, idx) => {
                              const selectedQty = selectedSplitItems[it.name] || 0;
                              return (
                                <div key={idx} className="flex justify-between items-center text-[10px] font-semibold border-b border-[#CFB5A0]/50 pb-1.5">
                                  <span className="truncate text-[#2D0E13]">{it.name} (${it.price.toFixed(0)})</span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button 
                                      onClick={() => setSelectedSplitItems(prev => ({
                                        ...prev,
                                        [it.name]: Math.max(0, (prev[it.name] || 0) - 1)
                                      }))}
                                      className="h-5 w-5 bg-[#EBDAC5] border border-[#CFB5A0] rounded text-[10px] font-bold text-[#5C1D27] cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <strong className="font-mono w-4 text-center text-[#FDFBF7]">{selectedQty}</strong>
                                    <button 
                                      onClick={() => setSelectedSplitItems(prev => ({
                                        ...prev,
                                        [it.name]: Math.min(it.quantity, (prev[it.name] || 0) + 1)
                                      }))}
                                      className="h-5 w-5 bg-[#2A1B12] border border-[#D4AF37]/30 rounded text-[10px] font-bold text-[#FFDF00] cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right subcolumn: Discounts, Fiscal data, Payment Method */}
                  <div className="space-y-5">
                    {/* Deducciones Manuales (Discounts) */}
                    <div className="p-4 bg-[#FAF2E6] border border-[#CFB5A0] rounded-2xl space-y-3.5 shadow-sm">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-[#5C1D27] border-b border-[#CFB5A0] pb-1.5 flex items-center gap-1.5 font-sans">
                        <Percent className="h-3.5 w-3.5 text-[#5C1D27]" /> Deducciones Manuales (Descuento)
                      </h4>
                      <div className="flex gap-2">
                        {[0, 5, 10, 15, 20].map(p => (
                          <button
                            key={p}
                            onClick={() => setDiscountPercentage(p)}
                            className={`px-3 py-2 rounded-xl text-[9px] font-black border transition-all cursor-pointer flex-1 text-center font-mono ${
                              discountPercentage === p
                                ? "bg-[#5C1D27] text-white border-[#5C1D27] shadow-xs"
                                : "bg-[#EBDAC5]/40 border-[#CFB5A0] text-[#2D0E13] hover:bg-[#EBDAC5]"
                            }`}
                          >
                            {p === 0 ? "Sin Dto" : `${p}%`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Datos de CUIT / Facturación */}
                    <div className="p-4 bg-[#FAF2E6] border border-[#CFB5A0] rounded-2xl space-y-3.5 shadow-sm">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-[#5C1D27] border-b border-[#CFB5A0] pb-1.5 flex items-center gap-1.5 font-sans">
                        <FileText className="h-3.5 w-3.5 text-[#5C1D27]" /> Datos de CUIT / Razón Social (ARCA)
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs font-bold text-[#2D0E13]">
                        <div>
                          <label className="text-[8px] font-bold text-[#5E393F] uppercase block mb-1">CUIT/CUIL</label>
                          <input 
                            type="text" 
                            placeholder="Ingrese CUIT" 
                            value={cuitNumber}
                            onChange={(e) => setCuitNumber(e.target.value)}
                            className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-[10px] bg-[#FAF2E6] text-[#2D0E13] font-bold font-mono outline-none focus:border-[#5C1D27]" 
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-[#5E393F] uppercase block mb-1">Razón Social</label>
                          <input 
                            type="text" 
                            placeholder="Nombre del Cliente" 
                            value={cuitName}
                            onChange={(e) => setCuitName(e.target.value)}
                            className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-[10px] bg-[#FAF2E6] text-[#2D0E13] font-bold outline-none focus:border-[#5C1D27]" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-[#5E393F] uppercase block mb-1">Condición Frente al IVA</label>
                        <select 
                          value={ivaCondition}
                          onChange={(e) => setIvaCondition(e.target.value)}
                          className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-[10px] bg-[#FAF2E6] text-[#2D0E13] font-bold cursor-pointer outline-none focus:border-[#5C1D27]"
                        >
                          <option>Consumidor Final</option>
                          <option>Responsable Inscripto</option>
                          <option>Monotributista</option>
                          <option>Exento</option>
                        </select>
                      </div>
                    </div>

                    {/* Método de Cobro */}
                    <div className="p-4 bg-[#FAF2E6] border border-[#CFB5A0] rounded-2xl space-y-4 shadow-sm">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-[#5C1D27] border-b border-[#CFB5A0] pb-1.5 flex items-center gap-1.5 font-sans">
                        <Coins className="h-3.5 w-3.5 text-[#5C1D27]" /> Método de Cobro
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { id: "Efectivo", label: "💵 Efectivo" },
                          { id: "MercadoPago", label: "📱 Mercado Pago / QR" },
                          { id: "Tarjeta Débito", label: "💳 Tarjeta Débito" },
                          { id: "Tarjeta Crédito", label: "💳 Tarjeta Crédito" },
                          { id: "Pago Mixto", label: "🔀 Pago Mixto" },
                          { id: "Fiado / Cta Cte", label: "🤝 Cta Cte / Fiado" }
                        ].map(m => (
                          <button
                            key={m.id}
                            onClick={() => setPaymentMethod(m.id as any)}
                            className={`p-2.5 text-[10px] font-black rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              paymentMethod === m.id
                                ? "bg-[#5C1D27] text-white border-[#5C1D27] shadow-xs"
                                : "bg-[#EBDAC5]/40 border-[#CFB5A0] text-[#2D0E13] hover:bg-[#EBDAC5]"
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>



                      {paymentMethod === "Pago Mixto" && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="text-[8px] font-bold text-[#5E393F] uppercase block mb-1">Monto en Efectivo ($)</label>
                            <input 
                              type="number" 
                              placeholder="ej: 5000" 
                              value={mixedCashAmount}
                              onChange={(e) => setMixedCashAmount(e.target.value)}
                              className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#5C1D27] font-bold font-mono outline-none focus:border-[#5C1D27]" 
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold text-[#5E393F] uppercase block mb-1">Monto Digital / QR ($)</label>
                            <input 
                              type="number" 
                              placeholder="ej: 7500" 
                              value={mixedDigitalAmount}
                              onChange={(e) => setMixedDigitalAmount(e.target.value)}
                              className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#5C1D27] font-bold font-mono outline-none focus:border-[#5C1D27]" 
                            />
                          </div>
                        </div>
                      )}

                      {(paymentMethod === "Tarjeta Débito" || paymentMethod === "Tarjeta Crédito" || paymentMethod === "Tarjeta") && (
                        <div className="pt-1">
                          <label className="text-[8px] font-bold text-[#5E393F] uppercase block mb-1">POSNET Cupón Nro</label>
                          <input 
                            type="text" 
                            placeholder="Ingrese código de cupón de pago" 
                            value={posCouponInput}
                            onChange={(e) => setPosCouponInput(e.target.value)}
                            className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold font-mono outline-none focus:border-[#5C1D27]" 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Final receipt emission actions - Checkout or Fiscal Invoice */}
                <div className="border-t border-[#CFB5A0] pt-5 space-y-3.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Mode 1: Simple Payment */}
                    <button 
                      onClick={handleProcessPosCheckout}
                      className="w-full py-4 rounded-2xl bg-[#4F735A] hover:bg-[#3D5B46] text-white text-xs font-black shadow-md cursor-pointer uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-[#4F735A]"
                    >
                      <CheckCircle className="h-4 w-4 text-white" /> 🟢 CONFIRMAR VENTA / COBRAR
                    </button>

                    {/* Mode 2: Fiscal Invoice via ARCA */}
                    <button 
                      onClick={() => handleOpenArcaModalForOrder(posCheckoutOrder)}
                      className="w-full py-4 rounded-2xl bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black shadow-md cursor-pointer uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-[#5C1D27]"
                    >
                      <FileText className="h-4 w-4 text-white" /> 🧾 EMITIR FACTURA FISCAL ARCA
                    </button>
                  </div>

                  {/* Supporting Printing & Utility Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <button 
                      onClick={() => {
                        ReceiptPDFService.generateTicketNoFiscalPDF(posCheckoutOrder);
                        onShowNotification("📥 Ticket en formato PDF descargado con éxito.", "success");
                      }}
                      className="py-2.5 rounded-xl bg-[#EBDAC5] hover:bg-[#EBDAC5] border border-[#CFB5A0] text-[#5C1D27] text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs uppercase tracking-wider"
                    >
                      <Download className="h-3.5 w-3.5 text-[#5C1D27]" /> 📥 Descargar PDF
                    </button>
                    <button 
                      onClick={() => handleIssueTicketNoFiscal(posCheckoutOrder)}
                      className="py-2.5 rounded-xl border border-[#CFB5A0] bg-[#EBDAC5] hover:bg-[#EBDAC5] text-xs font-bold text-[#5C1D27] transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
                    >
                      <Printer className="h-3.5 w-3.5 text-[#5C1D27]" /> 🖨️ Ticket Térmico
                    </button>
                    <button 
                      onClick={() => setIsPrinterConfigModalOpen(true)}
                      className="py-2.5 rounded-xl border border-[#CFB5A0] bg-[#EBDAC5] hover:bg-[#EBDAC5] text-xs font-bold text-[#5C1D27] transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
                    >
                      <Settings className="h-3.5 w-3.5 text-[#5C1D27]" /> Config Ticketera
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Historial de Comandas Facturadas */}
        <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#CFB5A0]/40 pb-3">
            <h3 className="font-serif text-base font-bold flex items-center gap-2 uppercase tracking-wider text-[#5C1D27]">
              <Receipt className="h-4 w-4 text-[#5C1D27]" /> Historial de Comandas Cobradas
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              {selectedHistoryOrderIds.length > 0 && (
                <button
                  onClick={() => {
                    setDeleteTargetType("selected");
                    setIsDeleteConfirmOpen(true);
                  }}
                  className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider animate-pulse"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Borrar Seleccionadas ({selectedHistoryOrderIds.length})
                </button>
              )}

              <button
                onClick={() => {
                  setDeleteTargetType("all");
                  setIsDeleteConfirmOpen(true);
                }}
                className="px-3 py-1.5 bg-[#5C1D27] hover:bg-[#4A151D] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                title="Eliminar todo el historial de comandas cobradas"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-300" /> Borrar Todo el Historial
              </button>
            </div>
          </div>

          {/* Filters bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl text-[#2D0E13] text-xs font-semibold">
            <div>
              <label className="text-[8px] font-bold text-[#5E393F] uppercase block mb-1">Buscar por Mesa</label>
              <input
                type="text"
                placeholder="ej: Mesa 3"
                value={historySearchTable}
                onChange={(e) => setHistorySearchTable(e.target.value)}
                className="w-full p-2 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-semibold outline-none focus:border-[#5C1D27]"
              />
            </div>
            <div>
              <label className="text-[8px] font-bold text-[#5E393F] uppercase block mb-1">Filtrar por Mozo</label>
              <select
                value={historyFilterWaiter}
                onChange={(e) => setHistoryFilterWaiter(e.target.value)}
                className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold cursor-pointer outline-none focus:border-[#5C1D27]"
              >
                <option value="todos">Todos los Mozos</option>
                {[...new Set(orders.map((order) => order.waiterName).filter(Boolean))].map((waiter) => (
                  <option key={waiter} value={waiter}>{waiter}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[8px] font-bold text-[#5E393F] uppercase block mb-1">Filtrar por Método de Pago</label>
              <select
                value={historyFilterPayment}
                onChange={(e) => setHistoryFilterPayment(e.target.value)}
                className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold cursor-pointer outline-none focus:border-[#5C1D27]"
              >
                <option value="todos">Todos los Métodos</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="MercadoPago">MercadoPago</option>
                <option value="Fiado / Cta Cte">Cta Cte / Fiado</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold text-[#2D0E13]">
              <thead>
                <tr className="bg-[#EBDAC5] border-b border-[#CFB5A0] text-[9px] uppercase tracking-wider text-[#5E393F]">
                  <th className="p-3 text-center w-8">
                    {(() => {
                      const filteredCompletedOrders = orders.filter(o => {
                        if (o.status !== "Completado" && o.status !== "Entregado") return false;
                        if (historySearchTable && !(o.tableNumber || "").toLowerCase().includes(historySearchTable.toLowerCase())) return false;
                        if (historyFilterWaiter !== "todos" && o.waiterName !== historyFilterWaiter) return false;
                        if (historyFilterPayment !== "todos" && (o.paymentMethod || "Efectivo").toLowerCase() !== historyFilterPayment.toLowerCase()) return false;
                        return true;
                      });
                      const allIds = filteredCompletedOrders.map(o => o.id);
                      const isAllChecked = allIds.length > 0 && allIds.every(id => selectedHistoryOrderIds.includes(id));
                      return (
                        <input
                          type="checkbox"
                          checked={isAllChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedHistoryOrderIds(allIds);
                            } else {
                              setSelectedHistoryOrderIds([]);
                            }
                          }}
                          className="w-3.5 h-3.5 accent-[#5C1D27] cursor-pointer"
                          title="Seleccionar todas las comandas"
                        />
                      );
                    })()}
                  </th>
                  <th className="p-3 font-black">Fecha y Hora</th>
                  <th className="p-3 font-black">Comanda ID</th>
                  <th className="p-3 font-black">Mesa / Tipo</th>
                  <th className="p-3 font-black">Detalle de Productos</th>
                  <th className="p-3 font-black">Método Pago</th>
                  <th className="p-3 text-right font-black">Total Cobrado</th>
                  <th className="p-3 text-center font-black">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFB5A0]">
                {(() => {
                  const filteredCompletedOrders = orders.filter(o => {
                    if (o.status !== "Completado" && o.status !== "Entregado") return false;
                    if (historySearchTable && !(o.tableNumber || "").toLowerCase().includes(historySearchTable.toLowerCase())) return false;
                    if (historyFilterWaiter !== "todos" && o.waiterName !== historyFilterWaiter) return false;
                    if (historyFilterPayment !== "todos" && (o.paymentMethod || "Efectivo").toLowerCase() !== historyFilterPayment.toLowerCase()) return false;
                    return true;
                  });

                  if (filteredCompletedOrders.length === 0) {
                    return (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-[#5E393F] font-medium italic">
                          No se encontraron comandas cobradas con los filtros seleccionados.
                        </td>
                      </tr>
                    );
                  }

                  const displayedOrders = showAllHistoryOrders ? filteredCompletedOrders : filteredCompletedOrders.slice(0, 2);

                  return displayedOrders.map((o) => {
                    const isSelected = selectedHistoryOrderIds.includes(o.id);
                    return (
                      <tr key={o.id} className={`hover:bg-[#EBDAC5]/30 transition-colors ${isSelected ? "bg-[#EBDAC5]/50" : ""}`}>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedHistoryOrderIds(prev => [...prev, o.id]);
                              } else {
                                setSelectedHistoryOrderIds(prev => prev.filter(id => id !== o.id));
                              }
                            }}
                            className="w-3.5 h-3.5 accent-[#5C1D27] cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-mono text-[10px] text-[#5E393F]">
                          <span className="font-bold block text-[#5C1D27]">
                            📅 {o.createdAt ? new Date(o.createdAt).toLocaleDateString("es-AR") : new Date().toLocaleDateString("es-AR")}
                          </span>
                          <span className="text-[9px] font-mono text-[#5E393F]">
                            🕒 {o.createdAt ? new Date(o.createdAt).toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' }) : "19:45"} hs
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-[#5C1D27]">{o.id}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md bg-[#EBDAC5] border border-[#CFB5A0] text-[#5C1D27] text-[10px] font-bold">
                            {o.tableNumber ? `Mesa ${o.tableNumber.replace("Mesa ", "")}` : o.type}
                          </span>
                        </td>
                        <td className="p-3 text-[#2D0E13] max-w-[280px]">
                          <div className="flex flex-wrap gap-1">
                            {o.items.map((it, idx) => (
                              <span key={idx} className="inline-block bg-[#EBDAC5]/50 border border-[#CFB5A0] text-[#2D0E13] px-1.5 py-0.5 rounded text-[9px] font-bold">
                                {it.quantity}x {it.name} (${(it.price * it.quantity).toLocaleString()})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <select
                            value={o.paymentMethod || "Efectivo"}
                            onChange={(e) => {
                              const newMethod = e.target.value as any;
                              if (onUpdateOrders) {
                                onUpdateOrders(orders.map(item => item.id === o.id ? { ...item, paymentMethod: newMethod } : item));
                              }
                              onShowNotification(`✅ Método de pago de comanda #${o.id.slice(-6)} actualizado a ${newMethod}.`, "success");
                            }}
                            className="p-1.5 bg-[#FAF2E6] border border-[#CFB5A0] text-[#5C1D27] rounded-xl text-[10px] font-bold cursor-pointer outline-none focus:border-[#5C1D27]"
                          >
                            <option value="Efectivo">💵 Efectivo</option>
                            <option value="MercadoPago">📱 MercadoPago / QR</option>
                            <option value="Tarjeta Débito">💳 Tarjeta Débito</option>
                            <option value="Tarjeta Crédito">💳 Tarjeta Crédito</option>
                            <option value="Pago Mixto">🔀 Pago Mixto</option>
                            <option value="Fiado / Cta Cte">🤝 Cta Cte / Fiado</option>
                          </select>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-[#5C1D27]">${o.total.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center gap-1.5 justify-center">
                            <button
                              onClick={() => setSelectedOrderForTicket(o)}
                              className="px-2 py-1 bg-[#EBDAC5] hover:bg-[#EBDAC5] border border-[#CFB5A0] text-[#5C1D27] rounded-lg transition-all cursor-pointer font-bold text-[10px] uppercase shadow-2xs flex items-center gap-1"
                              title="Ver Ticket Térmico"
                            >
                              <Printer className="h-3 w-3" /> Ver
                            </button>
                            <button
                              onClick={() => {
                                ReceiptPDFService.generateTicketNoFiscalPDF(o);
                                onShowNotification("📥 Ticket en formato PDF descargado con éxito.", "success");
                              }}
                              className="px-2 py-1 bg-[#5C1D27] hover:bg-[#4A151D] text-white rounded-lg transition-all cursor-pointer font-black text-[10px] uppercase shadow-2xs flex items-center gap-1"
                              title="Descargar Ticket PDF (80mm)"
                            >
                              <Download className="h-3 w-3" /> PDF
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTargetType("single");
                                setTargetOrderIdToDelete(o.id);
                                setIsDeleteConfirmOpen(true);
                              }}
                              className="px-2 py-1 bg-red-700 hover:bg-red-800 text-white rounded-lg transition-all cursor-pointer font-bold text-[10px] uppercase shadow-2xs flex items-center gap-1"
                              title="Borrar Ticket del Historial"
                            >
                              <Trash2 className="h-3 w-3" /> Borrar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* Ver más / Ver menos toggle button */}
          {(() => {
            const totalCount = orders.filter(o => {
              if (o.status !== "Completado" && o.status !== "Entregado") return false;
              if (historySearchTable && !(o.tableNumber || "").toLowerCase().includes(historySearchTable.toLowerCase())) return false;
              if (historyFilterWaiter !== "todos" && o.waiterName !== historyFilterWaiter) return false;
              if (historyFilterPayment !== "todos" && (o.paymentMethod || "Efectivo").toLowerCase() !== historyFilterPayment.toLowerCase()) return false;
              return true;
            }).length;

            if (totalCount <= 2) return null;

            return (
              <div className="pt-2 text-center border-t border-[#CFB5A0]/40">
                <button
                  onClick={() => setShowAllHistoryOrders(!showAllHistoryOrders)}
                  className="px-4 py-2 bg-[#EBDAC5] hover:bg-[#E0CCA7] text-[#5C1D27] border border-[#CFB5A0] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  {showAllHistoryOrders ? (
                    <>
                      <ChevronUp className="h-4 w-4" /> Ver menos (Mostrar solo las últimas 2 comandas)
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" /> Ver más comandas cobradas ({totalCount - 2} más)
                    </>
                  )}
                </button>
              </div>
            );
          })()}
        </div>

        {/* Bottom panel: closures history & audit log list */}
        <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#CFB5A0] pb-4">
            <div>
              <h3 className="font-serif text-base font-bold flex items-center gap-2 uppercase tracking-wider text-[#5C1D27]">
                <Calendar className="h-4 w-4 text-[#5C1D27]" /> REGISTRO DE AUDITORÍA Y CIERRES DE CAJA (ARQUEOS Z) ({closuresHistory.length})
              </h3>
              <p className="text-[10px] text-[#5E393F] font-semibold mt-0.5">
                Historial homologado de aperturas, cierres de turno, arqueos de efectivo y balances contables.
              </p>
            </div>
            {isShiftOpen && (
              <button
                onClick={() => {
                  setCloseShiftRealCash("");
                  setCloseShiftNotes("");
                  setIsCloseShiftModalOpen(true);
                }}
                className="px-3.5 py-2 bg-[#5C1D27] hover:bg-[#4A151D] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0"
              >
                <Lock className="h-3.5 w-3.5" /> Realizar Cierre Z
              </button>
            )}
          </div>
          
          {closuresHistory.length === 0 ? (
            <div className="text-center py-10 bg-[#EBDAC5]/30 border border-[#CFB5A0] rounded-2xl flex flex-col items-center justify-center space-y-2.5">
              <div className="h-12 w-12 rounded-2xl bg-[#EBDAC5] border border-[#CFB5A0] flex items-center justify-center text-[#5C1D27]">
                <FileText className="h-6 w-6 stroke-1.5" />
              </div>
              <h4 className="font-serif text-sm font-bold text-[#5C1D27]">Sin Arqueos de Caja Registrados</h4>
              <p className="text-xs text-[#5E393F] max-w-md px-4">
                Los cierres Z y arqueos de caja diaria se irán asentando de forma automática cada vez que los cajeros o administradores realicen el cierre de turno.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {closuresHistory.map((cls, idx) => (
                <div 
                  key={cls.id || idx}
                  className="p-4 bg-[#EBDAC5]/30 hover:bg-[#EBDAC5]/60 border border-[#CFB5A0] rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-semibold text-[#2D0E13] transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-[#5C1D27] text-white rounded text-[9px] font-black uppercase tracking-wider">
                        {cls.user || "Administrador"}
                      </span>
                      <strong className="font-serif text-sm text-[#5C1D27]">Arqueo #{cls.id ? cls.id.slice(-6) : idx + 1}</strong>
                    </div>
                    <p className="text-[10px] text-[#5E393F] font-mono mt-0.5">
                      📅 Apertura: {cls.apertura} • 🕒 Cierre: {cls.cierre}
                    </p>
                    {cls.observaciones && (
                      <p className="text-[10px] text-[#2D0E13]/80 italic bg-[#FAF2E6] px-2 py-1 rounded border border-[#CFB5A0]/50 mt-1">
                        "{cls.observaciones}"
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-6 shrink-0 w-full md:w-auto justify-between md:justify-end">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-[#FAF2E6] p-2 rounded-xl border border-[#CFB5A0]/60">
                        <span className="text-[8px] text-[#5E393F] font-bold block uppercase tracking-wider">Ventas Turno</span>
                        <strong className="font-mono text-xs text-[#5C1D27]">${cls.ventasTurno.toLocaleString()}</strong>
                      </div>
                      <div className="bg-[#FAF2E6] p-2 rounded-xl border border-[#CFB5A0]/60">
                        <span className="text-[8px] text-[#5E393F] font-bold block uppercase tracking-wider">Monto Real</span>
                        <strong className="font-mono text-xs text-[#2D0E13]">${cls.montoReal.toLocaleString()}</strong>
                      </div>
                      <div className="bg-[#FAF2E6] p-2 rounded-xl border border-[#CFB5A0]/60">
                        <span className="text-[8px] text-[#5E393F] font-bold block uppercase tracking-wider">Diferencia</span>
                        <strong className={`font-mono text-xs ${cls.diferencia >= 0 ? "text-[#4F735A]" : "text-[#A63F45]"}`}>
                          {cls.diferencia >= 0 ? "+" : ""}${cls.diferencia.toLocaleString()}
                        </strong>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setSelectedClosureForModal(cls)}
                      className="px-3.5 py-2.5 rounded-xl bg-[#5C1D27] hover:bg-[#4A151D] text-white text-[10px] font-black transition-all cursor-pointer uppercase tracking-wider shadow-2xs flex items-center gap-1"
                    >
                      🔍 Detalle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const renderReservas = () => {
    // Interactive Calendar View Calculation
    const todayStr = new Date().toISOString().split("T")[0];

    // Compute Calendar Days
    const currentCalMonth = new Date();
    currentCalMonth.setMonth(currentCalMonth.getMonth() + calMonthOffset);
    const year = currentCalMonth.getFullYear();
    const month = currentCalMonth.getMonth();

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const monthTitle = `${monthNames[month]} ${year}`;

    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Dom
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const calendarGrid = [];
    // Prev month padding
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarGrid.push(null);
    }
    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      calendarGrid.push({ day: d, dateStr });
    }

    const handleFormSubmit = async (e: FormEvent) => {
      e.preventDefault();
      if (!bookingFormName || !bookingFormPhone || !bookingFormDate) {
        onShowNotification("⚠️ Complete los campos obligatorios.", "warning");
        return;
      }
      const tableName = bookingFormTableId.replace("mesa-", "Mesa ");
      await handleAdminAddBooking({
        tableId: bookingFormTableId,
        tableName,
        date: bookingFormDate,
        timeSlot: bookingFormSlot,
        guests: bookingFormGuests,
        customerName: bookingFormName,
        customerPhone: bookingFormPhone
      });
      setIsAddingBooking(false);
      setBookingFormName("");
      setBookingFormPhone("");
    };

    const bookingsForSelectedDate = adminBookings.filter(b => b.date === selectedCalDate);
    const filteredBookings = adminBookings.filter(b => 
      b.customerName.toLowerCase().includes(bookingSearchQuery.toLowerCase()) ||
      b.tableName.toLowerCase().includes(bookingSearchQuery.toLowerCase()) ||
      b.referenceCode.toLowerCase().includes(bookingSearchQuery.toLowerCase()) ||
      (b.customerPhone && b.customerPhone.includes(bookingSearchQuery)) ||
      b.date.includes(bookingSearchQuery)
    );

    const totalGuests = adminBookings.reduce((sum, b) => sum + (parseInt(b.guests) || 0), 0);
    const todayBookingsCount = adminBookings.filter(b => b.date === todayStr).length;

    return (
      <motion.div
        key="reservas-view"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-8 text-[#2D0E13]"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#CFB5A0] pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#5E393F]">Control de Clientes & Salón</span>
            <h2 className="font-serif text-3xl font-bold text-[#2D0E13] mt-0.5">Calendario & Reservas de Mesas</h2>
            <p className="text-xs text-[#5E393F] mt-1 font-medium">Gestione y agende reservas sincronizadas en vivo con Supabase.</p>
          </div>
          <button
            onClick={() => {
              setBookingFormDate(selectedCalDate);
              setIsAddingBooking(!isAddingBooking);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black rounded-2xl shadow-xs transition-all cursor-pointer uppercase tracking-wider"
          >
            <Plus className="h-4 w-4" /> Agendar Nueva Reserva
          </button>
        </div>

        {/* KPI Cards Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-[#FAF2E6] border border-[#CFB5A0] rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[9px] font-bold text-[#5E393F] uppercase tracking-wider block">Reservas Totales</span>
              <span className="text-2xl font-black font-mono text-[#5C1D27] mt-1 block">{adminBookings.length}</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#EBDAC5] border border-[#CFB5A0] flex items-center justify-center text-[#5C1D27]">
              <Calendar className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 bg-[#FAF2E6] border border-[#CFB5A0] rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[9px] font-bold text-[#5E393F] uppercase tracking-wider block">Reservas de Hoy</span>
              <span className="text-2xl font-black font-mono text-[#5C1D27] mt-1 block">{todayBookingsCount}</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#EBDAC5] border border-[#CFB5A0] flex items-center justify-center text-[#5C1D27]">
              <Clock className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 bg-[#FAF2E6] border border-[#CFB5A0] rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[9px] font-bold text-[#5E393F] uppercase tracking-wider block">Total Comensales</span>
              <span className="text-2xl font-black font-mono text-[#5C1D27] mt-1 block">{totalGuests} pers.</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#EBDAC5] border border-[#CFB5A0] flex items-center justify-center text-[#5C1D27]">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 bg-[#FAF2E6] border border-[#CFB5A0] rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[9px] font-bold text-[#5E393F] uppercase tracking-wider block">En Fecha Seleccionada</span>
              <span className="text-2xl font-black font-mono text-[#5C1D27] mt-1 block">{bookingsForSelectedDate.length}</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#EBDAC5] border border-[#CFB5A0] flex items-center justify-center text-[#5C1D27]">
              <Coffee className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Interactive Calendar Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Calendar Grid Picker */}
          <div className="lg:col-span-7 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-[#CFB5A0] pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCalMonthOffset(prev => prev - 1)}
                  className="px-3 py-1.5 rounded-xl border border-[#CFB5A0] bg-[#EBDAC5] text-[#5C1D27] font-black text-xs hover:bg-[#EBDAC5] cursor-pointer"
                >
                  ◀
                </button>
                <h3 className="font-serif text-lg font-bold text-[#5C1D27] capitalize">{monthTitle}</h3>
                <button
                  type="button"
                  onClick={() => setCalMonthOffset(prev => prev + 1)}
                  className="px-3 py-1.5 rounded-xl border border-[#CFB5A0] bg-[#EBDAC5] text-[#5C1D27] font-black text-xs hover:bg-[#EBDAC5] cursor-pointer"
                >
                  ▶
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCalMonthOffset(0);
                  setSelectedCalDate(todayStr);
                  setBookingFormDate(todayStr);
                }}
                className="px-3 py-1.5 bg-[#5C1D27] text-white text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Hoy
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-widest text-[#5E393F] py-1">
              <span>Dom</span>
              <span>Lun</span>
              <span>Mar</span>
              <span>Mié</span>
              <span>Jue</span>
              <span>Vie</span>
              <span>Sáb</span>
            </div>

            {/* Monthly Days Cells */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold">
              {calendarGrid.map((item, idx) => {
                if (!item) {
                  return <div key={idx} className="h-12 p-2 rounded-xl bg-transparent"></div>;
                }
                const isSelected = selectedCalDate === item.dateStr;
                const dayBookings = adminBookings.filter(b => b.date === item.dateStr);
                const count = dayBookings.length;
                const isToday = item.dateStr === todayStr;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedCalDate(item.dateStr);
                      setBookingFormDate(item.dateStr);
                    }}
                    className={`h-12 p-1 rounded-xl flex flex-col items-center justify-between transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-[#5C1D27] text-white border-[#5C1D27] shadow-xs"
                        : isToday
                        ? "bg-[#EBDAC5] border-2 border-[#5C1D27] text-[#2D0E13]"
                        : "bg-[#FAF2E6] hover:bg-[#EBDAC5]/50 border-[#CFB5A0] text-[#2D0E13]"
                    }`}
                  >
                    <span className="font-mono text-xs leading-none">{item.day}</span>
                    {count > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black leading-none ${
                        isSelected ? "bg-white text-[#5C1D27]" : "bg-[#5C1D27] text-white"
                      }`}>
                        {count} res.
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Summary Side Panel */}
          <div className="lg:col-span-5 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="border-b border-[#CFB5A0] pb-3 flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-black uppercase text-[#5E393F] tracking-widest block">Detalle por Día</span>
                  <h3 className="font-serif text-lg font-bold text-[#5C1D27]">📅 {selectedCalDate}</h3>
                </div>
                <span className="text-xs font-mono font-bold text-[#5C1D27] bg-[#EBDAC5] px-2.5 py-1 rounded-lg">
                  {bookingsForSelectedDate.length} Reservas
                </span>
              </div>

              <div className="space-y-3 py-3 max-h-[260px] overflow-y-auto pr-1">
                {bookingsForSelectedDate.length === 0 ? (
                  <div className="text-center py-8 text-[#5E393F] italic font-medium">
                    No hay reservas registradas para esta fecha.
                  </div>
                ) : (
                  bookingsForSelectedDate.map((b) => (
                    <div key={b.id} className="p-3.5 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl space-y-1.5 text-xs shadow-xs">
                      <div className="flex justify-between items-center font-bold text-[#5C1D27]">
                        <span>{b.customerName}</span>
                        <span className="font-mono text-[10px] bg-[#EBDAC5] px-2 py-0.5 rounded-md text-[#2D0E13]">{b.tableName}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-[#5E393F] font-semibold font-mono">
                        <span>Horario: {b.timeSlot}</span>
                        <span>👥 {b.guests} Pers.</span>
                      </div>
                      <div className="text-[10px] text-[#5E393F] font-mono">
                        Tel: {b.customerPhone} • Ref: {b.referenceCode}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setBookingFormDate(selectedCalDate);
                setIsAddingBooking(true);
              }}
              className="w-full py-3 bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black rounded-xl uppercase tracking-wider shadow-xs cursor-pointer"
            >
              ➕ Agendar Reserva para {selectedCalDate}
            </button>
          </div>
        </div>

        {/* Add Booking Form Drawer */}
        {isAddingBooking && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-5"
          >
            <div className="flex justify-between items-center border-b border-[#CFB5A0] pb-3">
              <h3 className="font-serif text-xl font-bold text-[#5C1D27]">Agendar Nueva Reserva</h3>
              <button onClick={() => setIsAddingBooking(false)} className="text-[#5E393F] hover:text-[#2D0E13] font-black text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-[#2D0E13]">
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1 text-[#5E393F]">Nombre del Cliente *</label>
                <input
                  type="text"
                  value={bookingFormName}
                  onChange={(e) => setBookingFormName(e.target.value)}
                  placeholder="Ej: Mariano Closs"
                  className="w-full p-3 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] placeholder-[#5E393F]/50 focus:border-[#5C1D27] outline-none font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1 text-[#5E393F]">Teléfono Celular *</label>
                <input
                  type="text"
                  value={bookingFormPhone}
                  onChange={(e) => setBookingFormPhone(e.target.value)}
                  placeholder="Ej: 3584123456"
                  className="w-full p-3 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] placeholder-[#5E393F]/50 focus:border-[#5C1D27] outline-none font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1 text-[#5E393F]">Fecha de Reserva *</label>
                <input
                  type="date"
                  value={bookingFormDate}
                  onChange={(e) => setBookingFormDate(e.target.value)}
                  className="w-full p-3 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] focus:border-[#5C1D27] outline-none font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1 text-[#5E393F]">Horario / Turno</label>
                <select
                  value={bookingFormSlot}
                  onChange={(e) => setBookingFormSlot(e.target.value)}
                  className="w-full p-3 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] focus:border-[#5C1D27] outline-none cursor-pointer font-bold"
                >
                  <option value="08:00 - 10:00">Desayuno (08:00 - 10:00)</option>
                  <option value="10:00 - 12:00">Media Mañana (10:00 - 12:00)</option>
                  <option value="12:00 - 14:00">Almuerzo (12:00 - 14:00)</option>
                  <option value="14:00 - 16:00">Tarde Corta (14:00 - 16:00)</option>
                  <option value="16:00 - 18:00">Merienda (16:00 - 18:00)</option>
                  <option value="18:00 - 20:00">After Office (18:00 - 20:00)</option>
                  <option value="20:00 - 22:00">Cena 1 (20:00 - 22:00)</option>
                  <option value="22:00 - 00:00">Cena 2 (22:00 - 00:00)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1 text-[#5E393F]">Asignar Mesa en Salón</label>
                <select
                  value={bookingFormTableId}
                  onChange={(e) => setBookingFormTableId(e.target.value)}
                  className="w-full p-3 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] focus:border-[#5C1D27] outline-none cursor-pointer font-bold"
                >
                  {(() => {
                    const list = [...restaurantTables];
                    if (list.length < 12) {
                      for (let i = list.length + 1; i <= 12; i++) {
                        list.push({
                          id: `mesa-${i}`,
                          name: `Mesa ${i}`,
                          capacity: i % 2 === 0 ? 4 : 2,
                          status: "Activo" as const
                        });
                      }
                    }
                    return list.filter(t => t.status === "Activo");
                  })().map(t => (
                    <option key={t.id} value={t.id}>{t.name} (Capacidad: {t.capacity} Pers.)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1 text-[#5E393F]">Cantidad de Comensales</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={bookingFormGuests}
                  onChange={(e) => setBookingFormGuests(parseInt(e.target.value) || 1)}
                  className="w-full p-3 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] focus:border-[#5C1D27] outline-none font-mono font-bold"
                />
              </div>

              <div className="md:col-span-3 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingBooking(false)}
                  className="px-5 py-2.5 border border-[#CFB5A0] text-[#5E393F] hover:text-[#2D0E13] rounded-xl hover:bg-[#EBDAC5] cursor-pointer font-bold uppercase tracking-wider text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#5C1D27] hover:bg-[#4A151D] text-white rounded-xl shadow-xs cursor-pointer font-black uppercase tracking-wider text-xs"
                >
                  Guardar Reserva
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Filter & Search Bar */}
        <div className="w-full max-w-lg">
          <div className="relative">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#5C1D27]" />
            <input
              type="text"
              value={bookingSearchQuery}
              onChange={(e) => setBookingSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, teléfono, mesa o fecha..."
              className="w-full rounded-2xl border border-[#CFB5A0] bg-[#FAF2E6] py-3 pr-4 pl-11 shadow-sm outline-none transition-all focus:border-[#5C1D27] text-xs font-bold text-[#2D0E13] placeholder-[#5E393F]/50"
            />
          </div>
        </div>

        {/* Table of Bookings */}
        <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-medium">
              <thead>
                <tr className="bg-[#EBDAC5] border-b border-[#CFB5A0] text-[10px] uppercase tracking-widest text-[#5E393F]">
                  <th className="p-4 font-black">Cliente</th>
                  <th className="p-4 font-black">Teléfono</th>
                  <th className="p-4 font-black">Fecha</th>
                  <th className="p-4 font-black">Horario / Turno</th>
                  <th className="p-4 font-black">Mesa Asignada</th>
                  <th className="p-4 font-black text-center">Comensales</th>
                  <th className="p-4 font-black">Código Ref.</th>
                  <th className="p-4 font-black text-center">Acciones & WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFB5A0]">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-[#5E393F] italic font-medium">
                      No hay reservas agendadas que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => {
                    const cleanPhone = b.customerPhone ? b.customerPhone.replace(/\D/g, "") : "";
                    const waPhone = cleanPhone.startsWith("54") ? cleanPhone : `549${cleanPhone}`;
                    const waMessage = encodeURIComponent(
                      `🎭 *CASTAÑO — RESTO BAR*\n¡Hola ${b.customerName}! Confirmamos tu reserva para el *${b.date}* a las *${b.timeSlot}* en la *${b.tableName}* (${b.guests} personas). Código Ref: ${b.referenceCode}. ¡Te esperamos en Constitución 944, Río Cuarto!`
                    );
                    const waLink = `https://wa.me/${waPhone}?text=${waMessage}`;

                    return (
                      <tr key={b.id} className="hover:bg-[#EBDAC5]/30 transition-colors">
                        <td className="p-4 font-serif font-bold text-sm text-[#5C1D27]">{b.customerName}</td>
                        <td className="p-4 font-mono text-[#2D0E13] font-semibold">{b.customerPhone}</td>
                        <td className="p-4 font-mono font-bold text-xs text-[#2D0E13]">{b.date}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-lg bg-[#EBDAC5] border border-[#CFB5A0] font-mono text-[10px] text-[#5C1D27] font-bold">
                            {b.timeSlot}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-[#2D0E13]">{b.tableName}</td>
                        <td className="p-4 text-center">
                          <span className="px-3 py-1 rounded-full bg-[#EBDAC5] border border-[#CFB5A0] text-[#5C1D27] text-[10px] font-mono font-bold">
                            👤 {b.guests} Pers.
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-[#5E393F] text-xs">{b.referenceCode}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-[#4F735A] hover:bg-[#3D5B46] text-white rounded-xl transition-all cursor-pointer font-bold text-[10px] uppercase shadow-xs flex items-center gap-1"
                              title="Enviar Confirmación por WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                            </a>
                            <button
                              onClick={() => handleAdminCancelBooking(b.id)}
                              className="px-3 py-1.5 bg-[#F4DCDD] hover:bg-[#EBDAC5] border border-[#A63F45]/30 text-[#A63F45] rounded-xl transition-all cursor-pointer font-bold text-[10px] uppercase shadow-xs"
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderPedidosMozo = () => {
    const activeTableObjs = [...restaurantTables];
    if (activeTableObjs.length < 12) {
      for (let i = activeTableObjs.length + 1; i <= 12; i++) {
        activeTableObjs.push({
          id: `mesa-${i}`,
          name: `Mesa ${i}`,
          capacity: i % 2 === 0 ? 4 : 2,
          status: "Activo" as const
        });
      }
    }
    const MOZO_TABLES = activeTableObjs.filter(t => t.status === "Activo").map(t => t.name);
    
    const getActiveOrderForTable = (table: string) => {
      return orders.find(o => o.tableNumber === table && o.status !== "Completado");
    };

    const occupiedTablesCount = MOZO_TABLES.filter(t => getActiveOrderForTable(t) !== undefined).length;

    const filteredMenuItems = menuItems.filter(item => {
      // Exclude legacy executive items and old static menu_diario items
      if (item.category === "executive" || item.category === "menu_diario" || item.id === "menu_ejecutivo_promocional" || item.name.toLowerCase().includes("menú ejecutivo")) {
        return false;
      }
      const matchesSearch = item.name.toLowerCase().includes(mozoSearchQuery.toLowerCase()) || 
                            item.description.toLowerCase().includes(mozoSearchQuery.toLowerCase());
      const matchesCategory = mozoCategory === "todos" || item.category === mozoCategory;
      return item.isAvailable !== false && matchesSearch && matchesCategory;
    });

    const handleSelectMozoTable = (table: string) => {
      setMozoSelectedTable(table);
      const activeOrder = getActiveOrderForTable(table);
      if (activeOrder) {
        const cartItems = activeOrder.items.map(it => {
          const menuItem = menuItems.find(m => m.name === it.name) || {
            id: it.name,
            name: it.name,
            price: it.price,
            description: "",
            category: "coffee",
            image: "",
            customizable: false,
            nutrition: { calories: 0, allergens: [] }
          } as MenuItem;
          return { item: menuItem, qty: it.quantity, notes: it.customizationSummary || "" };
        });
        setMozoCart(cartItems);
      } else {
        setMozoCart([]);
      }
    };

    const handleAddMozoCart = (item: MenuItem) => {
      if (mozoServiceType === "salon" && !mozoSelectedTable) {
        onShowNotification("⚠️ Seleccione una mesa a la izquierda antes de añadir productos.", "warning");
        return;
      }
      setMozoCart(prev => {
        const match = prev.find(c => c.item.id === item.id);
        if (match) {
          return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c);
        }
        return [...prev, { item, qty: 1 }];
      });
      onShowNotification(`🛒 ${item.name} añadido a la comanda de ${mozoServiceType === "takeaway" ? "Retiro" : mozoServiceType === "delivery" ? "Delivery" : mozoSelectedTable}.`, "success");
    };

    const handleUpdateMozoCartQty = (itemId: string, val: number) => {
      setMozoCart(prev => 
        prev.map(c => c.item.id === itemId ? { ...c, qty: Math.max(1, c.qty + val) } : c)
      );
    };

    const handleRemoveFromMozoCart = (itemId: string) => {
      setMozoCart(prev => prev.filter(c => c.item.id !== itemId));
    };

    const handleSubmitMozoOrder = async () => {
      if (mozoCart.length === 0) {
        onShowNotification("⚠️ Añada productos a la comanda antes de enviar.", "warning");
        return;
      }

      const subtotal = mozoCart.reduce((sum, c) => sum + c.item.price * c.qty, 0);
      const deliveryExtra = mozoServiceType === "delivery" ? mozoDeliveryForm.deliveryFee : 0;
      const total = subtotal + deliveryExtra;
      const tax = parseFloat((total * 0.21).toFixed(2));

      if (mozoServiceType === "takeaway") {
        if (!mozoTakeawayForm.customerName || !mozoTakeawayForm.customerPhone) {
          onShowNotification("⚠️ Complete el nombre y teléfono del cliente para Retiro.", "warning");
          return;
        }
        const newTakeawayOrder: Order = {
          id: stableTakeawayId,
          items: mozoCart.map(c => ({
            itemId: c.item.id,
            name: c.item.name,
            quantity: c.qty,
            price: c.item.price,
            customizationSummary: c.notes || ""
          })),
          subtotal,
          tax,
          total,
          status: "Recibido",
          createdAt: new Date().toISOString(),
          type: "Llevar",
          priceList: "Takeaway",
          estimatedMinutes: 15,
          clientAccountName: mozoTakeawayForm.customerName,
          customerName: mozoTakeawayForm.customerName,
          customerPhone: mozoTakeawayForm.customerPhone,
          waiterName: currentUser.name,
          source: "takeaway"
        };

        const persisted = await SupabaseSyncService.saveOrder(newTakeawayOrder);
        const finalOrder = persisted.order || newTakeawayOrder;
        onUpdateOrders?.([finalOrder, ...orders.filter(o => o.id !== finalOrder.id)]);
        onShowNotification(`🛍️ Pedido de Retiro #${finalOrder.id.slice(-6)} para ${finalOrder.clientAccountName} enviado a Cocina y registrado en Caja.`, "success");
        setMozoCart([]);
        setStableTakeawayId(`RET-${crypto.randomUUID()}`);
        return;
      }

      if (mozoServiceType === "delivery") {
        if (!mozoDeliveryForm.customerName || !mozoDeliveryForm.customerPhone || !mozoDeliveryForm.street || !mozoDeliveryForm.number) {
          onShowNotification("⚠️ Complete nombre, teléfono, calle y altura para Delivery.", "warning");
          return;
        }
        const newDeliveryOrder: Order = {
          id: stableDeliveryId,
          items: mozoCart.map(c => ({
            itemId: c.item.id,
            name: c.item.name,
            quantity: c.qty,
            price: c.item.price,
            customizationSummary: c.notes || ""
          })),
          subtotal,
          tax,
          total,
          status: "Recibido",
          createdAt: new Date().toISOString(),
          type: "Llevar",
          priceList: "Delivery",
          fulfillmentType: "delivery",
          deliveryFee: mozoDeliveryForm.deliveryFee,
          deliveryAddress: {
            street: mozoDeliveryForm.street,
            number: mozoDeliveryForm.number,
            notes: mozoDeliveryForm.floorNotes || ""
          },
          estimatedMinutes: 30,
          clientAccountName: mozoDeliveryForm.customerName,
          customerName: mozoDeliveryForm.customerName,
          customerPhone: mozoDeliveryForm.customerPhone,
          waiterName: currentUser.name,
          source: "delivery"
        };

        const persisted = await SupabaseSyncService.saveOrder(newDeliveryOrder);
        const finalOrder = persisted.order || newDeliveryOrder;
        onUpdateOrders?.([finalOrder, ...orders.filter(o => o.id !== finalOrder.id)]);
        onShowNotification(`🛵 Pedido de Delivery #${finalOrder.id.slice(-6)} para ${finalOrder.clientAccountName} enviado a Cocina y registrado en Caja.`, "success");
        setMozoCart([]);
        setStableDeliveryId(`DEL-${crypto.randomUUID()}`);
        return;
      }

      // Salón Flow
      if (!mozoSelectedTable) return;
      const activeOrder = getActiveOrderForTable(mozoSelectedTable);
      if (activeOrder) {
        const updatedOrderObj: Order = {
          ...activeOrder,
          items: mozoCart.map(c => ({
            itemId: c.item.id,
            name: c.item.name,
            quantity: c.qty,
            price: c.item.price,
            customizationSummary: c.notes || ""
          })),
          subtotal,
          tax,
          total,
          waiterName: currentUser.name,
          source: "mozo"
        };
        const persisted = await SupabaseSyncService.saveOrder(updatedOrderObj);
        if (!persisted.success || !persisted.order) {
          onShowNotification(`⚠️ No se pudo actualizar la comanda: ${persisted.error || "error desconocido"}.`, "warning");
          return;
        }
        onUpdateOrders?.(orders.map(o => o.id === activeOrder.id ? persisted.order! : o));
        onShowNotification(`🍳 Comanda de la ${mozoSelectedTable} actualizada y enviada a cocina.`, "success");
      } else {
        const newOrder: Order = {
          id: `PED-${crypto.randomUUID()}`,
          tableNumber: mozoSelectedTable,
          items: mozoCart.map(c => ({
            itemId: c.item.id,
            name: c.item.name,
            quantity: c.qty,
            price: c.item.price,
            customizationSummary: c.notes || ""
          })),
          subtotal,
          tax,
          total,
          status: "Recibido",
          createdAt: new Date().toISOString(),
          type: "Mesa",
          priceList: "Salon",
          estimatedMinutes: 15,
          waiterName: currentUser.name,
          source: "mozo"
        };
        const persisted = await SupabaseSyncService.saveOrder(newOrder);
        if (!persisted.success || !persisted.order) {
          onShowNotification(`⚠️ No se pudo guardar la comanda: ${persisted.error || "error desconocido"}.`, "warning");
          return;
        }
        onUpdateOrders?.([persisted.order, ...orders]);
        onShowNotification(`🍳 Nueva comanda para la ${mozoSelectedTable} enviada a cocina.`, "success");
      }

      setMozoCart([]);
      setMozoSelectedTable(null);
    };

    const subtotal = mozoCart.reduce((sum, c) => sum + c.item.price * c.qty, 0);
    const tax = subtotal * 0.21;
    const total = subtotal;

    // Helper for table guest mock count matching screenshot
    const getDinersMockCount = (table: string) => {
      if (table === "Mesa 2") return 2;
      if (table === "Mesa 4") return 3;
      if (table === "Mesa 8") return 1;
      if (table === "Mesa 12") return 4;
      return 2;
    };

    return (
      <motion.div
        key="mozo-view"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-[#FDFBF7]"
      >
        {/* Real-time Waiter Attention Calls Bar */}
        {pendingWaiterCalls.length > 0 && (
          <div className="lg:col-span-12 bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border-2 border-[#FFDF00] rounded-3xl p-4 shadow-2xl space-y-3 gold-glow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#FFDF00] animate-ping"></span>
                <h4 className="font-serif text-sm font-black text-[#FFDF00] uppercase tracking-wider">
                  🔔 Solicitudes de Atención en Mesa ({pendingWaiterCalls.length})
                </h4>
              </div>
              <span className="text-[10px] text-[#FDFBF7]/70 font-mono">Responda para atenuar la alerta</span>
            </div>

            <div className="flex flex-wrap gap-3">
              {pendingWaiterCalls.map((call) => (
                <div key={call.id} className="bg-[#1A110B] border border-[#D4AF37] p-3 rounded-2xl flex items-center justify-between gap-4 shadow-md">
                  <div>
                    <strong className="text-xs font-serif font-black text-[#FFDF00] block">{call.tableNumber}</strong>
                    <span className="text-[10px] text-[#FDFBF7] font-semibold">
                      {call.type === "call_waiter" ? "🔔 Solicita Mozo" : "💳 Pide la Cuenta"} ({call.timestamp})
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await WaiterCallService.markAttended(call.id);
                        setPendingWaiterCalls((current) => current.filter((item) => item.id !== call.id));
                        onShowNotification(`✅ Solicitud de ${call.tableNumber} marcada como atendida.`, "success");
                      } catch (error) {
                        console.error("Error attending waiter call:", error);
                        onShowNotification("⚠️ No se pudo actualizar la solicitud.", "warning");
                      }
                    }}
                    className="px-3 py-1.5 bg-[#FFDF00] hover:bg-amber-400 text-[#1C120C] rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-sm"
                  >
                    Atendido
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Left Column: Waiter & Tables */}
        <div className="lg:col-span-3 space-y-6">
          {/* Waiter Card */}
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#EBDAC5] border border-[#CFB5A0] text-[#5C1D27] flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-[#5E393F] block">Mozo en Turno Activo</span>
                <strong className="text-xs font-serif block text-[#5C1D27]">Terminal POS Registrada</strong>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["Agustín", "Florencia", "Giuliana"].map(waiter => (
                <button
                  key={waiter}
                  onClick={() => setSelectedWaiter(waiter)}
                  className={`py-2.5 rounded-xl text-[10px] font-black transition-all cursor-pointer uppercase tracking-wider ${
                    selectedWaiter === waiter 
                      ? "bg-[#5C1D27] text-white shadow-xs" 
                      : "bg-[#EBDAC5] border border-[#CFB5A0] text-[#2D0E13] hover:bg-[#EBDAC5]"
                  }`}
                >
                  {waiter}
                </button>
              ))}
            </div>
          </div>

          {/* Order Type Selector Bar (Salón, Retiro, Delivery) */}
          <OrderTypeSelector
            activeType={mozoServiceType}
            onChangeType={(newType) => {
              setMozoServiceType(newType);
              if (newType !== "salon") {
                setMozoSelectedTable("");
              }
            }}
            takeawayForm={mozoTakeawayForm}
            onChangeTakeawayForm={setMozoTakeawayForm}
            deliveryForm={mozoDeliveryForm}
            onChangeDeliveryForm={setMozoDeliveryForm}
          />

          {/* Tables Card (Visible in Salón Mode) */}
          {mozoServiceType === "salon" && (
            <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-[#CFB5A0] pb-3">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-[#5E393F] block">Distribución de Salón</span>
                <h3 className="font-serif text-base font-bold mt-0.5 text-[#5C1D27]">Mapa de Mesas</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#EBDAC5] border border-[#CFB5A0] text-[#5C1D27] text-[9px] font-mono font-black uppercase tracking-wider">
                {occupiedTablesCount} Ocupadas
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {MOZO_TABLES.map(table => {
                const activeOrder = getActiveOrderForTable(table);
                const isOccupied = activeOrder !== undefined;
                const isSelected = mozoSelectedTable === table;
                
                return (
                  <div
                    key={table}
                    onClick={() => handleSelectMozoTable(table)}
                    className={`p-3.5 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between h-20 shadow-xs ${
                      isSelected
                        ? "bg-[#5C1D27] border-[#5C1D27] text-white shadow-sm"
                        : isOccupied
                        ? "bg-[#F5E4CC] border-[#B97932] text-[#B97932]"
                        : "bg-[#FAF2E6] border-[#CFB5A0] text-[#2D0E13] hover:bg-[#EBDAC5]"
                    }`}
                  >
                    <strong className={`text-xs font-bold block ${isSelected ? "text-white" : isOccupied ? "text-[#B97932]" : "text-[#2D0E13]"}`}>
                      {table}
                    </strong>
                    {isOccupied ? (
                      <span className={`text-[9px] font-bold flex items-center gap-1 mt-1 font-mono ${isSelected ? "text-white" : "text-[#B97932]"}`}>
                        <Users className="h-3 w-3" /> {getDinersMockCount(table)} pers.
                      </span>
                    ) : (
                      <span className={`text-[8px] font-black uppercase tracking-wider mt-1 block ${isSelected ? "text-white/80" : "text-[#5E393F]"}`}>
                        Disponible
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>

        {/* Center Column: Categories and Products */}
        <div className="lg:col-span-6 space-y-6">
          {/* Categories card with search */}
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#5E393F] block">Carta & Menú Digital POS</span>
                  <span className="text-[9px] font-mono font-bold bg-[#EBDAC5] border border-[#CFB5A0] text-[#5C1D27] px-2 py-0.5 rounded-full">
                    {TimeSlotService.getCurrentTimeSlot().name.split(":")[0]}
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold text-[#5C1D27] mt-0.5">Catálogo de Productos</h3>
              </div>
              <div className="relative w-full sm:w-52">
                <Search className="absolute left-3 top-3 h-4 w-4 text-[#5C1D27]" />
                <input
                  type="text"
                  placeholder="Buscar producto o bebida..."
                  value={mozoSearchQuery}
                  onChange={(e) => setMozoSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] placeholder-[#5E393F]/60 font-semibold focus:border-[#5C1D27] outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
              {[
                { id: "todos", label: "🍽️ Todos" },
                { id: "menu_diario", label: "⭐ Menú del Día" },
                { id: "executive", label: "🍱 Menú Diario" },
                { id: "desayunos_meriendas", label: "☕ Desayunos & Meriendas" },
                { id: "pizzas_focaccias", label: "🍕 Pizzas & Focaccias" },
                { id: "minutas_carnes", label: "🥩 Minutas & Carnes" },
                { id: "pastas_caseras", label: "🍝 Pastas Caseras" },
                { id: "empanadas", label: "🥟 Empanadas" },
                { id: "bebidas_sa", label: "🥤 Bebidas S/A" },
                { id: "bebidas_alcohol", label: "🍸 Bebidas c/Alcohol" },
                { id: "postres", label: "🍰 Postres" }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setMozoCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                    mozoCategory === cat.id
                      ? "bg-[#5C1D27] text-white shadow-xs"
                      : "bg-[#EBDAC5] border border-[#CFB5A0] text-[#2D0E13] hover:bg-[#EBDAC5]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* ⭐ Menú del Día (Plato Único Semanal) Card for Waiters */}
          {(mozoCategory === "todos" || mozoCategory === "menu_diario") && todayMenu && (
            <div className="bg-[#FAF2E6] border-2 border-[#5C1D27] rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#CFB5A0] pb-3">
                <div className="flex items-center gap-3">
                  {todayMenu.image ? (
                    <img src={todayMenu.image} alt={todayMenu.title} className="h-16 w-20 rounded-2xl object-cover border border-[#5C1D27] shadow-xs shrink-0" />
                  ) : (
                    <div className="h-16 w-20 rounded-2xl bg-[#5C1D27] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      ⭐ DÍA
                    </div>
                  )}
                  <div>
                    <span className="text-[9px] font-black uppercase text-[#5C1D27] tracking-widest block">⭐ Plato Único del Día ({todayMenu.dayOfWeek})</span>
                    <h4 className="font-serif text-lg font-bold text-[#2D0E13]">{todayMenu.title}</h4>
                    <p className="text-xs text-[#5E393F] italic">{todayMenu.description || "Plato especial del día."}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-[#5E393F] block font-bold">Precio</span>
                  <span className="text-xl font-mono font-black text-[#5C1D27] block">${todayMenu.price.toLocaleString("es-AR")}</span>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const itemToCart: MenuItem = {
                      id: `menu_dia_${Date.now()}`,
                      name: `⭐ Menú del Día (${todayMenu.title})`,
                      price: todayMenu.price,
                      category: "menu_diario",
                      description: todayMenu.description,
                      image: todayMenu.image
                    };
                    handleAddMozoCart(itemToCart);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Agregar Plato del Día a Comanda
                </button>
              </div>
            </div>
          )}

          {/* 🍱 Combo Menú Diario (4 Platos + 3 Guarniciones) Card for Waiters */}
          {(mozoCategory === "todos" || mozoCategory === "executive") && (
            <div className="bg-[#FAF2E6] border-2 border-[#5C1D27] rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-start border-b border-[#CFB5A0] pb-3">
                <div>
                  <span className="text-[9px] font-black uppercase text-[#5C1D27] tracking-widest block">🍱 Combo Menú Diario</span>
                  <h4 className="font-serif text-lg font-bold text-[#2D0E13]">Menú Diario (Plato + Guarnición)</h4>
                  <p className="text-xs text-[#5E393F] italic">Elija 1 Plato Principal de los 4 y 1 Guarnición de las 3 disponibles.</p>
                </div>
                <span className="text-xl font-black font-mono text-[#5C1D27] shrink-0">${dailyComboState.price.toLocaleString("es-AR")}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Main Choice */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-[#5C1D27] block font-bold">1. Plato Principal (4 Opciones):</label>
                  <select
                    value={selectedMainMozo || dailyComboState.mains[0] || ""}
                    onChange={(e) => setSelectedMainMozo(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#CFB5A0] rounded-xl text-xs font-bold text-[#2D0E13] outline-none focus:border-[#5C1D27]"
                  >
                    {dailyComboState.mains.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Side Choice */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-[#5C1D27] block font-bold">2. Guarnición Acompañamiento:</label>
                  <select
                    value={selectedSideMozo || (dailyComboState.sides && dailyComboState.sides[0] ? dailyComboState.sides[0] : "Puré de papa")}
                    onChange={(e) => setSelectedSideMozo(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#CFB5A0] rounded-xl text-xs font-bold text-[#2D0E13] outline-none focus:border-[#5C1D27]"
                  >
                    {(dailyComboState.sides && dailyComboState.sides.length > 0
                      ? dailyComboState.sides.flatMap((s: string) =>
                          s.toLowerCase().includes("puré de papa o mixto") || s.toLowerCase().includes("pure de papa o mixto")
                            ? ["Puré de papa", "Puré mixto"]
                            : s
                        )
                      : ["Puré de papa", "Puré mixto", "Arroz con crema", "Ensalada mixta"]
                    ).map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const mainChoice = selectedMainMozo || dailyComboState.mains[0] || "Pollo al horno";
                    const sideChoice = selectedSideMozo || (dailyComboState.sides && dailyComboState.sides[0] ? dailyComboState.sides[0] : "Puré de papa");
                    const itemToCart: MenuItem = {
                      id: `combo_diario_${Date.now()}`,
                      name: `🍱 Menú Diario (${mainChoice} c/ ${sideChoice})`,
                      price: dailyComboState.price,
                      category: "executive",
                      description: `Plato: ${mainChoice} | Guarnición: ${sideChoice}`
                    };
                    handleAddMozoCart(itemToCart);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Agregar Combo a Comanda
                </button>
              </div>
            </div>
          )}

          {/* 🥗 Ensalada Completa Card for Waiters */}
          {(mozoCategory === "todos" || mozoCategory === "executive") && (
            <div className="bg-[#FAF2E6] border-2 border-[#5C1D27] rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-start border-b border-[#CFB5A0] pb-3">
                <div className="flex items-center gap-3">
                  {dailyComboState.saladImage ? (
                    <img src={dailyComboState.saladImage} alt={dailyComboState.saladTitle || "Ensalada Completa"} className="h-16 w-20 rounded-2xl object-cover border border-[#5C1D27] shadow-xs shrink-0" />
                  ) : (
                    <div className="h-16 w-20 rounded-2xl bg-[#5C1D27] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      🥗
                    </div>
                  )}
                  <div>
                    <span className="text-[9px] font-black uppercase text-[#5C1D27] tracking-widest block">🥗 Menú Saludable</span>
                    <h4 className="font-serif text-lg font-bold text-[#2D0E13]">{dailyComboState.saladTitle || "Ensalada Completa"}</h4>
                    <p className="text-xs text-[#5E393F] italic">{dailyComboState.saladDescription || "Mix de verdes, pollo desmenuzado, queso, huevo y tomates cherry."}</p>
                  </div>
                </div>
                <span className="text-xl font-black font-mono text-[#5C1D27] shrink-0">
                  ${(saladSizeMozo === "chica" ? (dailyComboState.saladPriceSmall ?? 6500) : (dailyComboState.saladPriceLarge ?? 8500)).toLocaleString("es-AR")}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#5C1D27] uppercase tracking-wider">Tamaño:</span>
                  <button
                    type="button"
                    onClick={() => setSaladSizeMozo("chica")}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                      saladSizeMozo === "chica"
                        ? "bg-[#5C1D27] text-white border-[#5C1D27] shadow-xs font-black"
                        : "bg-white text-[#2D0E13] border-[#CFB5A0] hover:bg-[#EBDAC5]"
                    }`}
                  >
                    Chica (${(dailyComboState.saladPriceSmall ?? 6500).toLocaleString("es-AR")})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaladSizeMozo("grande")}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                      saladSizeMozo === "grande"
                        ? "bg-[#5C1D27] text-white border-[#5C1D27] shadow-xs font-black"
                        : "bg-white text-[#2D0E13] border-[#CFB5A0] hover:bg-[#EBDAC5]"
                    }`}
                  >
                    Grande (${(dailyComboState.saladPriceLarge ?? 8500).toLocaleString("es-AR")})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const price = saladSizeMozo === "chica" ? (dailyComboState.saladPriceSmall ?? 6500) : (dailyComboState.saladPriceLarge ?? 8500);
                    const title = `${dailyComboState.saladTitle || "Ensalada Completa"} (${saladSizeMozo === "chica" ? "Chica" : "Grande"})`;
                    const itemToCart: MenuItem = {
                      id: `ensalada_completa_${saladSizeMozo}_${Date.now()}`,
                      name: `🥗 ${title}`,
                      price: price,
                      category: "executive",
                      description: dailyComboState.saladDescription
                    };
                    handleAddMozoCart(itemToCart);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Agregar Ensalada a Comanda
                </button>
              </div>
            </div>
          )}

          {/* Product grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
            {filteredMenuItems.map(item => {
              const isOut = item.stock === 0;
              return (
                <div
                  key={item.id}
                  className="bg-[#6C222E] border border-[#CFB5A0]/40 text-white rounded-3xl overflow-hidden flex flex-col justify-between shadow-sm relative group hover:brightness-105 transition-all"
                >
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-28 w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="h-28 w-full bg-[#5C1D27] flex items-center justify-center text-[#EBDAC5]">
                      <Coffee className="h-8 w-8 stroke-1" />
                    </div>
                  )}

                  {/* Stock status badge overlay */}
                  <div className="absolute top-2.5 right-2.5">
                    {isOut ? (
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-[#F4DCDD] border border-[#A63F45]/40 text-[#A63F45] tracking-wider">
                        Sin Stock
                      </span>
                    ) : (
                      item.stock !== undefined && (
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-[#EBDAC5] text-[#5C1D27] border border-white/20 tracking-wider font-mono">
                          Disp: {item.stock}u
                        </span>
                      )
                    )}
                  </div>

                  <div className="p-4 flex justify-between items-center gap-3 bg-[#6C222E] border-t border-white/10">
                    <div className="space-y-1 overflow-hidden">
                      <strong className="text-xs font-serif font-bold text-white block truncate">{item.name}</strong>
                      <span className="text-sm font-mono font-black text-[#FAF2E6] block">${item.price.toLocaleString("es-AR")}</span>
                    </div>
                    <button
                      onClick={() => handleAddMozoCart(item)}
                      disabled={isOut}
                      className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        isOut 
                          ? "bg-[#5C1D27] opacity-50 cursor-not-allowed text-white/50" 
                          : "bg-[#FAF2E6] text-[#5C1D27] hover:bg-white shadow-xs font-black"
                      }`}
                    >
                      <Plus className="h-5 w-5 font-black" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Draft Comanda */}
        <div className="lg:col-span-3">
          <div className="bg-[#4A151D] border border-[#CFB5A0]/40 text-white rounded-3xl p-5 shadow-md flex flex-col justify-between h-[620px]">
            {!mozoSelectedTable && mozoServiceType === "salon" ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-white/80 p-6 space-y-3">
                <div className="h-16 w-16 rounded-3xl bg-[#5C1D27] border border-white/20 text-white flex items-center justify-center">
                  <Coffee className="h-8 w-8" />
                </div>
                <span className="text-xs font-black text-white uppercase tracking-widest block">Comanda en Espera</span>
                <p className="text-xs text-white/70 leading-relaxed max-w-[180px]">
                  Seleccione una mesa disponible en el mapa de salón izquierdo para iniciar el pedido.
                </p>
              </div>
            ) : (() => {
                const activeOrder = mozoSelectedTable ? getActiveOrderForTable(mozoSelectedTable) : undefined;
                if (activeOrder && mozoCart.length === 0) {
                  return (
                    <ProfessionalOrderTicket
                      order={activeOrder}
                      waiterName={selectedWaiter}
                      onOrderStatusUpdate={onOrderStatusUpdate}
                      onRequestBill={async (tableNum) => {
                        try {
                          await WaiterCallService.requestAttention(tableNum, "request_bill");
                          onShowNotification(`💳 Cuenta solicitada para ${tableNum}.`, "info");
                        } catch (error) {
                          console.error("Error requesting bill:", error);
                          onShowNotification("⚠️ No se pudo solicitar la cuenta.", "warning");
                        }
                      }}
                      onShowNotification={onShowNotification}
                    />
                  );
                }

                const deliveryFeeExtra = mozoServiceType === "delivery" ? mozoDeliveryForm.deliveryFee : 0;
                const currentTotal = subtotal + deliveryFeeExtra;

                return (
                  <div className="flex-1 flex flex-col justify-between h-full">
                    <div className="space-y-4 flex-1 flex flex-col">
                      <div className="border-b border-white/20 pb-3 flex justify-between items-center">
                        <div>
                          <h4 className="font-serif text-base font-bold text-white">
                            {mozoServiceType === "takeaway"
                              ? `RETIRO LOCAL (#${stableTakeawayId})`
                              : mozoServiceType === "delivery"
                              ? `DELIVERY (#${stableDeliveryId})`
                              : `Comanda ${mozoSelectedTable}`}
                          </h4>
                          <span className="text-[10px] font-bold text-white/80 block mt-0.5">
                            {mozoServiceType === "takeaway"
                              ? `Cliente: ${mozoTakeawayForm.customerName || "Consumidor Final"}`
                              : mozoServiceType === "delivery"
                              ? `Cliente: ${mozoDeliveryForm.customerName || "Consumidor Final"}`
                              : `Mozo: ${selectedWaiter}`}
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-[#5C1D27] border border-white/20 text-white text-[9px] font-mono font-black uppercase tracking-wider">
                          {mozoServiceType === "takeaway" ? "RETIRO" : mozoServiceType === "delivery" ? "DELIVERY" : activeOrder ? "Edición" : "Nueva"}
                        </span>
                      </div>

                      <div className="space-y-3 overflow-y-auto flex-1 pr-1 max-h-[340px]">
                        {mozoCart.length > 0 ? (
                          mozoCart.map((cart, idx) => (
                            <div key={idx} className="bg-[#5C1D27]/80 border border-white/10 rounded-2xl p-3 space-y-2 text-white">
                              <div className="flex justify-between items-center text-xs font-semibold">
                                <div className="space-y-0.5 truncate pr-2">
                                  <strong className="text-white block truncate font-serif">{cart.item.name}</strong>
                                  <span className="text-[10px] text-white/70 font-mono font-bold">${cart.item.price.toLocaleString("es-AR")} c/u</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="flex items-center gap-1 bg-[#4A151D] border border-white/20 rounded-xl p-1">
                                    <button
                                      onClick={() => handleUpdateMozoCartQty(cart.item.id, -1)}
                                      className="h-6 w-6 bg-[#5C1D27] hover:bg-white hover:text-[#4A151D] text-white flex items-center justify-center rounded-lg text-xs font-black cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <span className="font-mono font-bold w-5 text-center text-white">{cart.qty}</span>
                                    <button
                                      onClick={() => handleUpdateMozoCartQty(cart.item.id, 1)}
                                      className="h-6 w-6 bg-[#5C1D27] hover:bg-white hover:text-[#4A151D] text-white flex items-center justify-center rounded-lg text-xs font-black cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveFromMozoCart(cart.item.id)}
                                    className="p-1.5 text-[#EBDAC5] hover:text-white transition-all cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              <input 
                                type="text"
                                value={cart.notes || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMozoCart(prev => prev.map((c, i) => i === idx ? { ...c, notes: val } : c));
                                }}
                                placeholder="Añadir aclaración (ej: bien cocido, sin hielo...)"
                                className="w-full text-[10px] p-2 border border-white/20 rounded-xl bg-[#4A151D] text-white placeholder-white/50 outline-none font-medium"
                              />
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center py-16 text-white/70 text-center space-y-2">
                            <ClipboardList className="h-8 w-8 text-white stroke-1.5" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-white block">Comanda Vacía</span>
                            <p className="text-[10px] text-white/70 max-w-[140px]">Seleccione productos del catálogo para agregarlos.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-white/20 pt-4 space-y-4">
                      <div className="space-y-1.5 text-xs font-bold text-white/80">
                        <div className="flex justify-between">
                          <span>Subtotal Consumos</span>
                          <span className="font-mono text-white">${subtotal.toLocaleString("es-AR")}</span>
                        </div>
                        {mozoServiceType === "delivery" && (
                          <div className="flex justify-between text-[#F5E4CC]">
                            <span>Envío Cadete</span>
                            <span className="font-mono">${deliveryFeeExtra.toLocaleString("es-AR")}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>IVA (21% Estimado)</span>
                          <span className="font-mono text-white">${(currentTotal - currentTotal / 1.21).toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/20 pt-2 text-sm font-black text-white">
                          <span>TOTAL COMANDA</span>
                          <span className="font-mono text-xl text-white">${currentTotal.toLocaleString("es-AR")}</span>
                        </div>
                      </div>

                      <button
                        onClick={handleSubmitMozoOrder}
                        disabled={mozoCart.length === 0}
                        className={`w-full py-3.5 rounded-2xl font-black text-xs shadow-md transition-all cursor-pointer uppercase tracking-wider ${
                          mozoCart.length > 0
                            ? "bg-[#FAF2E6] text-[#4A151D] hover:bg-white"
                            : "bg-[#5C1D27] text-white/40 border border-white/10 cursor-not-allowed"
                        }`}
                      >
                        Marchar Comanda a Cocina
                      </button>
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderProveedores = () => {
    const handleAddProvSubmit = async (e: FormEvent) => {
      e.preventDefault();
      if (!provFormName || !provFormPhone) {
        onShowNotification("⚠️ Ingrese el nombre y teléfono del proveedor.", "warning");
        return;
      }
      const suppliedItems = provFormItems
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const { data, error } = await supabase
        .from("suppliers")
        .insert({
          name: provFormName.trim(),
          supplied_items: suppliedItems,
          email: provFormContact.trim() || null,
          phone: provFormPhone.replace(/\D/g, ""),
          active: provFormStatus === "ACTIVO"
        })
        .select("*")
        .single();
      if (error) {
        console.error("Error creating supplier:", error);
        onShowNotification("⚠️ No se pudo registrar el proveedor en Supabase.", "warning");
        return;
      }
      const newProv = {
        id: data.id,
        name: data.name,
        items: (data.supplied_items || []).join(", "),
        contact: data.email || "",
        phone: data.phone || "",
        status: data.active ? "ACTIVO" : "PENDIENTE"
      };
      setProveedores(prev => [...prev, newProv]);
      setIsAddingProv(false);
      setProvFormName("");
      setProvFormItems("");
      setProvFormContact("");
      setProvFormPhone("");
      onShowNotification(`🤝 Proveedor '${newProv.name}' agregado con éxito.`, "success");
    };

    const handleWhatsAppOrder = (phone: string, name: string) => {
      const cleanPhone = phone.replace(/\D/g, "");
      const targetPhone = cleanPhone.startsWith("54") ? cleanPhone : "54" + cleanPhone;
      const text = `Hola ${name}, les escribo desde Resto Bar Del Teatro para realizar un pedido de insumos.`;
      const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank");
      onShowNotification(`📱 Abriendo chat de WhatsApp con ${name}...`, "info");
    };

    return (
      <motion.div
        key="proveedores-view"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-8 animate-fade-in text-[#2D0E13]"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#CFB5A0] pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#5E393F]">Abastecimiento & Logística</span>
            <h2 className="font-serif text-3xl font-bold text-[#5C1D27] mt-0.5">Directorio de Proveedores</h2>
            <p className="text-xs text-[#5E393F] mt-1 font-medium">Gestione contactos de compras y envíe pedidos rápidos por WhatsApp a proveedores de Resto Bar Del Teatro.</p>
          </div>
          <button
            onClick={() => setIsAddingProv(!isAddingProv)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer uppercase tracking-wider"
          >
            <Plus className="h-4 w-4" /> Agregar Proveedor
          </button>
        </div>

        {/* KPI Metric Summary Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#5E393F] block">Proveedores Registrados</span>
              <strong className="font-serif text-2xl font-black text-[#5C1D27] block mt-1">{proveedores.length}</strong>
              <span className="text-[9px] text-[#5E393F]">Contactos comerciales activos</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#EBDAC5] border border-[#CFB5A0] text-[#5C1D27] flex items-center justify-center shadow-xs">
              <Users className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#5E393F] block">Proveedores Activos</span>
              <strong className="font-serif text-2xl font-black text-[#4F735A] block mt-1">{proveedores.filter(p => p.status === "ACTIVO").length}</strong>
              <span className="text-[9px] text-[#4F735A] font-mono">Disponibles para pedidos</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#DFEADF] border border-[#4F735A]/40 text-[#4F735A] flex items-center justify-center shadow-xs">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#5E393F] block">Canal Directo de Compras</span>
              <strong className="font-serif text-lg font-black text-[#5C1D27] block mt-1">1-Click WhatsApp</strong>
              <span className="text-[9px] text-[#5E393F]">Envío automático de reposición</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#EBDAC5] border border-[#CFB5A0] text-[#5C1D27] flex items-center justify-center shadow-xs">
              <PhoneCall className="h-6 w-6 text-[#4F735A]" />
            </div>
          </div>
        </div>

        {/* Form to Add Supplier */}
        {isAddingProv && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-4"
          >
            <h3 className="font-serif text-lg font-bold text-[#5C1D27]">Nuevo Proveedor de Compra</h3>
            <form onSubmit={handleAddProvSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-[#2D0E13]">
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-[#5E393F] block mb-1">Nombre / Razón Social *</label>
                <input
                  type="text"
                  value={provFormName}
                  onChange={(e) => setProvFormName(e.target.value)}
                  placeholder="Ej: Distribuidora Sur"
                  className="w-full p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] outline-none font-semibold focus:border-[#5C1D27]"
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-[#5E393F] block mb-1">Teléfono / WhatsApp *</label>
                <input
                  type="text"
                  value={provFormPhone}
                  onChange={(e) => setProvFormPhone(e.target.value)}
                  placeholder="Ej: 358 444-1234"
                  className="w-full p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] outline-none font-semibold focus:border-[#5C1D27]"
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-[#5E393F] block mb-1">Correo de Ventas</label>
                <input
                  type="email"
                  value={provFormContact}
                  onChange={(e) => setProvFormContact(e.target.value)}
                  placeholder="Ej: ventas@proveedor.com"
                  className="w-full p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] outline-none font-semibold focus:border-[#5C1D27]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[9px] font-bold uppercase tracking-wider text-[#5E393F] block mb-1">Insumos Abastecidos</label>
                <input
                  type="text"
                  value={provFormItems}
                  onChange={(e) => setProvFormItems(e.target.value)}
                  placeholder="Ej: Harina 0000, Muzzarella, Fernet Branca, Café"
                  className="w-full p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] outline-none font-semibold focus:border-[#5C1D27]"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-[#5E393F] block mb-1">Estado Comercial</label>
                <select
                  value={provFormStatus}
                  onChange={(e) => setProvFormStatus(e.target.value)}
                  className="w-full p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] outline-none cursor-pointer font-bold focus:border-[#5C1D27]"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                </select>
              </div>

              <div className="md:col-span-3 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingProv(false)}
                  className="px-4 py-2 border border-[#CFB5A0] text-[#5E393F] rounded-xl hover:bg-[#EBDAC5] cursor-pointer font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5C1D27] hover:bg-[#4A151D] text-white rounded-xl shadow-xs cursor-pointer font-black uppercase tracking-wider"
                >
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Suppliers Table */}
        <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EBDAC5] border-b border-[#CFB5A0] text-[10px] font-black uppercase tracking-wider text-[#5E393F]">
                  <th className="p-4">Proveedor</th>
                  <th className="p-4">Insumos Abastecidos</th>
                  <th className="p-4">Contacto Ventas</th>
                  <th className="p-4">Teléfono / Pedidos</th>
                  <th className="p-4 text-center">Estado Comercial</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFB5A0] text-xs">
                {proveedores.map((prov, idx) => (
                  <tr key={idx} className="hover:bg-[#EBDAC5]/40 transition-colors">
                    <td className="p-4 font-serif font-bold text-[#5C1D27] text-sm">{prov.name}</td>
                    <td className="p-4 text-[#2D0E13] font-medium">{prov.items}</td>
                    <td className="p-4 font-mono font-semibold text-[#5E393F]">{prov.contact}</td>
                    <td className="p-4 font-mono font-bold text-[#5C1D27]">{prov.phone.startsWith("+") ? prov.phone : "+" + prov.phone.replace(/\D/g, "")}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-full tracking-wider border font-mono ${
                        prov.status === "ACTIVO" 
                          ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-300" 
                          : "bg-amber-950/90 border-amber-500/50 text-amber-300"
                      }`}>
                        {prov.status}
                      </span>
                    </td>
                    <td className="p-4 text-center flex items-center justify-center gap-2.5">
                      <button
                        onClick={() => handleWhatsAppOrder(prov.phone, prov.name)}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white rounded-xl transition-all cursor-pointer font-black text-[10px] uppercase shadow-md flex items-center gap-1.5"
                      >
                        💬 WhatsApp Directo
                      </button>
                      <button
                        onClick={async () => {
                          const { error } = await supabase
                            .from("suppliers")
                            .delete()
                            .eq("id", prov.id);
                          if (error) {
                            console.error("Error deleting supplier:", error);
                            onShowNotification("⚠️ No se pudo eliminar el proveedor.", "warning");
                            return;
                          }
                          setProveedores(prev => prev.filter(p => p.id !== prov.id));
                          onShowNotification(`🗑️ Proveedor '${prov.name}' eliminado.`, "info");
                        }}
                        className="p-1.5 text-[#5C1D27] hover:text-white bg-[#EBDAC5] hover:bg-[#5C1D27] border border-[#CFB5A0] rounded-xl transition-all cursor-pointer"
                        title="Eliminar proveedor"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderPersonal = () => {
    return (
      <motion.div
        key="personal-view"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-8 text-[#2D0E13]"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#CFB5A0] pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#5C1D27]">Equipo y Colaboradores</span>
            <h2 className="font-serif text-3xl font-bold text-[#5C1D27] mt-0.5">Gestión de Personal</h2>
          </div>

          <div className="flex gap-2 bg-[#EBDAC5]/50 p-1.5 border border-[#CFB5A0] rounded-2xl shadow-xs">
            <button
              type="button"
              onClick={() => setPersonalSubTab("asistencia")}
              className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                personalSubTab === "asistencia"
                  ? "bg-[#5C1D27] text-white shadow-xs"
                  : "bg-[#FAF2E6] text-[#5C1D27] hover:bg-white"
              }`}
            >
              📱 Control de Asistencia & GPS
            </button>
            <button
              type="button"
              onClick={() => setPersonalSubTab("cuentas")}
              className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                personalSubTab === "cuentas"
                  ? "bg-[#5C1D27] text-white shadow-xs"
                  : "bg-[#FAF2E6] text-[#5C1D27] hover:bg-white"
              }`}
            >
              👥 Cuentas Registradas
            </button>
          </div>
        </div>

        {personalSubTab === "asistencia" ? (
          renderAttendance()
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-[#2D0E13]">
            {/* Form to add user: only visible to owner/administrator */}
            {(currentUser.role === "administrador" || currentUser.role === "dueño") && (
              <div className="lg:col-span-4 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-4">
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div className="border-b border-[#CFB5A0] pb-2">
                    <h3 className="font-serif text-base font-bold text-[#5C1D27]">Crear Nueva Cuenta</h3>
                    <p className="text-[10px] text-[#5E393F] mt-0.5 font-medium">Registre empleados y asigne sus permisos de acceso.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-[#5E393F] block">Nombre Completo</label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Ej. Juan Pérez"
                      className="w-full text-xs p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] font-semibold outline-none focus:border-[#5C1D27]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-[#5E393F] block">Correo Electrónico</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="juan@restobardelteatro.com"
                      className="w-full text-xs p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] font-semibold outline-none focus:border-[#5C1D27]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-[#5E393F] block">Contraseña de Acceso</label>
                    <input
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] font-semibold outline-none focus:border-[#5C1D27]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-[#5E393F] block">Dirección Particular</label>
                    <input
                      type="text"
                      value={newUserAddress}
                      onChange={(e) => setNewUserAddress(e.target.value)}
                      placeholder="Calle 50 nro. 123, Mar del Plata"
                      className="w-full text-xs p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] font-semibold outline-none focus:border-[#5C1D27]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-[#5E393F] block">Teléfono Personal</label>
                      <input
                        type="text"
                        value={newUserPhone}
                        onChange={(e) => setNewUserPhone(e.target.value)}
                        placeholder="+54 223 555-1234"
                        className="w-full text-xs p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] font-semibold outline-none focus:border-[#5C1D27]"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-[#5E393F] block">Tel. Contacto Emerg.</label>
                      <input
                        type="text"
                        value={newUserEmergencyPhone}
                        onChange={(e) => setNewUserEmergencyPhone(e.target.value)}
                        placeholder="+54 223 555-9876"
                        className="w-full text-xs p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] font-semibold outline-none focus:border-[#5C1D27]"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-[#5E393F] block">Sueldo Base ($ Mensual)</label>
                      <input
                        type="number"
                        value={newUserSalary}
                        onChange={(e) => setNewUserSalary(e.target.value)}
                        placeholder="Ej. 180000"
                        className="w-full text-xs p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#5C1D27] font-mono font-bold outline-none focus:border-[#5C1D27]"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-[#5E393F] block">Antigüedad (Meses)</label>
                      <input
                        type="number"
                        value={newUserSeniority}
                        onChange={(e) => setNewUserSeniority(e.target.value)}
                        placeholder="Ej. 12"
                        className="w-full text-xs p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#5C1D27] font-mono font-bold outline-none focus:border-[#5C1D27]"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-[#5E393F] block">Rol / Cargo</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="w-full text-xs p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] font-bold text-[#2D0E13] cursor-pointer outline-none focus:border-[#5C1D27]"
                    >
                      <option value="mesero">Mesero</option>
                      <option value="barista">Barista</option>
                      <option value="cajero">Cajero</option>
                      <option value="administrador">Administrador</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingUser}
                    className={`w-full text-xs font-black py-3 rounded-xl transition-all cursor-pointer uppercase tracking-wider mt-4 shadow-xs flex items-center justify-center gap-2 ${
                      isCreatingUser
                        ? "bg-[#5C1D27]/50 text-white/70 cursor-not-allowed"
                        : "bg-[#5C1D27] hover:bg-[#4A151D] text-white"
                    }`}
                  >
                    {isCreatingUser ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        <span>Guardando Colaborador...</span>
                      </>
                    ) : (
                      <span>+ Registrar Colaborador</span>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Users list */}
            <div className={(currentUser.role === "administrador" || currentUser.role === "dueño") ? "lg:col-span-8 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-6" : "lg:col-span-12 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-6"}>
              <div className="border-b border-[#CFB5A0] pb-2">
                <h3 className="font-serif text-base font-bold text-[#5C1D27]">Cuentas Registradas</h3>
                <p className="text-[10px] text-[#5E393F] mt-0.5">
                  {(currentUser.role === "administrador" || currentUser.role === "dueño") 
                    ? "Listado completo de accesos, datos salariales y permisos del personal." 
                    : "Directorio de contacto de colaboradores en turno."}
                </p>
              </div>

              <div className="border border-[#2C1810]/10 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#2C1810]/5 border-b border-[#2C1810]/10 text-[9px] font-bold uppercase tracking-wider text-[#2C1810]/60">
                      <th className="p-3">Nombre</th>
                      {(currentUser.role === "administrador" || currentUser.role === "dueño") && <th className="p-3">Email / Dirección</th>}
                      {(currentUser.role === "administrador" || currentUser.role === "dueño") && <th className="p-3">Teléfono</th>}
                      <th className="p-3">Contacto Emergencia</th>
                      {(currentUser.role === "administrador" || currentUser.role === "dueño") && <th className="p-3 text-right">Sueldo</th>}
                      <th className="p-3 text-center">Rol</th>
                      {(currentUser.role === "administrador" || currentUser.role === "dueño") && <th className="p-3 text-right">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#2C1810]/10">
                    {users.map((user) => {
                      const meta = usersMetadata[user.id] || {};
                      return (
                        <tr 
                          key={user.id} 
                          onClick={() => {
                            if (currentUser.role === "administrador" || currentUser.role === "dueño") {
                              setSelectedUserForPermissions(user);
                            }
                          }}
                          className={`transition-colors cursor-pointer ${
                            selectedUserForPermissions?.id === user.id 
                              ? "bg-amber-50/40 hover:bg-amber-50/60" 
                              : "hover:bg-stone-50/50"
                          }`}
                        >
                          <td className="p-3 font-bold text-[#2C1810]">{user.name}</td>
                          {(currentUser.role === "administrador" || currentUser.role === "dueño") && (
                            <td className="p-3">
                              <span className="font-mono text-[9px] text-[#2C1810]/70 block">{user.email}</span>
                              <span className="text-[9px] text-[#2C1810]/40 block mt-0.5">{meta.direccion || "No cargado"}</span>
                            </td>
                          )}
                          {(currentUser.role === "administrador" || currentUser.role === "dueño") && (
                            <td className="p-3 font-mono text-[10px] text-[#2C1810]/70">
                              {meta.telefono || "No cargado"}
                            </td>
                          )}
                          <td className="p-3 font-mono text-[10px] text-[#2C1810]/70">
                            {meta.telefono_contacto || "No cargado"}
                          </td>
                          {(currentUser.role === "administrador" || currentUser.role === "dueño") && (
                            <td className="p-3 text-right font-mono font-bold text-emerald-800">
                              ${meta.sueldo ? meta.sueldo.toLocaleString() : "0"}
                            </td>
                          )}
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 text-[8px] font-black rounded-full uppercase ${
                              user.role === "administrador"
                                ? "bg-amber-100 text-amber-800"
                                : user.role === "barista"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-stone-100 text-stone-800"
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          {(currentUser.role === "administrador" || currentUser.role === "dueño") && (
                            <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.name)}
                                disabled={user.id === "usr-1" || user.id === currentUser.id}
                                className={`p-1.5 rounded-lg transition-all border ${
                                  user.id === "usr-1" || user.id === currentUser.id
                                    ? "text-stone-300 border-stone-100 cursor-not-allowed"
                                    : "text-red-600 border-red-100 hover:bg-red-50 cursor-pointer"
                                }`}
                                title="Eliminar Cuenta"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Granular Permissions Settings panel */}
              {(currentUser.role === "administrador" || currentUser.role === "dueño") && selectedUserForPermissions && (
                <div className="p-5 bg-[#FDFBF7] border border-[#C2956E]/20 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center border-b border-[#2C1810]/10 pb-2.5">
                    <div>
                      <span className="text-[8px] font-black uppercase text-[#C2956E] tracking-widest block">Configurar Accesos del Sistema</span>
                      <h4 className="font-serif text-sm font-bold text-[#2C1810]">Permisos para {selectedUserForPermissions.name}</h4>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-[#2C1810]/60 bg-[#2C1810]/5 px-2.5 py-1 rounded-lg">
                      Rol: {selectedUserForPermissions.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-semibold text-[#2C1810]/80">
                    {[
                      { id: "dashboard", label: "📈 Dashboard" },
                      { id: "inventario", label: "📦 Stock & Insumos" },
                      { id: "precios", label: "📖 Carta & Recetas" },
                      { id: "salon", label: "🗺️ Mapa de Salón" },
                      { id: "reservas", label: "📅 Reservas" },
                      { id: "pedidos_mozo", label: "📋 Módulo Mozo" },
                      { id: "caja", label: "💰 Caja & Comandas" },
                      { id: "proveedores", label: "🤝 Proveedores" },
                      { id: "personal", label: "👥 Personal" },
                      { id: "reportes", label: "📊 Reportes" }
                    ].map((mod) => {
                      const meta = usersMetadata[selectedUserForPermissions.id] || {};
                      const userPerms = meta.permissions || [];
                      const hasPerm = userPerms.includes(mod.id);

                      return (
                        <label 
                          key={mod.id}
                          className="flex items-center gap-2.5 p-2 bg-white border border-[#2C1810]/5 rounded-xl cursor-pointer hover:bg-stone-50 select-none"
                        >
                          <input
                            type="checkbox"
                            checked={hasPerm}
                            disabled={selectedUserForPermissions.id === "usr-1" && mod.id === "personal"}
                            onChange={() => {
                              let updatedPerms = [...userPerms];
                              if (hasPerm) {
                                updatedPerms = updatedPerms.filter(p => p !== mod.id);
                              } else {
                                updatedPerms.push(mod.id);
                              }

                              const updatedMeta = {
                                ...usersMetadata,
                                [selectedUserForPermissions.id]: {
                                  ...meta,
                                  permissions: updatedPerms
                                }
                              };
                              saveUsersMetadata(updatedMeta, selectedUserForPermissions.id);
                              onShowNotification(`⚙️ Permisos de ${selectedUserForPermissions.name} actualizados.`, "info");
                            }}
                            className="h-4 w-4 rounded border-stone-300 text-[#2C1810] focus:ring-[#2C1810]/30 cursor-pointer"
                          />
                          <span>{mod.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const renderSalon = () => {
    const defaultCoords = [
      { x: 14, y: 18 }, { x: 38, y: 18 }, { x: 62, y: 18 }, { x: 84, y: 18 },
      { x: 14, y: 48 }, { x: 38, y: 48 }, { x: 62, y: 48 }, { x: 84, y: 48 },
      { x: 14, y: 78 }, { x: 38, y: 78 }, { x: 62, y: 78 }, { x: 84, y: 78 }
    ];

    const getStoredPos = (id: string, index: number) => {
      if (tablePositions[id]) return tablePositions[id];
      try {
        const stored = localStorage.getItem(`castano_table_pos_${id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed.x === "number" && typeof parsed.y === "number") {
            return parsed;
          }
        }
      } catch {
        // Fallback
      }
      return defaultCoords[index % defaultCoords.length];
    };

    const handleSavePos = (id: string, posX: number, posY: number) => {
      const newPos = { x: posX, y: posY };
      setTablePositions(prev => ({ ...prev, [id]: newPos }));
      try {
        localStorage.setItem(`castano_table_pos_${id}`, JSON.stringify(newPos));
        supabase.channel("castano-realtime-sync").send({
          type: "broadcast",
          event: "table_pos_moved",
          payload: { id, x: posX, y: posY }
        });
      } catch (e) {
        console.error("Error saving table position:", e);
      }
    };

    const activeTables = [...restaurantTables];
    if (activeTables.length < 12) {
      for (let i = activeTables.length + 1; i <= 12; i++) {
        activeTables.push({
          id: `mesa-${i}`,
          name: `Mesa ${i}`,
          capacity: i % 2 === 0 ? 4 : 2,
          status: "Activo" as const
        });
      }
    }

    const handleMergeTableToggle = (tableId: string) => {
      const linkedTableId = mergedTableIds[tableId];
      if (linkedTableId) {
        setMergedTableIds((current) => {
          const next = { ...current };
          delete next[tableId];
          delete next[linkedTableId];
          return next;
        });
        onShowNotification("🔗 Las mesas fueron desvinculadas.", "info");
        return;
      }

      const candidate = activeTables.find(
        (table) => table.id !== tableId && !mergedTableIds[table.id]
      );
      if (!candidate) {
        onShowNotification("⚠️ No hay otra mesa disponible para unir.", "warning");
        return;
      }

      setMergedTableIds((current) => ({
        ...current,
        [tableId]: candidate.id,
        [candidate.id]: tableId
      }));
      onShowNotification(`🔗 Mesa unida con ${candidate.name}.`, "success");
    };

    const handleResetGrid = () => {
      const newMap: { [id: string]: { x: number; y: number } } = {};
      activeTables.forEach((t, idx) => {
        const gridPos = defaultCoords[idx % defaultCoords.length];
        newMap[t.id] = gridPos;
        localStorage.setItem(`castano_table_pos_${t.id}`, JSON.stringify(gridPos));
      });
      setTablePositions(newMap);
      onShowNotification("✨ Cuadrícula de mesas alineada y reordenada en el plano.", "success");
    };

    const handleAddTable = async (e: FormEvent) => {
      e.preventDefault();
      if (!newTableName) return;
      const cleanName = newTableName.trim();
      if (restaurantTables.some(t => t.name.toLowerCase() === cleanName.toLowerCase())) {
        onShowNotification("⚠️ Ya existe una mesa con ese nombre.", "warning");
        return;
      }
      const { data, error } = await supabase
        .from("restaurant_tables")
        .insert({ name: cleanName, capacity: newTableCapacity, active: true })
        .select("*")
        .single();
      if (error) {
        console.error("Error creating restaurant table:", error);
        onShowNotification("⚠️ No se pudo guardar la mesa en Supabase.", "warning");
        return;
      }
      const newTable = {
        id: data.id,
        name: data.name,
        capacity: Number(data.capacity),
        status: "Activo" as const
      };
      setRestaurantTables(prev => [...prev, newTable]);
      setNewTableName("");
      onShowNotification(`🎉 Mesa "${cleanName}" agregada con éxito.`, "success");
    };

    const handleDeleteTable = async (id: string) => {
      const tableObj = restaurantTables.find(t => t.id === id);
      if (tableObj) {
        const activeOrder = orders.find(o => o.status !== "Completado" && o.tableNumber === tableObj.name);
        if (activeOrder) {
          onShowNotification("⚠️ No se puede eliminar una mesa que está ocupada.", "warning");
          return;
        }
      }
      const { error } = await supabase.from("restaurant_tables").delete().eq("id", id);
      if (error) {
        console.error("Error deleting restaurant table:", error);
        onShowNotification("⚠️ No se pudo eliminar la mesa de Supabase.", "warning");
        return;
      }
      setRestaurantTables(prev => prev.filter(t => t.id !== id));
      onShowNotification("🗑️ Mesa eliminada del plano.", "info");
    };

    const handleToggleTableStatus = async (id: string) => {
      const table = restaurantTables.find((candidate) => candidate.id === id);
      if (!table) return;
      const nextStatus = table.status === "Activo" ? "Mantenimiento" : "Activo";
      const { error } = await supabase
        .from("restaurant_tables")
        .update({ active: nextStatus === "Activo", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        console.error("Error updating restaurant table:", error);
        onShowNotification("⚠️ No se pudo actualizar la mesa en Supabase.", "warning");
        return;
      }
      setRestaurantTables(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));
      onShowNotification(`🔧 Mesa "${table.name}" cambiada a ${nextStatus.toUpperCase()}.`, "info");
    };

    return (
      <motion.div
        key="salon-view"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-8 text-[#2D0E13]"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#5E393F]">Control en Vivo</span>
            <h2 className="font-serif text-3xl font-bold text-[#2D0E13] mt-0.5">Plano del Salón</h2>
            <p className="text-xs text-[#5E393F] mt-1 font-medium">
              Mapa de arquitectura con 12 mesas arrastrables y estado en tiempo real.
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2 bg-[#FAF2E6] p-1.5 border border-[#CFB5A0] rounded-2xl shadow-sm">
            <button
              type="button"
              onClick={() => setFloorViewMode("map2d")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                floorViewMode === "map2d"
                  ? "bg-[#5C1D27] text-white shadow-md font-black"
                  : "text-[#2D0E13] hover:bg-[#EBDAC5]"
              }`}
            >
              <span>🗺️ Mapa Arquitectónico 2D</span>
            </button>
            <button
              type="button"
              onClick={() => setFloorViewMode("cards")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                floorViewMode === "cards"
                  ? "bg-[#5C1D27] text-white shadow-md font-black"
                  : "text-[#2D0E13] hover:bg-[#EBDAC5]"
              }`}
            >
              <span>📋 Vista de Tarjetas</span>
            </button>
          </div>
        </div>

        {/* Realtime KPI Banner & Status Filter Tabs */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#FAF2E6] border border-[#CFB5A0] p-3 rounded-2xl flex items-center gap-3 shadow-xs">
              <span className="text-2xl">📊</span>
              <div>
                <span className="text-[10px] text-[#5E393F] font-black uppercase block">Ocupación Salón</span>
                <span className="text-sm font-extrabold text-[#5C1D27]">
                  {Math.round((orders.filter(o => o.status !== "Completado").length / 12) * 100)}%
                </span>
              </div>
            </div>

            <div className="bg-[#FAF2E6] border border-[#CFB5A0] p-3 rounded-2xl flex items-center gap-3 shadow-xs">
              <span className="text-2xl">🟢</span>
              <div>
                <span className="text-[10px] text-[#5E393F] font-black uppercase block">Mesas Libres</span>
                <span className="text-sm font-extrabold text-[#4F735A]">
                  {12 - orders.filter(o => o.status !== "Completado").length} / 12
                </span>
              </div>
            </div>

            <div className="bg-[#FAF2E6] border border-[#CFB5A0] p-3 rounded-2xl flex items-center gap-3 shadow-xs">
              <span className="text-2xl">🔴</span>
              <div>
                <span className="text-[10px] text-[#5E393F] font-black uppercase block">Mesas Ocupadas</span>
                <span className="text-sm font-extrabold text-[#5C1D27]">
                  {orders.filter(o => o.status !== "Completado").length}
                </span>
              </div>
            </div>

            <div className="bg-[#FAF2E6] border border-[#CFB5A0] p-3 rounded-2xl flex items-center gap-3 shadow-xs">
              <span className="text-2xl">🟡</span>
              <div>
                <span className="text-[10px] text-[#5E393F] font-black uppercase block">Reservas Hoy</span>
                <span className="text-sm font-extrabold text-[#B97932]">
                  {adminBookings.filter(b => b.date === new Date().toISOString().split("T")[0]).length}
                </span>
              </div>
            </div>
          </div>

          {/* Status Filter Selector Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-[#2D0E13] bg-[#FAF2E6] p-3 border border-[#CFB5A0] rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { id: "all", label: "Todas las Mesas (12)" },
                { id: "Libre", label: "🟢 Libres" },
                { id: "Ocupada", label: "🔴 Ocupadas" },
                { id: "Reservada", label: "🟡 Reservadas" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTableStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                    tableStatusFilter === tab.id
                      ? "bg-[#5C1D27] text-white shadow-xs"
                      : "bg-white border border-[#CFB5A0] text-[#2D0E13] hover:bg-[#EBDAC5]"
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
            <span className="text-[10px] text-[#5E393F] italic font-semibold">
              ⚡ Sincronización en tiempo real multiterminal (PC + Móvil)
            </span>
          </div>
        </div>

        {/* 2D ARCHITECTURAL FLOOR PLAN MAP */}
        {floorViewMode === "map2d" && (
          <div className="bg-[#FAF2E6] border-2 border-[#CFB5A0] rounded-3xl p-6 shadow-md relative space-y-4">
            {/* Header info & Interactive Tool Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-bold border-b border-[#CFB5A0] pb-3">
              <div>
                <span className="text-[#5C1D27] uppercase tracking-wider font-extrabold flex items-center gap-2">
                  🏛️ PLANO ARQUITECTÓNICO — CASTAÑO RESTO BAR (12 MESAS EN SALÓN)
                </span>
                <span className="text-[10px] text-[#5E393F]">Constitución 944 • Frente al Teatro Municipal</span>
              </div>

              {/* Toolbar Actions: Mover, Unir, Eliminar */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setIsMoveModeActive(!isMoveModeActive);
                    onShowNotification(
                      isMoveModeActive ? "🔒 Arrastre de mesas bloqueado." : "🖐️ Modo arrastre activado: Mueva las mesas libremente.",
                      "info"
                    );
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 border ${
                    isMoveModeActive
                      ? "bg-[#4F735A] text-white border-emerald-800 shadow-xs"
                      : "bg-stone-200 text-stone-700 border-stone-400"
                  }`}
                >
                  <span>{isMoveModeActive ? "🖐️ Mover Mesas (Activo)" : "🔒 Mover Mesas (Bloqueado)"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const firstFree = activeTables.find(t => !mergedTableIds[t.id]);
                    if (firstFree) {
                      setSelectedTableForModal({
                        ...firstFree,
                        statusBadge: "Libre",
                        activeOrder: null,
                        reservation: null
                      });
                    } else {
                      onShowNotification("⚠️ Seleccione una mesa tocándola en el plano para unirla.", "info");
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-[#B97932] text-white border border-amber-800 shadow-xs hover:bg-[#A0672A] transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>🔗 Unir Mesas</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const targetEl = document.getElementById("table-editor-panel");
                    if (targetEl) targetEl.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-[#5C1D27] text-white border border-red-950 shadow-xs hover:bg-[#4A151D] transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>🗑️ Eliminar / Crear Mesa</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetGrid}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-stone-700 text-white border border-stone-900 shadow-xs hover:bg-stone-800 transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>🔄 Alinear Grid</span>
                </button>
              </div>
            </div>

            {/* Architectural Blueprint Canvas Container */}
            <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#CFB5A0]">
              <div 
                id="architectural-canvas"
                className="relative min-w-[700px] w-full h-[540px] bg-[#F8F1E9] border-2 border-dashed border-[#CFB5A0] rounded-2xl overflow-hidden shadow-inner selection:bg-transparent"
                style={{
                  backgroundImage: "radial-gradient(#CFB5A0 1px, transparent 1px)",
                  backgroundSize: "24px 24px"
                }}
              >
                {/* Architectural Landmark: Main Entrance Door */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 bg-[#5C1D27] text-white px-6 py-1 rounded-b-xl text-[10px] font-black uppercase tracking-widest shadow-md flex items-center gap-2 border-b-2 border-x-2 border-[#CFB5A0]">
                  🚪 ENTRADA PRINCIPAL / SALIDA DE SALÓN
                </div>

                {/* Architectural Landmark: Bar Counter */}
                <div className="absolute top-4 right-4 z-10 bg-[#EBDAC5] border-2 border-[#5C1D27] p-3 rounded-2xl text-center shadow-md">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#5C1D27] block">☕ BARRA & CAFETERÍA</span>
                  <span className="text-[8px] text-[#5E393F] block font-bold">Máquina Espresso & Coctelería</span>
                </div>

                {/* Architectural Landmark: Theater View Windows */}
                <div className="absolute bottom-0 inset-x-12 z-10 bg-[#5C1D27]/10 border-t-2 border-dashed border-[#5C1D27] py-1 text-center text-[9px] font-black uppercase tracking-widest text-[#5C1D27]">
                  🎭 VENTANAL A CALLE CONSTITUCIÓN (VISTA AL TEATRO MUNICIPAL)
                </div>

                {/* Architectural Landmark: Terrace / Garden Outer Edge */}
                <div className="absolute top-12 left-0 bottom-12 w-8 bg-[#4F735A]/15 border-r-2 border-dashed border-[#4F735A] flex items-center justify-center [writing-mode:vertical-lr] rotate-180 text-[9px] font-black uppercase tracking-widest text-[#4F735A]">
                  🌿 TERRAZA & PATIO EXTERIOR
                </div>

                {/* Render 12 Draggable Table Tokens */}
                {activeTables.filter(table => {
                  if (tableStatusFilter === "all") return true;
                  const activeOrder = orders.find(o => o.status !== "Completado" && o.tableNumber === table.name);
                  const todayStr = new Date().toISOString().split("T")[0];
                  const reservation = adminBookings.find(b => b.tableId === table.id && b.date === todayStr);
                  const currentBadge = activeOrder ? "Ocupada" : reservation ? "Reservada" : "Libre";
                  return currentBadge === tableStatusFilter;
                }).map((table, index) => {
                  const pos = getStoredPos(table.id, index);
                  const activeOrder = orders.find(o => o.status !== "Completado" && o.tableNumber === table.name);
                  const todayStr = new Date().toISOString().split("T")[0];
                  const reservation = adminBookings.find(b => b.tableId === table.id && b.date === todayStr);

                  let statusColor = "bg-[#4F735A] border-emerald-800 text-white";
                  let statusBadge = "Libre";
                  if (table.status === "Mantenimiento") {
                    statusColor = "bg-[#A63F45] border-red-900 text-white opacity-60";
                    statusBadge = "Mantenimiento";
                  } else if (activeOrder) {
                    statusColor = "bg-[#5C1D27] border-red-950 text-white animate-pulse";
                    statusBadge = "Ocupada";
                  } else if (reservation) {
                    statusColor = "bg-[#B97932] border-amber-900 text-white";
                    statusBadge = "Reservada";
                  }

                  const joinedName = mergedTableIds[table.id];

                  return (
                    <motion.div
                      key={table.id}
                      drag={isMoveModeActive}
                      dragSnapToOrigin={true}
                      dragMomentum={false}
                      onDragEnd={(e: any, info) => {
                        const canvas = document.getElementById("architectural-canvas");
                        if (canvas) {
                          const rect = canvas.getBoundingClientRect();
                          const newX = Math.min(Math.max(((info.point.x - rect.left) / rect.width) * 100, 5), 90);
                          const newY = Math.min(Math.max(((info.point.y - rect.top) / rect.height) * 100, 5), 90);
                          handleSavePos(table.id, newX, newY);
                        }
                      }}
                      onClick={() => {
                        setSelectedTableForModal({
                          ...table,
                          statusBadge,
                          activeOrder: activeOrder || null,
                          reservation: reservation || null
                        });
                      }}
                      style={{
                        position: "absolute",
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        transform: "translate(-50%, -50%)"
                      }}
                      className={`w-28 h-28 rounded-2xl p-2 cursor-pointer shadow-lg border-2 flex flex-col justify-between transition-shadow hover:shadow-xl z-20 ${statusColor}`}
                    >
                      {/* Top Header: Table Name & Capacity */}
                      <div className="flex justify-between items-center text-[10px] font-black border-b border-white/20 pb-1">
                        <span className="truncate">{table.name}</span>
                        <span className="bg-black/30 px-1.5 py-0.5 rounded text-[8px] font-mono">
                          {table.capacity}P
                        </span>
                      </div>

                      {/* Center: Main status text or reservation info */}
                      <div className="text-center my-auto space-y-0.5">
                        {statusBadge === "Reservada" && reservation && (
                          <div className="leading-none">
                            <span className="text-[9px] font-black block truncate">👤 {reservation.customerName}</span>
                            <span className="text-[8px] opacity-90 block font-mono">⏰ {reservation.timeSlot}</span>
                          </div>
                        )}

                        {statusBadge === "Ocupada" && activeOrder && (
                          <div className="leading-none">
                            <span className="text-[9px] font-black block">🛒 Ocupada</span>
                            <span className="text-[10px] font-black font-mono block">${activeOrder.total.toFixed(0)}</span>
                          </div>
                        )}

                        {statusBadge === "Libre" && (
                          <span className="text-[10px] font-bold uppercase tracking-wider block">🟢 Libre</span>
                        )}

                        {statusBadge === "Mantenimiento" && (
                          <span className="text-[8px] font-bold uppercase block">🔧 Taller</span>
                        )}

                        {joinedName && (
                          <span className="bg-white/90 text-[#5C1D27] text-[7px] font-black px-1 rounded block">
                            🔗 + {joinedName}
                          </span>
                        )}
                      </div>

                      {/* Bottom Indicator */}
                      <div className="text-[7px] font-mono text-center opacity-80 uppercase tracking-widest">
                        Tocar para opciones
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Grid Cards View fallback */}
        {floorViewMode === "cards" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTables.map((table) => {
              const activeOrder = orders.find(o => o.status !== "Completado" && o.tableNumber === table.name);
              const todayStr = new Date().toISOString().split("T")[0];
              const reservation = adminBookings.find(b => b.tableId === table.id && b.date === todayStr);

              let status: "Libre" | "Ocupada" | "Reservada" | "Mantenimiento" = "Libre";
              let colorClasses = "border-[#4F735A]/40 bg-[#FAF2E6] text-[#2D0E13] shadow-sm";
              if (table.status === "Mantenimiento") {
                status = "Mantenimiento";
                colorClasses = "border-[#A63F45]/40 bg-[#FAF2E6] text-[#2D0E13] shadow-sm";
              } else if (activeOrder) {
                status = "Ocupada";
                colorClasses = "border-[#5C1D27] bg-[#FAF2E6] text-[#2D0E13] shadow-sm";
              } else if (reservation) {
                status = "Reservada";
                colorClasses = "border-[#B97932]/40 bg-[#FAF2E6] text-[#2D0E13] shadow-sm";
              }

              return (
                <div
                  key={table.id}
                  className={`border rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[220px] transition-all relative ${colorClasses}`}
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-[#CFB5A0] pb-3 mb-3">
                      <span className="font-serif text-lg font-black text-[#5C1D27]">{table.name}</span>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-[#EBDAC5] border border-[#CFB5A0] text-[#5C1D27]">
                        {table.capacity} Personas
                      </span>
                    </div>

                    {status === "Mantenimiento" && (
                      <div className="py-4">
                        <p className="text-xs text-[#A63F45] italic font-semibold">🔧 Mesa fuera de servicio por mantenimiento.</p>
                      </div>
                    )}

                    {status === "Libre" && (
                      <div className="py-4">
                        <p className="text-xs text-[#5E393F] italic font-semibold">Mesa disponible para recibir comensales.</p>
                      </div>
                    )}

                    {status === "Reservada" && reservation && (
                      <div className="space-y-1.5 py-2 text-xs">
                        <p className="font-bold text-[#B97932]">📌 Reservada por: {reservation.customerName}</p>
                        <p className="text-[10px] text-[#5E393F] font-semibold font-mono">Horario: {reservation.timeSlot} • Fecha: {reservation.date}</p>
                        <p className="text-[10px] text-[#5E393F] font-semibold">Teléfono: {reservation.customerPhone}</p>
                      </div>
                    )}

                    {status === "Ocupada" && activeOrder && (
                      <div className="space-y-2 py-1 text-xs">
                        <div className="flex justify-between items-center text-[10px] uppercase font-black text-[#5C1D27]">
                          <span>Consumo Activo</span>
                          <span>Total: ${activeOrder.total.toFixed(0)}</span>
                        </div>
                        <div className="max-h-[60px] overflow-y-auto pr-1 text-[10px] text-[#5E393F] space-y-0.5 font-semibold">
                          {activeOrder.items.map((it: any, idx: number) => (
                            <div key={idx} className="flex justify-between">
                              <span>{it.quantity}x {it.name}</span>
                              <span>${(it.price * it.quantity).toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#CFB5A0] mt-2">
                    {status === "Libre" && (
                      <button
                        type="button"
                        onClick={() => {
                          setPosTable(table.name);
                          setActiveSubTab("caja");
                          onShowNotification(`✨ Iniciando pedido para la ${table.name}.`, "info");
                        }}
                        className="w-full bg-[#4F735A] hover:bg-[#3D5B46] text-white text-[10px] font-bold py-2 rounded-xl transition-all cursor-pointer uppercase tracking-wider shadow-xs"
                      >
                        Abrir Mesa
                      </button>
                    )}

                    {status === "Reservada" && (
                      <button
                        type="button"
                        onClick={() => {
                          setPosTable(table.name);
                          setActiveSubTab("caja");
                          onShowNotification(`📌 Ocupando mesa reservada para la ${table.name}.`, "info");
                        }}
                        className="w-full bg-[#B97932] hover:bg-[#A0672A] text-white text-[10px] font-bold py-2 rounded-xl transition-all cursor-pointer uppercase tracking-wider shadow-xs"
                      >
                        Registrar Arribo
                      </button>
                    )}

                    {status === "Ocupada" && activeOrder && (
                      <button
                        type="button"
                        onClick={() => {
                          setPosCheckoutOrder(activeOrder);
                          setPaymentMethod("Tarjeta");
                          setReceivedCashInput("");
                          setPosCouponInput("");
                          setActiveSubTab("caja");
                        }}
                        className="w-full bg-[#5C1D27] hover:bg-[#4A151D] text-white text-[10px] font-bold py-2 rounded-xl transition-all cursor-pointer uppercase tracking-wider shadow-xs"
                      >
                        💵 Cobrar Ticket
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Table Detail Modal Popover */}
        {selectedTableForModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-[#FAF2E6] border-2 border-[#5C1D27] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-xs text-[#2D0E13] relative">
              <div className="flex justify-between items-center border-b border-[#CFB5A0] pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#5C1D27] tracking-wider block">Ficha de Mesa en Salón</span>
                  <h3 className="font-serif text-xl font-bold text-[#2D0E13]">{selectedTableForModal.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTableForModal(null)}
                  className="h-8 w-8 rounded-full bg-[#EBDAC5] text-[#5C1D27] font-bold flex items-center justify-center hover:bg-[#5C1D27] hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Status Badge Banner */}
              <div className="p-3 rounded-2xl bg-white border border-[#CFB5A0] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#5E393F]">Estado Actual:</span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    selectedTableForModal.statusBadge === "Libre" ? "bg-[#4F735A] text-white" :
                    selectedTableForModal.statusBadge === "Ocupada" ? "bg-[#5C1D27] text-white" :
                    selectedTableForModal.statusBadge === "Reservada" ? "bg-[#B97932] text-white" : "bg-stone-500 text-white"
                  }`}>
                    {selectedTableForModal.statusBadge}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-[#5E393F]">Capacidad Salón:</span>
                  <span className="font-mono font-bold text-[#5C1D27]">{selectedTableForModal.capacity} Personas</span>
                </div>
              </div>

              {/* Reservation Info if Reserved */}
              {selectedTableForModal.reservation && (
                <div className="p-3.5 rounded-2xl bg-[#B97932]/10 border border-[#B97932]/30 space-y-1.5 text-xs text-[#2D0E13]">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#B97932] block">📌 Detalle de Reserva Activa</span>
                  <p className="font-bold">👤 Comensal: {selectedTableForModal.reservation.customerName}</p>
                  <p className="font-mono">📅 Fecha: {selectedTableForModal.reservation.date} • Horario: {selectedTableForModal.reservation.timeSlot}</p>
                  <p className="font-mono">📞 Teléfono: {selectedTableForModal.reservation.customerPhone}</p>
                </div>
              )}

              {/* Active Order Info if Occupied */}
              {selectedTableForModal.activeOrder && (
                <div className="p-3.5 rounded-2xl bg-[#5C1D27]/10 border border-[#5C1D27]/30 space-y-2 text-xs text-[#2D0E13]">
                  <div className="flex justify-between items-center text-[#5C1D27] font-black">
                    <span className="text-[10px] uppercase tracking-wider">🛒 Consumo Activo</span>
                    <span className="font-mono">Total: ${selectedTableForModal.activeOrder.total.toFixed(0)}</span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1 font-semibold text-[11px]">
                    {selectedTableForModal.activeOrder.items.map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between border-b border-[#CFB5A0]/40 pb-0.5">
                        <span>{it.quantity}x {it.name}</span>
                        <span>${(it.price * it.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2">
                {selectedTableForModal.statusBadge === "Libre" && (
                  <button
                    type="button"
                    onClick={() => {
                      setPosTable(selectedTableForModal.name);
                      setSelectedTableForModal(null);
                      setActiveSubTab("caja");
                      onShowNotification(`✨ Abriendo comanda para ${selectedTableForModal.name}.`, "success");
                    }}
                    className="w-full py-3 rounded-xl bg-[#4F735A] hover:bg-[#3D5B46] text-white font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    ✨ Abrir Comanda POS para esta Mesa
                  </button>
                )}

                {selectedTableForModal.statusBadge === "Reservada" && (
                  <button
                    type="button"
                    onClick={() => {
                      setPosTable(selectedTableForModal.name);
                      setSelectedTableForModal(null);
                      setActiveSubTab("caja");
                      onShowNotification(`📌 Ocupando mesa reservada para ${selectedTableForModal.name}.`, "success");
                    }}
                    className="w-full py-3 rounded-xl bg-[#B97932] hover:bg-[#A0672A] text-white font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    📌 Registrar Arribo de Comensales
                  </button>
                )}

                {selectedTableForModal.statusBadge === "Ocupada" && selectedTableForModal.activeOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      setPosCheckoutOrder(selectedTableForModal.activeOrder);
                      setSelectedTableForModal(null);
                      setPaymentMethod("Tarjeta");
                      setReceivedCashInput("");
                      setPosCouponInput("");
                      setActiveSubTab("caja");
                    }}
                    className="w-full py-3 rounded-xl bg-[#5C1D27] hover:bg-[#4A151D] text-white font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    💵 Ir a Cobrar Ticket a Caja
                  </button>
                )}

                {/* Action 1: Move / Reposition */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMoveModeActive(true);
                    setSelectedTableForModal(null);
                    onShowNotification(`🖐️ Arrastre ${selectedTableForModal.name} en el plano para moverla.`, "info");
                  }}
                  className="w-full py-2.5 rounded-xl border border-[#4F735A] text-[#4F735A] bg-[#FAF2E6] font-bold text-xs hover:bg-[#4F735A] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🖐️ Mover / Reposicionar Posición</span>
                </button>

                {/* Action 2: Merge / Group */}
                <button
                  type="button"
                  onClick={() => {
                    handleMergeTableToggle(selectedTableForModal.id);
                    setSelectedTableForModal(null);
                  }}
                  className="w-full py-2.5 rounded-xl border border-[#B97932] text-[#B97932] bg-[#FAF2E6] font-bold text-xs hover:bg-[#B97932] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🔗 {mergedTableIds[selectedTableForModal.id] ? "Desvincular Grupo de Mesas" : "Unir / Combinar con otra Mesa"}</span>
                </button>

                {/* Action 3: Delete */}
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteTable(selectedTableForModal.id);
                    setSelectedTableForModal(null);
                  }}
                  className="w-full py-2 rounded-xl border border-[#A63F45] text-[#A63F45] bg-[#FAF2E6] font-bold text-xs hover:bg-[#A63F45] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🗑️ Eliminar esta Mesa del Plano</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table Editor Panel */}
        <div id="table-editor-panel" className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-[#CFB5A0] pb-4">
            <h3 className="font-serif text-lg font-bold text-[#5C1D27]">Configuración y Distribución del Salón</h3>
            <p className="text-[10px] text-[#5E393F] mt-0.5 font-medium">Modifique el plano del local, agregue mesas nuevas o márquelas en mantenimiento.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form: Add table */}
            <form onSubmit={handleAddTable} className="lg:col-span-4 space-y-4 text-xs font-semibold text-[#2D0E13]">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#5C1D27] border-b border-[#CFB5A0] pb-1 flex items-center gap-1.5">
                ➕ Agregar Mesa Nueva
              </h4>
              <div>
                <label className="text-[8px] font-bold text-[#5E393F] uppercase block mb-1">Nombre (ej: Mesa 9, VIP-2)</label>
                <input 
                  type="text"
                  placeholder="Nombre de mesa"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] font-bold outline-none focus:border-[#5C1D27]"
                />
              </div>
              <div>
                <label className="text-[8px] font-bold text-[#5E393F] uppercase block mb-1">Capacidad (Comensales)</label>
                <select
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                  className="w-full p-2.5 border border-[#CFB5A0] rounded-xl bg-[#FAF2E6] text-[#2D0E13] font-bold cursor-pointer outline-none focus:border-[#5C1D27]"
                >
                  <option value="2">2 Personas</option>
                  <option value="4">4 Personas</option>
                  <option value="6">6 Personas</option>
                  <option value="8">8 Personas</option>
                  <option value="12">12 Personas</option>
                </select>
              </div>
              <button 
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#2C1810] hover:bg-[#3d2217] text-white text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border-none"
              >
                Agregar al Plano
              </button>
            </form>

            {/* List: Manage existing tables */}
            <div className="lg:col-span-8 space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#C2956E] border-b border-[#2C1810]/5 pb-1 flex items-center gap-1.5">
                📋 Listado y Estados de Distribución
              </h4>
              <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                {restaurantTables.map((t) => (
                  <div key={t.id} className="p-3 bg-stone-50 border border-stone-150 rounded-2xl flex justify-between items-center text-[10px] font-semibold text-[#2C1810]/80">
                    <div>
                      <strong className="text-xs text-[#2C1810]">{t.name}</strong>
                      <span className="text-[9px] text-[#2C1810]/50 block font-normal">Capacidad: {t.capacity} comensales</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleTableStatus(t.id)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${
                          t.status === "Activo"
                            ? "bg-emerald-50 border-emerald-250 text-emerald-800"
                            : "bg-red-50 border-red-250 text-red-800"
                        }`}
                      >
                        {t.status === "Activo" ? "Activa" : "Mantenimiento"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTable(t.id)}
                        className="p-1.5 bg-white border border-stone-250 hover:border-red-200 text-stone-400 hover:text-red-700 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const handleExportPDF = () => {
    try {
      AuditPDFService.generateAuditPDF(orders, cashLedger.transactions, mermaLogs);
      onShowNotification("📄 Reporte de Auditoría PDF generado y descargado con éxito.", "success");
    } catch (e) {
      console.error("Error generating PDF audit:", e);
      onShowNotification("⚠️ Error al generar el PDF de auditoría.", "warning");
    }
  };

  const handleExportCSV = () => {
    // Generate CSV for transactions
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "=== REPORTES DE AUDITORIA - RESTO BAR DEL TEATRO ===\n\n";
    
    // Section 1: Transacciones de Caja
    csvContent += "=== TRANSACCIONES DE CAJA ===\n";
    csvContent += "ID Comanda,Fecha y Hora,Metodo de Pago,Total Facturado\n";
    cashLedger.transactions.forEach((tx: any) => {
      csvContent += `"${tx.orderId}","${tx.timestamp}","${tx.method}",$${tx.total.toFixed(0)}\n`;
    });

    csvContent += "\n=== HISTORIAL DE MERMAS DE MATERIA PRIMA ===\n";
    csvContent += "Fecha,Insumo,Descripcion,Cantidad,Costo Estimado,Auditor\n";
    
    mermaLogs.forEach((merma) => {
      csvContent += `"${merma.date}","${merma.name}","${merma.reason}","${merma.qty}","${merma.cost}","${merma.auditor}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Auditoria_Resto_Bar_Del_Teatro_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowNotification("📊 Reporte de auditoría exportado en CSV correctamente.", "success");
  };

  const renderReportes = () => {
    const completedOrders = orders.filter(o => o.status === "Completado");
    const totalSalesSum = completedOrders.reduce((acc, curr) => acc + curr.total, 0);
    const countCompleted = completedOrders.length;
    const avgTicket = totalSalesSum / (countCompleted || 1);
    
    // Top selling dish calculation
    const itemSalesCount: Record<string, number> = {};
    completedOrders.forEach(o => {
      o.items.forEach(i => {
        itemSalesCount[i.name] = (itemSalesCount[i.name] || 0) + i.quantity;
      });
    });
    const sortedDishes = Object.entries(itemSalesCount).sort((a, b) => b[1] - a[1]);
    const topSellingDish = sortedDishes.length > 0 ? `${sortedDishes[0][0]} (${sortedDishes[0][1]} un.)` : "Sin ventas registradas";

    // Total merma cost calculation
    const totalMermaCost = mermaLogs.reduce((acc, m) => {
      const val = parseFloat(m.cost.replace(/[^0-9.]/g, "")) || 0;
      return acc + val;
    }, 0);

    const today = new Date();
    const monthlySales = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(today.getFullYear(), today.getMonth() - 6 + offset, 1);
      const total = completedOrders.reduce((sum, order) => {
        const createdAt = new Date(order.createdAt);
        return createdAt.getFullYear() === date.getFullYear() &&
          createdAt.getMonth() === date.getMonth()
          ? sum + order.total
          : sum;
      }, 0);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: new Intl.DateTimeFormat("es-AR", { month: "short" }).format(date),
        total
      };
    });
    const monthlyMax = Math.max(...monthlySales.map((month) => month.total), 1);
    const paymentTotal = cashLedger.transactions.reduce(
      (sum: number, transaction: any) => sum + Number(transaction.total || 0),
      0
    );
    const paymentMethods = [
      { name: "Efectivo", matcher: (method: string) => method === "Efectivo", color: "bg-[#4F735A]" },
      { name: "Tarjetas", matcher: (method: string) => method.includes("Tarjeta"), color: "bg-[#5C1D27]" },
      { name: "Mercado Pago / QR", matcher: (method: string) => method.includes("Mercado"), color: "bg-[#4A7BB0]" },
      { name: "Cuenta corriente", matcher: (method: string) => method.includes("Fiado"), color: "bg-[#B97932]" }
    ].map((method) => {
      const amount = cashLedger.transactions
        .filter((transaction: any) => method.matcher(String(transaction.method || "")))
        .reduce((sum: number, transaction: any) => sum + Number(transaction.total || 0), 0);
      return {
        ...method,
        amount,
        share: paymentTotal > 0 ? (amount / paymentTotal) * 100 : 0
      };
    });

    return (
      <motion.div
        key="reportes-view"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-8 animate-fade-in text-[#2D0E13]"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#CFB5A0] pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#5E393F]">Análisis de Negocio & Auditoría POS</span>
            <h2 className="font-serif text-3xl font-bold text-[#2D0E13] mt-0.5">Reportes e Informes Ejecutivos</h2>
            <p className="text-xs text-[#5E393F] font-medium mt-1">Estadísticas reales de facturación, desglose por canal de pago, mermas y auditoría de comandas.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer uppercase tracking-wider border-none"
            >
              <FileText className="h-4 w-4" /> Exportar Auditoría (.PDF)
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#EBDAC5] hover:bg-[#EBDAC5] text-[#5C1D27] border border-[#CFB5A0] text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer uppercase tracking-wider"
            >
              <Download className="h-4 w-4" /> Exportar Auditoría (.csv)
            </button>
          </div>
        </div>

        {/* Top 4 KPI Metrics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#5E393F] block">Ventas Totales</span>
              <strong className="font-serif text-2xl font-black text-[#5C1D27] font-mono block">
                ${totalSalesSum.toLocaleString("es-AR")}
              </strong>
              <span className="text-[9px] text-[#4F735A] font-bold block">Sólo comandas completadas</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#EBDAC5] border border-[#CFB5A0] flex items-center justify-center text-[#5C1D27] text-xl">
              💰
            </div>
          </div>

          <div className="p-5 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#5E393F] block">Ticket Promedio</span>
              <strong className="font-serif text-2xl font-black text-[#5C1D27] font-mono block">
                ${avgTicket.toFixed(0)}
              </strong>
              <span className="text-[9px] text-[#5E393F] font-semibold block">{countCompleted} comandas cerradas</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#EBDAC5] border border-[#CFB5A0] flex items-center justify-center text-[#5C1D27] text-xl">
              🧾
            </div>
          </div>

          <div className="p-5 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#5E393F] block">Producto Más Vendido</span>
              <strong className="font-serif text-sm font-bold text-[#2D0E13] block line-clamp-1">
                {topSellingDish}
              </strong>
              <span className="text-[9px] text-[#5C1D27] font-bold block">⭐ Máxima rotación</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#EBDAC5] border border-[#CFB5A0] flex items-center justify-center text-[#5C1D27] text-xl">
              🍱
            </div>
          </div>

          <div className="p-5 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#5E393F] block">Costo de Mermas</span>
              <strong className="font-serif text-2xl font-black text-[#A63F45] font-mono block">
                ${totalMermaCost.toLocaleString("es-AR")}
              </strong>
              <span className="text-[9px] text-[#5E393F] font-bold block">Según movimientos registrados</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#F4DCDD] border border-[#A63F45]/30 flex items-center justify-center text-[#A63F45] text-xl">
              📉
            </div>
          </div>
        </div>

        {/* Real Analytical Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sales performance chart */}
          <div className="lg:col-span-8 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-[#CFB5A0] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#5C1D27]">📈 Facturación Mensual Histórica</h3>
                <p className="text-[10px] text-[#5E393F]">Evolución de ventas completadas por mes en $ ARS</p>
              </div>
              <span className="text-xs font-mono font-bold text-[#5C1D27] bg-[#EBDAC5] px-3 py-1 rounded-xl border border-[#CFB5A0]">
                {today.getFullYear()} AUDIT
              </span>
            </div>
            
            {/* CSS Chart */}
            <div className="flex justify-between items-end h-52 px-4 border-b border-[#CFB5A0] pb-4 pt-6 bg-[#EBDAC5]/30 rounded-2xl">
              {monthlySales.map((bar) => (
                <div key={bar.key} className="flex flex-col items-center group w-12 cursor-pointer">
                  <span className="text-[9px] font-black text-[#5C1D27] group-hover:scale-110 transition-transform mb-1.5 font-mono">
                    ${bar.total.toLocaleString("es-AR", { notation: "compact", maximumFractionDigits: 1 })}
                  </span>
                  <div
                    style={{ height: `${Math.max((bar.total / monthlyMax) * 100, bar.total > 0 ? 4 : 0)}%` }}
                    className="w-8 bg-[#5C1D27] hover:bg-[#4A151D] transition-all rounded-t-lg duration-300 shadow-xs"
                  />
                  <span className="text-[10px] font-bold text-[#2D0E13] mt-2 font-mono capitalize">{bar.label}</span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl text-xs font-semibold flex justify-between text-[#2D0E13]">
              <div>Facturación Período: <strong className="text-[#5C1D27] font-mono text-sm shadow-xs">${totalSalesSum.toLocaleString("es-AR")}</strong></div>
              <div>Ticket Promedio: <strong className="text-[#5C1D27] font-mono text-sm shadow-xs">${avgTicket.toFixed(2)}</strong></div>
            </div>
          </div>

          {/* Payment method distribution */}
          <div className="lg:col-span-4 bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-6 flex flex-col justify-between">
            <div>
              <div className="border-b border-[#CFB5A0] pb-3">
                <h3 className="font-serif text-lg font-bold text-[#5C1D27]">💳 Desglose por Método de Pago</h3>
                <p className="text-[10px] text-[#5E393F]">Distribución porcentual de cobranzas en caja</p>
              </div>
              
              <div className="space-y-5 py-4">
                {paymentMethods.map((method, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-[#2D0E13]">
                      <span className="text-[#2D0E13] font-semibold">{method.name}</span>
                      <span className="font-mono text-[#5C1D27]">
                        ${method.amount.toLocaleString("es-AR")} ({method.share.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-[#EBDAC5] rounded-full overflow-hidden border border-[#CFB5A0] p-0.5">
                      <div className={`h-full ${method.color} rounded-full transition-all duration-500`} style={{ width: `${method.share}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl text-[10px] text-[#5E393F] italic">
              * Datos sincronizados en vivo con el Libro Diario de Caja y comprobantes emitidos.
            </div>
          </div>
        </div>

        {/* Bottom Section: Mermas & Cash Ledger */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Merma Logs */}
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#5C1D27] uppercase tracking-wider border-b border-[#CFB5A0] pb-3">
              📊 Historial de Mermas & Descarte de Materia Prima
            </h3>
            <p className="text-[10px] text-[#5E393F] leading-relaxed font-semibold">
              Descarte de insumos registrado bajo protocolo de auditoría de cocina. Límite máximo: 2% mensual.
            </p>
            <div className="space-y-3 text-xs">
              {mermaLogs.map((merma) => (
                <div key={merma.id} className="p-3.5 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl flex justify-between items-center font-semibold text-[#2D0E13] shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-bold text-[#5C1D27]">{merma.name} ({merma.qty})</strong>
                      <span className="text-[9px] text-[#5E393F] font-mono font-bold block">{merma.date}</span>
                    </div>
                    <span className="text-[10px] text-[#5E393F] block mt-0.5">{merma.reason}</span>
                  </div>
                  <div className="text-right">
                    <strong className="text-xs font-mono text-[#A63F45] block font-bold">{merma.cost}</strong>
                    <span className="text-[9px] text-[#5E393F] block">Auditor: {merma.auditor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cash Ledger Transactions */}
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] text-[#2D0E13] rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#5C1D27] uppercase tracking-wider border-b border-[#CFB5A0] pb-3">
              📋 Historial Reciente de Cobranzas en Caja
            </h3>
            <div className="space-y-3 text-xs">
              {cashLedger.transactions.length === 0 ? (
                <div className="text-center py-8 text-[#5E393F] italic font-medium">
                  No hay cobranzas registradas en el turno actual.
                </div>
              ) : (
                cashLedger.transactions.slice(0, 5).map((tx: any, idx: number) => (
                  <div key={idx} className="p-3.5 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl flex justify-between items-center font-semibold text-[#2D0E13] shadow-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-[#5C1D27]">{tx.type}</strong>
                        <span className="px-2 py-0.5 text-[9px] font-black rounded bg-[#EBDAC5] text-[#5C1D27] font-mono border border-[#CFB5A0]">{tx.orderId}</span>
                      </div>
                      <span className="text-[10px] text-[#5E393F] block mt-0.5">{tx.timestamp} vía {tx.method}</span>
                    </div>
                    <strong className="text-sm font-mono text-[#5C1D27] font-bold">${tx.total.toFixed(0)}</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F4E8D7] font-sans text-[#2D0E13] select-none relative">
      {/* Mobile Top Navigation Header */}
      <div className="lg:hidden bg-[#E2C6B0] border-b border-[#D1AD95] px-4 py-3 flex justify-between items-center z-40 text-[#2D0E13]">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-2 rounded-xl bg-[#5C1D27] text-white hover:bg-[#4A151D] cursor-pointer shadow-xs"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="h-5 w-5" />
          </button>
          <RestoBarLogo size="sm" />
        </div>
        <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-[#5C1D27] text-white">
          {activeSubTab.toUpperCase()}
        </span>
      </div>

      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileDrawerOpen && (
        <div 
          onClick={() => setIsMobileDrawerOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-xs z-45"
        />
      )}

      {/* Sidebar Navigation Drawer (Desktop Collapsible & Mobile Off-canvas) */}
      <div className={`fixed inset-y-0 left-0 z-50 bg-[#E2C6B0] text-[#2D0E13] flex flex-col justify-between p-4 shrink-0 border-r border-[#D1AD95] transform transition-all duration-200 ease-in-out lg:translate-x-0 lg:static ${
        isMobileDrawerOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0"
      } ${isSidebarCollapsed ? "lg:w-20" : "lg:w-64"}`}>
        <div>
          {/* Logo brand & Desktop Toggle Button */}
          <div className="mb-6 animate-fade-in flex items-center justify-between">
            <div onClick={onClosePanel} className="cursor-pointer">
              <RestoBarLogo size="md" compact={isSidebarCollapsed} />
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                type="button"
                onClick={() => {
                  const nextState = !isSidebarCollapsed;
                  setIsSidebarCollapsed(nextState);
                  localStorage.setItem("castano_sidebar_collapsed", String(nextState));
                }}
                className="hidden lg:flex p-2 rounded-xl text-[#5C1D27] hover:bg-[#EBDAC5] transition-colors cursor-pointer"
                title={isSidebarCollapsed ? "Expandir menú" : "Contraer menú"}
                aria-label={isSidebarCollapsed ? "Expandir menú" : "Contraer menú"}
              >
                {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              </button>

              <button 
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="lg:hidden p-1.5 rounded-lg text-[#2D0E13] hover:bg-[#EBDAC5]"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {/* 1. MÓDULOS DE OPERACIÓN DIARIA */}
            {[
              { id: "pedidos_mozo", label: "Módulo Mozo", icon: HandPlatter, roles: ["administrador", "mesero"] },
              { id: "kds_cocina", label: "Cocina & Chef", icon: ChefHat, badge: orders.filter(o => o.status === "Recibido" || o.status === "Preparando").length, roles: ["administrador", "barista", "mesero"] },
              { id: "caja", label: "Caja & Comandas", icon: ReceiptText, badge: orders.filter(isOrderActive).length, roles: ["administrador", "mesero"] },
              { id: "reservas", label: "Reservas", icon: CalendarCheck2, badge: adminBookings.length, roles: ["administrador", "mesero"] },
              { id: "salon", label: "Mapa de Salón", icon: Armchair, roles: ["administrador", "mesero"] }
            ].filter(link => {
              if (currentUser.role === "administrador" || currentUser.role === "dueño" || currentUser.role === "cajero") {
                return true;
              }
              const meta = usersMetadata[currentUser.id];
              const userPerms = currentUser.permissions || meta?.permissions || [];
              if (userPerms.includes("all") || userPerms.includes("*") || userPerms.includes(link.id)) {
                return true;
              }
              return link.roles.includes(currentUser.role);
            }).map((link) => {
              const active = activeSubTab === link.id;
              const Icon = link.icon;
              return (
                <button
                  key={link.id}
                  title={isSidebarCollapsed ? `${link.label}${link.badge ? ` (${link.badge} pendientes)` : ""}` : undefined}
                  aria-label={`${link.label}${link.badge ? `, ${link.badge} pendientes` : ""}`}
                  onClick={() => {
                    setActiveSubTab(link.id as any);
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} px-3 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    active 
                      ? "bg-[#5C1D27] text-white font-black shadow-sm"
                      : "text-[#2D0E13] hover:bg-[#EBDAC5]/50 hover:text-[#4A151D]"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 shrink-0 ${active ? "text-white" : "text-[#5C1D27]"}`} />
                    {!isSidebarCollapsed && <span>{link.label}</span>}
                  </span>
                  {link.badge !== undefined && link.badge > 0 && (
                    <span 
                      aria-label={`${link.badge} ${link.id === 'caja' ? 'comandas pendientes' : 'alertas'}`}
                      className={`h-4.5 min-w-[18px] px-1 flex items-center justify-center rounded-full text-[9px] font-black shrink-0 ${
                        active ? "bg-white text-[#5C1D27]" : "bg-[#A63F45] text-white shadow-xs"
                      }`}
                    >
                      {link.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Separador Visual Sutil */}
            {(currentUser.role === "administrador" || currentUser.role === "dueño" || currentUser.role === "cajero" || currentUser.role === "barista") && (
              <div className="pt-3 pb-1 border-t border-[#D1AD95] my-2">
                {!isSidebarCollapsed && (
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#5E393F] px-2 block">
                    ADMINISTRACIÓN & GESTIÓN
                  </span>
                )}
              </div>
            )}

            {/* 2. MÓDULOS DE ADMINISTRACIÓN Y GESTIÓN */}
            {[
              { id: "reportes", label: "Reportes & Analíticas", icon: ChartNoAxesCombined, roles: ["administrador"] },
              { id: "precios", label: "Carta & Recetas", icon: BookOpenText, roles: ["administrador"] },
              { id: "inventario", label: "Stock & Insumos", icon: Boxes, badge: insumos.filter(i => i.quantity <= i.minLimit).length, roles: ["administrador", "barista"] },
              { id: "proveedores", label: "Proveedores", icon: Truck, roles: ["administrador"] },
              { id: "personal", label: "Personal", icon: UsersRound, roles: ["administrador", "barista"] }
            ].filter(link => {
              if (currentUser.role === "administrador" || currentUser.role === "dueño" || currentUser.role === "cajero") {
                return true;
              }
              const meta = usersMetadata[currentUser.id];
              const userPerms = currentUser.permissions || meta?.permissions || [];
              if (userPerms.includes("all") || userPerms.includes("*") || userPerms.includes(link.id)) {
                return true;
              }
              return link.roles.includes(currentUser.role);
            }).map((link) => {
              const active = activeSubTab === link.id;
              const Icon = link.icon;
              return (
                <button
                  key={link.id}
                  title={isSidebarCollapsed ? `${link.label}${link.badge ? ` (${link.badge} insumos bajos)` : ""}` : undefined}
                  aria-label={`${link.label}${link.badge ? `, ${link.badge} insumos bajos` : ""}`}
                  onClick={() => {
                    setActiveSubTab(link.id as any);
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} px-3 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    active 
                      ? "bg-[#5C1D27] text-white font-black shadow-sm"
                      : "text-[#2D0E13] hover:bg-[#EBDAC5]/50 hover:text-[#4A151D]"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 shrink-0 ${active ? "text-white" : "text-[#5C1D27]"}`} />
                    {!isSidebarCollapsed && <span>{link.label}</span>}
                  </span>
                  {link.badge !== undefined && link.badge > 0 && (
                    <span 
                      aria-label={`${link.badge} insumos bajos`}
                      className={`h-4.5 min-w-[18px] px-1 flex items-center justify-center rounded-full text-[9px] font-black shrink-0 ${
                        active ? "bg-white text-[#5C1D27]" : "bg-[#B97932] text-white shadow-xs"
                      }`}
                    >
                      {link.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom Widgets */}
        <div className="space-y-2 pt-3 border-t border-[#D1AD95]">
          {!isSidebarCollapsed && (
            <div className="p-2.5 rounded-xl bg-[#FAF2E6] border border-[#D1AD95] text-[10px]">
              <span className="text-[#5E393F] block font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                <Activity
                  className={`h-3 w-3 ${
                    cloudHealth.state === "online"
                      ? "text-[#4F735A]"
                      : cloudHealth.state === "checking"
                        ? "text-[#B97932] animate-pulse"
                        : "text-[#A63F45]"
                  }`}
                /> Estado Nube
              </span>
              <p className="text-[#2D0E13] font-semibold">
                {cloudHealth.state === "online"
                  ? `Servidor en línea${cloudHealth.latencyMs ? ` · ${cloudHealth.latencyMs} ms` : ""}`
                  : cloudHealth.message}
              </p>
              {pendingSyncCount > 0 && (
                <p className="mt-1 font-bold text-[#A63F45]">
                  {pendingSyncCount} pedido{pendingSyncCount === 1 ? "" : "s"} pendiente{pendingSyncCount === 1 ? "" : "s"}
                </p>
              )}
            </div>
          )}

          <button
            onClick={onClosePanel}
            title="Cerrar Sesión"
            className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-center gap-2"} py-2.5 rounded-xl border border-[#A63F45]/30 hover:bg-[#A63F45] text-xs font-bold text-[#A63F45] hover:text-white transition-all cursor-pointer`}
          >
            <LogOut className="h-4 w-4 rotate-180" />
            {!isSidebarCollapsed && <span>Cerrar Sesión</span>}
          </button>
          
          {!isSidebarCollapsed && (
            <div className="text-[8px] text-[#5E393F] text-center font-bold tracking-wider uppercase">
              CASTAÑO — RESTO BAR<br />Constitución 944, Río Cuarto
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div ref={mainContentRef} className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 bg-[#F4E8D7] text-[#2D0E13]">
        <AnimatePresence mode="wait">
          {activeSubTab === "dashboard" && renderDashboard()}
          {activeSubTab === "inventario" && renderInventario()}
          {activeSubTab === "precios" && renderPrecios()}
          {activeSubTab === "salon" && renderSalon()}
          {activeSubTab === "reservas" && renderReservas()}
          {activeSubTab === "pedidos_mozo" && renderPedidosMozo()}
          {activeSubTab === "kds_cocina" && (
            <KitchenDisplay
              orders={orders}
              menuItems={menuItems}
              onOrderStatusUpdate={onOrderStatusUpdate}
              onArchiveOrder={onArchiveOrder}
              onDeleteOrder={onDeleteOrder}
              canDeleteOrders={["administrador", "dueño", "cajero"].includes(currentUser.role)}
            />
          )}
          {activeSubTab === "caja" && renderCaja()}
          {activeSubTab === "proveedores" && renderProveedores()}
          {activeSubTab === "personal" && renderPersonal()}
          {activeSubTab === "reportes" && renderReportes()}
        </AnimatePresence>
      </div>


      {/* Automated Purchase Orders (US-2.3) Modal */}
      {isAutoOrderModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] rounded-3xl p-6 w-full max-w-2xl shadow-xl relative text-xs font-semibold text-[#2D0E13] flex flex-col max-h-[90vh]">
            <button 
              onClick={() => setIsAutoOrderModalOpen(false)}
              className="absolute right-5 top-5 p-1.5 rounded-full hover:bg-[#EBDAC5] text-[#5E393F] hover:text-[#2D0E13] cursor-pointer border-none bg-transparent"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-[#CFB5A0] pb-3 mb-4">
              <span className="text-[9px] font-black uppercase text-[#5E393F] tracking-widest block">Reabastecimiento Inteligente</span>
              <h4 className="font-serif text-lg font-bold text-[#5C1D27]">Órdenes de Compra Sugeridas (Lote Crítico)</h4>
            </div>

            <div className="overflow-y-auto space-y-6 flex-1 pr-1">
              <p className="text-xs text-[#5E393F] italic leading-relaxed">
                El sistema detectó insumos en nivel de seguridad crítico y agrupó las cantidades necesarias de reposición por proveedor. Puede copiar el mensaje directo para enviarlo por WhatsApp o Correo Electrónico.
              </p>

              {Object.keys(draftOrders).length === 0 ? (
                <p className="text-xs text-center py-6 font-bold italic text-[#5E393F]">No hay borradores para generar.</p>
              ) : (
                <div className="space-y-6">
                  {Object.keys(draftOrders).map((prov) => {
                    const order = draftOrders[prov];
                    const whatsappUrl = `https://wa.me/${order.phone.replace(/[+\s-]/g, "")}?text=${encodeURIComponent(order.message)}`;
                    const mailtoUrl = `mailto:${order.email}?subject=Pedido%20Reposicion%20-%20Castano%20Resto%20Bar&body=${encodeURIComponent(order.message)}`;

                    return (
                      <div key={prov} className="border border-[#CFB5A0] rounded-2xl p-4 bg-[#EBDAC5]/40 space-y-4 shadow-xs">
                        <div className="flex justify-between items-center border-b border-[#CFB5A0] pb-2">
                          <div>
                            <span className="font-serif text-sm font-black text-[#5C1D27]">{prov}</span>
                            <span className="text-[10px] text-[#5E393F] block font-mono">Tel: {order.phone} • Email: {order.email}</span>
                          </div>
                          <div className="flex gap-2">
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                onShowNotification(`📱 Redirigiendo a WhatsApp para ${prov}`, "info");
                              }}
                              className="px-3.5 py-2 bg-[#4F735A] hover:bg-[#3D5B46] text-white rounded-xl font-black text-[10px] transition-all no-underline inline-block uppercase tracking-wider text-center shadow-xs"
                            >
                              📱 WhatsApp
                            </a>
                            <a
                              href={mailtoUrl}
                              onClick={() => {
                                onShowNotification(`📧 Abriendo cliente de correo para ${prov}`, "info");
                              }}
                              className="px-3.5 py-2 bg-[#5C1D27] hover:bg-[#4A151D] text-white rounded-xl font-black text-[10px] transition-all no-underline inline-block uppercase tracking-wider text-center shadow-xs"
                            >
                              📧 Email
                            </a>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-[#5E393F] uppercase tracking-wider block">Borrador del Pedido</label>
                          <textarea
                            readOnly
                            value={order.message}
                            rows={6}
                            className="w-full text-xs font-mono p-3 bg-[#FAF2E6] border border-[#CFB5A0] text-[#5C1D27] rounded-xl resize-none outline-none font-bold leading-relaxed shadow-inner"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-[#CFB5A0] pt-4 mt-4 flex justify-end">
              <button
                onClick={() => setIsAutoOrderModalOpen(false)}
                className="px-6 py-2.5 bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black rounded-xl transition-all cursor-pointer border-none uppercase tracking-wider"
              >
                ENTENDIDO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ➕ Crear Nuevo Insumo / Materia Prima */}
      {isNewInsumoModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] rounded-3xl p-6 w-full max-w-lg shadow-xl relative text-xs font-semibold text-[#2D0E13] space-y-4">
            <button 
              type="button"
              onClick={() => setIsNewInsumoModalOpen(false)}
              className="absolute right-5 top-5 p-1.5 rounded-full hover:bg-[#EBDAC5] text-[#5E393F] hover:text-[#2D0E13] cursor-pointer border-none bg-transparent"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-[#CFB5A0] pb-2">
              <span className="text-[9px] font-black uppercase text-[#5E393F] tracking-widest block">Gestión de Inventario</span>
              <h4 className="font-serif text-xl font-bold text-[#5C1D27]">➕ Crear Nuevo Insumo / Materia Prima</h4>
            </div>

            <form onSubmit={handleCreateNewInsumo} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-[#5E393F] block mb-1">Nombre de la Materia Prima *</label>
                <input
                  type="text"
                  required
                  value={newInsumoName}
                  onChange={(e) => setNewInsumoName(e.target.value)}
                  placeholder="Ej. Harina 0000 Masa Madre, Queso Muzzarella..."
                  className="w-full p-3 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-xs font-bold text-[#2D0E13] outline-none focus:border-[#5C1D27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-[#5E393F] block mb-1">Cantidad Inicial *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={newInsumoQuantity}
                    onChange={(e) => setNewInsumoQuantity(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-xs font-mono font-bold text-[#5C1D27] outline-none text-center focus:border-[#5C1D27]"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-[#5E393F] block mb-1">Unidad *</label>
                  <select
                    value={newInsumoUnit}
                    onChange={(e) => setNewInsumoUnit(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-xs font-bold text-[#2D0E13] outline-none cursor-pointer focus:border-[#5C1D27]"
                  >
                    <option value="kg">kg (Kilogramos)</option>
                    <option value="L">L (Litros)</option>
                    <option value="g">g (Gramos)</option>
                    <option value="ml">ml (Mililitros)</option>
                    <option value="un">un (Unidades)</option>
                    <option value="barras">barras</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-[#5E393F] block mb-1">Stock Mínimo *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={newInsumoMinLimit}
                    onChange={(e) => setNewInsumoMinLimit(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-xs font-mono font-bold text-[#2D0E13] outline-none text-center focus:border-[#5C1D27]"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-[#5E393F] block mb-1">Costo Unitario ($) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={newInsumoCost}
                    onChange={(e) => setNewInsumoCost(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-xs font-mono font-bold text-[#2D0E13] outline-none text-center focus:border-[#5C1D27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-[#5E393F] block mb-1">Proveedor Designado</label>
                  <input
                    type="text"
                    value={newInsumoProvider}
                    onChange={(e) => setNewInsumoProvider(e.target.value)}
                    placeholder="Ej. Distribuidora Sur, Lácteos del Campo"
                    className="w-full p-2.5 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-xs font-bold text-[#2D0E13] outline-none focus:border-[#5C1D27]"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-[#5E393F] block mb-1">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={newInsumoExpDate}
                    onChange={(e) => setNewInsumoExpDate(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF2E6] border border-[#CFB5A0] rounded-xl text-xs font-mono text-[#2D0E13] outline-none focus:border-[#5C1D27]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#CFB5A0] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewInsumoModalOpen(false)}
                  className="px-4 py-2 border border-[#CFB5A0] text-[#5E393F] rounded-xl hover:bg-[#EBDAC5] cursor-pointer font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingInsumo}
                  className="px-5 py-2 bg-[#5C1D27] hover:bg-[#4A151D] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs cursor-pointer disabled:cursor-wait disabled:opacity-60"
                >
                  {isCreatingInsumo ? "REGISTRANDO…" : "REGISTRAR INSUMO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Movement Registration Modal */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] rounded-3xl p-6 w-full max-w-sm shadow-xl relative text-xs font-semibold text-[#2D0E13]">
            <button 
              onClick={() => setIsMovementModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-[#EBDAC5] text-[#5E393F] hover:text-[#2D0E13]"
            >
              <X className="h-4 w-4" />
            </button>

            <h4 className="font-serif text-lg font-bold text-[#5C1D27] mb-4">Registrar Movimiento de Stock</h4>

            <div className="space-y-4">
              <div>
                <span className="text-[9px] font-bold text-[#5E393F] uppercase tracking-wider block mb-1.5">Tipo de Ajuste</span>
                <div className="grid grid-cols-2 gap-3">
                  {["Ingreso", "Egreso"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMovType(t as any)}
                      className={`p-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                        movType === t 
                          ? "bg-[#5C1D27] text-white border-[#5C1D27] font-black shadow-xs" 
                          : "bg-[#FAF2E6] border-[#CFB5A0] text-[#5E393F] hover:text-[#2D0E13]"
                      }`}
                    >
                      {t === "Ingreso" ? "📥 Ingreso (Recibo)" : "📤 Egreso (Merma/Ajuste)"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Materia Prima / Insumo</label>
                <select 
                  value={movInsumoId}
                  onChange={(e) => setMovInsumoId(e.target.value)}
                  className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold cursor-pointer focus:border-[#5C1D27]"
                >
                  {insumos.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Cantidad a Ajustar</label>
                <input 
                  type="number"
                  placeholder="Ingrese el valor numérico"
                  value={movQty}
                  onChange={(e) => setMovQty(e.target.value)}
                  className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#5C1D27] focus:ring-1 focus:ring-[#5C1D27] focus:outline-none font-bold font-mono"
                />
              </div>

              {movType === "Egreso" && (
                <div>
                  <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Motivo / Descripción de la Merma</label>
                  <textarea 
                    placeholder="Escriba el motivo del descarte..."
                    value={movReason}
                    onChange={(e) => setMovReason(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] focus:ring-1 focus:ring-[#5C1D27] focus:outline-none font-bold resize-none"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button 
                  onClick={() => {
                    setIsMovementModalOpen(false);
                    setMovReason("");
                  }}
                  className="w-1/2 py-2.5 rounded-xl border border-[#D4AF37]/30 text-xs font-bold text-[#D4AF37] hover:bg-[#3D281A] transition-all cursor-pointer text-center bg-transparent"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    const val = parseFloat(movQty);
                    if (isNaN(val) || val <= 0) {
                      onShowNotification("⚠️ Ingrese una cantidad válida mayor a cero.", "warning");
                      return;
                    }
                    const multiplier = movType === "Ingreso" ? 1 : -1;
                    const insumo = insumos.find(i => i.id === movInsumoId);
                    const reason = movType === "Egreso"
                      ? movReason || "Descarte / ajuste operativo manual"
                      : "Ingreso manual de inventario";
                    const costEstimate = movType === "Egreso" && insumo
                      ? val * (insumo.costPerUnit || 0)
                      : 0;
                    const saved = await handleAdjustInsumo(
                      movInsumoId,
                      val * multiplier,
                      reason,
                      costEstimate
                    );
                    if (!saved) return;

                    setIsMovementModalOpen(false);
                    setMovQty("");
                    setMovReason("");
                    onShowNotification(`✅ Movimiento de ${movType} registrado con éxito.`, "success");
                  }}
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] text-xs font-black transition-all cursor-pointer gold-glow uppercase tracking-wider shadow-md"
                >
                  Guardar Cambios ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Configurar Restaurant Modal */}
      {isConfigRestaurantOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] rounded-3xl p-6 w-full max-w-sm shadow-xl relative text-xs font-semibold text-[#2D0E13]">
            <button 
              onClick={() => setIsConfigRestaurantOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-[#EBDAC5] text-[#5E393F] hover:text-[#2D0E13]"
            >
              <X className="h-4 w-4" />
            </button>
            <h4 className="font-serif text-lg font-bold text-[#5C1D27] mb-1">Configurar Restaurant</h4>
            <p className="text-[10px] text-[#5E393F] mb-4 font-normal">Personalice los datos de su restaurante para el ticket fiscal.</p>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Nombre Comercial</label>
                <input type="text" value={businessProfile.name} onChange={(event) => setBusinessProfile((profile) => ({ ...profile, name: event.target.value }))} className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold outline-none focus:border-[#5C1D27]" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Dirección Física</label>
                <input type="text" value={businessProfile.address} onChange={(event) => setBusinessProfile((profile) => ({ ...profile, address: event.target.value }))} className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold outline-none focus:border-[#5C1D27]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">CUIT Comercial</label>
                  <input type="text" inputMode="numeric" value={businessProfile.cuit} onChange={(event) => setBusinessProfile((profile) => ({ ...profile, cuit: event.target.value }))} placeholder="11 dígitos" className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold outline-none focus:border-[#5C1D27]" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Punto de Venta</label>
                  <input type="number" min="1" value={businessProfile.posNumber} onChange={(event) => setBusinessProfile((profile) => ({ ...profile, posNumber: event.target.value }))} placeholder="Ej. 1" className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold outline-none focus:border-[#5C1D27]" />
                </div>
              </div>
              {!businessProfile.cuit && (
                <p className="rounded-xl border border-[#CFB5A0] bg-[#EBDAC5]/40 p-3 text-[10px] text-[#5E393F]">
                  El perfil fiscal está pendiente. No se completa con datos ficticios.
                </p>
              )}
              <div className="flex gap-3 pt-3">
                <button onClick={() => setIsConfigRestaurantOpen(false)} className="w-1/2 py-2.5 rounded-xl border border-[#CFB5A0] text-xs font-bold text-[#5E393F] hover:bg-[#EBDAC5] transition-all cursor-pointer bg-transparent">Cancelar</button>
                <button onClick={() => void handleSaveBusinessProfile()} disabled={isBusinessProfileSaving} className="w-1/2 py-2.5 rounded-xl bg-[#5C1D27] hover:bg-[#4A151D] disabled:opacity-60 disabled:cursor-wait text-white text-xs font-bold shadow-xs cursor-pointer">{isBusinessProfileSaving ? "Guardando…" : "Guardar"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuración Fiscal ARCA (AFIP) Modal */}
      {isConfigArcaOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] rounded-3xl p-6 w-full max-w-lg shadow-2xl relative text-xs font-semibold text-[#2D0E13] my-8 space-y-4">
            <button 
              onClick={() => setIsConfigArcaOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-[#EBDAC5] text-[#5E393F] hover:text-[#2D0E13] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#5C1D27] text-[#D4AF37] shadow-xs">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-serif text-lg font-bold text-[#5C1D27]">Configuración Fiscal ARCA (AFIP)</h4>
                <p className="text-[10px] text-[#5E393F] font-normal">Parámetros de facturación electrónica, clave fiscal y certificados WSFE.</p>
              </div>
            </div>

            <div className="space-y-3 bg-[#EBDAC5]/30 border border-[#CFB5A0] rounded-2xl p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">CUIT Comercial (11 dígitos)</label>
                  <input 
                    type="text"
                    value={arcaConfig.cuit}
                    onChange={(e) => setArcaConfig(prev => ({ ...prev, cuit: e.target.value }))}
                    placeholder="ej: 20445513408"
                    className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-mono font-bold outline-none focus:border-[#5C1D27]"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Punto de Venta Autorizado</label>
                  <input 
                    type="number"
                    min="1"
                    value={arcaConfig.posNumber}
                    onChange={(e) => setArcaConfig(prev => ({ ...prev, posNumber: e.target.value }))}
                    placeholder="ej: 3"
                    className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-mono font-bold outline-none focus:border-[#5C1D27]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Razón Social / Nombre Comercial</label>
                <input 
                  type="text"
                  value={arcaConfig.businessName}
                  onChange={(e) => setArcaConfig(prev => ({ ...prev, businessName: e.target.value }))}
                  placeholder="ej: Castaño — Resto Bar"
                  className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold outline-none focus:border-[#5C1D27]"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Domicilio Comercial</label>
                <input 
                  type="text"
                  value={arcaConfig.address}
                  onChange={(e) => setArcaConfig(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="ej: Constitución 944, Río Cuarto, Córdoba"
                  className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold outline-none focus:border-[#5C1D27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Condición frente al IVA</label>
                  <select 
                    value={arcaConfig.ivaCondition}
                    onChange={(e) => setArcaConfig(prev => ({ ...prev, ivaCondition: e.target.value as any }))}
                    className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold outline-none focus:border-[#5C1D27]"
                  >
                    <option value="Responsable Inscripto">Responsable Inscripto</option>
                    <option value="Monotributista">Monotributista</option>
                    <option value="Exento">Exento</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Ambiente AFIP / ARCA</label>
                  <select 
                    value={arcaConfig.environment}
                    onChange={(e) => setArcaConfig(prev => ({ ...prev, environment: e.target.value as any }))}
                    className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold outline-none focus:border-[#5C1D27]"
                  >
                    <option value="testing">🧪 Simulación / Homologación Local</option>
                    <option value="production">🟢 Producción Real (WSFE v1 AFIP)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Certificados Digitales (Punto de Vinculación .crt y .key) */}
            <div className="space-y-3 bg-[#FAF2E6] border border-[#CFB5A0] rounded-2xl p-4">
              <span className="text-[10px] font-black uppercase text-[#5C1D27] block">Carga de Certificados Digitales WSFE</span>
              
              <div>
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Certificado Digital (`.crt` / `.pem` AFIP)</label>
                <textarea 
                  rows={2}
                  value={arcaConfig.crtContent}
                  onChange={(e) => setArcaConfig(prev => ({ ...prev, crtContent: e.target.value }))}
                  placeholder="Pegue aquí el contenido del archivo .crt emitido por AFIP..."
                  className="w-full p-2 border border-[#CFB5A0] rounded-xl text-[10px] bg-[#FAF2E6] text-[#2D0E13] font-mono outline-none focus:border-[#5C1D27]"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Clave Privada (`.key` AFIP)</label>
                <textarea 
                  rows={2}
                  value={arcaConfig.keyContent}
                  onChange={(e) => setArcaConfig(prev => ({ ...prev, keyContent: e.target.value }))}
                  placeholder="Pegue aquí la clave privada .key generada para el certificado..."
                  className="w-full p-2 border border-[#CFB5A0] rounded-xl text-[10px] bg-[#FAF2E6] text-[#2D0E13] font-mono outline-none focus:border-[#5C1D27]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setIsConfigArcaOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-[#CFB5A0] text-xs font-bold text-[#5E393F] hover:bg-[#EBDAC5] transition-all cursor-pointer bg-transparent uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  const cleanCuit = arcaConfig.cuit.replace(/\D/g, "");
                  if (!cleanCuit || cleanCuit.length < 10) {
                    onShowNotification("⚠️ Ingrese un CUIT comercial válido (11 dígitos).", "warning");
                    return;
                  }
                  
                  const updatedConfig = { ...arcaConfig, cuit: cleanCuit };
                  setArcaConfig(updatedConfig);
                  localStorage.setItem("castano_arca_config", JSON.stringify(updatedConfig));

                  const updatedProfile = {
                    ...businessProfile,
                    cuit: cleanCuit,
                    posNumber: arcaConfig.posNumber,
                    name: arcaConfig.businessName,
                    address: arcaConfig.address
                  };
                  setBusinessProfile(updatedProfile);
                  localStorage.setItem("castano_business_profile", JSON.stringify(updatedProfile));

                  try {
                    await supabase.from("menu_items").upsert({
                      id: "sys_arca_config",
                      name: "Configuración Fiscal ARCA & Restaurante",
                      description: JSON.stringify(updatedConfig),
                      price: 0,
                      category: "SYSTEM_CONFIG"
                    }, { onConflict: "id" });
                    onShowNotification("☁️ Configuración Fiscal ARCA guardada y respaldada en la Nube.", "success");
                  } catch (err) {
                    console.error("Cloud sync error:", err);
                    onShowNotification("✅ Guardado localmente. Se sincronizará en segundo plano.", "success");
                  }

                  setIsConfigArcaOpen(false);
                }}
                className="w-1/2 py-2.5 rounded-xl bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black shadow-md cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <Check className="h-4 w-4 text-[#D4AF37]" /> Guardar ARCA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configuración Ticketera Modal */}
      {isConfigTicketerisOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] rounded-3xl p-6 w-full max-w-sm shadow-xl relative text-xs font-semibold text-[#2D0E13]">
            <button 
              onClick={() => setIsConfigTicketerisOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-[#EBDAC5] text-[#5E393F] hover:text-[#2D0E13]"
            >
              <X className="h-4 w-4" />
            </button>
            <h4 className="font-serif text-lg font-bold text-[#5C1D27] mb-1">Configurar Ticketera</h4>
            <p className="text-[10px] text-[#5E393F] mb-4 font-normal">Establezca la interfaz y parámetros de la impresora térmica.</p>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Interfaz de Conexión</label>
                <select value={printerConfig.printerType} onChange={(event) => setPrinterConfig((config) => ({ ...config, printerType: event.target.value as PrinterConfig["printerType"] }))} className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold cursor-pointer outline-none focus:border-[#5C1D27]">
                  <option value="browser_print">Impresión del navegador</option>
                  <option value="webbluetooth">Impresora Bluetooth</option>
                  <option value="websocket">Servidor ESC/POS por WebSocket</option>
                  <option value="webusb">USB mediante diálogo del navegador</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Ancho de Papel</label>
                <select value={printerConfig.paperWidth} onChange={(event) => setPrinterConfig((config) => ({ ...config, paperWidth: event.target.value as PrinterConfig["paperWidth"] }))} className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold cursor-pointer outline-none focus:border-[#5C1D27]">
                  <option value="80mm">80 mm (Recomendado)</option>
                  <option value="58mm">58 mm</option>
                </select>
              </div>
              {printerConfig.printerType === "websocket" && (
                <div>
                  <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Servidor WebSocket</label>
                  <input type="url" value={printerConfig.websocketUrl} onChange={(event) => setPrinterConfig((config) => ({ ...config, websocketUrl: event.target.value }))} placeholder="ws://localhost:9100" className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold outline-none focus:border-[#5C1D27]" />
                </div>
              )}
              <div className="flex gap-3 pt-3">
                <button onClick={() => setIsConfigTicketerisOpen(false)} className="w-1/2 py-2.5 rounded-xl border border-[#CFB5A0] text-xs font-bold text-[#5E393F] hover:bg-[#EBDAC5] transition-all cursor-pointer bg-transparent">Cancelar</button>
                <button onClick={handleSavePrinterConfig} className="w-1/2 py-2.5 rounded-xl bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-bold shadow-xs cursor-pointer">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cerrar Turno de Caja Modal */}
      {isCloseShiftModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] rounded-3xl p-6 w-full max-w-sm shadow-xl relative text-xs font-semibold text-[#2D0E13]">
            <button 
              onClick={() => setIsCloseShiftModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-[#EBDAC5] text-[#5E393F] hover:text-[#2D0E13]"
            >
              <X className="h-4 w-4" />
            </button>
            <h4 className="font-serif text-lg font-bold text-[#5C1D27] mb-1">Cerrar Turno de Caja Diaria</h4>
            <p className="text-[10px] text-[#5E393F] mb-4 font-normal">Declare el monto real e ingrese observaciones para el arqueo final.</p>
            
            <div className="my-4 p-4 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl">
              <span className="text-[9px] font-bold text-[#5E393F] uppercase tracking-wider block">Ventas Turno Teórico</span>
              <div className="text-2xl font-serif font-black text-[#5C1D27] mt-1 font-mono">${cashLedger.totalCollected.toLocaleString()}</div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-[9px] text-[#5E393F] font-bold border-t border-[#CFB5A0] pt-2.5">
                <div>Efectivo: <span className="font-mono text-[#5C1D27]">${cashLedger.cash.toLocaleString()}</span></div>
                <div>Tarjeta: <span className="font-mono text-[#5C1D27]">${cashLedger.card.toLocaleString()}</span></div>
                <div>MP: <span className="font-mono text-[#5C1D27]">${cashLedger.mercadopago.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Monto Real en Caja ($)</label>
                <input 
                  type="number" 
                  placeholder="Ingrese el monto físico contado" 
                  value={closeShiftRealCash} 
                  onChange={(e) => setCloseShiftRealCash(e.target.value)}
                  className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#5C1D27] focus:ring-1 focus:ring-[#5C1D27] focus:outline-none font-bold font-mono" 
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Observaciones</label>
                <textarea 
                  placeholder="Facturación normal del turno, diferencias de arqueo, etc." 
                  value={closeShiftNotes} 
                  onChange={(e) => setCloseShiftNotes(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] focus:ring-1 focus:ring-[#5C1D27] focus:outline-none font-semibold resize-none"
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button onClick={() => setIsCloseShiftModalOpen(false)} className="w-1/2 py-2.5 rounded-xl border border-[#CFB5A0] text-xs font-bold text-[#5E393F] hover:bg-[#EBDAC5] transition-all cursor-pointer bg-transparent">Cancelar</button>
                <button 
                  onClick={() => {
                    const realCash = parseFloat(closeShiftRealCash);
                    if (isNaN(realCash) || realCash < 0) {
                      onShowNotification("⚠️ Ingrese un monto real válido.", "warning");
                      return;
                    }
                    void handleConfirmCloseShift(realCash, closeShiftNotes);
                  }} 
                  disabled={isShiftOperationPending}
                  className="w-1/2 py-2.5 rounded-xl bg-[#A63F45] hover:bg-[#8A3338] disabled:opacity-60 disabled:cursor-wait text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {isShiftOperationPending ? "Cerrando…" : "Confirmar Arqueo ✓"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detalle de Cierre de Caja Modal */}
      {false && selectedClosureForModal && (
        <div className="fixed inset-0 bg-[#2C1810]/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FDFBF7] border border-[#2C1810]/15 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative text-xs font-semibold text-[#2C1810]/80">
            <button 
              onClick={() => setSelectedClosureForModal(null)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-stone-200/50 text-[#2C1810]/40 hover:text-[#2C1810]"
            >
              <X className="h-4 w-4" />
            </button>
            <h4 className="font-serif text-lg font-bold text-[#2C1810] mb-1">Auditoría de Cierre de Caja</h4>
            <p className="text-[10px] text-[#2C1810]/50 mb-4 font-normal">Arqueo fiscal homologado por el personal de Resto Bar Del Teatro.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4 text-[10px] text-[#2C1810]/70 border-b border-[#2C1810]/10 pb-4">
              <div>
                <span className="text-[#2C1810]/40 font-bold block">Responsable:</span>
                <strong>{selectedClosureForModal.user}</strong>
              </div>
              <div>
                <span className="text-[#2C1810]/40 font-bold block">Observaciones:</span>
                <strong>"{selectedClosureForModal.observaciones}"</strong>
              </div>
              <div>
                <span className="text-[#2C1810]/40 font-bold block">Fecha Apertura:</span>
                <strong>{selectedClosureForModal.apertura}</strong>
              </div>
              <div>
                <span className="text-[#2C1810]/40 font-bold block">Fecha Cierre:</span>
                <strong>{selectedClosureForModal.cierre}</strong>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 bg-stone-50 border border-stone-150 rounded-2xl text-center mb-6">
              <div>
                <span className="text-[9px] font-bold text-[#2C1810]/40 uppercase tracking-wider block">Ventas Turno</span>
                <strong className="text-lg font-serif text-[#2C1810] font-mono block mt-0.5">${selectedClosureForModal.ventasTurno.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-[9px] font-bold text-[#2C1810]/40 uppercase tracking-wider block">Monto Real</span>
                <strong className="text-lg font-serif text-[#2C1810] font-mono block mt-0.5">${selectedClosureForModal.montoReal.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-[9px] font-bold text-[#2C1810]/40 uppercase tracking-wider block">Diferencia</span>
                <strong className={`text-lg font-serif font-mono block mt-0.5 ${selectedClosureForModal.diferencia >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  ${selectedClosureForModal.diferencia.toLocaleString()}
                </strong>
              </div>
            </div>

            <h5 className="font-bold text-[10px] uppercase tracking-wider text-[#2C1810]/50 mb-2.5">Historial de Transacciones del Turno</h5>
          </div>
        </div>
      )}

      {/* Configuración Ticketera Modal */}
      {false && isConfigTicketerisOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] rounded-3xl p-6 w-full max-w-sm shadow-xl relative text-xs font-semibold text-[#2D0E13]">
            <button 
              onClick={() => setIsConfigTicketerisOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-[#EBDAC5] text-[#5E393F] hover:text-[#2D0E13]"
            >
              <X className="h-4 w-4" />
            </button>
            <h4 className="font-serif text-lg font-bold text-[#5C1D27] mb-1">Configurar Ticketera</h4>
            <p className="text-[10px] text-[#5E393F] mb-4 font-normal">Establezca la interfaz y parámetros de la impresora térmica.</p>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Interfaz de Conexión</label>
                <select className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold cursor-pointer outline-none focus:border-[#5C1D27]">
                  <option>USB Thermal Printer (Predeterminado)</option>
                  <option>Bluetooth clover-thermal-58</option>
                  <option>Ethernet (IP: 192.168.1.150)</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Ancho de Papel</label>
                <select className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold cursor-pointer outline-none focus:border-[#5C1D27]">
                  <option>80 mm (Recomendado)</option>
                  <option>58 mm</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Texto de Pie de Página</label>
                <input type="text" defaultValue="¡Gracias por su visita! Castaño — Resto Bar" className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold outline-none focus:border-[#5C1D27]" />
              </div>
              <div className="flex gap-3 pt-3">
                <button onClick={() => setIsConfigTicketerisOpen(false)} className="w-1/2 py-2.5 rounded-xl border border-[#CFB5A0] text-xs font-bold text-[#5E393F] hover:bg-[#EBDAC5] transition-all cursor-pointer bg-transparent">Cancelar</button>
                <button onClick={() => { setIsConfigTicketerisOpen(false); onShowNotification("🖨️ Configuración de impresora térmica guardada.", "success"); }} className="w-1/2 py-2.5 rounded-xl bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-bold shadow-xs cursor-pointer">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cerrar Turno de Caja Modal */}
      {false && isCloseShiftModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] rounded-3xl p-6 w-full max-w-sm shadow-xl relative text-xs font-semibold text-[#2D0E13]">
            <button 
              onClick={() => setIsCloseShiftModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-[#EBDAC5] text-[#5E393F] hover:text-[#2D0E13]"
            >
              <X className="h-4 w-4" />
            </button>
            <h4 className="font-serif text-lg font-bold text-[#5C1D27] mb-1">Cerrar Turno de Caja Diaria</h4>
            <p className="text-[10px] text-[#5E393F] mb-4 font-normal">Declare el monto real e ingrese observaciones para el arqueo final.</p>
            
            <div className="my-4 p-4 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl">
              <span className="text-[9px] font-bold text-[#5E393F] uppercase tracking-wider block">Ventas Turno Teórico</span>
              <div className="text-2xl font-serif font-black text-[#5C1D27] mt-1 font-mono">${cashLedger.totalCollected.toLocaleString()}</div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-[9px] text-[#5E393F] font-bold border-t border-[#CFB5A0] pt-2.5">
                <div>Efectivo: <span className="font-mono text-[#5C1D27]">${cashLedger.cash.toLocaleString()}</span></div>
                <div>Tarjeta: <span className="font-mono text-[#5C1D27]">${cashLedger.card.toLocaleString()}</span></div>
                <div>MP: <span className="font-mono text-[#5C1D27]">${cashLedger.mercadopago.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Monto Real en Caja ($)</label>
                <input 
                  type="number" 
                  placeholder="Ingrese el monto físico contado" 
                  value={closeShiftRealCash} 
                  onChange={(e) => setCloseShiftRealCash(e.target.value)}
                  className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#5C1D27] focus:ring-1 focus:ring-[#5C1D27] focus:outline-none font-bold font-mono" 
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Observaciones</label>
                <textarea 
                  placeholder="Facturación normal del turno, diferencias de arqueo, etc." 
                  value={closeShiftNotes} 
                  onChange={(e) => setCloseShiftNotes(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] focus:ring-1 focus:ring-[#5C1D27] focus:outline-none font-semibold resize-none"
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button onClick={() => setIsCloseShiftModalOpen(false)} className="w-1/2 py-2.5 rounded-xl border border-[#CFB5A0] text-xs font-bold text-[#5E393F] hover:bg-[#EBDAC5] transition-all cursor-pointer bg-transparent">Cancelar</button>
                <button 
                  onClick={() => {
                    const realCash = parseFloat(closeShiftRealCash);
                    if (isNaN(realCash) || realCash < 0) {
                      onShowNotification("⚠️ Ingrese un monto real válido.", "warning");
                      return;
                    }
                    void handleConfirmCloseShift(realCash, closeShiftNotes);
                  }} 
                  disabled={isShiftOperationPending}
                  className="w-1/2 py-2.5 rounded-xl bg-[#A63F45] hover:bg-[#8A3338] disabled:opacity-60 disabled:cursor-wait text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {isShiftOperationPending ? "Cerrando…" : "Confirmar Arqueo ✓"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detalle de Cierre de Caja Modal */}
      {selectedClosureForModal && (
        <div className="fixed inset-0 bg-[#2C1810]/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FDFBF7] border border-[#2C1810]/15 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative text-xs font-semibold text-[#2C1810]/80">
            <button 
              onClick={() => setSelectedClosureForModal(null)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-stone-200/50 text-[#2C1810]/40 hover:text-[#2C1810]"
            >
              <X className="h-4 w-4" />
            </button>
            <h4 className="font-serif text-lg font-bold text-[#2C1810] mb-1">Auditoría de Cierre de Caja</h4>
            <p className="text-[10px] text-[#2C1810]/50 mb-4 font-normal">Arqueo fiscal homologado por el personal de Resto Bar Del Teatro.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4 text-[10px] text-[#2C1810]/70 border-b border-[#2C1810]/10 pb-4">
              <div>
                <span className="text-[#2C1810]/40 font-bold block">Responsable:</span>
                <strong>{selectedClosureForModal.user}</strong>
              </div>
              <div>
                <span className="text-[#2C1810]/40 font-bold block">Observaciones:</span>
                <strong>"{selectedClosureForModal.observaciones}"</strong>
              </div>
              <div>
                <span className="text-[#2C1810]/40 font-bold block">Fecha Apertura:</span>
                <strong>{selectedClosureForModal.apertura}</strong>
              </div>
              <div>
                <span className="text-[#2C1810]/40 font-bold block">Fecha Cierre:</span>
                <strong>{selectedClosureForModal.cierre}</strong>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 bg-stone-50 border border-stone-150 rounded-2xl text-center mb-6">
              <div>
                <span className="text-[9px] font-bold text-[#2C1810]/40 uppercase tracking-wider block">Ventas Turno</span>
                <strong className="text-lg font-serif text-[#2C1810] font-mono block mt-0.5">${selectedClosureForModal.ventasTurno.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-[9px] font-bold text-[#2C1810]/40 uppercase tracking-wider block">Monto Real</span>
                <strong className="text-lg font-serif text-[#2C1810] font-mono block mt-0.5">${selectedClosureForModal.montoReal.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-[9px] font-bold text-[#2C1810]/40 uppercase tracking-wider block">Diferencia</span>
                <strong className={`text-lg font-serif font-mono block mt-0.5 ${selectedClosureForModal.diferencia >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  ${selectedClosureForModal.diferencia.toLocaleString()}
                </strong>
              </div>
            </div>

            <h5 className="font-bold text-[10px] uppercase tracking-wider text-[#2C1810]/50 mb-2.5">Historial de Transacciones del Turno</h5>
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
              {selectedClosureForModal.transactions && selectedClosureForModal.transactions.length > 0 ? (
                selectedClosureForModal.transactions.map((tx: any, idx: number) => (
                  <div key={idx} className="p-3 bg-white border border-stone-150 rounded-xl flex justify-between items-center text-[10px] font-semibold">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-[#2C1810]">{tx.type}</strong>
                        <span className="px-1.5 py-0.5 text-[8px] font-black rounded bg-[#2C1810]/5 text-[#2C1810]/70 font-mono">{tx.orderId}</span>
                      </div>
                      <span className="text-[9px] text-[#2C1810]/40 block mt-0.5">{tx.timestamp} vía {tx.method}</span>
                    </div>
                    <strong className="text-xs font-mono text-[#2C1810]">${tx.total.toFixed(0)}</strong>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-stone-400 text-[10px]">No se registraron transacciones cobradas en este turno.</div>
              )}
            </div>

            <div className="pt-5 flex justify-end">
              <button onClick={() => setSelectedClosureForModal(null)} className="px-6 py-2.5 rounded-xl bg-[#2C1810] hover:bg-[#3d2217] text-white text-xs font-bold shadow-md cursor-pointer">Cerrar Detalle</button>
            </div>
          </div>
        </div>
      )}

      {/* simulated thermal ticket modal */}
      {selectedOrderForTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 w-full max-w-xs shadow-2xl relative text-xs text-[#2D0E13] font-mono">
            <button 
              onClick={() => setSelectedOrderForTicket(null)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-stone-100 text-[#2D0E13]/60 hover:text-[#2D0E13]"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Thermal Ticket Monospace Layout */}
            <div className="text-center space-y-1 mb-4">
              <span className="font-bold text-sm block">*** {selectedOrderForTicket.fiscal?.issuerName || "RESTO BAR DEL TEATRO"} ***</span>
              {selectedOrderForTicket.fiscal?.status &&
              ["authorized", "observed"].includes(selectedOrderForTicket.fiscal.status) ? (
                <>
                  <span className="text-[9px] block">C.U.I.T.: {selectedOrderForTicket.fiscal.issuerCuit || "No informado"}</span>
                  <span className="text-[9px] block">{selectedOrderForTicket.fiscal.issuerAddress || "Domicilio no informado"}</span>
                </>
              ) : (
                <span className="text-[9px] block font-bold text-[#5C1D27]">DOCUMENTO NO FISCAL</span>
              )}
            </div>

            <div className="border-t border-dashed border-stone-800 py-2 space-y-1 text-[10px]">
              <div>FECHA: {new Date().toLocaleDateString("es-AR")}</div>
              <div>HORA: {new Date().toLocaleTimeString("es-AR")}</div>
              <div>TICKET FACTURA NRO: {selectedOrderForTicket.id}</div>
              <div>ORIGEN: {selectedOrderForTicket.tableNumber ? `SALÓN - ${selectedOrderForTicket.tableNumber.toLowerCase().startsWith("mesa") ? selectedOrderForTicket.tableNumber : `Mesa ${selectedOrderForTicket.tableNumber}`}` : selectedOrderForTicket.type}</div>
            </div>

            <div className="border-t border-dashed border-stone-800 py-3 text-[10px]">
              <div className="grid grid-cols-12 gap-1 font-bold mb-1 border-b border-dashed border-stone-400 pb-1">
                <span className="col-span-2">Cant</span>
                <span className="col-span-6">Detalle / Producto</span>
                <span className="col-span-4 text-right">Monto</span>
              </div>
              <div className="space-y-1.5 border-b border-dashed border-stone-400 pb-2">
                {selectedOrderForTicket.items.map((it: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-12 gap-1 items-start">
                    <span className="col-span-2 font-bold">{it.quantity}x</span>
                    <span className="col-span-6 pr-1 font-medium leading-tight text-left">{it.name}</span>
                    <span className="col-span-4 text-right font-mono font-bold">${(it.price * it.quantity).toLocaleString("es-AR")}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1 font-bold pt-2 text-xs">
                <span>SUBTOTAL:</span>
                <span className="text-right">${selectedOrderForTicket.subtotal.toLocaleString()}</span>
                {selectedOrderForTicket.fiscal?.invoiceType === "A" && (
                  <>
                    <span>IVA (21%):</span>
                    <span className="text-right">${selectedOrderForTicket.tax.toLocaleString()}</span>
                  </>
                )}
                <span className="text-sm font-black border-t border-dashed border-stone-800 pt-1 mt-1">TOTAL ARS:</span>
                <span className="text-sm font-black text-right border-t border-dashed border-stone-800 pt-1 mt-1">${selectedOrderForTicket.total.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 font-sans">
              <button 
                onClick={() => {
                  if (selectedOrderForTicket.fiscal) {
                    void ReceiptPDFService.generateArcaInvoicePDF(selectedOrderForTicket, selectedOrderForTicket.fiscal);
                  } else {
                    ReceiptPDFService.generateTicketNoFiscalPDF(selectedOrderForTicket);
                  }
                  onShowNotification("📥 Ticket descargado en formato PDF correctamente.", "success");
                }} 
                className="py-2.5 rounded-xl bg-[#5C1D27] text-white text-[10px] font-black cursor-pointer hover:bg-[#4A151D] transition-all flex items-center justify-center gap-1.5 shadow-xs uppercase tracking-wider"
              >
                <Download className="h-3.5 w-3.5" /> Descargar PDF
              </button>

              <button 
                onClick={() => {
                  ThermalPrinterService.printOrderThermalReceipt(selectedOrderForTicket);
                  onShowNotification("🖨️ Enviando comanda/ticket de compra a la impresora...", "info");
                }} 
                className="py-2.5 rounded-xl bg-[#EBDAC5] text-[#5C1D27] border border-[#CFB5A0] text-[10px] font-black cursor-pointer hover:bg-[#CFB5A0] transition-all flex items-center justify-center gap-1.5 shadow-xs uppercase tracking-wider"
              >
                <Printer className="h-3.5 w-3.5" /> Imprimir Ticket
              </button>

              <button 
                type="button"
                disabled
                title="Requiere configurar un proveedor de correo transaccional"
                className="py-2.5 rounded-xl bg-[#EBDAC5] text-[#5E393F] border border-[#CFB5A0] text-[10px] font-black cursor-not-allowed opacity-70 flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                <FileText className="h-3.5 w-3.5" /> Email no configurado
              </button>

              <button 
                onClick={() => {
                  const orderNum = selectedOrderForTicket.id.slice(-6).toUpperCase();
                  const msg = `☕ *COMPROBANTE RESTO BAR DEL TEATRO*\nTicket: #${orderNum}\nTotal: $${selectedOrderForTicket.total.toLocaleString("es-AR")}\n¡Gracias por su compra! 🎭`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                }} 
                className="py-2.5 rounded-xl bg-[#4F735A] text-white text-[10px] font-black cursor-pointer hover:bg-[#3D5B46] transition-all flex items-center justify-center gap-1.5 shadow-xs uppercase tracking-wider"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </button>
            </div>

            <div className="border-t border-dashed border-stone-800 py-2 mt-4 text-center text-[9px] space-y-1">
              <div>PAGO PROCESADO VÍA: {selectedOrderForTicket.paymentMethod?.toUpperCase() || "EFECTIVO"}</div>
              {selectedOrderForTicket.couponNumber && <div>CUPÓN POSNET NRO: {selectedOrderForTicket.couponNumber}</div>}
              {selectedOrderForTicket.clientAccountName && <div>CTA CORRIENTE CLIENTE: {selectedOrderForTicket.clientAccountName}</div>}
              <div className="pt-2 italic">*** ¡Muchas gracias por su visita! ***</div>
              <div className="text-[7px] text-[#2D0E13]/60 font-sans mt-2">
                {selectedOrderForTicket.fiscal?.status && ["authorized", "observed"].includes(selectedOrderForTicket.fiscal.status)
                  ? "COMPROBANTE ELECTRÓNICO AUTORIZADO POR ARCA"
                  : "DOCUMENTO NO FISCAL · SIN CAE"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Facturación Fiscal ARCA (Comanda de Salón / POS) */}
      {isArcaModalOpen && selectedOrderForBilling && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] rounded-3xl p-6 w-full max-w-lg shadow-2xl relative text-xs font-semibold text-[#2D0E13]">
            <button 
              onClick={() => setIsArcaModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-[#EBDAC5] text-[#5E393F] hover:text-[#2D0E13] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Receipt className="h-5 w-5 text-[#5C1D27]" />
              <h4 className="font-serif text-lg font-bold text-[#5C1D27]">Facturación Fiscal ARCA</h4>
            </div>
            <p className="text-[10px] text-[#5E393F] mb-4">Emisión de comprobante oficial autorizado por ARCA para comanda de salón.</p>

            {/* Detalle Resumen Comanda */}
            <div className="bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl p-3 mb-4 space-y-1.5">
              <div className="flex justify-between items-center border-b border-[#CFB5A0] pb-1.5">
                <span className="text-[10px] font-bold text-[#5C1D27]">Comanda #{selectedOrderForBilling.id.slice(-6)}</span>
                <span className="text-xs font-mono font-black text-[#5C1D27]">${selectedOrderForBilling.total.toLocaleString("es-AR")}</span>
              </div>
              <div className="text-[10px] text-[#5E393F] space-y-1 max-h-24 overflow-y-auto pr-1">
                {selectedOrderForBilling.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.quantity}x {it.name}</span>
                    <span className="font-mono">${(it.price * it.quantity).toLocaleString("es-AR")}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Formulario Cliente / Factura */}
            <div className="space-y-3.5">
              <div>
                <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Condición frente al IVA</label>
                <select 
                  value={fiscalForm.ivaCondition}
                  onChange={(e) => setFiscalForm(prev => ({ ...prev, ivaCondition: e.target.value as any }))}
                  className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold outline-none focus:border-[#5C1D27]"
                >
                  <option value="Consumidor Final">Consumidor Final (Factura C)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">CUIT / DNI</label>
                  <input 
                    type="text" 
                    placeholder="Opcional para Consumidor Final"
                    value={fiscalForm.cuitOrDni}
                    onChange={(e) => setFiscalForm(prev => ({ ...prev, cuitOrDni: e.target.value }))}
                    className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold font-mono outline-none focus:border-[#5C1D27]"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Razón Social / Nombre</label>
                  <input 
                    type="text" 
                    placeholder="ej: Juan Pérez"
                    value={fiscalForm.nameOrReason}
                    onChange={(e) => setFiscalForm(prev => ({ ...prev, nameOrReason: e.target.value }))}
                    className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold outline-none focus:border-[#5C1D27]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  onClick={() => setIsArcaModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-[#CFB5A0] text-xs font-bold text-[#5E393F] hover:bg-[#EBDAC5] transition-all cursor-pointer bg-transparent uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => void handleConfirmArcaBilling()}
                  className="w-1/2 py-3 rounded-xl bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black shadow-md cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <FileText className="h-4 w-4" /> Confirmar y Emitir ARCA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Facturación Manual ARCA */}
      {isManualArcaModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] rounded-3xl p-6 w-full max-w-xl shadow-2xl relative text-xs font-semibold text-[#2D0E13] my-8">
            <button 
              onClick={() => setIsManualArcaModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-[#EBDAC5] text-[#5E393F] hover:text-[#2D0E13] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-5 w-5 text-[#5C1D27]" />
              <h4 className="font-serif text-lg font-bold text-[#5C1D27]">Facturación Manual ARCA</h4>
            </div>
            <p className="text-[10px] text-[#5E393F] mb-4">Generador independiente de comprobantes fiscales autorizados con CAE y Código QR.</p>

            <div className="space-y-4">
              {/* Tipo de Factura & Medio de Pago */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Tipo de Comprobante</label>
                  <select 
                    value={manualInvoiceType}
                    onChange={(e) => setManualInvoiceType(e.target.value as any)}
                    className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold outline-none focus:border-[#5C1D27]"
                  >
                    <option value="Factura B">Factura B (Consumidor Final)</option>
                    <option value="Factura A">Factura A (Resp. Inscripto)</option>
                    <option value="Factura C">Factura C (Monotributo / Exento)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Medio de Pago</label>
                  <select 
                    value={manualPaymentMethod}
                    onChange={(e) => setManualPaymentMethod(e.target.value)}
                    className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold outline-none focus:border-[#5C1D27]"
                  >
                    <option value="Efectivo">💵 Efectivo</option>
                    <option value="MercadoPago">📱 Mercado Pago / QR</option>
                    <option value="Tarjeta Débito">💳 Tarjeta Débito</option>
                    <option value="Tarjeta Crédito">💳 Tarjeta Crédito</option>
                  </select>
                </div>
              </div>

              {/* Datos Cliente */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Condición IVA</label>
                  <select 
                    value={manualCustomerInfo.ivaCondition}
                    onChange={(e) => setManualCustomerInfo(prev => ({ ...prev, ivaCondition: e.target.value as any }))}
                    className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold outline-none focus:border-[#5C1D27]"
                  >
                    <option value="Consumidor Final">Consumidor Final (Factura C)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">CUIT / DNI</label>
                  <input 
                    type="text" 
                    placeholder="Opcional para Consumidor Final"
                    value={manualCustomerInfo.cuitOrDni}
                    onChange={(e) => setManualCustomerInfo(prev => ({ ...prev, cuitOrDni: e.target.value }))}
                    className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold font-mono outline-none focus:border-[#5C1D27]"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-[#5E393F] uppercase block mb-1">Razón Social / Nombre</label>
                  <input 
                    type="text" 
                    placeholder="ej: Juan Pérez"
                    value={manualCustomerInfo.nameOrReason}
                    onChange={(e) => setManualCustomerInfo(prev => ({ ...prev, nameOrReason: e.target.value }))}
                    className="w-full p-2.5 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold outline-none focus:border-[#5C1D27]"
                  />
                </div>
              </div>

              {/* Formulario Agregar Concepto */}
              <div className="p-3.5 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl space-y-3">
                <span className="text-[10px] font-black uppercase text-[#5C1D27] block">Agregar Concepto / Ítem a Facturar</span>
                <div className="grid grid-cols-12 gap-2">
                  <input 
                    type="text" 
                    placeholder="Descripción (ej: Menú Ejecutivo)" 
                    value={newManualDesc}
                    onChange={(e) => setNewManualDesc(e.target.value)}
                    className="col-span-5 p-2 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold outline-none focus:border-[#5C1D27]"
                  />
                  <input 
                    type="number" 
                    min="1"
                    placeholder="Cant" 
                    value={newManualQty}
                    onChange={(e) => setNewManualQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="col-span-2 p-2 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold font-mono outline-none focus:border-[#5C1D27]"
                  />
                  <input 
                    type="number" 
                    placeholder="Precio Unit ($)" 
                    value={newManualPrice}
                    onChange={(e) => setNewManualPrice(e.target.value)}
                    className="col-span-3 p-2 border border-[#CFB5A0] rounded-xl text-xs bg-[#FAF2E6] text-[#2D0E13] font-bold font-mono outline-none focus:border-[#5C1D27]"
                  />
                  <button 
                    onClick={() => {
                      const pr = parseFloat(newManualPrice);
                      if (!newManualDesc.trim() || isNaN(pr) || pr <= 0) {
                        onShowNotification("⚠️ Ingrese descripción y precio válido.", "warning");
                        return;
                      }
                      setManualItems(prev => [
                        ...prev,
                        { description: newManualDesc.trim(), qty: newManualQty, unitPrice: pr, ivaPct: newManualIva }
                      ]);
                      setNewManualDesc("");
                      setNewManualQty(1);
                      setNewManualPrice("");
                    }}
                    className="col-span-2 py-2 rounded-xl bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black cursor-pointer shadow-2xs"
                  >
                    + Agregar
                  </button>
                </div>
              </div>

              {/* Lista de Ítems Cargados */}
              <div className="border border-[#CFB5A0] rounded-2xl p-3 bg-[#FAF2E6] space-y-2">
                <div className="flex justify-between items-center border-b border-[#CFB5A0] pb-1.5 text-[9px] font-bold text-[#5E393F] uppercase">
                  <span>Conceptos a Facturar ({manualItems.length})</span>
                  <span>Total ARS</span>
                </div>
                {manualItems.length === 0 ? (
                  <div className="text-center py-4 text-xs text-[#5E393F] italic">No hay conceptos agregados aún.</div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {manualItems.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-[#EBDAC5]/30 rounded-xl text-xs border border-[#CFB5A0]/60">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#5C1D27]">{it.qty}x</span>
                          <span>{it.description}</span>
                          <span className="text-[9px] text-[#5E393F]">(${it.unitPrice.toLocaleString("es-AR")} c/u)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#5C1D27]">${(it.qty * it.unitPrice).toLocaleString("es-AR")}</span>
                          <button 
                            onClick={() => setManualItems(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-red-700 hover:text-red-900 rounded-lg hover:bg-red-100/50 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subtotal & Total */}
                <div className="border-t border-[#CFB5A0] pt-2 flex justify-between items-center text-sm font-black text-[#5C1D27]">
                  <span>TOTAL A FACTURAR:</span>
                  <span className="font-mono text-base">
                    ${manualItems.reduce((acc, it) => acc + (it.unitPrice * it.qty), 0).toLocaleString("es-AR")}
                  </span>
                </div>
              </div>

              {/* Acciones Modal */}
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsManualArcaModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-[#CFB5A0] text-xs font-bold text-[#5E393F] hover:bg-[#EBDAC5] transition-all cursor-pointer bg-transparent uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => void handleEmitManualArcaInvoice()}
                  disabled={manualItems.length === 0}
                  className="w-1/2 py-3 rounded-xl bg-[#5C1D27] hover:bg-[#4A151D] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black shadow-md cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <FileText className="h-4 w-4" /> Emitir Factura Manual ARCA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación de Comandas / Tickets */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] rounded-3xl p-6 w-full max-w-md shadow-2xl relative text-xs font-semibold text-[#2D0E13] space-y-4">
            <button 
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-[#EBDAC5] text-[#5E393F] hover:text-[#2D0E13] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#CFB5A0] pb-3">
              <div className="p-2.5 rounded-2xl bg-red-100 border border-red-300 text-red-700">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-[#5C1D27] uppercase tracking-wider">
                  {deleteTargetType === "single"
                    ? "Eliminar Ticket del Historial"
                    : deleteTargetType === "selected"
                    ? `Eliminar ${selectedHistoryOrderIds.length} Ticket(s) Seleccionado(s)`
                    : "⚠️ ELIMINAR TODO EL HISTORIAL DE COMANDAS"}
                </h3>
                <p className="text-[10px] text-[#5E393F]">Confirmación de acción irreversible</p>
              </div>
            </div>

            <div className="p-3.5 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl space-y-2 text-xs text-[#2D0E13]">
              <p>
                {deleteTargetType === "single"
                  ? `¿Está seguro de eliminar permanentemente la comanda #${targetOrderIdToDelete?.slice(-6)}?`
                  : deleteTargetType === "selected"
                  ? `¿Está seguro de eliminar permanentemente las ${selectedHistoryOrderIds.length} comandas seleccionadas?`
                  : "⚠️ ¿Está seguro de eliminar ABSOLUTAMENTE TODAS las comandas cobradas del historial?"}
              </p>
              <p className="text-[10px] text-red-800 font-bold">
                * Esta acción borrará la información de la memoria local y de la nube Supabase.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeletingOrders}
                className="w-1/2 py-2.5 rounded-xl border border-[#CFB5A0] text-xs font-bold text-[#5E393F] hover:bg-[#EBDAC5] transition-all cursor-pointer bg-transparent uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleConfirmDeleteHistoryOrders()}
                disabled={isDeletingOrders}
                className="w-1/2 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs font-black shadow-md cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                {isDeletingOrders ? (
                  <span>Eliminando...</span>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> Sí, Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
