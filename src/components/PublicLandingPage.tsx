import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  FileText, 
  Utensils, 
  Clock, 
  MapPin, 
  PhoneCall, 
  Lock, 
  Star, 
  ShieldCheck,
  Calendar,
  Menu,
  X,
  ExternalLink
} from "lucide-react";
import { MenuItem } from "../types";
import { MENU_ITEMS } from "../data/menu";
import { MenuPDFService } from "../services/MenuPDFService";
import { getTodayExecutiveMenu } from "../data/dailyMenus";
import RestoBarLogo from "./RestoBarLogo";
import LoginScreen from "./LoginScreen";
import TableReservation from "./TableReservation";
import { PublicDigitalMarquee } from "./PublicDigitalMarquee";

interface PublicLandingPageProps {
  menuItems: MenuItem[];
  onLoginSuccess: (user: { id: string; name: string; email: string; role: string; pin?: string }) => void;
  onShowNotification: (message: string, type: "success" | "info" | "warning") => void;
}

export const PublicLandingPage: React.FC<PublicLandingPageProps> = ({
  menuItems,
  onLoginSuccess,
  onShowNotification
}) => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"landing" | "digital_menu">("landing");
  const [todayMenu, setTodayMenu] = useState(() => getTodayExecutiveMenu());

  useEffect(() => {
    const handleUpdate = () => {
      setTodayMenu(getTodayExecutiveMenu());
    };
    window.addEventListener("daily_menus_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("daily_menus_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Lock scroll and handle escape key when modal is open
  useEffect(() => {
    const isAnyModalOpen = isReservationModalOpen || isLoginModalOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsReservationModalOpen(false);
        setIsLoginModalOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isReservationModalOpen, isLoginModalOpen]);

  const handleDownloadPDF = () => {
    const activeItems = menuItems && menuItems.length > 0 ? menuItems : MENU_ITEMS;
    MenuPDFService.generateMenuPDF(activeItems);
    onShowNotification("📄 Descargando Carta PDF Oficial de Resto Bar Del Teatro...", "info");
  };

  if (viewMode === "digital_menu") {
    return (
      <div className="relative min-h-screen bg-[#FAF8F5]">
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setViewMode("landing")}
            className="px-5 py-2.5 rounded-2xl bg-white border-2 border-[#D4AF37] text-[#1C120C] text-xs font-black shadow-xl hover:bg-[#FAF8F5] transition-all cursor-pointer flex items-center gap-2 uppercase tracking-wider"
            aria-label="Volver a Portada Publicitaria"
          >
            ← Volver a Portada Publicitaria
          </button>
        </div>
        <PublicDigitalMarquee
          menuItems={menuItems.length > 0 ? menuItems : MENU_ITEMS}
          onShowNotification={onShowNotification}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C120C] font-sans selection:bg-[#D4AF37] selection:text-white pb-24 sm:pb-16">
      {/* Top Marketing Banner */}
      <div className="bg-gradient-to-r from-[#D4AF37] via-[#C59B27] to-[#996515] text-white py-2.5 px-4 text-center font-black text-xs uppercase tracking-widest shadow-md flex items-center justify-center gap-2">
        <Sparkles className="h-4 w-4 animate-spin shrink-0" />
        <span>🎭 RESTO BAR DEL TEATRO • MENÚ EJECUTIVO PROMOCIONAL $8.000 • CONSTITUCIÓN 944, RÍO CUARTO</span>
        <Sparkles className="h-4 w-4 animate-spin shrink-0" />
      </div>

      {/* Modern Luminous Header */}
      <nav className="border-b border-[#E2D4C3] bg-white/95 backdrop-blur-md sticky top-0 z-40 px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RestoBarLogo size="md" />
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-black uppercase tracking-widest text-[#4A3B32]">
            <a href="#promos" className="hover:text-[#B8860B] transition-colors">Promociones</a>
            <a href="#experiencia" className="hover:text-[#B8860B] transition-colors">Experiencia</a>
            <a href="#horarios" className="hover:text-[#B8860B] transition-colors">Horarios & Ubicación</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPDF}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#D4AF37] text-[#1C120C] text-xs font-bold shadow-xs hover:bg-[#FAF8F5] transition-all cursor-pointer"
              aria-label="Descargar Carta PDF Oficial"
            >
              <FileText className="h-4 w-4 text-[#B8860B]" /> Carta PDF
            </button>

            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white text-xs font-black shadow-md hover:brightness-110 active:scale-98 transition-all cursor-pointer uppercase tracking-wider"
              aria-label="Acceso a POS y Personal"
            >
              <Lock className="h-4 w-4" /> Acceso POS / Personal
            </button>

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-[#FAF8F5] border border-[#D4AF37] text-[#1C120C] hover:bg-white"
              aria-label="Abrir menú de navegación móvil"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6 text-[#B8860B]" /> : <Menu className="h-6 w-6 text-[#B8860B]" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden pt-4 pb-2 border-t border-[#E2D4C3] mt-3 space-y-3 font-bold text-xs uppercase tracking-wider text-[#4A3B32]">
            <a href="#promos" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 px-2 hover:bg-[#FAF8F5] rounded-lg">Promociones</a>
            <a href="#experiencia" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 px-2 hover:bg-[#FAF8F5] rounded-lg">Experiencia</a>
            <a href="#horarios" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 px-2 hover:bg-[#FAF8F5] rounded-lg">Horarios & Ubicación</a>
            <button 
              onClick={() => { setIsMobileMenuOpen(false); handleDownloadPDF(); }}
              className="w-full text-left py-2 px-2 text-[#B8860B] font-black flex items-center gap-2"
            >
              <FileText className="h-4 w-4" /> Descargar Carta PDF Oficial
            </button>
            <button 
              onClick={() => { setIsMobileMenuOpen(false); setIsLoginModalOpen(true); }}
              className="w-full text-left py-2.5 px-3 bg-[#1C120C] text-[#FFDF00] rounded-xl font-black flex items-center gap-2"
            >
              <Lock className="h-4 w-4 text-[#D4AF37]" /> Acceso POS / Personal
            </button>
          </div>
        )}
      </nav>

      {/* Hero Section - Luminous Gastronomic Marketing */}
      <header className="relative py-16 md:py-20 px-6 overflow-hidden bg-gradient-to-b from-white via-[#FAF8F5] to-[#FAF8F5] border-b border-[#E2D4C3]">
        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFF8E7] border border-[#F3E5C8] text-[#B8860B] text-xs font-black tracking-widest uppercase shadow-xs">
            <Star className="h-4 w-4 fill-[#D4AF37] text-[#D4AF37]" /> Gastronomía de Autor Frente al Teatro Municipal <Star className="h-4 w-4 fill-[#D4AF37] text-[#D4AF37]" />
          </div>

          <h1 className="font-serif text-5xl md:text-7xl font-extrabold text-[#1C120C] tracking-tight leading-tight">
            RESTO BAR <span className="bg-gradient-to-r from-[#D4AF37] via-[#B8860B] to-[#996515] bg-clip-text text-transparent">DEL TEATRO</span>
          </h1>

          <p className="text-base md:text-xl text-[#4A3B32] max-w-3xl mx-auto font-normal leading-relaxed">
            Cafetería de especialidad por las mañanas, Menú Ejecutivo gourmet al mediodía y la mejor cocina de autor por las noches. Una experiencia gastronómica distinguida e inolvidable en Río Cuarto.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <button
              onClick={() => setViewMode("digital_menu")}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#C59B27] to-[#996515] text-white font-black text-sm uppercase tracking-wider shadow-xl hover:scale-102 active:scale-98 transition-all cursor-pointer"
              aria-label="Ver Menú Digital y Pedir por WhatsApp"
            >
              <Utensils className="h-5 w-5" /> Ver Menú Digital & Pedir por WhatsApp
            </button>

            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-3 px-7 py-4 rounded-2xl bg-white border-2 border-[#D4AF37] text-[#1C120C] font-black text-sm uppercase tracking-wider shadow-md hover:bg-[#FAF8F5] transition-all cursor-pointer"
              aria-label="Descargar Carta PDF Oficial"
            >
              <FileText className="h-5 w-5 text-[#B8860B]" /> Descargar Carta PDF Oficial
            </button>
          </div>

          {/* HIGH-IMPACT MARKETING SHOWCASE: MENÚ DEL DÍA ($8.000) */}
          <div className="mt-8 max-w-4xl mx-auto bg-gradient-to-br from-[#1C120C] via-[#2A1B12] to-[#1C120C] text-[#FDFBF7] border-2 border-[#D4AF37] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden text-left gold-glow">
            <div className="flex flex-wrap justify-between items-center gap-3 border-b border-[#D4AF37]/30 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FFDF00] bg-[#FFDF00]/10 px-3 py-1 rounded-full border border-[#FFDF00]/30 font-mono">
                  🔥 OFERTA DEL MEDIODÍA • {todayMenu.dayOfWeek.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-bold">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Vianda del Día • <strong>$8.000 ARS</strong></span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-serif text-2xl md:text-3xl font-extrabold text-[#FFDF00] tracking-tight">
                  ⭐ MENÚ DEL DÍA
                </h3>
                <span className="text-2xl md:text-3xl font-black font-mono text-[#FFDF00] bg-[#2A1B12] px-5 py-2 rounded-2xl border-2 border-[#D4AF37] shadow-xl gold-glow">
                  $8.000
                </span>
              </div>
              <p className="text-xs text-[#FDFBF7]/80 italic font-medium">
                Plato fresco y abundante elaborado en el día por nuestro Chef. Listo para consumir en el local o llevar en vianda.
              </p>
            </div>

            <div className="bg-[#130B07]/90 p-5 rounded-2xl border border-[#D4AF37]/30 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] block">🍱 OPICIONES DE VIANDA / PLATO PRINCIPAL DEL DÍA ($8.000)</span>
              <p className="text-sm text-[#FDFBF7] font-serif font-bold leading-relaxed">
                {todayMenu.mains.join(" • ")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => {
                  const message = `Hola Resto Bar Del Teatro, quiero encargar el Menú del Día (${todayMenu.dayOfWeek}) por $8.000.`;
                  window.open(`https://wa.me/543585042311?text=${encodeURIComponent(message)}`, "_blank");
                  onShowNotification("📱 Abriendo chat de WhatsApp para pedir el Menú del Día ($8.000)...", "success");
                }}
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-700 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                💬 Pedir Menú del Día por WhatsApp ($8.000)
              </button>
              <button
                onClick={() => setViewMode("digital_menu")}
                className="py-4 px-6 rounded-2xl bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 cursor-pointer gold-glow flex items-center justify-center gap-2"
              >
                🍽️ Ver Menú Digital & Pedir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Featured Promo Cards Section */}
      <section id="promos" className="max-w-7xl mx-auto py-12 px-6 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-[#B8860B]">Propuestas Gastronómicas</span>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#1C120C]">Especialidades de la Casa</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Menú Ejecutivo */}
          <div className="bg-white border-2 border-[#D4AF37] rounded-3xl p-6 space-y-5 shadow-xl flex flex-col justify-between hover:shadow-2xl transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-l from-[#D4AF37] to-[#B8860B] text-white text-[9px] font-black px-4 py-1 rounded-bl-2xl uppercase tracking-widest">
              Conectado en Vivo
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <span className="px-3 py-1 rounded-full bg-[#FFF8E7] border border-[#F3E5C8] text-[#B8860B] text-[10px] font-black uppercase tracking-wider">
                  Menú del {todayMenu.dayOfWeek}
                </span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#1C120C]">⭐ {todayMenu.title}</h3>
              <p className="text-xs text-[#5C4A3E] leading-relaxed italic">
                "{todayMenu.description}"
              </p>

              <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#E2D4C3] space-y-1.5 text-[11px]">
                <p className="text-[#1C120C] font-semibold">
                  <strong className="text-[#B8860B]">🥟 Entradas:</strong> {todayMenu.starters.join(" • ")}
                </p>
                <p className="text-[#1C120C] font-semibold">
                  <strong className="text-[#B8860B]">🥩 Principales:</strong> {todayMenu.mains.join(" • ")}
                </p>
                <p className="text-[#1C120C] font-semibold">
                  <strong className="text-[#B8860B]">🍷 Bebidas:</strong> {todayMenu.drinks.join(" • ")}
                </p>
                <p className="text-[#1C120C] font-semibold">
                  <strong className="text-[#B8860B]">🍰 Postres:</strong> {todayMenu.desserts.join(" • ")}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2D4C3] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#8C7A6B] block font-bold">Combo Completo</span>
                <span className="text-2xl font-black font-mono text-[#B8860B]">${todayMenu.price.toLocaleString("es-AR")}</span>
              </div>
              <button
                onClick={() => setViewMode("digital_menu")}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white text-xs font-black uppercase tracking-wider shadow-md hover:brightness-110 transition-all cursor-pointer"
              >
                Ver Menú y Pedir 📱
              </button>
            </div>
          </div>

          {/* Card 2: Cafetería Bariloche */}
          <div className="bg-white border-2 border-[#E2D4C3] rounded-3xl p-6 space-y-5 shadow-lg flex flex-col justify-between hover:border-[#D4AF37] hover:shadow-2xl transition-all">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="px-3 py-1 rounded-full bg-[#FFF8E7] border border-[#F3E5C8] text-[#B8860B] text-[10px] font-black uppercase tracking-wider">
                  Desayunos & Meriendas
                </span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#1C120C]">☕ Submarino Bariloche & Dulces</h3>
              <p className="text-xs text-[#5C4A3E] leading-relaxed">
                Leche entera espumada en jarro térmico con barra de chocolate amargo Bariloche 70% y medialunas recién horneadas.
              </p>
            </div>
            <div className="pt-4 border-t border-[#E2D4C3] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#8C7A6B] block font-bold">Especialidad</span>
                <span className="text-2xl font-black font-mono text-[#B8860B]">$4.500</span>
              </div>
              <button
                onClick={() => setViewMode("digital_menu")}
                className="px-5 py-2.5 rounded-xl bg-white border border-[#D4AF37] text-[#1C120C] text-xs font-black uppercase tracking-wider hover:bg-[#FAF8F5] transition-all cursor-pointer"
              >
                Ver Opciones ☕
              </button>
            </div>
          </div>

          {/* Card 3: Noches de Teatro */}
          <div className="bg-white border-2 border-[#E2D4C3] rounded-3xl p-6 space-y-5 shadow-lg flex flex-col justify-between hover:border-[#D4AF37] hover:shadow-2xl transition-all">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="px-3 py-1 rounded-full bg-[#FFF8E7] border border-[#F3E5C8] text-[#B8860B] text-[10px] font-black uppercase tracking-wider">
                  Almuerzos & Cenas
                </span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#1C120C]">🥩 Cocina de Autor & Bodega</h3>
              <p className="text-xs text-[#5C4A3E] leading-relaxed">
                Cortes de carne a las brasas, pastas elaboradas en el día, pescados y una completa carta de tragos y vinos.
              </p>
            </div>
            <div className="pt-4 border-t border-[#E2D4C3] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#8C7A6B] block font-bold">Carta Nocturna</span>
                <span className="text-xs font-bold text-[#B8860B] font-mono">Consulte Carta</span>
              </div>
              <button
                onClick={() => setViewMode("digital_menu")}
                className="px-5 py-2.5 rounded-xl bg-white border border-[#D4AF37] text-[#1C120C] text-xs font-black uppercase tracking-wider hover:bg-[#FAF8F5] transition-all cursor-pointer"
              >
                Ver Carta 🍽️
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Experiencia Section (Target for #experiencia anchor) */}
      <section id="experiencia" className="max-w-7xl mx-auto py-16 px-6 border-t border-[#E2D4C3]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-xs font-black uppercase tracking-widest text-[#B8860B] block">Experiencia Frente al Teatro</span>
            <h2 className="font-serif text-3xl md:text-5xl font-extrabold text-[#1C120C] leading-tight">
              Una Tradición Gastronómica en el Corazón de Río Cuarto
            </h2>
            <p className="text-sm text-[#5C4A3E] leading-relaxed">
              Ubicado estratégicamente frente al emblemático Teatro Municipal de Río Cuarto (Constitución 944), Resto Bar Del Teatro combina el encanto de la cafetería tradicional con la excelencia de la cocina contemporánea.
            </p>
            <div className="grid grid-cols-2 gap-4 text-xs font-bold text-[#1C120C]">
              <div className="p-4 bg-white rounded-2xl border border-[#E2D4C3]">
                <strong className="text-[#B8860B] block text-base font-serif font-black mb-1">☕ Especialidad</strong>
                Grano seleccionado y tostado artesanal para espresso perfecto.
              </div>
              <div className="p-4 bg-white rounded-2xl border border-[#E2D4C3]">
                <strong className="text-[#B8860B] block text-base font-serif font-black mb-1">🎭 Ubicación</strong>
                Frente al Teatro Municipal de Río Cuarto.
              </div>
            </div>
          </div>

          <div className="bg-[#1C120C] border-2 border-[#D4AF37] rounded-3xl p-8 text-[#FDFBF7] space-y-6 shadow-2xl gold-glow">
            <h3 className="font-serif text-2xl font-bold text-[#FFDF00]">📍 Cómo Llegar & Contacto Directo</h3>
            <p className="text-xs text-[#FDFBF7]/80 leading-relaxed">
              Visitanos en Constitución 944, Río Cuarto (Córdoba). Contamos con ambiente climatizado, salón principal, rincón de lectura y atención personalizada.
            </p>
            <div className="space-y-3 pt-2">
              <a
                href="https://www.google.com/maps/search/?api=1&query=Constituci%C3%B3n+944%2C+R%C3%ADo+Cuarto%2C+C%C3%B3rdoba"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer gold-glow"
              >
                <MapPin className="h-4 w-4" /> Abrir en Google Maps (Cómo Llegar) <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://instagram.com/restobardelteatro_rio4"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 bg-[#2A1B12] hover:bg-[#3D281A] border border-[#D4AF37]/40 text-[#FFDF00] font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                📸 Instagram Oficial @restobardelteatro_rio4 <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Compact Info & Location Section */}
      <section id="horarios" className="bg-white border-t border-b border-[#E2D4C3] py-8 px-6 shadow-xs">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E2D4C3]">
            <div className="h-8 w-8 rounded-xl bg-[#FFF8E7] text-[#B8860B] flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <strong className="text-xs font-extrabold text-[#1C120C] block">Ubicación Privilegiada</strong>
              <p className="text-xs text-[#5C4A3E] leading-tight mt-1">
                Constitución 944 (Frente al Teatro Municipal)<br />
                Río Cuarto, Provincia de Córdoba
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E2D4C3]">
            <div className="h-8 w-8 rounded-xl bg-[#FFF8E7] text-[#B8860B] flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <strong className="text-xs font-extrabold text-[#1C120C] block">Horarios de Atención</strong>
              <p className="text-xs text-[#5C4A3E] leading-tight mt-1">
                Lunes a Sábados: 07:30 a 01:00 hs<br />
                Domingos: 08:30 a 00:00 hs
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E2D4C3]">
            <div className="h-8 w-8 rounded-xl bg-[#FFF8E7] text-[#B8860B] flex items-center justify-center shrink-0 mt-0.5">
              <PhoneCall className="h-4 w-4" />
            </div>
            <div>
              <strong className="text-xs font-extrabold text-[#1C120C] block">Reservas & Pedidos</strong>
              <p className="text-xs text-[#5C4A3E] leading-tight mt-1">
                WhatsApp: 358 5042311 / 358 4651847<br />
                Instagram: @restobardelteatro_rio4
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-[#1C120C] text-[#FAF8F5] text-center text-xs space-y-3 border-t border-[#D4AF37]/30">
        <p className="font-serif text-base font-bold text-[#D4AF37]">RESTO BAR DEL TEATRO</p>
        <p className="text-[#A59585] text-[11px]">Constitución 944, frente al Teatro Municipal • Río Cuarto, Córdoba.</p>
        <div className="pt-2">
          <button 
            onClick={() => setIsLoginModalOpen(true)}
            className="text-[10px] text-[#D4AF37]/60 hover:text-[#D4AF37] uppercase font-mono font-bold transition-colors cursor-pointer border-b border-dashed border-[#D4AF37]/30 pb-0.5"
          >
            🔒 Acceso Exclusivo para Personal / POS
          </button>
        </div>
      </footer>

      {/* Floating Table Reservation Button */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
        <button
          onClick={() => setIsReservationModalOpen(true)}
          className="flex items-center gap-2.5 px-5 py-3.5 sm:px-6 sm:py-4 rounded-full bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] font-black text-xs uppercase tracking-wider shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white gold-glow"
          aria-label="Reservar Mesa Frente al Teatro"
        >
          <Calendar className="h-5 w-5" />
          <span>🎟️ Reservar Mesa Frente al Teatro</span>
        </button>
      </div>

      {/* Public Table Reservation Accessible Modal */}
      {isReservationModalOpen && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-reservation-title"
        >
          <div className="relative w-full max-w-4xl my-auto bg-[#1A110B] border-2 border-[#D4AF37] rounded-3xl p-6 shadow-2xl gold-glow">
            <button
              onClick={() => setIsReservationModalOpen(false)}
              className="absolute -top-3 -right-3 z-50 h-10 w-10 rounded-full bg-[#2A1B12] border-2 border-[#D4AF37] text-[#FFDF00] hover:bg-[#3D281A] flex items-center justify-center text-sm font-black cursor-pointer shadow-2xl gold-glow"
              aria-label="Cerrar ventana de reserva"
            >
              ✕
            </button>
            <TableReservation
              bookings={[]}
              onConfirmReservation={(res) => {
                setIsReservationModalOpen(false);
                onShowNotification(`🎟️ ¡Reserva confirmada para ${res.customerName}! Te esperamos el ${res.date} (${res.timeSlot}).`, "success");
              }}
            />
          </div>
        </div>
      )}

      {/* Staff Login Accessible Modal */}
      {isLoginModalOpen && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-login-title"
        >
          <div className="relative w-full max-w-lg my-auto">
            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute -top-3 -right-3 z-50 h-10 w-10 rounded-full bg-[#2A1B12] border-2 border-[#D4AF37] text-[#FFDF00] hover:bg-[#3D281A] flex items-center justify-center text-sm font-black cursor-pointer shadow-2xl gold-glow"
              aria-label="Cerrar ventana de login"
            >
              ✕
            </button>
            <LoginScreen
              onLoginSuccess={(user) => {
                setIsLoginModalOpen(false);
                onLoginSuccess(user);
              }}
              onShowNotification={onShowNotification}
            />
          </div>
        </div>
      )}
    </div>
  );
};
