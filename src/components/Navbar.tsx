import { ShoppingBag, Menu, X, Coffee, Calendar, Bot, ListOrdered, BookOpen, Settings, Scroll, LogOut, ChevronLeft, LayoutDashboard } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cartCount: number;
  onCartClick: () => void;
  onLogout: () => void;
  currentUser: { name: string; role: string };
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Navbar({ activeTab, setActiveTab, cartCount, onCartClick, onLogout, currentUser, isOpen, setIsOpen }: NavbarProps) {
  // Restrict navigation based on role
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["administrador", "barista", "mesero"] },
    { id: "menu", label: "Menú", icon: Coffee, roles: ["administrador", "mesero"] },
    { id: "carta-digital", label: "Carta Digital", icon: BookOpen, roles: ["administrador", "mesero"] },
    { id: "reservas", label: "Reservas", icon: Calendar, roles: ["administrador", "mesero"] },
    { id: "barista-ia", label: "Barista IA", icon: Bot, roles: ["administrador", "barista", "mesero"] },
    { id: "manual", label: "Manual Operativo", icon: Scroll, roles: ["administrador", "barista", "mesero"] },
    { id: "historial", label: "Mis Pedidos", icon: ListOrdered, roles: ["administrador", "mesero"] },
    { id: "admin", label: "Administración", icon: Settings, roles: ["administrador", "barista", "mesero"] },
  ].filter(item => item.roles.includes(currentUser.role));

  return (
    <>
      {/* Floating Hamburger Toggle Button (visible when sidebar is closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#2C1810] text-[#FDFBF7] border border-[#C2956E]/20 shadow-lg hover:scale-105 hover:bg-[#C2956E] transition-all duration-300 cursor-pointer"
          title="Abrir Menú"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}

      {/* Sidebar Drawer & Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Overlay for mobile only */}
            <div
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-35 bg-black/40 backdrop-blur-xs md:hidden cursor-pointer"
            />

            {/* Left Sidebar Navigation Menu */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-40 w-80 bg-[#2C1810] text-[#FDFBF7] flex flex-col justify-between p-6 border-r border-[#C2956E]/20"
            >
              <div>
                {/* Header (Logo & Collapse Button) */}
                <div className="flex items-center justify-between border-b border-[#C2956E]/20 pb-5 mb-6">
                  <div 
                    className="cursor-pointer" 
                    onClick={() => { setActiveTab("inicio"); }}
                  >
                    <span className="font-serif text-2xl font-bold tracking-tight text-white block">Café Puglia</span>
                    <span className="text-[9px] uppercase tracking-widest text-[#C2956E] font-semibold block mt-0.5">SPECIALTY COFFEE • MAR DEL PLATA</span>
                  </div>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-transparent text-[#FDFBF7] transition-all hover:bg-white/10 hover:border-white cursor-pointer"
                    title="Esconder Menú"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </div>

                {/* Sidebar Navigation Links */}
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          // Auto close on mobile
                          if (window.innerWidth < 768) {
                            setIsOpen(false);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          isActive 
                            ? "bg-[#C2956E] text-white shadow-md font-black" 
                            : "text-[#FDFBF7]/60 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className={`h-4.5 w-4.5 ${isActive ? "text-white" : "text-[#FDFBF7]/40"}`} />
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Sidebar Bottom Widgets */}
              <div className="space-y-4">
                {/* Active User widget styling matching Conectividad POS */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[10px]">
                  <span className="text-white/40 block font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Usuario Activo
                  </span>
                  <p className="text-[#FDFBF7]/80 font-semibold truncate">{currentUser.name}</p>
                  <p className="text-[#FDFBF7]/40 mt-0.5 uppercase font-bold tracking-wider font-mono">({currentUser.role})</p>
                </div>

                {/* Cart Action (Ver mi bandeja) */}
                {currentUser.role !== "barista" && (
                  <button
                    onClick={() => {
                      onCartClick();
                      // Auto close on mobile
                      if (window.innerWidth < 768) {
                        setIsOpen(false);
                      }
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#C2956E] hover:bg-[#C2956E]/90 text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-md"
                  >
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="h-4.5 w-4.5" />
                      Ver bandeja
                    </span>
                    {cartCount > 0 && (
                      <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white text-[#C2956E] text-[10px] font-black">
                        {cartCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/20 hover:border-white text-xs font-bold text-white transition-all cursor-pointer bg-transparent"
                >
                  <LogOut className="h-4 w-4 rotate-180" />
                  Cerrar Sesión
                </button>

                <div className="text-[8px] text-white/30 text-center font-bold tracking-wider uppercase">
                  Diseño para Café Puglia SL<br />Arg: Mar del Plata (Prov. Bs As)
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
