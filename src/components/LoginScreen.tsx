import { useState, useEffect, FormEvent } from "react";
import { Coffee, Key, User, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

interface LoginScreenProps {
  onLoginSuccess: (user: { id: string; name: string; email: string; role: string; pin?: string }) => void;
  onShowNotification: (message: string, type: "success" | "info" | "warning") => void;
}

const DEFAULT_USERS = [
  { id: "usr-1", name: "Pablo Madina (Administrador)", email: "pablo@cafepuglia.com", password: "pablo123", role: "administrador", pin: "1111" },
  { id: "usr-2", name: "Rami Madina (Barista)", email: "rami@cafepuglia.com", password: "barista123", role: "barista", pin: "2222" },
  { id: "usr-3", name: "Silvana Madina (Mesero)", email: "silvana@cafepuglia.com", password: "mesero123", role: "mesero", pin: "3333" }
];

export default function LoginScreen({ onLoginSuccess, onShowNotification }: LoginScreenProps) {
  const [loginMode, setLoginMode] = useState<"credentials" | "pin">("pin");
  
  // Credentials mode states
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // PIN mode states
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [selectedUserForPin, setSelectedUserForPin] = useState<any>(null);
  
  // Loaded employees list for quick PIN sign-in
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load active employees list from Supabase
  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase.from("users_accounts").select("id, name, role, email, pin");
      let dbUsers = data || [];

      // Load local custom users
      let localUsers: any[] = [];
      try {
        const saved = localStorage.getItem("puglia_local_users");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            localUsers = parsed;
          }
        }
      } catch (e) {
        console.error("Error reading local users:", e);
      }

      // Merge and remove duplicates by email/pin/id
      const merged = [...dbUsers];
      if (Array.isArray(localUsers)) {
        localUsers.forEach(l => {
          if (l && !merged.some(m => m.id === l.id || m.email === l.email || m.pin === l.pin)) {
            merged.push(l);
          }
        });
      }

      if (merged.length > 0) {
        setEmployees(merged);
      } else {
        setEmployees(DEFAULT_USERS);
      }
    } catch (e) {
      console.error(e);
      let localUsers: any[] = [];
      try {
        const saved = localStorage.getItem("puglia_local_users");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            localUsers = parsed;
          }
        }
      } catch (err) {}
      setEmployees([...DEFAULT_USERS, ...localUsers]);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // Handle email/password authentication
  const handleCredentialsLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput.trim()) {
      onShowNotification("⚠️ Complete todos los campos.", "warning");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Check local storage users first
      let localUsers: any[] = [];
      try {
        const saved = localStorage.getItem("puglia_local_users");
        if (saved) {
          localUsers = JSON.parse(saved);
        }
      } catch (e) {}

      const matchedLocal = localUsers.find(u => u.email === emailInput.trim().toLowerCase());
      if (matchedLocal) {
        if (matchedLocal.password === passwordInput) {
          onShowNotification(`☕ ¡Bienvenido, ${matchedLocal.name}! Sesión iniciada como ${matchedLocal.role}.`, "success");
          onLoginSuccess({
            id: matchedLocal.id,
            name: matchedLocal.name,
            email: matchedLocal.email,
            role: matchedLocal.role,
            pin: matchedLocal.pin
          });
          setIsLoading(false);
          return;
        } else {
          onShowNotification("❌ Contraseña incorrecta.", "warning");
          setIsLoading(false);
          return;
        }
      }

      // 2. Fallback to Supabase
      const { data, error } = await supabase
        .from("users_accounts")
        .select("*")
        .eq("email", emailInput.trim().toLowerCase())
        .single();

      let user = data;
      if (error || !data) {
        const fallbackUser = DEFAULT_USERS.find(u => u.email === emailInput.trim().toLowerCase());
        if (fallbackUser) {
          user = fallbackUser;
        } else {
          onShowNotification("❌ Usuario no registrado.", "warning");
          setIsLoading(false);
          return;
        }
      }

      if (user.password !== passwordInput) {
        onShowNotification("❌ Contraseña incorrecta.", "warning");
        setIsLoading(false);
        return;
      }

      onShowNotification(`☕ ¡Bienvenido, ${user.name}! Sesión iniciada como ${user.role}.`, "success");
      onLoginSuccess({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        pin: user.pin
      });
    } catch (err) {
      const fallbackUser = DEFAULT_USERS.find(u => u.email === emailInput.trim().toLowerCase());
      if (fallbackUser && fallbackUser.password === passwordInput) {
        onShowNotification(`☕ ¡Bienvenido, ${fallbackUser.name}! Sesión iniciada como ${fallbackUser.role}.`, "success");
        onLoginSuccess({
          id: fallbackUser.id,
          name: fallbackUser.name,
          email: fallbackUser.email,
          role: fallbackUser.role,
          pin: fallbackUser.pin
        });
      } else {
        onShowNotification("❌ Error de conexión al verificar credenciales.", "warning");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle PIN authentication
  const handlePinDigitClick = (num: string) => {
    if (pinDigits.length >= 4) return;
    const newDigits = [...pinDigits, num];
    setPinDigits(newDigits);

    if (newDigits.length === 4 && selectedUserForPin) {
      verifyPin(newDigits.join(""), selectedUserForPin);
    }
  };

  const verifyPin = async (enteredPin: string, user: any) => {
    setIsLoading(true);
    setTimeout(async () => {
      if (user.pin === enteredPin) {
        onShowNotification(`☕ ¡Hola, ${user.name}! Iniciando sesión rápido.`, "success");
        onLoginSuccess({
          id: user.id,
          name: user.name,
          email: user.email || "",
          role: user.role,
          pin: user.pin
        });
      } else {
        onShowNotification("❌ Código PIN incorrecto.", "warning");
        setPinDigits([]);
      }
      setIsLoading(false);
    }, 500);
  };

  const handlePinDelete = () => {
    setPinDigits((prev) => prev.slice(0, -1));
  };

  const handlePinClear = () => {
    setPinDigits([]);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 relative overflow-hidden font-sans text-[#2C1810]">
      {/* Background elegant circles */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#2C1810]/5 blur-3xl" />
      <div className="absolute bottom-[-25%] right-[-25%] w-[70%] h-[70%] rounded-full bg-[#D97706]/5 blur-3xl" />

      {/* Main card */}
      <div className="w-full max-w-md bg-white border border-[#2C1810]/10 rounded-3xl p-8 shadow-2xl relative z-10 transition-all flex flex-col justify-between min-h-[580px]">
        
        {/* Logo and title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#2C1810] text-[#FDFBF7] mb-3 shadow-md">
            <Coffee className="h-7 w-7" />
          </div>
          <h1 className="font-serif text-2xl font-black tracking-tight text-[#2C1810]">Café Puglia</h1>
          <p className="text-[10px] text-[#2C1810]/50 uppercase tracking-widest font-bold mt-1">Plataforma SaaS de Gestión</p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 bg-[#FDFBF7] p-1 rounded-xl border border-[#2C1810]/5 mb-6 text-xs font-bold text-center">
          <button
            onClick={() => { setLoginMode("pin"); setPinDigits([]); setSelectedUserForPin(null); }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${loginMode === "pin" ? "bg-[#2C1810] text-white shadow-xs" : "text-[#2C1810]/60 hover:text-[#2C1810]"}`}
          >
            🔑 PIN Rápido
          </button>
          <button
            onClick={() => setLoginMode("credentials")}
            className={`py-2 rounded-lg transition-all cursor-pointer ${loginMode === "credentials" ? "bg-[#2C1810] text-white shadow-xs" : "text-[#2C1810]/60 hover:text-[#2C1810]"}`}
          >
            ✉️ Email y Clave
          </button>
        </div>

        {/* Loading Spinner Overlaid */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs rounded-3xl z-50 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#2C1810] mb-3"></div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C1810]/60">Verificando...</span>
          </div>
        )}

        {/* CREDENTIALS MODE */}
        {loginMode === "credentials" && (
          <form onSubmit={handleCredentialsLogin} className="space-y-4 flex-1 flex flex-col justify-center">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-[#2C1810]/50 block">Correo Electrónico</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-[#2C1810]/40" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="ejemplo@cafepuglia.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-[#2C1810]/15 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#2C1810]/50 bg-[#FDFBF7]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-[#2C1810]/50 block">Contraseña</label>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-[#2C1810]/40" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 border border-[#2C1810]/15 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#2C1810]/50 bg-[#FDFBF7]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-[#2C1810]/40 hover:text-[#2C1810]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#2C1810] hover:bg-[#3d2217] text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer mt-4"
            >
              Ingresar al Sistema
            </button>
          </form>
        )}

        {/* PIN MODE */}
        {loginMode === "pin" && (
          <div className="flex-1 flex flex-col justify-between">
            {/* User selector */}
            {!selectedUserForPin ? (
              <div className="space-y-3 flex-1 flex flex-col justify-center">
                <p className="text-[10px] font-black uppercase text-[#2C1810]/50 text-center mb-2">Seleccione su cuenta de personal</p>
                <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {employees.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => { setSelectedUserForPin(emp); setPinDigits([]); }}
                      className="flex items-center justify-between p-3.5 bg-[#FDFBF7] hover:bg-[#2C1810]/5 border border-[#2C1810]/10 rounded-2xl text-left transition-all cursor-pointer"
                    >
                      <div>
                        <span className="text-xs font-bold block">{emp.name}</span>
                        <span className="text-[9px] uppercase tracking-wider text-caramel font-semibold font-mono">{emp.role}</span>
                      </div>
                      <Key className="h-4 w-4 text-[#2C1810]/30" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // PIN Keyboard entry
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="text-center">
                  <button
                    onClick={() => setSelectedUserForPin(null)}
                    className="text-[9px] uppercase font-bold text-caramel hover:underline block mb-2"
                  >
                    ← Volver a la lista
                  </button>
                  <span className="text-xs font-bold text-[#2C1810]">{selectedUserForPin.name}</span>
                  <div className="flex justify-center gap-3 mt-3">
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        className={`w-3.5 h-3.5 rounded-full border-2 border-[#2C1810] transition-all ${pinDigits.length > idx ? "bg-[#2C1810]" : "bg-transparent"}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Keyboard Grid */}
                <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      onClick={() => handlePinDigitClick(num)}
                      className="w-14 h-14 rounded-full bg-[#FDFBF7] hover:bg-[#2C1810] hover:text-white border border-[#2C1810]/10 text-base font-serif font-black flex items-center justify-center transition-all cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={handlePinClear}
                    className="w-14 h-14 rounded-full bg-[#FDFBF7] hover:bg-[#2C1810]/5 text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer uppercase text-espresso/60"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => handlePinDigitClick("0")}
                    className="w-14 h-14 rounded-full bg-[#FDFBF7] hover:bg-[#2C1810] hover:text-white border border-[#2C1810]/10 text-base font-serif font-black flex items-center justify-center transition-all cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    onClick={handlePinDelete}
                    className="w-14 h-14 rounded-full bg-[#FDFBF7] hover:bg-[#2C1810]/5 text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer uppercase text-espresso/60"
                  >
                    Del
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="text-center border-t border-[#2C1810]/10 pt-4 mt-4">
          <p className="text-[8px] text-[#2C1810]/40 font-bold uppercase tracking-wider">
            La Plata, Argentina • Calle 50 nro 600
          </p>
        </div>
      </div>
    </div>
  );
}
