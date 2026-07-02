import { ShoppingBag, Menu, X, Coffee, Calendar, Bot, ListOrdered, BookOpen, Settings, Scroll } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cartCount: number;
  onCartClick: () => void;
}

export default function Navbar({ activeTab, setActiveTab, cartCount, onCartClick }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: "inicio", label: "Inicio", icon: Coffee },
    { id: "menu", label: "Menú", icon: Coffee },
    { id: "carta-digital", label: "Carta Digital", icon: BookOpen },
    { id: "reservas", label: "Reservas", icon: Calendar },
    { id: "barista-ia", label: "Barista IA", icon: Bot },
    { id: "manual", label: "Manual Operativo", icon: Scroll },
    { id: "historial", label: "Mis Pedidos", icon: ListOrdered },
    { id: "admin", label: "Administración", icon: Settings },
  ];

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-coffee bg-paper/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo Brand */}
          <div 
            className="flex cursor-pointer items-center space-x-3" 
            onClick={() => setActiveTab("inicio")}
          >
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-espresso text-paper shadow-md overflow-visible">
              <div className="absolute top-1.5 flex justify-center space-x-0.5 w-full animate-steam">
                <span className="w-0.5 h-1.5 bg-caramel/70 rounded-full"></span>
                <span className="w-0.5 h-2 bg-caramel/50 rounded-full"></span>
                <span className="w-0.5 h-1.5 bg-caramel/70 rounded-full"></span>
              </div>
              <Coffee className="h-5.5 w-5.5 text-caramel mt-1.5" />
            </div>
            <div>
              <span className="font-serif text-2xl font-bold tracking-tight text-espresso">Café Puglia</span>
              <p className="text-[10px] uppercase tracking-widest text-caramel font-semibold leading-none">Especialidad • La Plata</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center space-x-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                    isActive 
                      ? "text-espresso font-semibold" 
                      : "text-espresso/70 hover:text-espresso hover:bg-espresso/5"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 rounded-full bg-caramel/20 shadow-xs -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={`h-4 w-4 ${isActive ? "text-caramel" : "text-espresso/40"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Cart & Mobile Hamburger */}
          <div className="flex items-center space-x-3">
            {/* Shopping Cart Trigger Button */}
            <button
              id="cart-trigger-btn"
              onClick={onCartClick}
              className="relative flex h-11 w-11 items-center justify-center rounded-full bg-espresso text-paper transition-all hover:bg-caramel hover:scale-105 shadow-md"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-caramel text-[10px] font-bold text-white ring-2 ring-paper"
                >
                  {cartCount}
                </motion.span>
              )}
            </button>

            {/* Mobile Hamburger Menu */}
            <button
              id="mobile-nav-toggle"
              onClick={() => setIsOpen(!isOpen)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-coffee bg-white text-espresso transition-all hover:bg-paper md:hidden"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden border-b border-coffee bg-paper px-4 py-4 space-y-2 shadow-inner"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-btn-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                  isActive 
                    ? "bg-espresso text-paper shadow-md" 
                    : "text-espresso/70 hover:bg-espresso/5"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-caramel" : "text-espresso/40"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </motion.div>
      )}
    </nav>
  );
}
