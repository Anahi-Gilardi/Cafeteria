import { useState, useEffect, FormEvent } from "react";
import RestoBarLogo from "./RestoBarLogo";
import { Key, User, Eye, EyeOff, ShieldCheck, Lock } from "lucide-react";
import { supabase } from "../lib/supabase";
import { AuthService } from "../services/AuthService";

interface LoginScreenProps {
  onLoginSuccess: (user: { id: string; name: string; email: string; role: string; pin?: string }) => void;
  onShowNotification: (message: string, type: "success" | "info" | "warning") => void;
}

const DEFAULT_USERS = [
  { id: "usr-admin", name: "Admin (Administrador)", email: "admin", password: "1998", role: "administrador", pin: "1998" },
  { id: "usr-admin-full", name: "Admin (Administrador)", email: "admin@cafepuglia.com", password: "1998", role: "administrador", pin: "1998" },
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
  const [isLoading, setIsLoading] = useState(false);

  // Load active employees list from Supabase
  const loadEmployees = async () => {
    try {
      const { data } = await supabase.from("users_accounts").select("id, name, role, email, pin");
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

      // Merge default users (including admin)
      const merged = [...dbUsers];
      if (Array.isArray(localUsers)) {
        localUsers.forEach(l => {
          if (l && !merged.some(m => m.id === l.id || m.email === l.email || m.pin === l.pin)) {
            merged.push(l);
          }
        });
      }
      DEFAULT_USERS.forEach(def => {
        if (!merged.some(m => m.email === def.email || m.id === def.id)) {
          merged.push(def);
        }
      });

      setEmployees(merged.length > 0 ? merged : DEFAULT_USERS);
    } catch (e) {
      console.error(e);
      let localUsers: any[] = [];
      try {
        const saved = localStorage.getItem("puglia_local_users");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) localUsers = parsed;
        }
      } catch (err) {}
      setEmployees([...DEFAULT_USERS, ...localUsers]);
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
      const authResult = await AuthService.loginWithCredentials(emailInput, passwordInput);
      if (authResult.success && authResult.user) {
        onShowNotification(`🎭 ¡Bienvenido/a, ${authResult.user.name}! Sesión iniciada como ${authResult.user.role}.`, "success");
        onLoginSuccess(authResult.user);
      } else {
        onShowNotification(`❌ ${authResult.error || "Credenciales de acceso incorrectas."}`, "warning");
      }
    } catch (err) {
      onShowNotification("❌ Error de autenticación.", "warning");
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
        onShowNotification(`🎭 ¡Hola, ${user.name}! Acceso concedido al sistema.`, "success");
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
    }, 400);
  };

  const handlePinDelete = () => setPinDigits((prev) => prev.slice(0, -1));
  const handlePinClear = () => setPinDigits([]);

  return (
    <div className="w-full bg-[#1A110B] border-2 border-[#D4AF37]/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 transition-all flex flex-col justify-between min-h-[580px] text-[#FDFBF7] gold-glow">
      {/* Logo and title */}
      <div className="flex flex-col items-center justify-center text-center mb-6">
        <RestoBarLogo size="xl" />
        <div className="mt-3 text-[10px] text-[#FFDF00] font-black uppercase tracking-widest bg-[#2A1B12] border border-[#D4AF37]/40 px-4 py-1.5 rounded-full font-mono shadow-md">
          📍 CONSTITUCIÓN 944 • RÍO CUARTO | 📞 358 5042311
        </div>
      </div>

      {/* Mode Tab Selector */}
      <div className="grid grid-cols-2 bg-[#2A1B12] p-1.5 rounded-2xl border border-[#D4AF37]/30 mb-6 text-xs font-bold text-center">
        <button
          onClick={() => { setLoginMode("pin"); setPinDigits([]); setSelectedUserForPin(null); }}
          className={`py-2.5 rounded-xl transition-all cursor-pointer font-black uppercase tracking-wider ${
            loginMode === "pin" 
              ? "bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] shadow-md gold-glow" 
              : "text-[#FDFBF7]/70 hover:text-white"
          }`}
        >
          🔑 PIN Rápido (4 Dígitos)
        </button>
        <button
          onClick={() => setLoginMode("credentials")}
          className={`py-2.5 rounded-xl transition-all cursor-pointer font-black uppercase tracking-wider ${
            loginMode === "credentials" 
              ? "bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] shadow-md gold-glow" 
              : "text-[#FDFBF7]/70 hover:text-white"
          }`}
        >
          ✉️ Email y Clave
        </button>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#1A110B]/90 backdrop-blur-xs rounded-3xl z-50 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFDF00] mb-3"></div>
          <span className="text-xs font-black uppercase tracking-widest text-[#FFDF00]">Autenticando en Sistema...</span>
        </div>
      )}

      {/* CREDENTIALS MODE */}
      {loginMode === "credentials" && (
        <form onSubmit={handleCredentialsLogin} className="space-y-4 flex-1 flex flex-col justify-center">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-[#D4AF37] block tracking-wider">Correo Electrónico / Usuario</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 h-4 w-4 text-[#D4AF37]" />
              <input
                type="text"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="ej: admin"
                className="w-full pl-11 pr-4 py-3 bg-[#2A1B12] border border-[#D4AF37]/30 rounded-xl text-xs font-bold text-[#FDFBF7] focus:outline-none focus:border-[#FFDF00] placeholder-[#FDFBF7]/40"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-[#D4AF37] block tracking-wider">Contraseña de Acceso</label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-[#D4AF37]" />
              <input
                type={showPassword ? "text" : "password"}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-11 py-3 bg-[#2A1B12] border border-[#D4AF37]/30 rounded-xl text-xs font-bold text-[#FDFBF7] focus:outline-none focus:border-[#FFDF00] placeholder-[#FDFBF7]/40"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-[#D4AF37] hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] text-xs font-black py-3.5 rounded-xl transition-all shadow-lg uppercase tracking-wider cursor-pointer mt-4 gold-glow"
          >
            Ingresar al Sistema POS
          </button>
        </form>
      )}

      {/* PIN MODE */}
      {loginMode === "pin" && (
        <div className="flex-1 flex flex-col justify-between">
          {!selectedUserForPin ? (
            <div className="space-y-3 flex-1 flex flex-col justify-center">
              <p className="text-[10px] font-black uppercase text-[#D4AF37] text-center mb-2 tracking-widest">Seleccione su cuenta de personal</p>
              <div className="grid grid-cols-1 gap-2.5 max-h-[240px] overflow-y-auto pr-1">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => { setSelectedUserForPin(emp); setPinDigits([]); }}
                    className="flex items-center justify-between p-3.5 bg-[#2A1B12] hover:bg-[#3D281A] border border-[#D4AF37]/30 hover:border-[#D4AF37] rounded-2xl text-left transition-all cursor-pointer shadow-md group"
                  >
                    <div>
                      <span className="text-xs font-bold text-[#FDFBF7] group-hover:text-[#FFDF00] block">{emp.name}</span>
                      <span className="text-[9px] uppercase tracking-wider text-[#FFDF00] font-black font-mono mt-0.5 block">{emp.role}</span>
                    </div>
                    <Lock className="h-4 w-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
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
                  className="text-[10px] uppercase font-bold text-[#D4AF37] hover:text-[#FFDF00] block mb-2 cursor-pointer"
                >
                  ← Volver a la lista de personal
                </button>
                <span className="text-sm font-bold text-[#FFDF00] font-serif block">{selectedUserForPin.name}</span>
                <span className="text-[9px] uppercase text-[#FDFBF7]/60 font-mono font-bold block mt-0.5">({selectedUserForPin.role})</span>

                <div className="flex justify-center gap-3 mt-4">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full border-2 border-[#D4AF37] transition-all ${
                        pinDigits.length > idx 
                          ? "bg-[#FFDF00] shadow-md gold-glow scale-110" 
                          : "bg-transparent"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Keyboard Grid */}
              <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    onClick={() => handlePinDigitClick(num)}
                    className="w-14 h-14 rounded-2xl bg-[#2A1B12] hover:bg-gradient-to-r hover:from-[#FFDF00] hover:to-[#D4AF37] hover:text-[#1C120C] border border-[#D4AF37]/40 text-[#FFDF00] text-xl font-mono font-black flex items-center justify-center transition-all cursor-pointer shadow-md"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={handlePinClear}
                  className="w-14 h-14 rounded-2xl bg-[#2A1B12] hover:bg-[#3D281A] border border-[#D4AF37]/20 text-[10px] font-black text-[#D4AF37] flex items-center justify-center transition-all cursor-pointer uppercase"
                >
                  Limpiar
                </button>
                <button
                  onClick={() => handlePinDigitClick("0")}
                  className="w-14 h-14 rounded-2xl bg-[#2A1B12] hover:bg-gradient-to-r hover:from-[#FFDF00] hover:to-[#D4AF37] hover:text-[#1C120C] border border-[#D4AF37]/40 text-[#FFDF00] text-xl font-mono font-black flex items-center justify-center transition-all cursor-pointer shadow-md"
                >
                  0
                </button>
                <button
                  onClick={handlePinDelete}
                  className="w-14 h-14 rounded-2xl bg-[#2A1B12] hover:bg-[#3D281A] border border-[#D4AF37]/20 text-[10px] font-black text-[#D4AF37] flex items-center justify-center transition-all cursor-pointer uppercase"
                >
                  Borrar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer info */}
      <div className="text-center border-t border-[#D4AF37]/20 pt-4 mt-4">
        <p className="text-[9px] text-[#FDFBF7]/60 font-bold uppercase tracking-wider">
          Constitución 944, frente al Teatro Municipal • Río Cuarto, Córdoba
        </p>
      </div>
    </div>
  );
}
