import React, { useState } from "react";
import { 
  Sparkles, 
  FileText, 
  Utensils, 
  Clock, 
  MapPin, 
  PhoneCall, 
  Instagram, 
  Lock, 
  Coffee, 
  Star, 
  ChefHat, 
  Wine, 
  ArrowRight,
  ShieldCheck,
  Award
} from "lucide-react";
import { MenuItem } from "../types";
import { MenuPDFService } from "../services/MenuPDFService";
import { getTodayExecutiveMenu } from "../data/dailyMenus";
import RestoBarLogo from "./RestoBarLogo";
import LoginScreen from "./LoginScreen";
import { PublicDigitalMarquee } from "./PublicDigitalMarquee";
import { useEffect } from "react";

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

  if (viewMode === "digital_menu") {
    return (
      <div className="relative min-h-screen bg-[#FAF8F5]">
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setViewMode("landing")}
            className="px-5 py-2.5 rounded-2xl bg-white border-2 border-[#D4AF37] text-[#1C120C] text-xs font-black shadow-xl hover:bg-[#FAF8F5] transition-all cursor-pointer flex items-center gap-2 uppercase tracking-wider"
          >
            ← Volver a Portada Publicitaria
          </button>
        </div>
        <PublicDigitalMarquee
          menuItems={menuItems}
          onShowNotification={onShowNotification}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C120C] font-sans selection:bg-[#D4AF37] selection:text-white">
      {/* Top Marketing Banner */}
      <div className="bg-gradient-to-r from-[#D4AF37] via-[#C59B27] to-[#996515] text-white py-2.5 px-4 text-center font-black text-xs uppercase tracking-widest shadow-md flex items-center justify-center gap-2">
        <Sparkles className="h-4 w-4 animate-spin shrink-0" />
        <span>🎭 RESTO BAR DEL TEATRO • MENÚ EJECUTIVO PROMOCIONAL $8.000 • CONSTITUCIÓN 944, RÍO CUARTO</span>
        <Sparkles className="h-4 w-4 animate-spin shrink-0" />
      </div>

      {/* Modern Luminous Header */}
      <nav className="border-b border-[#E2D4C3] bg-white/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4 shadow-xs">
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
              onClick={() => MenuPDFService.generateMenuPDF(menuItems)}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#D4AF37] text-[#1C120C] text-xs font-bold shadow-xs hover:bg-[#FAF8F5] transition-all cursor-pointer"
            >
              <FileText className="h-4 w-4 text-[#B8860B]" /> Carta PDF
            </button>

            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white text-xs font-black shadow-md hover:brightness-110 active:scale-98 transition-all cursor-pointer uppercase tracking-wider"
            >
              <Lock className="h-4 w-4" /> Acceso POS / Personal
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Luminous Gastronomic Marketing */}
      <header className="relative py-20 px-6 overflow-hidden bg-gradient-to-b from-white via-[#FAF8F5] to-[#FAF8F5] border-b border-[#E2D4C3]">
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

          <div className="flex flex-wrap justify-center gap-4 pt-6">
            <button
              onClick={() => setViewMode("digital_menu")}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#C59B27] to-[#996515] text-white font-black text-sm uppercase tracking-wider shadow-xl hover:scale-102 active:scale-98 transition-all cursor-pointer"
            >
              <Utensils className="h-5 w-5" /> Ver Menú Digital & Pedir por WhatsApp
            </button>

            <button
              onClick={() => MenuPDFService.generateMenuPDF(menuItems)}
              className="flex items-center gap-3 px-7 py-4 rounded-2xl bg-white border-2 border-[#D4AF37] text-[#1C120C] font-black text-sm uppercase tracking-wider shadow-md hover:bg-[#FAF8F5] transition-all cursor-pointer"
            >
              <FileText className="h-5 w-5 text-[#B8860B]" /> Descargar Carta PDF Oficial
            </button>
          </div>

          {/* HIGH-IMPACT MARKETING SHOWCASE: MENÚ EJECUTIVO DIARIO ($8.000) */}
          <div className="mt-8 max-w-4xl mx-auto bg-gradient-to-br from-[#1C120C] via-[#2A1B12] to-[#1C120C] text-[#FDFBF7] border-2 border-[#D4AF37] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden text-left gold-glow">
            {/* Top Scarcity & Social Proof Bar */}
            <div className="flex flex-wrap justify-between items-center gap-3 border-b border-[#D4AF37]/30 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FFDF00] bg-[#FFDF00]/10 px-3 py-1 rounded-full border border-[#FFDF00]/30 font-mono">
                  🔥 OFERTA DEL MEDIODÍA • {todayMenu.dayOfWeek.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-bold">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>4 Pasos Incluidos • <strong>${todayMenu.price.toLocaleString("es-AR")} ARS</strong></span>
              </div>
            </div>

            {/* Menu Title & Headline */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-serif text-2xl md:text-3xl font-extrabold text-[#FFDF00] tracking-tight">
                  ⭐ {todayMenu.title}
                </h3>
                <span className="text-xl md:text-2xl font-black font-mono text-[#FFDF00] bg-[#2A1B12] px-4 py-1.5 rounded-2xl border border-[#D4AF37]/50 shadow-md">
                  ${todayMenu.price.toLocaleString("es-AR")}
                </span>
              </div>
              <p className="text-xs text-[#FDFBF7]/70 italic">
                "{todayMenu.subtitle || "Selección fresca elaborada en el día por nuestro Chef."}"
              </p>
            </div>

            {/* 4 Steps Value Proposition Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[#130B07]/80 p-4 rounded-2xl border border-[#D4AF37]/20">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#D4AF37] block">🥖 1. ENTRADA</span>
                <p className="text-xs text-[#FDFBF7] font-semibold leading-snug">{todayMenu.starters.join(" • ")}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#D4AF37] block">🥩 2. PLATO PRINCIPAL</span>
                <p className="text-xs text-[#FDFBF7] font-semibold leading-snug">{todayMenu.mains.join(" • ")}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#D4AF37] block">🥤 3. BEBIDA INCLUIDA</span>
                <p className="text-xs text-[#FDFBF7] font-semibold leading-snug">{todayMenu.drinks.join(" • ")}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#D4AF37] block">🍰 4. POSTRE / CAFÉ</span>
                <p className="text-xs text-[#FDFBF7] font-semibold leading-snug">{todayMenu.desserts.join(" • ")}</p>
              </div>
            </div>

            {/* High Converting Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => {
                  const message = `Hola Resto Bar Del Teatro, quiero hacer un pedido/reserva para el Menú Ejecutivo del Día (${todayMenu.dayOfWeek}) por $${todayMenu.price.toLocaleString("es-AR")}.`;
                  window.open(`https://wa.me/543585042311?text=${encodeURIComponent(message)}`, "_blank");
                  onShowNotification("📱 Abriendo chat de WhatsApp para pedir el Menú Diario...", "success");
                }}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-700 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                💬 Pedir Menú Diario por WhatsApp ($8.000)
              </button>
              <button
                onClick={() => setViewMode("digital_menu")}
                className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 cursor-pointer gold-glow flex items-center justify-center gap-2"
              >
                🍽️ Personalizar Mi Combo
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
          {/* Card 1: Menú Ejecutivo (Dynamic Live Connected) */}
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

              {/* Dynamic live choices from Admin */}
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
                Pedir por WhatsApp 📱
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
                <span className="text-2xl font-black font-mono text-[#B8860B]">$4.200</span>
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

      {/* Compact Info & Location Section */}
      <section id="horarios" className="bg-white border-t border-b border-[#E2D4C3] py-6 px-6 shadow-xs">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-3.5 px-4 bg-[#FAF8F5] rounded-2xl border border-[#E2D4C3]">
            <div className="h-7 w-7 rounded-xl bg-[#FFF8E7] text-[#B8860B] flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <div>
              <strong className="text-xs font-extrabold text-[#1C120C] block">Ubicación Privilegiada</strong>
              <p className="text-[10px] text-[#5C4A3E] leading-tight mt-0.5">
                Constitución 944 (Frente al Teatro Municipal)<br />
                Río Cuarto, Provincia de Córdoba
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 px-4 bg-[#FAF8F5] rounded-2xl border border-[#E2D4C3]">
            <div className="h-7 w-7 rounded-xl bg-[#FFF8E7] text-[#B8860B] flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <div>
              <strong className="text-xs font-extrabold text-[#1C120C] block">Horarios de Atención</strong>
              <p className="text-[10px] text-[#5C4A3E] leading-tight mt-0.5">
                Lunes a Sábados: 07:30 a 01:00 hs<br />
                Domingos: 08:30 a 00:00 hs
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 px-4 bg-[#FAF8F5] rounded-2xl border border-[#E2D4C3]">
            <div className="h-7 w-7 rounded-xl bg-[#FFF8E7] text-[#B8860B] flex items-center justify-center shrink-0 mt-0.5">
              <PhoneCall className="h-3.5 w-3.5" />
            </div>
            <div>
              <strong className="text-xs font-extrabold text-[#1C120C] block">Reservas & Pedidos</strong>
              <p className="text-[10px] text-[#5C4A3E] leading-tight mt-0.5">
                WhatsApp: 358 5042311 / 358 4651847<br />
                Instagram: @restobardelteatro_rio4
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-[#1C120C] text-[#FAF8F5] text-center text-xs space-y-2">
        <p className="font-serif text-sm font-bold text-[#D4AF37]">RESTO BAR DEL TEATRO</p>
        <p className="text-[#A59585]">Constitución 944, Río Cuarto, Córdoba • Todos los derechos reservados.</p>
      </footer>

      {/* Staff Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg my-auto">
            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute -top-3 -right-3 z-50 h-10 w-10 rounded-full bg-[#2A1B12] border-2 border-[#D4AF37] text-[#FFDF00] hover:bg-[#3D281A] flex items-center justify-center text-sm font-black cursor-pointer shadow-2xl gold-glow"
              title="Cerrar Ventana"
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
