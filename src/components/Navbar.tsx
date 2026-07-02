import { ShoppingBag, Menu, X, Coffee, Calendar, Bot, ListOrdered, BookOpen, Settings, Scroll, LogOut } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cartCount: number;
  onCartClick: () => void;
  onLogout: () => void;
  currentUser: { name: string; role: string };
}

export default function Navbar({ activeTab, setActiveTab, cartCount, onCartClick, onLogout, currentUser }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Restrict navigation based on role
  const navItems = [
    { id: "inicio", label: "Inicio", icon: Coffee, roles: ["administrador", "barista", "mesero"] },
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
      {/* Floating Hamburger Toggle Button (when sidebar is closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-espresso text-paper border border-coffee shadow-lg hover:scale-105 hover:bg-caramel transition-all duration-300 cursor-pointer"
          title="Abrir Menú"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}

      {/* Sidebar Drawer & Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-45 bg-[#2C1810]/40 backdrop-blur-xs cursor-pointer"
            />

            {/* Sidebar Container */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-80 bg-paper/95 backdrop-blur-md border-r border-coffee shadow-2xl flex flex-col justify-between p-6"
            >
              <div>
                {/* Header (Logo + Close Button) */}
                <div className="flex items-center justify-between border-b border-coffee/20 pb-5 mb-5">
                  <div 
                    className="flex cursor-pointer items-center space-x-3" 
                    onClick={() => { setActiveTab("inicio"); setIsOpen(false); }}
                  >
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-espresso text-paper shadow-md">
                      <div className="absolute top-1.5 flex justify-center space-x-0.5 w-full animate-steam">
                        <span className="w-0.5 h-1.5 bg-caramel/70 rounded-full"></span>
                        <span className="w-0.5 h-2 bg-caramel/50 rounded-full"></span>
                        <span className="w-0.5 h-1.5 bg-caramel/70 rounded-full"></span>
                      </div>
                      <Coffee className="h-5.5 w-5.5 text-caramel mt-1.5" />
                    </div>
                    <div>
                      <span className="font-serif text-xl font-bold tracking-tight text-espresso block leading-none">Café Puglia</span>
                      <span className="text-[9px] uppercase tracking-widest text-caramel font-black mt-1 block">La Plata</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-coffee bg-white text-espresso transition-all hover:bg-paper cursor-pointer"
                    title="Cerrar Menú"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Active User profile capsule */}
                <div className="flex items-center space-x-3 bg-[#2C1810]/5 p-3 rounded-2xl border border-coffee/10 mb-6">
                  <div className="w-9 h-9 rounded-full bg-caramel/20 flex items-center justify-center text-caramel font-black text-sm">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold block text-espresso truncate">{currentUser.name}</span>
                    <span className="text-[9px] uppercase tracking-wider text-caramel font-black">{currentUser.role}</span>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                </div>

                {/* Vertical Navigation Links */}
                <div className="space-y-1.5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        id={`sidebar-nav-${item.id}`}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsOpen(false);
                        }}
                        className={`relative w-full flex items-center space-x-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                          isActive 
                            ? "text-espresso font-black" 
                            : "text-espresso/70 hover:text-espresso hover:bg-espresso/5"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeTabIndicatorSidebar"
                            className="absolute inset-0 rounded-2xl bg-caramel/20 shadow-xs -z-10"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        <Icon className={`h-4.5 w-4.5 ${isActive ? "text-caramel" : "text-espresso/40"}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions (Cart & Logout) */}
              <div className="border-t border-coffee/20 pt-5 mt-auto space-y-3">
                {/* Cart Action */}
                {currentUser.role !== "barista" && (
                  <button
                    onClick={() => {
                      onCartClick();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-espresso hover:bg-caramel text-paper font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-md cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <ShoppingBag className="h-4.5 w-4.5" />
                      <span>Ver mi bandeja</span>
                    </div>
                    {cartCount > 0 && (
                      <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-caramel text-[10px] font-black text-white ring-2 ring-espresso">
                        {cartCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Logout Action */}
                <button
                  onClick={() => {
                    onLogout();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2.5 px-5 py-3.5 rounded-2xl border border-coffee bg-white text-espresso font-bold text-xs uppercase tracking-wider hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all duration-300 cursor-pointer"
                >
                  <LogOut className="h-4.5 w-4.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
