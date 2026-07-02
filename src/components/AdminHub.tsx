import { useState, useEffect, FormEvent } from "react";
import { MenuItem, Order, OrderStatusType, ClientAccount } from "../types";
import {
  Coins, ClipboardList, Package, TrendingUp, AlertCircle, Plus, Edit2, Save, 
  Check, DollarSign, ArrowUpRight, Receipt, RefreshCw, Layers, Users, 
  ArrowUp, CreditCard, Coffee, CheckCircle, Info, BookOpen, LogOut, 
  Search, Activity, Trash2, Calendar, FileText, LayoutDashboard, Sliders, X,
  Lock, Unlock, Percent, Printer, Scissors, Settings
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";

interface AdminHubProps {
  orders: Order[];
  onOrderStatusUpdate: (orderId: string, status: OrderStatusType) => void;
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
}

export default function AdminHub({
  orders,
  onOrderStatusUpdate,
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
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "inventario" | "precios" | "caja" | "salon" | "proveedores" | "personal" | "reportes">(
    currentUser.role === "barista" 
      ? "inventario" 
      : currentUser.role === "mesero" 
      ? "salon" 
      : "dashboard"
  );
  const [personalSubTab, setPersonalSubTab] = useState<"barista" | "consumo" | "profit" | "cuentas">("barista");

  // User Accounts Management state
  const [users, setUsers] = useState<any[]>([]);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("mesero");
  const [newUserPin, setNewUserPin] = useState("");
  const [newUserAddress, setNewUserAddress] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserEmergencyPhone, setNewUserEmergencyPhone] = useState("");
  const [newUserSalary, setNewUserSalary] = useState("");
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<any | null>(null);
  const [usersMetadata, setUsersMetadata] = useState<Record<string, {
    direccion?: string;
    telefono?: string;
    telefono_contacto?: string;
    sueldo?: number;
    permissions?: string[];
  }>>({});

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

  const [isShiftOpen, setIsShiftOpen] = useState<boolean>(() => {
    return localStorage.getItem("puglia_shift_open") === "true";
  });
  const [shiftOpenTime, setShiftOpenTime] = useState<string>(() => {
    return localStorage.getItem("puglia_shift_open_time") || "";
  });
  const [closuresHistory, setClosuresHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("puglia_closures_history");
      return saved ? JSON.parse(saved) : [
        {
          id: "cls-1",
          user: "Sofía Colombo",
          apertura: "2026-06-18 13:24:56",
          cierre: "2026-06-26 16:48:55",
          observaciones: "Facturación normal del turno",
          ventasTurno: 294254,
          montoReal: 120000,
          diferencia: -174254
        }
      ];
    } catch (e) {
      return [];
    }
  });

  // Modal open states
  const [isConfigRestaurantOpen, setIsConfigRestaurantOpen] = useState(false);
  const [isConfigTicketerisOpen, setIsConfigTicketerisOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [closeShiftRealCash, setCloseShiftRealCash] = useState<string>("");
  const [closeShiftNotes, setCloseShiftNotes] = useState<string>("");
  const [selectedClosureForModal, setSelectedClosureForModal] = useState<any>(null);

  // Split bill & billing details state
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [cuitNumber, setCuitNumber] = useState<string>("");
  const [cuitName, setCuitName] = useState<string>("");
  const [ivaCondition, setIvaCondition] = useState<string>("Consumidor Final");
  const [splitPaymentType, setSplitPaymentType] = useState<"indiviso" | "comensales" | "articulos">("indiviso");
  const [dinersCount, setDinersCount] = useState<number>(2);
  const [selectedSplitItems, setSelectedSplitItems] = useState<Record<string, number>>({});
  const [selectedCtaCteClient, setSelectedCtaCteClient] = useState<string>("");

  // Waiter ordering (Mozo module) states
  const [selectedWaiter, setSelectedWaiter] = useState<string>("Enzo");
  const [mozoSelectedTable, setMozoSelectedTable] = useState<string | null>(null);
  const [mozoCart, setMozoCart] = useState<{ item: MenuItem; qty: number }[]>([]);
  const [mozoCategory, setMozoCategory] = useState<string>("todos");
  const [mozoSearchQuery, setMozoSearchQuery] = useState<string>("");
  const [mozoDinersCount, setMozoDinersCount] = useState<number>(2);

  // Local Storage state for Raw Materials Insumos
  const [insumos, setInsumos] = useState<Insumo[]>([]);

  // Billing calculation states
  const [billingOrder, setBillingOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"Efectivo" | "Tarjeta" | "MercadoPago">("Tarjeta");
  const [receivedCash, setReceivedCash] = useState<string>("");
  const [returnedChange, setReturnedChange] = useState<number>(0);

  // Price & Stock editing states
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);
  const [editIsOffer, setEditIsOffer] = useState<boolean>(false);
  const [editOfferPrice, setEditOfferPrice] = useState<number>(0);

  const [tipPool, setTipPool] = useState(0);
  const [profitSales, setProfitSales] = useState(80000);
  const [profitNet, setProfitNet] = useState(18000);
  const [profitHoursTotal, setProfitHoursTotal] = useState(4500);

  const [staffConsumptions, setStaffConsumptions] = useState([
    { id: "staff-1", name: "Carlos Gómez", rol: "Barista", consumedToday: 4.50, limit: 12.00 },
    { id: "staff-2", name: "Lucía Fernández", rol: "Pastelera", consumedToday: 8.20, limit: 12.00 },
    { id: "staff-3", name: "Mariano Díaz", rol: "Mozo", consumedToday: 3.20, limit: 12.00 }
  ]);

  // Load and seed initial data from Supabase
  useEffect(() => {
    const loadSupabaseData = async () => {
      try {
        // 1. Fetch Insumos
        const { data: insData } = await supabase.from("insumos").select("*");
        if (insData && insData.length > 0) {
          setInsumos(insData.map(i => ({
            id: i.id,
            name: i.name,
            quantity: Number(i.quantity),
            unit: i.unit,
            minLimit: Number(i.min_limit),
            provider: i.provider || undefined,
            expirationDate: i.expiration_date || undefined
          })));
        } else {
          // Seed default insumos if empty
          const defaultInsumos = [
            { id: "ins-harina", name: "Harina 000 Pastelera", quantity: 0.8, unit: "kg", minLimit: 10.0, provider: "Distribuidora Sur", expirationDate: "2026-08-15" },
            { id: "ins-leche", name: "Leche Entera La Suipachense", quantity: 1.2, unit: "L", minLimit: 12.0, provider: "Lácteos del Campo", expirationDate: "2026-06-10" },
            { id: "ins-crema", name: "Crema de Leche 44% Tenor Gras", quantity: 4.5, unit: "L", minLimit: 6.0, provider: "Lácteos del Campo", expirationDate: "2026-06-12" },
            { id: "ins-cafe", name: "Tostado Etiopía Yirgacheffe (Especialidad)", quantity: 8.5, unit: "kg", minLimit: 5.0, provider: "Moinho Alegre", expirationDate: "2026-11-01" },
            { id: "ins-cafe-colombia", name: "Tostado Colombia Huila (Finca El Diviso)", quantity: 12.0, unit: "kg", minLimit: 6.0, provider: "Moinho Alegre", expirationDate: "2026-11-15" },
            { id: "ins-manteca", name: "Manteca Calidad Extra", quantity: 3.2, unit: "kg", minLimit: 8.0, provider: "Distribuidora Sur", expirationDate: "2026-07-20" },
            { id: "ins-azucar", name: "Azúcar Chango Refinada", quantity: 15.0, unit: "kg", minLimit: 10.0, provider: "Mayorista Altiplano", expirationDate: "2027-01-10" },
            { id: "ins-huevos", name: "Huevos de Campo Orgánicos", quantity: 120, unit: "un", minLimit: 90, provider: "Granja La Pradera", expirationDate: "2026-06-25" },
            { id: "ins-ddl", name: "Dulce de Leche Repostero", quantity: 4.2, unit: "kg", minLimit: 5.0, provider: "Distribuidora Sur", expirationDate: "2026-09-01" },
            { id: "ins-chocolate", name: "Chocolate Fino de Bariloche", quantity: 38, unit: "barras", minLimit: 15, provider: "Distribuidora Sur", expirationDate: "2026-12-15" },
            { id: "ins-yerba", name: "Yerba Mate Orgánica Barbacuá", quantity: 5.0, unit: "kg", minLimit: 3.0, provider: "Mayorista Altiplano", expirationDate: "2027-04-18" },
            { id: "ins-jugo-naranja", name: "Naranjas de Jugo Seleccionadas", quantity: 18.0, unit: "kg", minLimit: 10.0, provider: "Granja La Pradera", expirationDate: "2026-06-18" }
          ];
          await supabase.from("insumos").insert(defaultInsumos.map(i => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            min_limit: i.minLimit,
            provider: i.provider,
            expiration_date: i.expirationDate
          })));
          setInsumos(defaultInsumos);
        }

        // 2. Fetch Cash Ledger
        const { data: cashData } = await supabase.from("cash_ledger").select("*").eq("id", "current").single();
        if (cashData) {
          setCashLedger({
            totalCollected: Number(cashData.total_collected),
            cash: Number(cashData.cash),
            card: Number(cashData.card),
            mercadopago: Number(cashData.mercadopago),
            transactions: cashData.transactions || []
          });
        } else {
          const defaultLedger = {
            id: 'current',
            total_collected: 125.40,
            cash: 45.20,
            card: 55.20,
            mercadopago: 25.00,
            transactions: [
              { id: "tx-1", type: "Cobro", orderId: "PRE-0941", total: 15.20, method: "Efectivo", timestamp: "Hace 1 hora" },
              { id: "tx-2", type: "Cobro", orderId: "PRE-0932", total: 45.00, method: "Tarjeta", timestamp: "Hace 2 horas" },
              { id: "tx-3", type: "Cobro", orderId: "PRE-0925", total: 65.20, method: "MercadoPago", timestamp: "Hace 3 horas" }
            ]
          };
          await supabase.from("cash_ledger").insert({
            id: defaultLedger.id,
            total_collected: defaultLedger.total_collected,
            cash: defaultLedger.cash,
            card: defaultLedger.card,
            mercadopago: defaultLedger.mercadopago,
            transactions: defaultLedger.transactions
          });
          setCashLedger({
            totalCollected: defaultLedger.total_collected,
            cash: defaultLedger.cash,
            card: defaultLedger.card,
            mercadopago: defaultLedger.mercadopago,
            transactions: defaultLedger.transactions
          });
        }

        // 3. Fetch Barista Calibration Data
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

        // 4. Fetch Tip Pool
        const { data: settingsData } = await supabase.from("system_settings").select("*").eq("key", "tip_pool").single();
        if (settingsData) {
          setTipPool(Number(settingsData.value));
        }

        // 5. Fetch Users Metadata
        const { data: metaData } = await supabase.from("system_settings").select("*").eq("key", "users_metadata").single();
        if (metaData) {
          setUsersMetadata(JSON.parse(metaData.value));
        } else {
          const saved = localStorage.getItem("puglia_users_metadata");
          if (saved) {
            setUsersMetadata(JSON.parse(saved));
          }
        }
      } catch (err) {
        console.error("Error fetching admin data from Supabase:", err);
      }
    };

    loadSupabaseData();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from("users_accounts").select("*");
      const dbUsers = data || [];

      // Extract metadata from DB columns if available
      const newMeta: any = {};
      dbUsers.forEach(u => {
        newMeta[u.id] = {
          direccion: u.direccion || "",
          telefono: u.telefono || "",
          telefono_contacto: u.telefono_contacto || "",
          sueldo: u.sueldo ? parseFloat(u.sueldo) : 0,
          permissions: u.permissions || []
        };
      });

      // Merge local storage data
      let localUsers: any[] = [];
      try {
        const saved = localStorage.getItem("puglia_local_users");
        if (saved) {
          localUsers = JSON.parse(saved);
        }
      } catch (e) {}

      const savedMeta = localStorage.getItem("puglia_users_metadata");
      let localMeta: any = {};
      if (savedMeta) {
        try { localMeta = JSON.parse(savedMeta); } catch (e) {}
      }

      // Merge avoiding duplicates by ID
      const merged = [...dbUsers];
      localUsers.forEach(l => {
        if (!merged.some(m => m.id === l.id)) {
          merged.push(l);
        }
        if (localMeta[l.id] && !newMeta[l.id]) {
          newMeta[l.id] = localMeta[l.id];
        }
      });

      setUsersMetadata(newMeta);
      setUsers(merged);
    } catch (e) {
      console.error("Error fetching users:", e);
      let localUsers: any[] = [];
      try {
        const saved = localStorage.getItem("puglia_local_users");
        if (saved) localUsers = JSON.parse(saved);
      } catch (err) {}
      setUsers(localUsers);
    }
  };

  const saveUsersMetadata = async (newMeta: any, updatedUserId?: string) => {
    setUsersMetadata(newMeta);
    localStorage.setItem("puglia_users_metadata", JSON.stringify(newMeta));
    
    if (updatedUserId) {
      const metaVal = newMeta[updatedUserId];
      if (metaVal) {
        try {
          const { error } = await supabase.from("users_accounts").update({
            direccion: metaVal.direccion,
            telefono: metaVal.telefono,
            telefono_contacto: metaVal.telefono_contacto,
            sueldo: metaVal.sueldo,
            permissions: metaVal.permissions
          }).eq("id", updatedUserId);
          if (error) {
            console.warn("DB update failed, using local storage fallback", error);
          }
        } catch (e) {
          console.warn("DB update failed, using local storage fallback", e);
        }
      }
    }
  };

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim() || !newUserRole || !newUserPin.trim()) {
      onShowNotification("⚠️ Complete todos los campos.", "warning");
      return;
    }
    const newId = "usr-" + Date.now();
    const defaultPerms = newUserRole === "administrador"
      ? ["dashboard", "inventario", "precios", "salon", "pedidos_mozo", "caja", "proveedores", "personal", "reportes"]
      : newUserRole === "mesero"
      ? ["salon", "pedidos_mozo", "caja"]
      : ["inventario", "personal"]; // barista

    const newUser = {
      id: newId,
      name: newUserName.trim(),
      email: newUserEmail.trim().toLowerCase(),
      password: newUserPassword.trim(),
      role: newUserRole,
      pin: newUserPin.trim(),
      direccion: newUserAddress.trim(),
      telefono: newUserPhone.trim(),
      telefono_contacto: newUserEmergencyPhone.trim(),
      sueldo: parseFloat(newUserSalary) || 0,
      permissions: defaultPerms
    };

    let savedLocally = false;
    try {
      const { error } = await supabase.from("users_accounts").insert(newUser);
      if (error) {
        console.warn("DB write blocked by RLS. Saving locally...", error);
        savedLocally = true;
      }
    } catch (err) {
      console.warn("DB write error. Saving locally...", err);
      savedLocally = true;
    }

    if (savedLocally) {
      try {
        let localUsers: any[] = [];
        const saved = localStorage.getItem("puglia_local_users");
        if (saved) {
          localUsers = JSON.parse(saved);
        }
        localUsers.push(newUser);
        localStorage.setItem("puglia_local_users", JSON.stringify(localUsers));
      } catch (e) {
        console.error("Error saving user locally:", e);
      }
    }

    const newMeta = {
      ...usersMetadata,
      [newId]: {
        direccion: newUserAddress.trim(),
        telefono: newUserPhone.trim(),
        telefono_contacto: newUserEmergencyPhone.trim(),
        sueldo: parseFloat(newUserSalary) || 0,
        permissions: defaultPerms
      }
    };
    await saveUsersMetadata(newMeta, savedLocally ? undefined : newId);

    onShowNotification(
      savedLocally 
        ? `✅ Colaborador ${newUserName} registrado localmente (Seguridad DB).`
        : `✅ Colaborador ${newUserName} creado con éxito en la nube.`, 
      "success"
    );

    setNewUserName("");
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserRole("mesero");
    setNewUserPin("");
    setNewUserAddress("");
    setNewUserPhone("");
    setNewUserEmergencyPhone("");
    setNewUserSalary("");
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === "usr-1") {
      onShowNotification("⚠️ No se puede eliminar el Administrador principal semilla.", "warning");
      return;
    }
    if (userId === currentUser.id) {
      onShowNotification("⚠️ No puede eliminar su propia cuenta activa.", "warning");
      return;
    }

    let isLocal = false;
    let localUsers: any[] = [];
    try {
      const saved = localStorage.getItem("puglia_local_users");
      if (saved) {
        localUsers = JSON.parse(saved);
        isLocal = localUsers.some(u => u.id === userId);
      }
    } catch (e) {}

    if (isLocal) {
      try {
        const updatedLocal = localUsers.filter(u => u.id !== userId);
        localStorage.setItem("puglia_local_users", JSON.stringify(updatedLocal));
        onShowNotification(`✅ Usuario local ${userName} eliminado.`, "success");
      } catch (e) {
        console.error(e);
      }
    } else {
      try {
        const { error } = await supabase.from("users_accounts").delete().eq("id", userId);
        if (error) {
          console.warn("DB delete blocked. Deleting from local list...", error);
        }
        onShowNotification(`✅ Usuario ${userName} eliminado.`, "success");
      } catch (err) {
        console.warn("DB delete error. Deleting from local list...", err);
      }
    }

    // Clean up metadata
    const updatedMeta = { ...usersMetadata };
    delete updatedMeta[userId];
    await saveUsersMetadata(updatedMeta);

    if (selectedUserForPermissions?.id === userId) {
      setSelectedUserForPermissions(null);
    }
    fetchUsers();
  };

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
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movType, setMovType] = useState<"Ingreso" | "Egreso">("Ingreso");
  const [movInsumoId, setMovInsumoId] = useState<string>("");
  const [movQty, setMovQty] = useState<string>("");

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
  const equitativoPerEmp = pozoProfitSharing * 0.50 / 4;

  const [scannedItems, setScannedItems] = useState([
    { id: "scan-1", insumoId: "ins-cafe", name: "Tostado Etiopía Yirgacheffe", qty: 10, unit: "kg", damaged: false },
    { id: "scan-2", insumoId: "ins-leche", name: "Leche Entera La Suipachense", qty: 24, unit: "L", damaged: false },
    { id: "scan-3", insumoId: "ins-ddl", name: "Dulce de Leche Repostero", qty: 5, unit: "kg", damaged: false }
  ]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleMassivePriceUpdate = () => {
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

    onUpdateMenu(updated);
    onShowNotification(`📈 ¡Ajuste de precios masivo completado! Se aumentó un ${inflationPercentage}% en la categoría '${targetCategory}'.`, "success");
  };

  const handleRecordRepayment = (e: FormEvent) => {
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

    const updated = clientAccounts.map(c => {
      if (c.id === selectedClientId) {
        return {
          ...c,
          balance: Number((c.balance + amountVal).toFixed(2)) // balance is negative or zero, adding money brings it closer to or above 0
        };
      }
      return c;
    });

    onUpdateClientAccounts(updated);
    
    // Add transaction to cashLedger
    setCashLedger(prev => {
      const newTx = {
        id: "tx-" + Date.now(),
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

  const handleConfirmBarcodeReception = () => {
    setInsumos(prev =>
      prev.map(ins => {
        const matchingScans = scannedItems.filter(s => s.insumoId === ins.id && !s.damaged);
        if (matchingScans.length > 0) {
          const addedQty = matchingScans.reduce((sum, s) => sum + s.qty, 0);
          return {
            ...ins,
            quantity: Number((ins.quantity + addedQty).toFixed(2))
          };
        }
        return ins;
      })
    );

    const damagedCount = scannedItems.filter(s => s.damaged).length;

    if (damagedCount > 0) {
      onShowNotification(`📦 Recepción: Se testaron/rechazaron ${damagedCount} bultos dañados. Se ingresó el stock conforme.`, "success");
    } else {
      onShowNotification("📦 Recepción de remito completa sin discrepancias físicas.", "success");
    }

    setScannedItems([
      { id: "scan-" + Date.now() + "-1", insumoId: "ins-cafe", name: "Tostado Etiopía Yirgacheffe", qty: 5, unit: "kg", damaged: false },
      { id: "scan-" + Date.now() + "-2", insumoId: "ins-leche", name: "Leche Entera La Suipachense", qty: 12, unit: "L", damaged: false },
      { id: "scan-" + Date.now() + "-3", insumoId: "ins-yerba", name: "Yerba Mate Orgánica Barbacuá", qty: 4, unit: "kg", damaged: false }
    ]);
    setIsScannerOpen(false);
  };

  // Sync to Supabase
  useEffect(() => {
    const syncCash = async () => {
      try {
        if (cashLedger.transactions.length === 0 && cashLedger.totalCollected === 0) return;
        await supabase.from("cash_ledger").upsert({
          id: "current",
          total_collected: cashLedger.totalCollected,
          cash: cashLedger.cash,
          card: cashLedger.card,
          mercadopago: cashLedger.mercadopago,
          transactions: cashLedger.transactions
        });
      } catch (err) {
        console.error("Error syncing cash ledger to Supabase:", err);
      }
    };
    syncCash();
  }, [cashLedger]);

  // Sync Shift states to LocalStorage
  useEffect(() => {
    localStorage.setItem("puglia_shift_open", isShiftOpen ? "true" : "false");
    localStorage.setItem("puglia_shift_open_time", shiftOpenTime);
  }, [isShiftOpen, shiftOpenTime]);

  useEffect(() => {
    localStorage.setItem("puglia_closures_history", JSON.stringify(closuresHistory));
  }, [closuresHistory]);

  useEffect(() => {
    const syncInsumos = async () => {
      try {
        if (insumos.length === 0) return;
        await supabase.from("insumos").upsert(
          insumos.map(ins => ({
            id: ins.id,
            name: ins.name,
            quantity: ins.quantity,
            unit: ins.unit,
            min_limit: ins.minLimit,
            provider: ins.provider || null,
            expiration_date: ins.expirationDate || null
          }))
        );
      } catch (err) {
        console.error("Error syncing insumos to Supabase:", err);
      }
    };
    syncInsumos();
  }, [insumos]);

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

  const handleProcessBilling = () => {
    if (!billingOrder) return;

    const total = billingOrder.total;
    const orderId = billingOrder.id;

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
        id: "tx-" + Date.now(),
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

    // Update central state: Set order as Completed
    onOrderStatusUpdate(orderId, "Completado");

    // Reduce raw material stock slightly to simulate consumption
    setInsumos((prev) => 
      prev.map(ins => {
        if (ins.id === "ins-cafe") return { ...ins, quantity: Math.max(0, parseFloat((ins.quantity - 0.15).toFixed(2))) };
        if (ins.id === "ins-leche") return { ...ins, quantity: Math.max(0, parseFloat((ins.quantity - 0.4).toFixed(2))) };
        return ins;
      })
    );

    onShowNotification(`💵 Cobro procesado con éxito por $${total.toFixed(2)} vía ${paymentMethod}.`, "success");
    setBillingOrder(null);
  };

  // Adjust raw materials stock
  const handleAdjustInsumo = (id: string, amount: number) => {
    setInsumos(prev =>
      prev.map(ins => {
        if (ins.id === id) {
          const newQty = parseFloat((ins.quantity + amount).toFixed(2));
          if (newQty < ins.minLimit) {
            onShowNotification(`⚠️ Alerta: El insumo '${ins.name}' quedó por debajo de su stock de seguridad.`, "warning");
          }
          return { ...ins, quantity: Math.max(0, newQty) };
        }
        return ins;
      })
    );
  };

  // Save changes to menu item pricing & stock
  const handleStartEditing = (item: MenuItem) => {
    setEditingItemId(item.id);
    setEditPrice(item.price);
    setEditStock(item.stock || 0);
    setEditIsOffer(item.isOffer || false);
    setEditOfferPrice(item.offerPrice || item.price * 0.85);
  };

  const handleSaveItemChanges = (itemId: string) => {
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

    onUpdateMenu(updatedMenu);
    setEditingItemId(null);
    onShowNotification("✍️ Cambios guardados con éxito en el catálogo de productos.", "success");
  };

  // Open Daily Shift
  const handleOpenShift = () => {
    const now = new Date();
    const formattedDate = now.getFullYear() + "-" + 
      String(now.getMonth() + 1).padStart(2, '0') + "-" + 
      String(now.getDate()).padStart(2, '0') + " " + 
      String(now.getHours()).padStart(2, '0') + ":" + 
      String(now.getMinutes()).padStart(2, '0') + ":" + 
      String(now.getSeconds()).padStart(2, '0');
      
    setIsShiftOpen(true);
    setShiftOpenTime(formattedDate);
    setCashLedger({
      totalCollected: 0,
      cash: 0,
      card: 0,
      mercadopago: 0,
      transactions: []
    });
    onShowNotification("🔓 Turno fiscal de caja abierto con éxito.", "success");
  };

  // Close Daily Shift
  const handleConfirmCloseShift = (montoReal: number, observaciones: string) => {
    const now = new Date();
    const formattedDate = now.getFullYear() + "-" + 
      String(now.getMonth() + 1).padStart(2, '0') + "-" + 
      String(now.getDate()).padStart(2, '0') + " " + 
      String(now.getHours()).padStart(2, '0') + ":" + 
      String(now.getMinutes()).padStart(2, '0') + ":" + 
      String(now.getSeconds()).padStart(2, '0');

    const ventas = cashLedger.totalCollected;
    const diff = montoReal - ventas;

    const newClosure = {
      id: "cls-" + Date.now(),
      user: currentUser.name,
      apertura: shiftOpenTime,
      cierre: formattedDate,
      observaciones: observaciones || "Cierre de caja ordinario",
      ventasTurno: ventas,
      montoReal: montoReal,
      diferencia: diff,
      transactions: cashLedger.transactions
    };

    setClosuresHistory(prev => [newClosure, ...prev]);
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
    onShowNotification("🔒 Turno de caja cerrado y homologado en auditoría.", "info");
  };

  // Unit Costs mapping for dynamic recipe costing
  const INSUMO_UNIT_COSTS: Record<string, { price: number; unit: string }> = {
    "ins-harina": { price: 1500, unit: "kg" },
    "ins-leche": { price: 1200, unit: "L" },
    "ins-crema": { price: 4000, unit: "L" },
    "ins-cafe": { price: 24000, unit: "kg" },
    "ins-cafe-colombia": { price: 28000, unit: "kg" },
    "ins-manteca": { price: 6500, unit: "kg" },
    "ins-azucar": { price: 1100, unit: "kg" },
    "ins-huevos": { price: 200, unit: "un" },
    "ins-ddl": { price: 3800, unit: "kg" },
    "ins-chocolate": { price: 2500, unit: "barra" },
    "ins-yerba": { price: 3200, unit: "kg" }
  };

  const getRecipeCost = (item: MenuItem) => {
    if (!item.recipe || item.recipe.length === 0) return 480; // Default mockup cost for V60
    let total = 0;
    item.recipe.forEach(r => {
      const unitCost = INSUMO_UNIT_COSTS[r.ingredientId]?.price || 1500;
      total += r.amount * unitCost;
    });
    return parseFloat(total.toFixed(2));
  };

  const renderDashboard = () => {
    return (
      <motion.div
        key="dashboard-view"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-8"
      >
        {/* Title Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#C2956E]">Resumen Diario</span>
            <h2 className="font-serif text-3xl font-bold text-[#2C1810] mt-0.5">Control de Operaciones</h2>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                setMovType("Ingreso");
                setMovInsumoId(insumos[0]?.id || "");
                setMovQty("");
                setIsMovementModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2C1810] text-[#FDFBF7] text-xs font-bold shadow-md hover:bg-[#3d2217] transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Registrar Movimiento
            </button>
            <button 
              onClick={() => setActiveSubTab("caja")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#2C1810]/20 hover:bg-[#2C1810]/5 text-xs font-bold text-[#2C1810] transition-all cursor-pointer bg-white"
            >
              <Receipt className="h-4 w-4" /> Terminal de Caja
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs relative overflow-hidden flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#2C1810]/50 block font-bold uppercase tracking-wider">Venta Neta Hoy</span>
              <div className="text-3xl font-serif font-black text-[#2C1810] mt-1.5">$185.400</div>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-1.5 flex items-center gap-0.5">
                <ArrowUp className="h-3 w-3" /> +18.4% vs promedio histórico
              </span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#C2956E]/10 flex items-center justify-center text-[#C2956E]">
              <Coins className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs relative overflow-hidden flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#2C1810]/50 block font-bold uppercase tracking-wider">Costo de Insumos</span>
              <div className="text-3xl font-serif font-black text-[#2C1810] mt-1.5">$58.401</div>
              <span className="text-[10px] text-[#2C1810]/60 font-semibold block mt-1.5">
                Ratio objetivo: 32% (Actual: 31.5%)
              </span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#C2956E]/10 flex items-center justify-center text-[#C2956E]">
              <Coffee className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs relative overflow-hidden flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#2C1810]/50 block font-bold uppercase tracking-wider">Margen Bruto</span>
              <div className="text-3xl font-serif font-black text-[#2C1810] mt-1.5">68.5%</div>
              <span className="text-[10px] text-[#2C1810]/60 font-semibold block mt-1.5">
                Generando $126.999 neto hoy
              </span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#C2956E]/10 flex items-center justify-center text-[#C2956E]">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Chart + Reposición split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2C1810]">Desempeño de Ventas</h3>
                  <p className="text-[10px] text-[#2C1810]/50 font-medium">Flujo de caja registrado acumulado por día de la semana habitual (en ARS)</p>
                </div>
                <span className="text-[9px] font-bold text-[#2C1810]/60 bg-[#2C1810]/5 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                  7 Días Históricos
                </span>
              </div>

              {/* Custom CSS Bars */}
              <div className="flex justify-between items-end h-64 px-4 border-b border-[#2C1810]/10 pb-2">
                {[
                  { label: "Lunes", value: "$150k", height: "45%" },
                  { label: "Martes", value: "$170k", height: "52%" },
                  { label: "Miércoles", value: "$160k", height: "48%" },
                  { label: "Jueves", value: "$200k", height: "60%" },
                  { label: "Viernes", value: "$240k", height: "72%" },
                  { label: "Sábado", value: "$300k", height: "90%" },
                  { label: "Domingo", value: "$280k", height: "84%" }
                ].map((bar, idx) => (
                  <div key={idx} className="flex flex-col items-center group w-10">
                    <span className="text-[9px] font-bold text-[#2C1810] opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-mono">
                      {bar.value}
                    </span>
                    <div 
                      style={{ height: bar.height }}
                      className="w-8 bg-[#2C1810] hover:bg-[#C2956E] transition-all rounded-t-md duration-300"
                    ></div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between px-4 pt-3 text-[10px] font-bold text-[#2C1810]/60">
                <span>Lunes</span>
                <span>Martes</span>
                <span>Miércoles</span>
                <span>Jueves</span>
                <span>Viernes</span>
                <span>Sábado</span>
                <span>Domingo</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2C1810]">Semáforo de Reposición</h3>
                  <p className="text-[10px] text-[#2C1810]/50 font-medium">Insumos críticos e interrupciones potenciales</p>
                </div>
                <span className="h-5 px-2 flex items-center justify-center rounded-full bg-black text-white text-[9px] font-bold">
                  4 Alertas
                </span>
              </div>

              <div className="p-3 bg-stone-50 border border-[#2C1810]/5 rounded-2xl">
                <div className="flex justify-between text-[10px] font-bold text-[#2C1810]/80 mb-1.5">
                  <span>Cobertura General de Stock</span>
                  <span>56% óptimo</span>
                </div>
                <div className="w-full h-2 bg-[#2C1810]/10 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-600 rounded-full" style={{ width: "56%" }}></div>
                </div>
              </div>

              <div className="space-y-2.5">
                {[
                  { name: "Harina 000 Pastelera", qty: "0.8 kg", min: "Min: 10 kg", color: "bg-red-500", provider: "Distribuidora Sur" },
                  { name: "Leche Entera La Suipachense", qty: "1.2 L", min: "Min: 12 L", color: "bg-red-500", provider: "Lácteos del Campo" },
                  { name: "Manteca Calidad Extra", qty: "3.2 kg", min: "Min: 8 kg", color: "bg-amber-500", provider: "Distribuidora Sur" },
                  { name: "Crema de Leche 44% Tenor Gras", qty: "4.5 L", min: "Min: 6 L", color: "bg-amber-500", provider: "Lácteos del Campo" }
                ].map((alert, idx) => (
                  <div key={idx} className="p-3 bg-stone-50/50 border border-[#2C1810]/5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${alert.color} shrink-0`}></span>
                      <div>
                        <strong className="text-xs font-bold text-[#2C1810] block leading-tight">{alert.name}</strong>
                        <span className="text-[9px] text-[#2C1810]/40">Proveedor: {alert.provider}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#2C1810] block">{alert.qty}</span>
                      <span className="text-[9px] text-[#2C1810]/40 block font-semibold">{alert.min}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => setActiveSubTab("inventario")}
              className="w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#2C1810]/5 hover:bg-[#2C1810]/10 text-xs font-bold text-[#2C1810] transition-all cursor-pointer"
            >
              Gestionar Inventario Completo ↗
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderInventario = () => {
    const totalInsumosCount = insumos.length;
    const criticalInsumosCount = insumos.filter(i => i.quantity <= i.minLimit / 2).length;
    const lowStockInsumosCount = insumos.filter(i => i.quantity <= i.minLimit && i.quantity > i.minLimit / 2).length;
    const healthyInsumosCount = insumos.filter(i => i.quantity > i.minLimit).length;

    const filteredInsumos = insumos.filter(i => 
      i.name.toLowerCase().includes(searchInsumoQuery.toLowerCase()) ||
      (i.provider && i.provider.toLowerCase().includes(searchInsumoQuery.toLowerCase()))
    );

    return (
      <motion.div
        key="inventario-view"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-8"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#C2956E]">Módulo de Inventario</span>
            <h2 className="font-serif text-3xl font-bold text-[#2C1810] mt-0.5">Stock & Materias Primas</h2>
          </div>
          <button 
            onClick={() => {
              setMovType("Ingreso");
              setMovInsumoId(insumos[0]?.id || "");
              setMovQty("");
              setIsMovementModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2C1810] text-[#FDFBF7] text-xs font-bold shadow-md hover:bg-[#3d2217] transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Registrar Movimiento
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#2C1810]/10 rounded-2xl p-4 shadow-xs">
            <span className="text-[9px] font-bold text-[#2C1810]/40 uppercase tracking-wider block">Total Insumos</span>
            <div className="text-2xl font-serif font-black text-[#2C1810] mt-1">{totalInsumosCount}</div>
          </div>
          <div className="bg-white border border-[#2C1810]/10 rounded-2xl p-4 shadow-xs">
            <span className="text-[9px] font-bold text-[#2C1810]/40 uppercase tracking-wider block flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span> Críticos
            </span>
            <div className="text-2xl font-serif font-black text-red-600 mt-1">{criticalInsumosCount}</div>
          </div>
          <div className="bg-white border border-[#2C1810]/10 rounded-2xl p-4 shadow-xs">
            <span className="text-[9px] font-bold text-[#2C1810]/40 uppercase tracking-wider block flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Stock Bajo
            </span>
            <div className="text-2xl font-serif font-black text-amber-600 mt-1">{lowStockInsumosCount}</div>
          </div>
          <div className="bg-white border border-[#2C1810]/10 rounded-2xl p-4 shadow-xs">
            <span className="text-[9px] font-bold text-[#2C1810]/40 uppercase tracking-wider block flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Stock Saludable
            </span>
            <div className="text-2xl font-serif font-black text-emerald-600 mt-1">{healthyInsumosCount}</div>
          </div>
        </div>

        <div className="bg-white border border-[#2C1810]/10 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#2C1810]/40" />
            <input 
              type="text"
              placeholder="Buscar insumo, proveedor..."
              value={searchInsumoQuery}
              onChange={(e) => setSearchInsumoQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#2C1810]/20 rounded-xl text-xs bg-stone-50/50 text-[#2C1810] focus:ring-1 focus:ring-[#C2956E] focus:outline-none font-bold"
            />
          </div>
          <div className="text-xs font-semibold text-[#2C1810]/60 uppercase tracking-wider">
            Mostrando {filteredInsumos.length} productos
          </div>
        </div>

        <div className="bg-white border border-[#2C1810]/10 rounded-3xl overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2C1810]/5 border-b border-[#2C1810]/10 text-[9px] font-bold uppercase tracking-wider text-[#2C1810]/60">
                <th className="p-4">Producto</th>
                <th className="p-4">Proveedor</th>
                <th className="p-4 text-center">Mínimo</th>
                <th className="p-4 text-center">Actual</th>
                <th className="p-4 text-center">Unidad</th>
                <th className="p-4">Vencimiento</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-center">Ajuste</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2C1810]/10 text-xs">
              {filteredInsumos.map((ins, idx) => {
                const isCritical = ins.quantity <= ins.minLimit / 2;
                const isLow = ins.quantity <= ins.minLimit && !isCritical;
                const statusBadge = isCritical ? (
                  <span className="px-2.5 py-1 text-[8px] font-extrabold uppercase bg-red-50 border border-red-200 text-red-700 rounded-full tracking-wider">CRÍTICO</span>
                ) : isLow ? (
                  <span className="px-2.5 py-1 text-[8px] font-extrabold uppercase bg-amber-50 border border-amber-200 text-amber-700 rounded-full tracking-wider">BAJO</span>
                ) : (
                  <span className="px-2.5 py-1 text-[8px] font-extrabold uppercase bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full tracking-wider">OK</span>
                );

                return (
                  <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                    <td className="p-4 font-bold text-[#2C1810]">{ins.name}</td>
                    <td className="p-4 text-[#2C1810]/70 font-semibold">{ins.provider || "Sin designar"}</td>
                    <td className="p-4 text-center font-mono font-bold text-[#2C1810]/60">{ins.minLimit}</td>
                    <td className="p-4 text-center font-mono font-black text-[#2C1810]">{ins.quantity}</td>
                    <td className="p-4 text-center text-[#2C1810]/60 uppercase font-bold">{ins.unit}</td>
                    <td className="p-4 font-mono font-semibold text-[#2C1810]/60">{ins.expirationDate || "-"}</td>
                    <td className="p-4 text-center">{statusBadge}</td>
                    <td className="p-4 text-center flex items-center justify-center gap-1.5">
                      <button 
                        onClick={() => handleAdjustInsumo(ins.id, -1)}
                        className="h-7 w-7 rounded-lg bg-stone-100 text-espresso hover:bg-stone-200 flex items-center justify-center font-bold text-base cursor-pointer"
                        title="Descontar 1 unidad"
                      >
                        -
                      </button>
                      <button 
                        onClick={() => handleAdjustInsumo(ins.id, 1)}
                        className="h-7 w-7 rounded-lg bg-stone-100 text-espresso hover:bg-stone-200 flex items-center justify-center font-bold text-base cursor-pointer"
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
      </motion.div>
    );
  };

  const renderPrecios = () => {
    const currentItem = selectedMenuProduct || menuItems[0];
    if (!currentItem) return <div>Cargando catálogo...</div>;
    const directCost = getRecipeCost(currentItem);
    const utility = simulatedPrice - directCost;
    const margin = simulatedPrice > 0 ? (utility / simulatedPrice) * 100 : 0;

    return (
      <motion.div
        key="precios-view"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-8"
      >
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#C2956E]">Ficha Técnica & Rentabilidad</span>
          <h2 className="font-serif text-3xl font-bold text-[#2C1810] mt-0.5">Carta & Recetas</h2>
        </div>

        <div className="flex border-b border-[#2C1810]/10 gap-2 mb-6">
          {["todos", "coffee", "pastry"].map((cat) => (
            <button 
              key={cat}
              onClick={() => setSelectedPosCategory(cat)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                selectedPosCategory === cat ? "border-[#C2956E] text-[#2C1810] font-black" : "border-transparent text-[#2C1810]/50 hover:text-[#2C1810]"
              }`}
            >
              {cat === "todos" ? "Todos" : cat === "coffee" ? "☕ Cafetería" : "🍰 Pastelería"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-white border border-[#2C1810]/10 rounded-3xl p-5 shadow-xs space-y-4">
            <h3 className="font-serif text-base font-bold text-[#2C1810] uppercase tracking-wider border-b border-[#2C1810]/15 pb-2">Menú Disponible</h3>
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {menuItems
                .filter(item => selectedPosCategory === "todos" || item.category === selectedPosCategory)
                .map((item, idx) => {
                  const active = currentItem.id === item.id;
                  const itemCost = getRecipeCost(item);
                  const itemMargin = item.price > 0 ? ((item.price - itemCost) / item.price) * 100 : 0;

                  return (
                    <div 
                      key={idx}
                      onClick={() => {
                        setSelectedMenuProduct(item);
                        setSimulatedPrice(item.price);
                      }}
                      className={`p-3.5 rounded-2xl flex items-center justify-between cursor-pointer border transition-all ${
                        active 
                          ? "bg-[#2C1810] border-[#2C1810] text-white shadow-md"
                          : "bg-stone-50 hover:bg-stone-100/50 border-[#2C1810]/5 text-[#2C1810]"
                      }`}
                    >
                      <div className="space-y-1">
                        <strong className="text-xs font-bold block">{item.name}</strong>
                        <span className={`text-[9px] font-semibold block ${active ? "text-white/60" : "text-[#2C1810]/40"}`}>
                          {item.description ? item.description.substring(0, 50) + "..." : "Sin descripción disponible."}
                        </span>
                      </div>
                      <div className="text-right shrink-0 ml-3 font-mono">
                        <span className="text-xs font-bold block">${item.price.toFixed(0)}</span>
                        <span className={`text-[8px] font-bold block px-1.5 py-0.5 rounded-md ${
                          active ? "bg-white/10 text-white" : "bg-[#2C1810]/5 text-[#2C1810]/60"
                        }`}>
                          {itemMargin.toFixed(0)}% mrg.
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs space-y-6">
              <div>
                <span className="text-[9px] font-bold text-[#2C1810]/40 uppercase tracking-widest block">Ficha Técnica — {currentItem.category === "coffee" ? "Cafetería de Especialidad" : "Pastelería de Autor"}</span>
                <h3 className="font-serif text-2xl font-bold text-[#2C1810] mt-1">{currentItem.name}</h3>
                <p className="text-xs text-[#2C1810]/60 mt-1 leading-relaxed">{currentItem.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-stone-50 border border-[#2C1810]/5 rounded-2xl">
                  <span className="text-[8px] font-bold text-[#2C1810]/50 uppercase tracking-wider block">Costo Materia Prima</span>
                  <div className="text-xl font-serif font-black text-[#2C1810] mt-1.5 font-mono">${directCost.toFixed(0)}</div>
                  <span className="text-[7px] text-[#2C1810]/40 block font-semibold mt-1">Calculado por gramo/mL</span>
                </div>
                <div className="p-4 bg-stone-50 border border-[#2C1810]/5 rounded-2xl">
                  <span className="text-[8px] font-bold text-[#2C1810]/50 uppercase tracking-wider block">Utilidad Bruta</span>
                  <div className="text-xl font-serif font-black text-[#2C1810] mt-1.5 font-mono">${utility.toFixed(0)}</div>
                  <span className="text-[7px] text-[#2C1810]/40 block font-semibold mt-1">Sugerido menos costos fijos</span>
                </div>
                <div className="p-4 bg-stone-50 border border-[#2C1810]/5 rounded-2xl">
                  <span className="text-[8px] font-bold text-[#2C1810]/50 uppercase tracking-wider block">Margen de Contribución</span>
                  <div className="text-xl font-serif font-black text-[#2C1810] mt-1.5 font-mono">{margin.toFixed(1)}%</div>
                  <span className={`text-[7px] font-bold block mt-1 uppercase text-center ${
                    margin >= 60 ? "text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded" : "text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded"
                  }`}>
                    {margin >= 60 ? "EXCELENTE" : "BAJO"}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-[#2C1810] uppercase tracking-wider">Materia Prima Requerida (Porción Técnica)</h4>
                <div className="border border-[#2C1810]/10 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-stone-50 border-b border-[#2C1810]/10 text-[9px] font-bold uppercase tracking-wider text-[#2C1810]/60">
                        <th className="p-3">Insumo</th>
                        <th className="p-3 text-center">Cantidad Receta</th>
                        <th className="p-3 text-center">Costo Unitario</th>
                        <th className="p-3 text-right">Inversión</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2C1810]/5">
                      {currentItem.recipe && currentItem.recipe.length > 0 ? (
                        currentItem.recipe.map((r, idx) => {
                          const ins = insumos.find(i => i.id === r.ingredientId);
                          const unitCost = INSUMO_UNIT_COSTS[r.ingredientId]?.price || 0;
                          const totalCost = r.amount * unitCost;
                          return (
                            <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                              <td className="p-3 font-bold text-[#2C1810]">{ins?.name || r.ingredientId}</td>
                              <td className="p-3 text-center font-mono font-semibold text-[#2C1810]/80">{r.amount} {ins?.unit}</td>
                              <td className="p-3 text-center font-mono font-semibold text-[#2C1810]/50">${unitCost.toLocaleString("es-AR")} / {ins?.unit}</td>
                              <td className="p-3 text-right font-mono font-bold text-[#2C1810]">${totalCost.toFixed(0)}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-xs text-[#2C1810]/40 font-bold">Esta especificación no requiere ingredientes adicionales registrados.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-amber-50/40 border border-[#C2956E]/20 rounded-3xl p-6 shadow-xs space-y-4">
              <h4 className="font-serif text-sm font-bold text-[#2C1810] flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#C2956E]" /> Simulador de Estrategia para el Cliente
              </h4>
              <p className="text-[10px] text-[#2C1810]/60 leading-relaxed font-semibold">
                Edite el precio sugerido de venta (ingresando un valor alternativo debajo) para evaluar la rentabilidad del producto.
              </p>
              <div className="flex gap-4 items-center">
                <div className="w-1/2">
                  <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Precio de Venta Sugerido ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-[#2C1810]/40 text-xs font-bold">$</span>
                    <input 
                      type="number"
                      value={simulatedPrice}
                      onChange={(e) => setSimulatedPrice(Math.max(1, parseFloat(e.target.value) || 0))}
                      className="w-full pl-6 pr-3 py-2 border border-[#2C1810]/20 rounded-xl text-xs bg-white text-[#2C1810] focus:outline-none focus:ring-1 focus:ring-[#C2956E] font-bold font-mono"
                    />
                  </div>
                </div>
                <div className="w-1/2 p-3 bg-white border border-[#2C1810]/15 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[8px] font-bold text-[#2C1810]/50 uppercase tracking-wider block">Margen Sim.</span>
                    <span className="text-base font-black text-[#2C1810] block font-mono">{margin.toFixed(1)}%</span>
                  </div>
                  <button 
                    onClick={() => {
                      const updated = menuItems.map(item => {
                        if (item.id === currentItem.id) {
                          return { ...item, price: simulatedPrice };
                        }
                        return item;
                      });
                      onUpdateMenu(updated);
                      onShowNotification(`💰 Precio comercial actualizado para '${currentItem.name}' a $${simulatedPrice.toFixed(0)}`, "success");
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#2C1810] hover:bg-[#3d2217] text-[10px] font-bold text-white transition-all cursor-pointer"
                  >
                    Guardar Precio 
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderCaja = () => {
    // 1. Calculate values
    const posSubtotal = posCart.reduce((sum, item) => sum + item.item.price * item.qty, 0);
    const posIva = posSubtotal * 0.21;
    const posTotal = posSubtotal;

    const posMenuItems = menuItems.filter(item => 
      selectedPosCategory === "todos" || item.category === selectedPosCategory
    );

    const pendingOrders = orders.filter(o => o.status !== "Completado");

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
        id: "PED-" + Math.floor(Math.random() * 9000 + 1000).toString(),
        tableNumber: posTable,
        items: posCart.map(c => ({
          name: c.item.name,
          quantity: c.qty,
          price: c.item.price,
          customizationSummary: ""
        })),
        subtotal: posSubtotal,
        tax: posIva,
        total: posTotal,
        status: "Recibido",
        createdAt: "Hace instantes",
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
      setSelectedSplitItems({});
      setSelectedCtaCteClient("");
    };

    // Calculate checkout totals dynamically
    const orderTotalOriginal = posCheckoutOrder ? posCheckoutOrder.total : 0;
    const discountAmount = orderTotalOriginal * (discountPercentage / 105);
    const orderTotalWithDiscount = Math.max(0, orderTotalOriginal - discountAmount);

    // Calculate split totals
    let activeCheckoutTotal = orderTotalWithDiscount;
    if (posCheckoutOrder && splitPaymentType === "comensales") {
      activeCheckoutTotal = orderTotalWithDiscount / dinersCount;
    } else if (posCheckoutOrder && splitPaymentType === "articulos") {
      const selectedItemsSum = Object.entries(selectedSplitItems).reduce((sum, [itemName, qty]) => {
        const matchedItem = posCheckoutOrder.items.find(i => i.name === itemName);
        return sum + (matchedItem ? matchedItem.price * Number(qty) : 0);
      }, 0);
      activeCheckoutTotal = selectedItemsSum * (1 - discountPercentage / 100);
    }

    const handleProcessPosCheckout = () => {
      if (!posCheckoutOrder) return;
      const orderId = posCheckoutOrder.id;

      // Validation
      if (paymentMethod === "Tarjeta" && !posCouponInput) {
        onShowNotification("⚠️ Registre el número de cupón POSNET.", "warning");
        return;
      }
      if (paymentMethod === "Efectivo" && receivedCashInput && parseFloat(receivedCashInput) < activeCheckoutTotal) {
        onShowNotification("⚠️ El efectivo recibido es menor al total a pagar.", "warning");
        return;
      }
      if (paymentMethod === "Fiado / Cta Cte" && !selectedCtaCteClient) {
        onShowNotification("⚠️ Seleccione una cuenta corriente para imputar el saldo.", "warning");
        return;
      }

      const totalToRecord = activeCheckoutTotal;

      // Update ledger state
      setCashLedger(prev => {
        const addedCash = paymentMethod === "Efectivo" ? totalToRecord : 0;
        const addedCard = paymentMethod === "Tarjeta" ? totalToRecord : 0;
        const addedMp = paymentMethod === "MercadoPago" ? totalToRecord : 0;

        return {
          totalCollected: Number((prev.totalCollected + totalToRecord).toFixed(2)),
          cash: Number((prev.cash + addedCash).toFixed(2)),
          card: Number((prev.card + addedCard).toFixed(2)),
          mercadopago: Number((prev.mercadopago + addedMp).toFixed(2)),
          transactions: [
            {
              id: "tx-" + Date.now(),
              type: splitPaymentType !== "indiviso" ? `Cobro Parcial (${splitPaymentType === "comensales" ? "Comensal" : "Items"})` : "Cobro Total",
              orderId: orderId,
              total: totalToRecord,
              method: paymentMethod,
              timestamp: "Hace instantes"
            },
            ...prev.transactions
          ]
        };
      });

      // Handle split logic
      if (splitPaymentType === "indiviso") {
        onOrderStatusUpdate(orderId, "Completado");
        setPosCheckoutOrder(null);
        onShowNotification(`💵 Cobro por $${totalToRecord.toFixed(0)} completado con éxito vía ${paymentMethod}.`, "success");
      } else if (splitPaymentType === "comensales") {
        onShowNotification(`💵 Pago de comensal por $${totalToRecord.toFixed(0)} registrado con éxito.`, "success");
        if (dinersCount <= 1) {
          onOrderStatusUpdate(orderId, "Completado");
          setPosCheckoutOrder(null);
          onShowNotification(`🎉 Todos los comensales han abonado. Comanda finalizada.`, "success");
        } else {
          setDinersCount(prev => prev - 1);
          setReceivedCashInput("");
          setPosCouponInput("");
        }
      } else if (splitPaymentType === "articulos") {
        onShowNotification(`💵 Pago parcial por artículos ($${totalToRecord.toFixed(0)}) registrado con éxito.`, "success");
        
        // Subtract paid items from order items list
        const updatedItems = posCheckoutOrder.items.map(it => {
          const qtyPaid = selectedSplitItems[it.name] || 0;
          return {
            ...it,
            quantity: Math.max(0, it.quantity - qtyPaid)
          };
        }).filter(it => it.quantity > 0);

        if (updatedItems.length === 0) {
          onOrderStatusUpdate(orderId, "Completado");
          setPosCheckoutOrder(null);
          onShowNotification(`🎉 Todos los artículos han sido abonados. Comanda finalizada.`, "success");
        } else {
          const updatedSubtotal = updatedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
          const updatedIva = updatedSubtotal * 0.21;
          const updatedTotal = updatedSubtotal;

          const updatedOrderObj = {
            ...posCheckoutOrder,
            items: updatedItems,
            subtotal: updatedSubtotal,
            tax: updatedIva,
            total: updatedTotal
          };

          // Update orders state
          if (onUpdateOrders) {
            onUpdateOrders(orders.map(o => o.id === orderId ? updatedOrderObj : o));
          }
          setPosCheckoutOrder(updatedOrderObj);
          setSelectedSplitItems({});
          setReceivedCashInput("");
          setPosCouponInput("");
        }
      }

      // If fiado, debit client account
      if (paymentMethod === "Fiado / Cta Cte" && selectedCtaCteClient) {
        const clientAcc = clientAccounts.find(c => c.name === selectedCtaCteClient);
        if (clientAcc) {
          const updatedClients = clientAccounts.map(c => {
            if (c.id === clientAcc.id) {
              const currentDebt = c.cuit ? parseFloat(c.cuit) || 0 : 0;
              return {
                ...c,
                cuit: String(currentDebt + totalToRecord)
              };
            }
            return c;
          });
          onUpdateClientAccounts(updatedClients);
          onShowNotification(`🤝 Saldo de $${totalToRecord.toFixed(0)} cargado a la Cuenta Corriente de ${clientAcc.name}.`, "info");
        }
      }
    };

    const getMozoName = (id: string) => {
      const lastChar = id.slice(-1);
      if (lastChar === "1") return "Enzo";
      if (lastChar === "2") return "Enzo";
      if (lastChar === "3") return "Micaela";
      if (lastChar === "4") return "Enzo";
      if (lastChar === "5") return "PedidosYa Delivery";
      return "Enzo";
    };

    return (
      <motion.div
        key="caja-view"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-8 text-[#2C1810]"
      >
        {/* Header Terminal */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-[#2C1810]/10 p-6 rounded-3xl shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-[#C2956E]/20 text-[#C2956E] flex items-center justify-center shadow-xs">
              <Receipt className="h-6 w-6 stroke-1.5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold tracking-tight">TERMINAL DE CAJA & FACTURACIÓN FISCAL</h2>
              <p className="text-[10px] text-[#2C1810]/60 font-semibold mt-0.5">Gestor de comprobantes de salón • Café Puglia</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsConfigRestaurantOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#2C1810]/15 hover:bg-[#2C1810]/5 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Settings className="h-3.5 w-3.5" /> CONFIGURAR RESTAURANT
            </button>
            <button 
              onClick={() => setIsConfigTicketerisOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#2C1810]/15 hover:bg-[#2C1810]/5 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
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
            <div className="bg-white border border-[#2C1810]/10 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-[#2C1810]/10 pb-3">
                <div>
                  <span className="text-[8px] font-black uppercase tracking-wider text-[#2C1810]/40 block">Flujo Contable Diario</span>
                  <h3 className="font-serif text-sm font-bold mt-0.5">Estado de Caja Diaria</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider flex items-center gap-1 ${
                  isShiftOpen 
                    ? "bg-emerald-50 border-emerald-250 text-emerald-800" 
                    : "bg-stone-50 border-stone-250 text-stone-600"
                }`}>
                  {isShiftOpen ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {isShiftOpen ? "Abierta" : "Cerrada"}
                </span>
              </div>

              {!isShiftOpen ? (
                <div className="space-y-4">
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-center">
                    <p className="text-[10px] text-[#2C1810]/60 font-semibold">No se registran turnos fiscales abiertos</p>
                    <p className="text-[9px] text-[#2C1810]/40 mt-0.5">Es indispensable abrir el turno para facturar a las mesas.</p>
                  </div>
                  <button 
                    onClick={handleOpenShift}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Unlock className="h-4 w-4" /> ABRIR CAJA DIARIA
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 bg-stone-50 border border-stone-150 rounded-xl space-y-2">
                    <p className="text-[10px] text-[#2C1810]/50 font-bold uppercase tracking-wider">Turno en curso</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>Efectivo: <span className="font-mono font-bold">${cashLedger.cash.toLocaleString()}</span></div>
                      <div>Tarjeta: <span className="font-mono font-bold">${cashLedger.card.toLocaleString()}</span></div>
                      <div>MP: <span className="font-mono font-bold">${cashLedger.mercadopago.toLocaleString()}</span></div>
                      <div className="border-t border-[#2C1810]/10 pt-1 font-bold">Total: <span className="font-mono text-emerald-800">${cashLedger.totalCollected.toLocaleString()}</span></div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setCloseShiftRealCash("");
                      setCloseShiftNotes("");
                      setIsCloseShiftModalOpen(true);
                    }}
                    className="w-full py-3 rounded-2xl bg-red-950 text-red-200 border border-red-900/50 text-xs font-bold hover:bg-red-900 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Lock className="h-4 w-4" /> CERRAR CAJA DIARIA (Arqueo)
                  </button>
                </div>
              )}
            </div>

            {/* Box 2: Comandas en Salón */}
            <div className="bg-white border border-[#2C1810]/10 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-[#2C1810]/10 pb-3">
                <h3 className="font-serif text-sm font-bold flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#C2956E]" /> COMANDAS EN SALÓN
                </h3>
                {isShiftOpen && (
                  <span className="px-2 py-0.5 rounded bg-[#C2956E]/10 text-[#C2956E] text-[9px] font-black uppercase">
                    {pendingOrders.length} pendientes
                  </span>
                )}
              </div>

              {!isShiftOpen ? (
                <div className="text-center py-12 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col items-center justify-center text-stone-400">
                  <Lock className="h-8 w-8 stroke-1.5 mb-2 text-stone-300" />
                  <p className="text-[10px] font-bold text-[#2C1810]/40 uppercase tracking-widest">Caja Cerrada</p>
                  <p className="text-[9px] text-[#2C1810]/30 mt-1 max-w-xs px-4">Abra el turno de caja diario para visualizar comandas.</p>
                </div>
              ) : pendingOrders.length === 0 ? (
                <div className="text-center py-12 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col items-center justify-center text-stone-400">
                  <CheckCircle className="h-8 w-8 text-emerald-600 mb-2 stroke-1.5" />
                  <p className="text-[10px] font-bold text-[#2C1810]/40 uppercase tracking-widest">Sin Pendientes</p>
                  <p className="text-[9px] text-[#2C1810]/30 mt-1">Todas las mesas han cobrado.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {pendingOrders.map((order) => {
                    const active = posCheckoutOrder?.id === order.id;
                    const statusText = order.status === "Listo" ? "Listo" : order.status === "Preparando" ? "En Cocina" : "Pendiente";
                    const statusColor = order.status === "Listo" 
                      ? "bg-amber-50 border-amber-250 text-amber-800" 
                      : order.status === "Preparando"
                      ? "bg-blue-50 border-blue-250 text-blue-800"
                      : "bg-stone-50 border-stone-250 text-stone-600";

                    return (
                      <div 
                        key={order.id}
                        onClick={() => openCheckoutPanel(order)}
                        className={`p-3.5 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                          active 
                            ? "bg-[#C2956E]/10 border-[#C2956E] shadow-sm" 
                            : "bg-[#FDFBF7] hover:bg-stone-50 border-[#2C1810]/10"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <strong className="text-xs font-serif text-[#2C1810] block">Mesa {order.tableNumber?.replace("Mesa ", "") || "1"}</strong>
                            <span className="text-[9px] font-bold text-[#2C1810]/40 block mt-0.5">Mozo: {getMozoName(order.id)} • {order.items.reduce((acc, curr) => acc + curr.quantity, 0)} items</span>
                          </div>
                          <span className="text-xs font-mono font-black text-[#2C1810]">${order.total.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${statusColor}`}>
                            {statusText}
                          </span>
                          <span className="font-mono text-[8px] font-black text-[#2C1810]/30">#{order.id.replace("PED-", "")}</span>
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
              <div className="bg-white border border-[#2C1810]/10 rounded-3xl p-10 shadow-xs flex flex-col items-center justify-center text-center h-[560px]">
                <div className="h-16 w-16 bg-[#2C1810]/5 border border-[#2C1810]/10 rounded-2xl flex items-center justify-center text-[#2C1810]/60 mb-6">
                  <Receipt className="h-8 w-8 stroke-1" />
                </div>
                <h3 className="font-serif text-lg font-bold">TERMINAL DE COBRO CAFÉ PUGLIA PRO</h3>
                <p className="text-xs text-[#2C1810]/60 max-w-md mt-2.5 leading-relaxed">
                  Seleccione una mesa ocupada desde la lista lateral. Se iniciará el panel interactivo de check-out, permitiéndole coordinar pagos mixtos, aplicar deducciones manuales, configurar datos de CUIT, fraccionar saldos por comensales u artículos indivisos, y emitir comprobantes en PDF y thermal roll.
                </p>
                {!isShiftOpen ? (
                  <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-left max-w-sm">
                    <Info className="h-5 w-5 text-amber-700 shrink-0" />
                    <div>
                      <strong className="text-[10px] font-bold uppercase tracking-wider text-amber-850 block">Caja Cerrada</strong>
                      <span className="text-[9px] text-amber-900 mt-0.5 block leading-normal">Tenga a bien iniciar el turno con el botón "Abrir Caja Diaria" izquierdo antes de realizar operaciones de facturación.</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3 text-left max-w-sm">
                    <Info className="h-5 w-5 text-blue-700 shrink-0" />
                    <div>
                      <strong className="text-[10px] font-bold uppercase tracking-wider text-blue-850 block">Turno Activo</strong>
                      <span className="text-[9px] text-blue-900 mt-0.5 block leading-normal">Seleccione una comanda del menú lateral izquierdo para abrir el panel interactivo de facturación.</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Active POS Checkout Interactive Panel
              <div className="bg-white border border-[#2C1810]/10 rounded-3xl p-6 lg:p-8 shadow-xs space-y-6">
                
                {/* Header panel */}
                <div className="flex justify-between items-center border-b border-[#2C1810]/10 pb-4">
                  <div>
                    <button 
                      onClick={() => setPosCheckoutOrder(null)}
                      className="text-[9px] font-bold uppercase tracking-wider text-[#C2956E] hover:text-[#2C1810] flex items-center gap-1.5 cursor-pointer bg-transparent border-0 p-0 mb-1"
                    >
                      <ArrowUp className="-rotate-90 h-3.5 w-3.5" /> VOLVER AL TERMINAL
                    </button>
                    <h3 className="font-serif text-lg font-bold">Detalle de Facturación - Mesa {posCheckoutOrder.tableNumber?.replace("Mesa ", "") || "1"}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase text-[#2C1810]/40 font-mono">Orden #{posCheckoutOrder.id}</span>
                    <div className="text-xl font-serif font-black text-emerald-805 font-mono mt-0.5">${activeCheckoutTotal.toLocaleString()}</div>
                  </div>
                </div>

                {/* Grid Checkout Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left subcolumn: Consumo & Fraccionar */}
                  <div className="space-y-5">
                    {/* Resumen de Consumo */}
                    <div className="p-4 bg-stone-50 border border-stone-150 rounded-2xl space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#2C1810]/50 border-b border-[#2C1810]/10 pb-1.5 flex items-center gap-1.5">
                        <Coffee className="h-3.5 w-3.5 text-[#C2956E]" /> Resumen de Consumo
                      </h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                        {posCheckoutOrder.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-start text-[10px] font-semibold text-[#2C1810]/80">
                            <span className="italic">{item.quantity}x {item.name}</span>
                            <span className="font-mono">${(item.price * item.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-[#2C1810]/10 pt-2.5 flex justify-between text-[10px] font-bold">
                        <span>Total Comanda</span>
                        <span className="font-mono text-[#2C1810]">${orderTotalOriginal.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Fraccionar Cuenta */}
                    <div className="p-4 bg-stone-50 border border-stone-150 rounded-2xl space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#2C1810]/50 border-b border-[#2C1810]/10 pb-1.5 flex items-center gap-1.5">
                        <Scissors className="h-3.5 w-3.5 text-[#C2956E]" /> Fraccionar Saldo
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
                                ? "bg-[#2C1810] text-[#FDFBF7] border-[#2C1810] shadow-xs"
                                : "bg-white border-stone-250 text-[#2C1810]/60 hover:bg-stone-50"
                            }`}
                          >
                            <t.icon className="h-3.5 w-3.5" />
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {splitPaymentType === "comensales" && (
                        <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-[#2C1810]/60">Número de Comensales:</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setDinersCount(prev => Math.max(2, prev - 1))} className="h-6 w-6 bg-stone-150 hover:bg-stone-200 rounded text-xs font-bold cursor-pointer">-</button>
                              <strong className="font-mono text-sm w-4 text-center">{dinersCount}</strong>
                              <button onClick={() => setDinersCount(prev => Math.min(10, prev + 1))} className="h-6 w-6 bg-stone-150 hover:bg-stone-200 rounded text-xs font-bold cursor-pointer">+</button>
                            </div>
                          </div>
                          <div className="text-[10px] border-t border-[#2C1810]/5 pt-2 flex justify-between font-bold">
                            <span>Monto por Comensal</span>
                            <span className="font-mono text-emerald-805">${(orderTotalWithDiscount / dinersCount).toFixed(0)}</span>
                          </div>
                        </div>
                      )}

                      {splitPaymentType === "articulos" && (
                        <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-2.5">
                          <span className="text-[9px] font-bold text-[#2C1810]/40 uppercase tracking-wider block mb-1">Seleccionar Items a Cobrar</span>
                          <div className="space-y-2 max-h-28 overflow-y-auto pr-1">
                            {posCheckoutOrder.items.map((it, idx) => {
                              const selectedQty = selectedSplitItems[it.name] || 0;
                              return (
                                <div key={idx} className="flex justify-between items-center text-[10px] font-semibold border-b border-stone-100 pb-1.5">
                                  <span className="truncate">{it.name} (${it.price.toFixed(0)})</span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button 
                                      onClick={() => setSelectedSplitItems(prev => ({
                                        ...prev,
                                        [it.name]: Math.max(0, (prev[it.name] || 0) - 1)
                                      }))}
                                      className="h-5 w-5 bg-stone-100 hover:bg-stone-200 rounded text-[10px] font-bold cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <strong className="font-mono w-4 text-center">{selectedQty}</strong>
                                    <button 
                                      onClick={() => setSelectedSplitItems(prev => ({
                                        ...prev,
                                        [it.name]: Math.min(it.quantity, (prev[it.name] || 0) + 1)
                                      }))}
                                      className="h-5 w-5 bg-stone-100 hover:bg-stone-200 rounded text-[10px] font-bold cursor-pointer"
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
                    <div className="p-4 bg-stone-50 border border-stone-150 rounded-2xl space-y-3.5">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#2C1810]/50 border-b border-[#2C1810]/10 pb-1.5 flex items-center gap-1.5">
                        <Percent className="h-3.5 w-3.5 text-[#C2956E]" /> Deducciones Manuales (Descuento)
                      </h4>
                      <div className="flex gap-2">
                        {[0, 5, 10, 15, 20].map(p => (
                          <button
                            key={p}
                            onClick={() => setDiscountPercentage(p)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black border transition-all cursor-pointer flex-1 text-center ${
                              discountPercentage === p
                                ? "bg-[#2C1810] text-[#FDFBF7] border-[#2C1810]"
                                : "bg-white border-stone-250 text-[#2C1810]/60 hover:bg-stone-50"
                            }`}
                          >
                            {p === 0 ? "Sin Dto" : `${p}%`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Datos de CUIT / Facturación */}
                    <div className="p-4 bg-stone-50 border border-stone-150 rounded-2xl space-y-3.5">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#2C1810]/50 border-b border-[#2C1810]/10 pb-1.5 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-[#C2956E]" /> Datos de CUIT / Razón Social
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[8px] font-bold text-[#2C1810]/40 uppercase block mb-1">CUIT/CUIL</label>
                          <input 
                            type="text" 
                            placeholder="Ingrese CUIT" 
                            value={cuitNumber}
                            onChange={(e) => setCuitNumber(e.target.value)}
                            className="w-full p-2 border border-[#2C1810]/20 rounded-lg text-[10px] bg-white font-bold" 
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-[#2C1810]/40 uppercase block mb-1">Razón Social</label>
                          <input 
                            type="text" 
                            placeholder="Nombre del Cliente" 
                            value={cuitName}
                            onChange={(e) => setCuitName(e.target.value)}
                            className="w-full p-2 border border-[#2C1810]/20 rounded-lg text-[10px] bg-white font-bold" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-[#2C1810]/40 uppercase block mb-1">Condición Frente al IVA</label>
                        <select 
                          value={ivaCondition}
                          onChange={(e) => setIvaCondition(e.target.value)}
                          className="w-full p-2 border border-[#2C1810]/20 rounded-lg text-[10px] bg-white font-bold cursor-pointer"
                        >
                          <option>Consumidor Final</option>
                          <option>Responsable Inscripto</option>
                          <option>Monotributista</option>
                          <option>Exento</option>
                        </select>
                      </div>
                    </div>

                    {/* Método de Cobro */}
                    <div className="p-4 bg-stone-50 border border-stone-150 rounded-2xl space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#2C1810]/50 border-b border-[#2C1810]/10 pb-1.5 flex items-center gap-1.5">
                        <Coins className="h-3.5 w-3.5 text-[#C2956E]" /> Método de Cobro
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { id: "Efectivo", label: "💵 Efectivo" },
                          { id: "Tarjeta", label: "💳 Tarjeta (Cupón)" },
                          { id: "MercadoPago", label: "📱 MercadoPago" },
                          { id: "Fiado / Cta Cte", label: "🤝 Cta Cte / Fiado" }
                        ].map(m => (
                          <button
                            key={m.id}
                            onClick={() => setPaymentMethod(m.id as any)}
                            className={`p-2.5 text-[10px] font-bold rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              paymentMethod === m.id
                                ? "bg-[#2C1810] text-[#FDFBF7] border-[#2C1810] shadow-xs"
                                : "bg-white border-stone-250 text-[#2C1810] hover:bg-stone-50"
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>

                      {paymentMethod === "Efectivo" && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="text-[8px] font-bold text-[#2C1810]/40 uppercase block mb-1">Efectivo Entregado</label>
                            <input 
                              type="number" 
                              placeholder="Monto entregado" 
                              value={receivedCashInput}
                              onChange={(e) => setReceivedCashInput(e.target.value)}
                              className="w-full p-2.5 border border-[#2C1810]/20 rounded-xl text-xs bg-white text-[#2C1810] focus:ring-1 focus:ring-[#C2956E] focus:outline-none font-bold font-mono" 
                            />
                          </div>
                          <div className="p-2.5 bg-white border border-stone-200 rounded-xl flex flex-col justify-center font-mono">
                            <span className="text-[8px] font-bold text-[#2C1810]/45 uppercase block font-sans">Vuelto Cambio</span>
                            <strong className="text-xs text-emerald-850 mt-0.5">
                              ${receivedCashInput && parseFloat(receivedCashInput) >= activeCheckoutTotal
                                ? (parseFloat(receivedCashInput) - activeCheckoutTotal).toFixed(0)
                                : "0"}
                            </strong>
                          </div>
                        </div>
                      )}

                      {paymentMethod === "Tarjeta" && (
                        <div className="pt-1">
                          <label className="text-[8px] font-bold text-[#2C1810]/40 uppercase block mb-1">POSNET Cupón Nro</label>
                          <input 
                            type="text" 
                            placeholder="Ingrese código de cupón de pago" 
                            value={posCouponInput}
                            onChange={(e) => setPosCouponInput(e.target.value)}
                            className="w-full p-2.5 border border-[#2C1810]/20 rounded-xl text-xs bg-white text-[#2C1810] font-bold font-mono" 
                          />
                        </div>
                      )}

                      {paymentMethod === "Fiado / Cta Cte" && (
                        <div className="pt-1">
                          <label className="text-[8px] font-bold text-[#2C1810]/40 uppercase block mb-1">Seleccionar Cuenta de Cliente</label>
                          <select 
                            value={selectedCtaCteClient}
                            onChange={(e) => setSelectedCtaCteClient(e.target.value)}
                            className="w-full p-2.5 border border-[#2C1810]/20 rounded-xl text-xs bg-white text-[#2C1810] font-bold cursor-pointer"
                          >
                            <option value="">-- Elija Cuenta Corriente --</option>
                            {clientAccounts.map(c => (
                              <option key={c.id} value={c.name}>{c.name} (${c.cuit ? parseFloat(c.cuit).toLocaleString() : '0'} acumulado)</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Final receipt emission actions */}
                <div className="border-t border-[#2C1810]/10 pt-5 space-y-3">
                  <button 
                    onClick={handleProcessPosCheckout}
                    className="w-full py-3 rounded-2xl bg-[#2C1810] hover:bg-[#3d2217] text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    🧾 Confirmar Venta & Emitir Factura Fiscal (AFIP)
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => {
                        handleProcessPosCheckout();
                        onShowNotification("🖨️ Imprimiendo ticket no fiscal en ticketera térmica...", "success");
                      }}
                      className="py-2.5 rounded-xl border border-[#2C1810]/20 hover:bg-[#2C1810]/5 text-xs font-bold text-[#2C1810] transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-transparent"
                    >
                      <Printer className="h-3.5 w-3.5" /> Ticket No Fiscal
                    </button>
                    <button 
                      onClick={() => {
                        onShowNotification("📥 Descargando comprobante fiscal en formato PDF...", "success");
                      }}
                      className="py-2.5 rounded-xl border border-[#2C1810]/20 hover:bg-[#2C1810]/5 text-xs font-bold text-[#2C1810] transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-transparent"
                    >
                      <FileText className="h-3.5 w-3.5" /> Descargar PDF
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom panel: closures history list */}
        <div className="bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="font-serif text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-[#2C1810]/70">
            <Calendar className="h-4 w-4 text-[#C2956E]" /> REGISTRO DE AUDITORÍA DE CIERRES DE CAJA HOMOLOGADOS ({closuresHistory.length})
          </h3>
          
          <div className="space-y-3">
            {closuresHistory.map((cls, idx) => (
              <div 
                key={cls.id || idx}
                className="p-4 bg-stone-50 border border-stone-150 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-[10px] font-semibold text-[#2C1810]/80"
              >
                <div>
                  <h4 className="text-xs font-serif font-bold text-[#2C1810]">Cierre de Caja {cls.user}</h4>
                  <p className="text-[#2C1810]/50 mt-1">Apertura: {cls.apertura} • Cierre: {cls.cierre}</p>
                  <p className="text-[#2C1810]/40 mt-0.5 italic">Observaciones: "{cls.observaciones}"</p>
                </div>
                <div className="flex items-center gap-6 shrink-0 w-full md:w-auto justify-between md:justify-end">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <span className="text-[8px] text-[#2C1810]/40 font-bold block uppercase tracking-wider">Ventas Turno</span>
                      <strong className="font-mono text-[#2C1810]">${cls.ventasTurno.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#2C1810]/40 font-bold block uppercase tracking-wider">Monto Real</span>
                      <strong className="font-mono text-[#2C1810]">${cls.montoReal.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#2C1810]/40 font-bold block uppercase tracking-wider">Diferencia</span>
                      <strong className={`font-mono ${cls.diferencia >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        ${cls.diferencia.toLocaleString()}
                      </strong>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedClosureForModal(cls)}
                    className="px-4 py-2 rounded-xl bg-[#2C1810] hover:bg-[#3d2217] text-white text-[10px] font-bold shadow-sm transition-all cursor-pointer uppercase tracking-wider"
                  >
                    Detalle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderPedidosMozo = () => {
    const MOZO_TABLES = ["Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4", "Mesa 5", "Mesa 6", "Mesa 8", "Mesa 12", "VIP-1", "Terraza-3"];
    
    const getActiveOrderForTable = (table: string) => {
      return orders.find(o => o.tableNumber === table && o.status !== "Completado");
    };

    const occupiedTablesCount = MOZO_TABLES.filter(t => getActiveOrderForTable(t) !== undefined).length;

    const filteredMenuItems = menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(mozoSearchQuery.toLowerCase()) || 
                            item.description.toLowerCase().includes(mozoSearchQuery.toLowerCase());
      const matchesCategory = mozoCategory === "todos" || item.category === mozoCategory;
      return matchesSearch && matchesCategory;
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
          return { item: menuItem, qty: it.quantity };
        });
        setMozoCart(cartItems);
      } else {
        setMozoCart([]);
      }
    };

    const handleAddMozoCart = (item: MenuItem) => {
      if (!mozoSelectedTable) {
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
    };

    const handleUpdateMozoCartQty = (itemId: string, val: number) => {
      setMozoCart(prev => 
        prev.map(c => c.item.id === itemId ? { ...c, qty: Math.max(1, c.qty + val) } : c)
      );
    };

    const handleRemoveFromMozoCart = (itemId: string) => {
      setMozoCart(prev => prev.filter(c => c.item.id !== itemId));
    };

    const handleSubmitMozoOrder = () => {
      if (!mozoSelectedTable) return;
      if (mozoCart.length === 0) {
        onShowNotification("⚠️ Añada productos a la comanda antes de enviar.", "warning");
        return;
      }

      const activeOrder = getActiveOrderForTable(mozoSelectedTable);
      const subtotal = mozoCart.reduce((sum, c) => sum + c.item.price * c.qty, 0);
      const tax = subtotal * 0.21;
      const total = subtotal;

      if (activeOrder) {
        const updatedOrderObj: Order = {
          ...activeOrder,
          items: mozoCart.map(c => ({
            name: c.item.name,
            quantity: c.qty,
            price: c.item.price,
            customizationSummary: ""
          })),
          subtotal,
          tax,
          total
        };
        if (onUpdateOrders) {
          onUpdateOrders(orders.map(o => o.id === activeOrder.id ? updatedOrderObj : o));
        }
        onShowNotification(`🍳 Comanda de la ${mozoSelectedTable} actualizada y enviada a cocina.`, "success");
      } else {
        const newOrder: Order = {
          id: "PED-" + Math.floor(Math.random() * 9000 + 1000).toString(),
          tableNumber: mozoSelectedTable,
          items: mozoCart.map(c => ({
            name: c.item.name,
            quantity: c.qty,
            price: c.item.price,
            customizationSummary: ""
          })),
          subtotal,
          tax,
          total,
          status: "Recibido",
          createdAt: "Hace instantes",
          type: "Mesa",
          priceList: "Salon",
          estimatedMinutes: 15
        };
        if (onUpdateOrders) {
          onUpdateOrders([newOrder, ...orders]);
        }
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
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-[#2C1810]"
      >
        {/* Left Column: Waiter & Tables */}
        <div className="lg:col-span-3 space-y-6">
          {/* Waiter Card */}
          <div className="bg-[#FDFBF7] border border-[#2C1810]/10 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-50 border border-[#C2956E]/20 text-[#C2956E] flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[8px] font-black uppercase tracking-wider text-[#2C1810]/40 block">Mozo en Turno Activo</span>
                <strong className="text-xs font-serif block">Terminal Registrada</strong>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["Enzo", "Micaela", "Sofía"].map(waiter => (
                <button
                  key={waiter}
                  onClick={() => setSelectedWaiter(waiter)}
                  className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                    selectedWaiter === waiter 
                      ? "bg-[#2C1810] text-[#FDFBF7] border-[#2C1810] shadow-xs" 
                      : "bg-white border-stone-250 text-[#2C1810]/75 hover:bg-stone-50"
                  }`}
                >
                  {waiter}
                </button>
              ))}
            </div>
          </div>

          {/* Tables Card */}
          <div className="bg-[#FDFBF7] border border-[#2C1810]/10 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-[#2C1810]/10 pb-3">
              <div>
                <span className="text-[8px] font-black uppercase tracking-wider text-[#2C1810]/40 block">Distribución de Mesas</span>
                <h3 className="font-serif text-sm font-bold mt-0.5">Mapa de Comensales</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#2C1810] text-[#FDFBF7] text-[8px] font-black uppercase tracking-wider">
                {occupiedTablesCount} Ocupadas
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
              {MOZO_TABLES.map(table => {
                const activeOrder = getActiveOrderForTable(table);
                const isOccupied = activeOrder !== undefined;
                const isSelected = mozoSelectedTable === table;
                
                return (
                  <div
                    key={table}
                    onClick={() => handleSelectMozoTable(table)}
                    className={`p-3.5 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between h-20 ${
                      isSelected
                        ? "bg-[#C2956E]/10 border-[#C2956E] shadow-sm"
                        : isOccupied
                        ? "bg-red-50/70 border-red-200 text-red-800"
                        : "bg-white border-[#2C1810]/10 hover:bg-stone-50"
                    }`}
                  >
                    <strong className="text-xs font-bold block">{table}</strong>
                    {isOccupied ? (
                      <span className="text-[8px] font-bold text-red-700/80 flex items-center gap-1 mt-2">
                        <Users className="h-3 w-3" /> {getDinersMockCount(table)} comensales
                      </span>
                    ) : (
                      <span className="text-[8px] font-black uppercase tracking-wider text-[#2C1810]/30 mt-2 block">
                        Libre
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center Column: Categories and Products */}
        <div className="lg:col-span-6 space-y-6">
          {/* Categories card with search */}
          <div className="bg-[#FDFBF7] border border-[#2C1810]/10 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[8px] font-black uppercase tracking-wider text-[#2C1810]/40 block">Filtro de Categorías Premium</span>
                <h3 className="font-serif text-sm font-bold mt-0.5">Catálogo de Productos</h3>
              </div>
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#2C1810]/40" />
                <input
                  type="text"
                  placeholder="Buscar plato o bebida..."
                  value={mozoSearchQuery}
                  onChange={(e) => setMozoSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 border border-[#2C1810]/20 rounded-xl text-[10px] bg-white font-semibold"
                />
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
              {[
                { id: "todos", label: "Todos 🍽️" },
                { id: "coffee", label: "Cafetería ☕" },
                { id: "pastry", label: "Pastelería 🥐" },
                { id: "brunch", label: "Brunch 🍳" },
                { id: "cold", label: "Bebidas 🍷" },
                { id: "traditional", label: "Cocina 🍝" }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setMozoCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border shrink-0 transition-all cursor-pointer ${
                    mozoCategory === cat.id
                      ? "bg-[#2C1810] text-[#FDFBF7] border-[#2C1810]"
                      : "bg-white border-stone-250 text-[#2C1810]/60 hover:bg-stone-50"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[480px] overflow-y-auto pr-1">
            {filteredMenuItems.map(item => {
              const isOut = item.stock === 0;
              return (
                <div
                  key={item.id}
                  className="bg-white border border-[#2C1810]/10 rounded-2xl overflow-hidden flex flex-col justify-between h-44 shadow-xs relative"
                >
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-20 w-full object-cover" />
                  ) : (
                    <div className="h-20 w-full bg-[#2C1810]/5 flex items-center justify-center text-[#2C1810]/30 border-b border-[#2C1810]/5">
                      <Coffee className="h-7 w-7 stroke-1" />
                    </div>
                  )}

                  {/* Stock status badge overlay */}
                  <div className="absolute top-2 right-2">
                    {isOut ? (
                      <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-red-100 border border-red-200 text-red-700 tracking-wider">
                        Sin Stock (Fórmulas 0)
                      </span>
                    ) : (
                      item.stock !== undefined && (
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-50 border border-emerald-250 text-emerald-800 tracking-wider">
                          Disp: {item.stock}u
                        </span>
                      )
                    )}
                  </div>

                  <div className="p-3 flex justify-between items-center gap-3 bg-white">
                    <div className="space-y-0.5">
                      <strong className="text-xs font-bold text-[#2C1810] line-clamp-1">{item.name}</strong>
                      <span className="text-xs font-mono font-black text-[#2C1810]/80">${item.price.toFixed(0)}</span>
                    </div>
                    <button
                      onClick={() => handleAddMozoCart(item)}
                      disabled={isOut}
                      className={`h-8 w-8 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        isOut 
                          ? "bg-stone-100 border border-stone-200 text-stone-300 cursor-not-allowed" 
                          : "bg-[#2C1810] hover:bg-[#3d2217] text-white shadow-sm"
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Draft Comanda */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-[#2C1810]/10 rounded-3xl p-5 shadow-xs flex flex-col justify-between h-[580px]">
            {!mozoSelectedTable ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-stone-300 p-6">
                <Coffee className="h-12 w-12 stroke-1 animate-pulse" />
                <span className="text-[10px] font-bold text-[#2C1810]/40 uppercase tracking-widest mt-3 block">Nueva Comanda</span>
                <p className="text-[9px] text-[#2C1810]/30 mt-1.5 leading-normal">Seleccione una mesa disponible en el plano izquierdo para iniciar la comanda.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between h-full">
                <div className="space-y-4 flex-1 flex flex-col">
                  <div className="border-b border-[#2C1810]/10 pb-3 flex justify-between items-center">
                    <div>
                      <h4 className="font-serif text-sm font-bold">Comanda {mozoSelectedTable}</h4>
                      <span className="text-[8px] font-bold text-[#2C1810]/45 block">Mozo: {selectedWaiter}</span>
                    </div>
                    <span className="text-[9px] font-black uppercase text-[#C2956E] tracking-wider">
                      {getActiveOrderForTable(mozoSelectedTable) ? "Edición" : "Borrador"}
                    </span>
                  </div>

                  <div className="space-y-3 overflow-y-auto flex-1 pr-1 max-h-[320px]">
                    {mozoCart.length > 0 ? (
                      mozoCart.map((cart, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px] font-semibold">
                          <div className="space-y-0.5 truncate pr-2">
                            <strong className="text-[#2C1810] block truncate">{cart.item.name}</strong>
                            <span className="text-[8px] text-[#2C1810]/40 font-bold font-mono">${cart.item.price.toFixed(0)} c/u</span>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleUpdateMozoCartQty(cart.item.id, -1)}
                                className="h-5 w-5 bg-stone-100 hover:bg-stone-200 text-[#2C1810] flex items-center justify-center rounded text-[10px] font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <span className="font-mono font-bold w-4 text-center">{cart.qty}</span>
                              <button
                                onClick={() => handleUpdateMozoCartQty(cart.item.id, 1)}
                                className="h-5 w-5 bg-stone-100 hover:bg-stone-200 text-[#2C1810] flex items-center justify-center rounded text-[10px] font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => handleRemoveFromMozoCart(cart.item.id)}
                              className="p-1 text-[#2C1810]/40 hover:text-red-700 transition-all cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-stone-300 text-center">
                        <ClipboardList className="h-8 w-8 stroke-1.5 mb-2" />
                        <span className="text-[8px] font-bold uppercase tracking-wider text-[#2C1810]/40 block">Comanda Vacía</span>
                        <p className="text-[8px] text-[#2C1810]/30 mt-1 max-w-[120px]">Haga clic en los productos del panel central para añadirlos.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-[#2C1810]/15 pt-4 space-y-4">
                  <div className="space-y-1.5 text-[10px] font-semibold text-[#2C1810]/70">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-mono">${subtotal.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IVA (21% Incl.)</span>
                      <span className="font-mono">${tax.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between border-t border-[#2C1810]/10 pt-2 text-xs font-black text-[#2C1810]">
                      <span>TOTAL COMANDA</span>
                      <span className="font-mono text-emerald-800">${total.toFixed(0)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitMozoOrder}
                    disabled={mozoCart.length === 0}
                    className={`w-full py-3 rounded-2xl font-bold text-xs shadow-md transition-all cursor-pointer uppercase tracking-wider ${
                      mozoCart.length > 0
                        ? "bg-[#2C1810] hover:bg-[#3d2217] text-white"
                        : "bg-stone-100 text-[#2C1810]/30 border border-stone-200 cursor-not-allowed"
                    }`}
                  >
                    🍳 Enviar Comanda a Cocina ✓
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderProveedores = () => {
    return (
      <motion.div
        key="proveedores-view"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-8"
      >
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#C2956E]">Abastecimiento y Logística</span>
          <h2 className="font-serif text-3xl font-bold text-[#2C1810] mt-0.5">Directorio de Proveedores</h2>
        </div>

        <div className="bg-white border border-[#2C1810]/10 rounded-3xl overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2C1810]/5 border-b border-[#2C1810]/10 text-[9px] font-bold uppercase tracking-wider text-[#2C1810]/60">
                <th className="p-4">Proveedor</th>
                <th className="p-4">Insumos Abastecidos</th>
                <th className="p-4">Contacto Ventas</th>
                <th className="p-4">Teléfono / Pedidos</th>
                <th className="p-4 text-center">Estado Comercial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2C1810]/10 text-xs">
              {[
                { name: "Distribuidora Sur", items: "Harina, Manteca, DDL, Chocolate", contact: "ventas@distribuidorasur.com", phone: "+54 221 444-1234", status: "ACTIVO", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                { name: "Lácteos del Campo", items: "Leche Entera, Crema de Leche 44%", contact: "pedidos@lacteosdelcampo.com.ar", phone: "+54 221 455-9876", status: "ACTIVO", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                { name: "Moinho Alegre", items: "Tostado Etiopía, Tostado Colombia", contact: "compras@moinhoalegre.com", phone: "+54 11 5000-8800", status: "ACTIVO", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                { name: "Mayorista Altiplano", items: "Azúcar Chango, Yerba Mate Orgánica", contact: "contacto@altiplano.com.ar", phone: "+54 221 477-4545", status: "ACTIVO", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                { name: "Granja La Pradera", items: "Huevos de Campo Orgánicos", contact: "granja@lapradera.com", phone: "+54 2241 88-1290", status: "PENDIENTE", color: "bg-blue-50 border-blue-200 text-blue-700" }
              ].map((prov, idx) => (
                <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                  <td className="p-4 font-bold text-[#2C1810]">{prov.name}</td>
                  <td className="p-4 text-[#2C1810]/70 font-semibold">{prov.items}</td>
                  <td className="p-4 font-mono font-semibold text-[#2C1810]/60">{prov.contact}</td>
                  <td className="p-4 font-mono font-semibold text-[#2C1810]/60">{prov.phone}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 text-[8px] font-extrabold uppercase rounded-full tracking-wider border ${prov.color}`}>{prov.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
        className="space-y-8"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#C2956E]">Equipo y Colaboradores</span>
            <h2 className="font-serif text-3xl font-bold text-[#2C1810] mt-0.5">Gestión de Personal</h2>
          </div>
          <div className="flex gap-1.5 bg-[#2C1810]/5 p-1 rounded-xl">
            {[
              { id: "barista", label: "Calibración" },
              { id: "consumo", label: "Mesa Colaborador" },
              { id: "profit", label: "Profit-Sharing" },
              { id: "cuentas", label: "Cuentas y Accesos" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPersonalSubTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  personalSubTab === tab.id
                    ? "bg-[#2C1810] text-[#FDFBF7] shadow-sm"
                    : "text-[#2C1810]/60 hover:text-[#2C1810]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {personalSubTab === "barista" && (
            <motion.div
              key="subtab-barista"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              <div className="lg:col-span-5 bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="mb-4 border-b border-[#2C1810]/15 pb-2">
                    <h3 className="font-serif text-base font-bold text-[#2C1810]">Ficha de Calibración Diaria</h3>
                    <p className="text-[10px] text-[#2C1810]/50 mt-0.5">Control de extracción obligatorio para Baristas (Sec. III.1).</p>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await supabase.from("barista_calibrations").insert({
                          gramos_in: calibrationData.gramosIn,
                          mililitros_out: calibrationData.mililitrosOut,
                          tiempo: calibrationData.tiempo,
                          temperatura: calibrationData.temperatura,
                          clima: calibrationData.clima
                        });
                        localStorage.setItem("puglia_calibration", JSON.stringify(calibrationData));
                        onShowNotification("☕ Calibración del Barista guardada e integrada con éxito.", "success");
                      } catch (err) {
                        console.error("Error saving calibration to Supabase:", err);
                        onShowNotification("⚠️ Error al guardar calibración en la nube.", "warning");
                      }
                    }}
                    className="space-y-4 text-xs font-semibold text-[#2C1810]/70"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Entrada (Gramos)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={calibrationData.gramosIn}
                          onChange={(e) => setCalibrationData({ ...calibrationData, gramosIn: parseFloat(e.target.value) || 18 })}
                          className="w-full p-2 border border-[#2C1810]/20 rounded-lg font-mono font-bold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Salida (mL)</label>
                        <input
                          type="number"
                          value={calibrationData.mililitrosOut}
                          onChange={(e) => setCalibrationData({ ...calibrationData, mililitrosOut: parseInt(e.target.value) || 36 })}
                          className="w-full p-2 border border-[#2C1810]/20 rounded-lg font-mono font-bold focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Tiempo (Seg)</label>
                        <input
                          type="number"
                          value={calibrationData.tiempo}
                          onChange={(e) => setCalibrationData({ ...calibrationData, tiempo: parseInt(e.target.value) || 27 })}
                          className="w-full p-2 border border-[#2C1810]/20 rounded-lg font-mono font-bold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Temp (°C)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={calibrationData.temperatura}
                          onChange={(e) => setCalibrationData({ ...calibrationData, temperatura: parseFloat(e.target.value) || 92 })}
                          className="w-full p-2 border border-[#2C1810]/20 rounded-lg font-mono font-bold focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Clima / Humedad</label>
                      <select
                        value={calibrationData.clima}
                        onChange={(e) => setCalibrationData({ ...calibrationData, clima: e.target.value })}
                        className="w-full p-2 border border-[#2C1810]/20 rounded-lg font-bold focus:outline-none bg-stone-50 cursor-pointer"
                      >
                        <option value="Despejado y Seco">Despejado y Seco (Estable)</option>
                        <option value="Lluvioso y Húmedo">Lluvioso y Húmedo (Ajustar Molienda)</option>
                        <option value="Frío extremo">Frío extremo (Calentar tazas)</option>
                        <option value="Caluroso y Húmedo">Caluroso y Húmedo</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-[#2C1810] hover:bg-[#3d2217] text-white text-[10px] font-bold uppercase transition-all cursor-pointer tracking-wider"
                    >
                      ✓ Guardar & Calibrar
                    </button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-7 bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs">
                <div className="mb-4">
                  <h3 className="font-serif text-base font-bold text-[#2C1810]">Historial de Calibraciones Recientes</h3>
                  <p className="text-[10px] text-[#2C1810]/50">Monitoreo de molienda y estabilidad de caldera.</p>
                </div>

                <div className="space-y-3 text-xs">
                  {[
                    { fecha: "Hoy - Turno Tarde", gramos: calibrationData.gramosIn, ml: calibrationData.mililitrosOut, tiempo: calibrationData.tiempo, temp: calibrationData.temperatura, clima: calibrationData.clima, estado: "Activa (Perfil actual)" },
                    { fecha: "Hoy - Turno Mañana", gramos: 18.0, ml: 36, tiempo: 26, temp: 92.0, clima: "Lluvioso y Húmedo", estado: "Archivada" },
                    { fecha: "Ayer - Turno Tarde", gramos: 18.2, ml: 36, tiempo: 28, temp: 92.5, clima: "Despejado y Seco", estado: "Archivada" }
                  ].map((log, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl border ${idx === 0 ? "border-[#C2956E] bg-amber-50/20" : "border-[#2C1810]/10 bg-stone-50/50"} space-y-1.5`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#2C1810]">{log.fecha}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${idx === 0 ? "bg-[#C2956E] text-white" : "bg-stone-200 text-stone-600"}`}>
                          {log.estado}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 font-mono text-[11px] text-[#2C1810]/70 pt-1">
                        <div>In: <strong className="text-[#2C1810]">{log.gramos}g</strong></div>
                        <div>Out: <strong className="text-[#2C1810]">{log.ml}ml</strong></div>
                        <div>Tiempo: <strong className="text-[#2C1810]">{log.tiempo}s</strong></div>
                        <div>Temp: <strong className="text-[#2C1810]">{log.temp}°C</strong></div>
                      </div>
                      <div className="text-[9px] text-[#2C1810]/50 italic pt-1 border-t border-[#2C1810]/5 mt-1">
                        Condición ambiental: {log.clima}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {personalSubTab === "consumo" && (
            <motion.div
              key="subtab-consumo"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs space-y-6"
            >
              <div>
                <h3 className="font-serif text-base font-bold text-[#2C1810]">💳 Mesa Colaborador (Consumos de Empleados)</h3>
                <p className="text-[10px] text-[#2C1810]/50 mt-0.5 leading-relaxed">
                  El manual operativo de <strong>Café Puglia</strong> otorga un subsidio diario de consumo de hasta $12,00 por colaborador de turno para alimentación o refrigerio (Art. 9).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {staffConsumptions.map((staff) => {
                  const limitReached = staff.consumedToday >= staff.limit;
                  return (
                    <div key={staff.id} className="p-4 bg-stone-50 border border-[#2C1810]/5 rounded-2xl flex flex-col justify-between h-36">
                      <div>
                        <strong className="text-xs font-bold text-[#2C1810] block">{staff.name}</strong>
                        <span className="text-[9px] text-[#2C1810]/40 font-bold block mt-0.5">{staff.rol}</span>
                        <div className="text-sm font-mono font-bold text-[#2C1810]/70 mt-3">
                          ${staff.consumedToday.toFixed(2)} / ${staff.limit.toFixed(2)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRecordStaffConsumption(staff.id, 2.50)}
                        disabled={limitReached}
                        className={`w-full py-1.5 rounded-lg text-[9px] font-bold tracking-wider transition-all cursor-pointer uppercase mt-3 ${
                          limitReached 
                            ? "bg-red-50 border border-red-200 text-red-700 cursor-not-allowed"
                            : "bg-[#2C1810] hover:bg-[#3d2217] text-white"
                        }`}
                      >
                        {limitReached ? "Subsidio Excedido" : "+$2.50 Consumo"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {personalSubTab === "profit" && (
            <motion.div
              key="subtab-profit"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs">
                    <div className="mb-4 border-b border-[#2C1810]/15 pb-2 flex items-center justify-between">
                      <div>
                        <h3 className="font-serif text-base font-bold text-[#2C1810]">Billetera de Propinas</h3>
                        <p className="text-[10px] text-[#2C1810]/50 mt-0.5">Fondo Colectivo de Propinas Digitales (Sec. III.2)</p>
                      </div>
                      <Coins className="h-5 w-5 text-[#C2956E]" />
                    </div>

                    <div className="p-4 bg-[#FDFBF7] border border-[#2C1810]/10 rounded-2xl text-center space-y-1">
                      <span className="text-[10px] text-[#2C1810]/50 uppercase font-bold block">Fondo Acumulado</span>
                      <span className="font-serif text-3xl font-black text-[#2C1810] block font-mono">${tipPool.toFixed(0)}</span>
                      <p className="text-[8px] text-[#2C1810]/40 italic leading-tight pt-1">
                        * Reparto digital semanal equitativo entre todos los miembros de turno.
                      </p>
                    </div>

                    <button
                      onClick={async () => {
                        if (tipPool <= 0) {
                          onShowNotification("⚠️ No hay propinas acumuladas para repartir.", "warning");
                          return;
                        }
                        try {
                          await supabase.from("system_settings").upsert({ key: "tip_pool", value: 0 });
                          localStorage.setItem("origen_tip_pool", "0");
                          setTipPool(0);
                          onShowNotification("✅ Se liquidaron las propinas acumuladas.", "success");
                        } catch (err) {
                          console.error("Error clearing tip pool on Supabase:", err);
                        }
                      }}
                      className="w-full bg-[#2C1810] hover:bg-[#3d2217] text-white text-[10px] font-bold py-2.5 rounded-xl transition-all cursor-pointer mt-4 uppercase tracking-wider"
                    >
                      💸 Repartir Propinas Colectivas
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="mb-2 border-b border-[#2C1810]/15 pb-2 flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-base font-bold text-[#2C1810]">Profit-Sharing Semestral</h3>
                      <p className="text-[10px] text-[#2C1810]/50 mt-0.5">Distribución de utilidades (Marzo y Septiembre) - Sec. III.3</p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-[#C2956E]" />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Ventas Semestrales</label>
                      <input
                        type="number"
                        value={profitSales}
                        onChange={(e) => setProfitSales(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full text-xs font-mono font-bold p-2 border border-[#2C1810]/20 rounded-lg bg-stone-50 text-[#2C1810]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Ganancia Neta</label>
                      <input
                        type="number"
                        value={profitNet}
                        onChange={(e) => setProfitNet(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full text-xs font-mono font-bold p-2 border border-[#2C1810]/20 rounded-lg bg-stone-50 text-[#2C1810]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Horas Equipo</label>
                      <input
                        type="number"
                        value={profitHoursTotal}
                        onChange={(e) => setProfitHoursTotal(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-xs font-mono font-bold p-2 border border-[#2C1810]/20 rounded-lg bg-stone-50 text-[#2C1810]"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-stone-50 border border-[#2C1810]/5 rounded-2xl text-xs space-y-2 font-semibold">
                    <div className="flex justify-between text-[#2C1810]">
                      <span>Umbral de Rentabilidad Mínimo (URM 6% de Ventas):</span>
                      <span>${(profitSales * 0.06).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-[#2C1810]">
                      <span>¿Supera el Umbral para Reparto?:</span>
                      <span className={superaSueldos ? "text-emerald-700 font-extrabold" : "text-rose-700 font-extrabold"}>
                        {superaSueldos ? "SÍ (Se activa el pozo del 10%)" : "NO"}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-[#2C1810]/10 pt-2 text-[#2C1810]">
                      <span>Pozo Profit-Sharing Neto (10% del Excedente):</span>
                      <span className="font-mono text-caramel">${pozoProfitSharing.toFixed(0)}</span>
                    </div>
                  </div>

                  <div className="border border-[#2C1810]/10 rounded-2xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-[#2C1810]/5 border-b border-[#2C1810]/10 text-[9px] font-bold uppercase tracking-wider text-[#2C1810]/60">
                          <th className="p-3">Colaborador</th>
                          <th className="p-3 text-center">Horas / Ant.</th>
                          <th className="p-3 text-center">Pago Equitativo</th>
                          <th className="p-3 text-center">Pago Proporcional</th>
                          <th className="p-3 text-right">Total Neto</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[#2C1810]/10">
                        {[
                          { name: "Julio Puglia", rol: "Director", horas: 960, antiguedad: 12 },
                          { name: "Carlos Gómez", rol: "Barista Principal", horas: 900, antiguedad: 8 },
                          { name: "Lucía Fernández", rol: "Chef Pastelería", horas: 880, antiguedad: 7 },
                          { name: "Mariano Díaz", rol: "Mozo Principal", horas: 860, antiguedad: 6 },
                          { name: "Sofía Martínez", rol: "Ayudante Bachero", horas: 600, antiguedad: 3 }
                        ].map((emp, idx) => {
                          const eligible = emp.antiguedad >= 6;
                          const eligibleCount = 4;
                          const equitativa = eligible ? (proporcionalPartTotal / eligibleCount) : 0;
                          const proporcional = (eligible && profitHoursTotal > 0) ? (emp.horas / profitHoursTotal) * proporcionalPartTotal : 0;
                          const totalEmp = equitativa + proporcional;

                          return (
                            <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                              <td className="p-3">
                                <strong className="text-[#2C1810] font-bold block">{emp.name}</strong>
                                <span className="text-[9px] text-[#2C1810]/50 block">{emp.rol}</span>
                              </td>
                                <td className="p-3 text-center font-mono text-[10px] text-[#2C1810]/80">
                                  {emp.horas}h / {emp.antiguedad}m
                                </td>
                                <td className="p-3 text-center font-mono text-[10px] text-[#2C1810]/60">
                                  {eligible ? `$${equitativa.toFixed(0)}` : "-"}
                                </td>
                                <td className="p-3 text-center font-mono text-[10px] text-[#2C1810]/60">
                                  {eligible ? `$${proporcional.toFixed(0)}` : "-"}
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-[#C2956E]">
                                  {eligible ? `$${totalEmp.toFixed(0)}` : (
                                    <span className="text-rose-700 text-[8px] uppercase tracking-wider font-extrabold bg-rose-50 px-1 py-0.5 rounded border border-rose-200">Excluido</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          {personalSubTab === "cuentas" && (
            <motion.div
              key="subtab-cuentas"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-[#2C1810]"
            >
              {/* Form to add user: only visible to owner/administrator */}
              {(currentUser.role === "administrador" || currentUser.role === "dueño") && (
                <div className="lg:col-span-4 bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs space-y-4">
                  <form onSubmit={handleAddUser} className="space-y-4">
                    <div className="border-b border-[#2C1810]/15 pb-2">
                      <h3 className="font-serif text-base font-bold text-[#2C1810]">Crear Nueva Cuenta</h3>
                      <p className="text-[10px] text-[#2C1810]/50 mt-0.5 font-normal">Registre empleados y asigne sus permisos de acceso.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-[#2C1810]/50 block">Nombre Completo</label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="Ej. Juan Pérez"
                        className="w-full text-xs p-2 border border-[#2C1810]/15 rounded-lg bg-[#FDFBF7] text-[#2C1810] font-semibold"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-[#2C1810]/50 block">Correo Electrónico</label>
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="juan@cafepuglia.com"
                        className="w-full text-xs p-2 border border-[#2C1810]/15 rounded-lg bg-[#FDFBF7] text-[#2C1810] font-semibold"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-[#2C1810]/50 block">Contraseña de Acceso</label>
                      <input
                        type="text"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Min. 6 caracteres"
                        className="w-full text-xs p-2 border border-[#2C1810]/15 rounded-lg bg-[#FDFBF7] text-[#2C1810] font-semibold"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-[#2C1810]/50 block">Dirección Particular</label>
                      <input
                        type="text"
                        value={newUserAddress}
                        onChange={(e) => setNewUserAddress(e.target.value)}
                        placeholder="Calle 50 nro. 123, Mar del Plata"
                        className="w-full text-xs p-2 border border-[#2C1810]/15 rounded-lg bg-[#FDFBF7] text-[#2C1810] font-semibold"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-[#2C1810]/50 block">Teléfono Personal</label>
                        <input
                          type="text"
                          value={newUserPhone}
                          onChange={(e) => setNewUserPhone(e.target.value)}
                          placeholder="+54 223 555-1234"
                          className="w-full text-xs p-2 border border-[#2C1810]/15 rounded-lg bg-[#FDFBF7] text-[#2C1810] font-semibold"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-[#2C1810]/50 block">Tel. Contacto Emerg.</label>
                        <input
                          type="text"
                          value={newUserEmergencyPhone}
                          onChange={(e) => setNewUserEmergencyPhone(e.target.value)}
                          placeholder="+54 223 555-9876"
                          className="w-full text-xs p-2 border border-[#2C1810]/15 rounded-lg bg-[#FDFBF7] text-[#2C1810] font-semibold"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-[#2C1810]/50 block">Sueldo Base ($ Mensual)</label>
                      <input
                        type="number"
                        value={newUserSalary}
                        onChange={(e) => setNewUserSalary(e.target.value)}
                        placeholder="Ej. 180000"
                        className="w-full text-xs p-2 border border-[#2C1810]/15 rounded-lg bg-[#FDFBF7] text-[#2C1810] font-mono font-bold"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-[#2C1810]/50 block">Rol / Cargo</label>
                        <select
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value)}
                          className="w-full text-xs p-2 border border-[#2C1810]/15 rounded-lg bg-[#FDFBF7] font-bold text-[#2C1810] cursor-pointer"
                        >
                          <option value="mesero">Mesero</option>
                          <option value="barista">Barista</option>
                          <option value="administrador">Administrador</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-[#2C1810]/50 block">PIN de Salón</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={newUserPin}
                          onChange={(e) => setNewUserPin(e.target.value.replace(/\D/g, ""))}
                          placeholder="1234"
                          className="w-full text-xs p-2 border border-[#2C1810]/15 rounded-lg bg-[#FDFBF7] text-[#2C1810] text-center font-mono font-bold"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#2C1810] hover:bg-[#3d2217] text-white text-[10px] font-bold py-2.5 rounded-xl transition-all cursor-pointer uppercase tracking-wider mt-4"
                    >
                      + Registrar Colaborador
                    </button>
                  </form>
                </div>
              )}

              {/* Users list */}
              <div className={(currentUser.role === "administrador" || currentUser.role === "dueño") ? "lg:col-span-8 bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs space-y-6" : "lg:col-span-12 bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs space-y-6"}>
                <div className="border-b border-[#2C1810]/15 pb-2">
                  <h3 className="font-serif text-base font-bold text-[#2C1810]">Cuentas Registradas</h3>
                  <p className="text-[10px] text-[#2C1810]/50 mt-0.5">
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
                        {(currentUser.role === "administrador" || currentUser.role === "dueño") && <th className="p-3 text-center">PIN</th>}
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
                              <td className="p-3 text-center font-mono font-bold text-caramel">{user.pin}</td>
                            )}
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
            </motion.div>
          )}
          </AnimatePresence>
        </motion.div>
      );
    };

  const renderSalon = () => {
    const tablesList = [
      { id: "1", name: "Mesa 1", capacity: 2 },
      { id: "2", name: "Mesa 2", capacity: 2 },
      { id: "3", name: "Mesa 3", capacity: 4 },
      { id: "4", name: "Mesa 4", capacity: 4 },
      { id: "5", name: "Mesa 5", capacity: 6 },
      { id: "6", name: "Mesa 6", capacity: 8 }
    ];

    return (
      <motion.div
        key="salon-view"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-8"
      >
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#C2956E]">Control en Vivo</span>
          <h2 className="font-serif text-3xl font-bold text-[#2C1810] mt-0.5">Plano del Salón</h2>
          <p className="text-xs text-[#2C1810]/60 mt-1">Gestione el estado de las mesas y agilice el cobro en tiempo real.</p>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs font-bold text-[#2C1810]/70 bg-white p-4 border border-[#2C1810]/10 rounded-2xl">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-600/20"></span>
            <span>Libre</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-[#2C1810] border border-[#2C1810]/20"></span>
            <span>Ocupada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-amber-600/20"></span>
            <span>Reservada</span>
          </div>
        </div>

        {/* Grid of tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tablesList.map((table) => {
            // Find active order for this table
            const activeOrder = orders.find(o => o.status !== "Completado" && o.tableNumber === table.id);
            // Find reservation for this table
            const reservation = bookings.find(b => b.tableId === table.id);

            let status: "Libre" | "Ocupada" | "Reservada" = "Libre";
            let colorClasses = "border-emerald-200 bg-emerald-50/20 text-emerald-900";
            if (activeOrder) {
              status = "Ocupada";
              colorClasses = "border-[#2C1810]/30 bg-[#2C1810]/5 text-[#2C1810]";
            } else if (reservation) {
              status = "Reservada";
              colorClasses = "border-amber-200 bg-amber-50/20 text-amber-900";
            }

            return (
              <div
                key={table.id}
                className={`border rounded-3xl p-6 shadow-xs flex flex-col justify-between min-h-[220px] transition-all relative ${colorClasses}`}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-[#2C1810]/10 pb-3 mb-3">
                    <span className="font-serif text-lg font-black">{table.name}</span>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-white/60 border border-[#2C1810]/5 shadow-2xs">
                      {table.capacity} Personas
                    </span>
                  </div>

                  {status === "Libre" && (
                    <div className="py-4">
                      <p className="text-xs text-[#2C1810]/60 italic font-semibold">Mesa disponible para recibir comensales.</p>
                    </div>
                  )}

                  {status === "Reservada" && reservation && (
                    <div className="space-y-1.5 py-2 text-xs">
                      <p className="font-bold text-amber-800">📌 Reservada por: {reservation.customerName}</p>
                      <p className="text-[10px] text-amber-700 font-semibold font-mono">Horario: {reservation.timeSlot} • Tel: {reservation.customerPhone}</p>
                    </div>
                  )}

                  {status === "Ocupada" && activeOrder && (
                    <div className="space-y-2 py-1 text-xs">
                      <div className="flex justify-between items-center text-[10px] uppercase font-black text-caramel">
                        <span>Consumo Activo</span>
                        <span>Total: ${activeOrder.total.toFixed(0)}</span>
                      </div>
                      <div className="max-h-[60px] overflow-y-auto pr-1 text-[10px] text-[#2C1810]/80 space-y-0.5 font-semibold">
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

                <div className="pt-4 border-t border-[#2C1810]/5 mt-2">
                  {status === "Libre" && (
                    <button
                      onClick={() => {
                        setActiveSubTab("caja");
                        onShowNotification(`✨ Iniciando pedido para la Mesa ${table.id}.`, "info");
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-2 rounded-xl transition-all cursor-pointer uppercase tracking-wider"
                    >
                      Abrir Mesa
                    </button>
                  )}

                  {status === "Reservada" && (
                    <button
                      onClick={() => {
                        setActiveSubTab("caja");
                        onShowNotification(`📌 Ocupando mesa reservada para Mesa ${table.id}.`, "info");
                      }}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold py-2 rounded-xl transition-all cursor-pointer uppercase tracking-wider"
                    >
                      Registrar Arribo
                    </button>
                  )}

                  {status === "Ocupada" && activeOrder && (
                    <button
                      onClick={() => {
                        setPosCheckoutOrder(activeOrder);
                        setPaymentMethod("Tarjeta");
                        setReceivedCashInput("");
                        setPosCouponInput("");
                        setActiveSubTab("caja");
                      }}
                      className="w-full bg-[#2C1810] hover:bg-[#3d2217] text-white text-[10px] font-bold py-2 rounded-xl transition-all cursor-pointer uppercase tracking-wider shadow-md"
                    >
                      💵 Cobrar Ticket
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  const renderReportes = () => {
    // Math indicators based on actual data
    const totalSalesSum = orders.reduce((acc, curr) => acc + curr.total, 0);
    const completedOrders = orders.filter(o => o.status === "Completado");
    const countCompleted = completedOrders.length;
    const avgTicket = countCompleted > 0 ? (totalSalesSum / countCompleted) : 0;

    return (
      <motion.div
        key="reportes-view"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-8 animate-fade-in"
      >
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#C2956E]">Análisis de Negocio</span>
          <h2 className="font-serif text-3xl font-bold text-[#2C1810] mt-0.5">Reportes e Informes</h2>
          <p className="text-xs text-[#2C1810]/60 mt-1">Estadísticas reales de facturación, mermas y métodos de pago.</p>
        </div>

        {/* Real Analytical Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sales performance chart */}
          <div className="lg:col-span-8 bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="font-serif text-base font-bold text-[#2C1810] uppercase tracking-wider border-b border-[#2C1810]/15 pb-2">📈 Facturación Mensual Histórica</h3>
            
            {/* CSS Chart */}
            <div className="flex justify-between items-end h-48 px-4 border-b border-[#2C1810]/10 pb-2 pt-6">
              {[
                { label: "Ene", val: "$1.2M", pct: "65%" },
                { label: "Feb", val: "$1.4M", pct: "75%" },
                { label: "Mar", val: "$1.1M", pct: "58%" },
                { label: "Abr", val: "$1.5M", pct: "82%" },
                { label: "May", val: "$1.9M", pct: "95%" },
                { label: "Jun", val: "$2.1M", pct: "100%" }
              ].map((bar, idx) => (
                <div key={idx} className="flex flex-col items-center group w-12">
                  <span className="text-[8px] font-black text-[#2C1810] opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-mono">{bar.val}</span>
                  <div style={{ height: bar.pct }} className="w-7 bg-[#2C1810] hover:bg-[#C2956E] transition-all rounded-t-md duration-300"></div>
                  <span className="text-[9px] font-bold text-[#2C1810]/50 mt-2">{bar.label}</span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-stone-50 border border-[#2C1810]/5 rounded-2xl text-xs font-semibold flex justify-between text-[#2C1810]/70">
              <div>Facturación Total: <strong className="text-[#2C1810] text-sm">${totalSalesSum.toLocaleString("es-AR")}</strong></div>
              <div>Ticket Promedio: <strong className="text-[#2C1810] text-sm">${avgTicket.toFixed(2)}</strong></div>
            </div>
          </div>

          {/* Payment method distribution */}
          <div className="lg:col-span-4 bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="font-serif text-base font-bold text-[#2C1810] uppercase tracking-wider border-b border-[#2C1810]/15 pb-2">💳 Métodos de Pago</h3>
            
            <div className="space-y-4 py-3">
              {[
                { name: "Efectivo", share: "35%", color: "bg-emerald-600" },
                { name: "Tarjetas (Débito/Crédito)", share: "45%", color: "bg-blue-600" },
                { name: "Mercado Pago", share: "20%", color: "bg-[#00B1EA]" }
              ].map((method, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-[#2C1810]">
                    <span>{method.name}</span>
                    <span>{method.share}</span>
                  </div>
                  <div className="w-full h-2 bg-[#2C1810]/5 rounded-full overflow-hidden">
                    <div className={`h-full ${method.color}`} style={{ width: method.share }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Existing reports (Merma logs) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="font-serif text-base font-bold text-[#2C1810] uppercase tracking-wider border-b border-[#2C1810]/15 pb-2">📊 Historial de Mermas de Materia Prima</h3>
            <p className="text-[10px] text-[#2C1810]/60 leading-relaxed font-semibold">
              El manual obliga a un desecho menor al 2% mensual. Registro descartes:
            </p>
            <div className="space-y-2 text-xs">
              {[
                { date: "Hoy", desc: "Leche cortada por corte de refrigeración", qty: "4.0 L", cost: "$4.800", auditor: "Carlos Gómez" },
                { date: "Ayer", desc: "Harina mojada por humedad de limpieza", qty: "2.5 kg", cost: "$3.750", auditor: "Lucía Fernández" },
                { date: "Hace 3 días", desc: "Granos de descarte de purga de molienda", qty: "0.5 kg", cost: "$12.000", auditor: "Mariano Díaz" }
              ].map((merma, idx) => (
                <div key={idx} className="p-3 bg-stone-50 border border-stone-150 rounded-2xl flex justify-between items-center font-semibold text-[#2C1810]/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-bold text-[#2C1810]">{merma.qty}</strong>
                      <span className="text-[9px] text-[#2C1810]/40 font-bold block">{merma.date}</span>
                    </div>
                    <span className="text-[10px] text-[#2C1810]/60 block mt-0.5">{merma.desc}</span>
                  </div>
                  <div className="text-right">
                    <strong className="text-xs font-mono text-[#2C1810] block">{merma.cost}</strong>
                    <span className="text-[8px] text-[#2C1810]/40 block">Auditor: {merma.auditor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#2C1810]/10 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="font-serif text-base font-bold text-[#2C1810] uppercase tracking-wider border-b border-[#2C1810]/15 pb-2">📋 Historial de Transacciones de Caja</h3>
            <div className="space-y-2 text-xs">
              {cashLedger.transactions.slice(0, 5).map((tx: any, idx: number) => (
                <div key={idx} className="p-3 bg-stone-50 border border-stone-150 rounded-2xl flex justify-between items-center font-semibold text-[#2C1810]/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-bold text-[#2C1810]">{tx.type}</strong>
                      <span className="px-1.5 py-0.5 text-[8px] font-black rounded bg-[#2C1810]/5 text-[#2C1810]/70 font-mono">{tx.orderId}</span>
                    </div>
                    <span className="text-[9px] text-[#2C1810]/40 block mt-0.5">{tx.timestamp} vía {tx.method}</span>
                  </div>
                  <strong className="text-xs font-mono text-[#2C1810]">${tx.total.toFixed(0)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#FDFBF7] font-sans text-espresso select-none">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-[#2C1810] text-[#FDFBF7] flex flex-col justify-between p-6 shrink-0 border-r border-[#C2956E]/20">
        <div>
          {/* Logo brand */}
          <div className="mb-8 cursor-pointer animate-fade-in" onClick={onClosePanel}>
            <span className="font-serif text-2xl font-bold tracking-tight text-white block">Café Puglia</span>
            <span className="text-[9px] uppercase tracking-widest text-[#C2956E] font-semibold block mt-0.5">SPECIALTY COFFEE • MAR DEL PLATA</span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["administrador"] },
              { id: "inventario", label: "Stock & Insumos", icon: Package, badge: insumos.filter(i => i.quantity <= i.minLimit).length, roles: ["administrador", "barista"] },
              { id: "precios", label: "Carta & Recetas", icon: BookOpen, roles: ["administrador"] },
              { id: "salon", label: "Mapa de Salón", icon: Layers, roles: ["administrador", "mesero"] },
              { id: "pedidos_mozo", label: "Módulo Mozo", icon: ClipboardList, roles: ["administrador", "mesero"] },
              { id: "caja", label: "Caja & Comandas", icon: Coins, badge: orders.filter(o => o.status !== "Completado").length, roles: ["administrador", "mesero"] },
              { id: "proveedores", label: "Proveedores", icon: Sliders, roles: ["administrador"] },
              { id: "personal", label: "Personal", icon: Users, roles: ["administrador", "barista"] },
              { id: "reportes", label: "Reportes", icon: FileText, roles: ["administrador"] }
            ].filter(link => {
              if (!link.roles.includes(currentUser.role) && currentUser.role !== "dueño" && currentUser.role !== "administrador") {
                return false;
              }
              if (currentUser.role === "administrador" || currentUser.role === "dueño") {
                return true;
              }
              const meta = usersMetadata[currentUser.id];
              if (meta && meta.permissions) {
                return meta.permissions.includes(link.id);
              }
              return true;
            }).map((link) => {
              const active = activeSubTab === link.id;
              const Icon = link.icon;
              return (
                <button
                  key={link.id}
                  onClick={() => setActiveSubTab(link.id as any)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    active 
                      ? "bg-[#C2956E] text-white shadow-md"
                      : "text-[#FDFBF7]/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4.5 w-4.5" />
                    {link.label}
                  </span>
                  {link.badge !== undefined && link.badge > 0 && (
                    <span className={`h-4 w-4 flex items-center justify-center rounded-full text-[9px] font-bold shrink-0 ${
                      active ? "bg-white text-[#C2956E]" : "bg-red-600 text-white"
                    }`}>
                      {link.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom Widgets */}
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[10px]">
            <span className="text-white/40 block font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-emerald-500 animate-pulse" /> Conectividad POS
            </span>
            <p className="text-[#FDFBF7]/80 font-semibold">• Servidor Local Offline Activo</p>
            <p className="text-[#FDFBF7]/40 mt-0.5">Mesa 1-8 sintonizada - Respuestas en 0ms.</p>
          </div>

          <button
            onClick={onClosePanel}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/20 hover:border-red-500 hover:bg-red-500/10 text-xs font-bold text-red-200 hover:text-white transition-all cursor-pointer bg-transparent"
          >
            <LogOut className="h-4 w-4 rotate-180" />
            Cerrar Sesión
          </button>
          
          <div className="text-[8px] text-white/30 text-center font-bold tracking-wider uppercase">
            Diseño para Café Puglia SL<br />Arg: Mar del Plata (Prov. Bs As)
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 lg:p-10 bg-[#FDFBF7]">
        <AnimatePresence mode="wait">
          {activeSubTab === "dashboard" && renderDashboard()}
          {activeSubTab === "inventario" && renderInventario()}
          {activeSubTab === "precios" && renderPrecios()}
          {activeSubTab === "salon" && renderSalon()}
          {activeSubTab === "pedidos_mozo" && renderPedidosMozo()}
          {activeSubTab === "caja" && renderCaja()}
          {activeSubTab === "proveedores" && renderProveedores()}
          {activeSubTab === "personal" && renderPersonal()}
          {activeSubTab === "reportes" && renderReportes()}
        </AnimatePresence>
      </div>

      {/* Unified Movement Registration Modal */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 bg-[#2C1810]/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FDFBF7] border border-[#2C1810]/15 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-xs font-semibold text-[#2C1810]/80">
            <button 
              onClick={() => setIsMovementModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-stone-200/50 text-[#2C1810]/40 hover:text-[#2C1810]"
            >
              <X className="h-4 w-4" />
            </button>

            <h4 className="font-serif text-lg font-bold text-[#2C1810] mb-4">Registrar Movimiento de Stock</h4>

            <div className="space-y-4">
              <div>
                <span className="text-[9px] font-bold text-[#2C1810]/50 uppercase tracking-wider block mb-1.5">Tipo de Ajuste</span>
                <div className="grid grid-cols-2 gap-3">
                  {["Ingreso", "Egreso"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMovType(t as any)}
                      className={`p-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                        movType === t 
                          ? "bg-[#2C1810] text-[#FDFBF7] border-[#2C1810]" 
                          : "bg-white border-stone-200 text-[#2C1810] hover:bg-stone-50"
                      }`}
                    >
                      {t === "Ingreso" ? "📥 Ingreso (Recibo)" : "📤 Egreso (Merma/Ajuste)"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Materia Prima / Insumo</label>
                <select 
                  value={movInsumoId}
                  onChange={(e) => setMovInsumoId(e.target.value)}
                  className="w-full p-2.5 border border-[#2C1810]/20 rounded-xl text-xs bg-white text-[#2C1810] font-bold cursor-pointer"
                >
                  {insumos.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Cantidad a Ajustar</label>
                <input 
                  type="number"
                  placeholder="Ingrese el valor numérico"
                  value={movQty}
                  onChange={(e) => setMovQty(e.target.value)}
                  className="w-full p-2.5 border border-[#2C1810]/20 rounded-xl text-xs bg-white text-[#2C1810] focus:ring-1 focus:ring-[#C2956E] focus:outline-none font-bold"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  onClick={() => setIsMovementModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-[#2C1810]/60 hover:bg-stone-100 transition-all cursor-pointer text-center bg-transparent"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    const val = parseFloat(movQty);
                    if (isNaN(val) || val <= 0) {
                      onShowNotification("⚠️ Ingrese una cantidad válida mayor a cero.", "warning");
                      return;
                    }
                    const multiplier = movType === "Ingreso" ? 1 : -1;
                    handleAdjustInsumo(movInsumoId, val * multiplier);
                    setIsMovementModalOpen(false);
                    onShowNotification(`📦 Ajuste realizado: Se registró ${movType.toLowerCase()} de ${val} unidades.`, "success");
                  }}
                  className="w-1/2 py-2.5 rounded-xl bg-[#2C1810] hover:bg-[#3d2217] text-white text-xs font-bold shadow-md transition-all cursor-pointer text-center"
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
        <div className="fixed inset-0 bg-[#2C1810]/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FDFBF7] border border-[#2C1810]/15 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-xs font-semibold text-[#2C1810]/80">
            <button 
              onClick={() => setIsConfigRestaurantOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-stone-200/50 text-[#2C1810]/40 hover:text-[#2C1810]"
            >
              <X className="h-4 w-4" />
            </button>
            <h4 className="font-serif text-lg font-bold text-[#2C1810] mb-1">Configurar Restaurant</h4>
            <p className="text-[10px] text-[#2C1810]/50 mb-4 font-normal">Personalice los datos de su restaurante para el ticket fiscal.</p>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Nombre Comercial</label>
                <input type="text" defaultValue="Café Puglia" className="w-full p-2.5 border border-[#2C1810]/20 rounded-xl text-xs bg-white font-bold" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Dirección Física</label>
                <input type="text" defaultValue="Calle 50 nro 600, La Plata" className="w-full p-2.5 border border-[#2C1810]/20 rounded-xl text-xs bg-white font-bold" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">CUIT Comercial</label>
                <input type="text" defaultValue="30-71458925-9" className="w-full p-2.5 border border-[#2C1810]/20 rounded-xl text-xs bg-white font-bold" />
              </div>
              <div className="flex gap-3 pt-3">
                <button onClick={() => setIsConfigRestaurantOpen(false)} className="w-1/2 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-[#2C1810]/60 hover:bg-stone-100 transition-all cursor-pointer bg-transparent">Cancelar</button>
                <button onClick={() => { setIsConfigRestaurantOpen(false); onShowNotification("✅ Configuración de restaurante guardada.", "success"); }} className="w-1/2 py-2.5 rounded-xl bg-[#2C1810] hover:bg-[#3d2217] text-white text-xs font-bold shadow-md cursor-pointer">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuración Ticketera Modal */}
      {isConfigTicketerisOpen && (
        <div className="fixed inset-0 bg-[#2C1810]/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FDFBF7] border border-[#2C1810]/15 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-xs font-semibold text-[#2C1810]/80">
            <button 
              onClick={() => setIsConfigTicketerisOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-stone-200/50 text-[#2C1810]/40 hover:text-[#2C1810]"
            >
              <X className="h-4 w-4" />
            </button>
            <h4 className="font-serif text-lg font-bold text-[#2C1810] mb-1">Configurar Ticketera</h4>
            <p className="text-[10px] text-[#2C1810]/50 mb-4 font-normal">Establezca la interfaz y parámetros de la impresora térmica.</p>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Interfaz de Conexión</label>
                <select className="w-full p-2.5 border border-[#2C1810]/20 rounded-xl text-xs bg-white font-bold cursor-pointer">
                  <option>USB Thermal Printer (Predeterminado)</option>
                  <option>Bluetooth clover-thermal-58</option>
                  <option>Ethernet (IP: 192.168.1.150)</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Ancho de Papel</label>
                <select className="w-full p-2.5 border border-[#2C1810]/20 rounded-xl text-xs bg-white font-bold cursor-pointer">
                  <option>80 mm (Recomendado)</option>
                  <option>58 mm</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Texto de Pie de Página</label>
                <input type="text" defaultValue="¡Gracias por su visita! Café de Especialidad" className="w-full p-2.5 border border-[#2C1810]/20 rounded-xl text-xs bg-white font-bold" />
              </div>
              <div className="flex gap-3 pt-3">
                <button onClick={() => setIsConfigTicketerisOpen(false)} className="w-1/2 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-[#2C1810]/60 hover:bg-stone-100 transition-all cursor-pointer bg-transparent">Cancelar</button>
                <button onClick={() => { setIsConfigTicketerisOpen(false); onShowNotification("🖨️ Configuración de impresora térmica guardada.", "success"); }} className="w-1/2 py-2.5 rounded-xl bg-[#2C1810] hover:bg-[#3d2217] text-white text-xs font-bold shadow-md cursor-pointer">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cerrar Turno de Caja Modal */}
      {isCloseShiftModalOpen && (
        <div className="fixed inset-0 bg-[#2C1810]/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FDFBF7] border border-[#2C1810]/15 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-xs font-semibold text-[#2C1810]/80">
            <button 
              onClick={() => setIsCloseShiftModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-stone-200/50 text-[#2C1810]/40 hover:text-[#2C1810]"
            >
              <X className="h-4 w-4" />
            </button>
            <h4 className="font-serif text-lg font-bold text-[#2C1810] mb-1">Cerrar Turno de Caja Diaria</h4>
            <p className="text-[10px] text-[#2C1810]/50 mb-4 font-normal">Declare el monto real e ingrese observaciones para el arqueo final.</p>
            
            <div className="my-4 p-4 bg-stone-50 border border-stone-150 rounded-2xl">
              <span className="text-[9px] font-bold text-[#2C1810]/50 uppercase tracking-wider block">Ventas Turno Teórico</span>
              <div className="text-2xl font-serif font-black text-[#2C1810] mt-1 font-mono">${cashLedger.totalCollected.toLocaleString()}</div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-[9px] text-[#2C1810]/60 font-bold border-t border-[#2C1810]/10 pt-2.5">
                <div>Efectivo: <span className="font-mono text-[#2C1810]">${cashLedger.cash.toLocaleString()}</span></div>
                <div>Tarjeta: <span className="font-mono text-[#2C1810]">${cashLedger.card.toLocaleString()}</span></div>
                <div>MP: <span className="font-mono text-[#2C1810]">${cashLedger.mercadopago.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Monto Real en Caja ($)</label>
                <input 
                  type="number" 
                  placeholder="Ingrese el monto físico contado" 
                  value={closeShiftRealCash} 
                  onChange={(e) => setCloseShiftRealCash(e.target.value)}
                  className="w-full p-2.5 border border-[#2C1810]/20 rounded-xl text-xs bg-white text-[#2C1810] focus:ring-1 focus:ring-[#C2956E] focus:outline-none font-bold font-mono" 
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[#2C1810]/50 uppercase block mb-1">Observaciones</label>
                <textarea 
                  placeholder="Facturación normal del turno, diferencias de arqueo, etc." 
                  value={closeShiftNotes} 
                  onChange={(e) => setCloseShiftNotes(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 border border-[#2C1810]/20 rounded-xl text-xs bg-white text-[#2C1810] focus:ring-1 focus:ring-[#C2956E] focus:outline-none font-semibold resize-none"
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button onClick={() => setIsCloseShiftModalOpen(false)} className="w-1/2 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-[#2C1810]/60 hover:bg-stone-100 transition-all cursor-pointer bg-transparent">Cancelar</button>
                <button 
                  onClick={() => {
                    const realCash = parseFloat(closeShiftRealCash);
                    if (isNaN(realCash) || realCash < 0) {
                      onShowNotification("⚠️ Ingrese un monto real válido.", "warning");
                      return;
                    }
                    handleConfirmCloseShift(realCash, closeShiftNotes);
                    setCloseShiftRealCash("");
                    setCloseShiftNotes("");
                  }} 
                  className="w-1/2 py-2.5 rounded-xl bg-red-650 hover:bg-red-750 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Confirmar Arqueo ✓
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
            <p className="text-[10px] text-[#2C1810]/50 mb-4 font-normal">Arqueo fiscal homologado por el personal de Café Puglia.</p>
            
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
    </div>
  );
}
