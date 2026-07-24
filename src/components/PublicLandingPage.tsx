import React, { useState } from "react";
import { motion } from "framer-motion";
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
  ArrowRight,
  Wine,
  ShoppingBag,
  Send
} from "lucide-react";
import { MenuItem } from "../types";
import { MenuPDFService } from "../services/MenuPDFService";
import RestoBarLogo from "./RestoBarLogo";
import LoginScreen from "./LoginScreen";
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
  const [viewMode, setViewMode] = useState<"landing" | "digital_menu">("landing");

  if (viewMode === "digital_menu") {
    return (
      <div className="relative min-h-screen bg-[#0F0A07]">
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setViewMode("landing")}
            className="px-4 py-2 rounded-xl bg-[#2A1B12] border border-[#D4AF37]/40 text-[#FFDF00] text-xs font-bold shadow-lg hover:bg-[#3D281A] transition-all cursor-pointer flex items-center gap-2 gold-glow"
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
    <div className="min-h-screen bg-[#0F0A07] text-[#FDFBF7] font-sans selection:bg-[#D4AF37] selection:text-[#1C120C]">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#FFDF00] text-[#1C120C] py-2 px-4 text-center font-bold text-xs uppercase tracking-widest overflow-hidden shadow-md flex items-center justify-center gap-2">
        <Sparkles className="h-4 w-4 animate-spin" />
        <span>🎭 RESTO BAR DEL TEATRO • MENÚ EJECUTIVO DEL DÍA $8.000 • CONSTITUCIÓN 944, RÍO CUARTO</span>
        <Sparkles className="h-4 w-4 animate-spin" />
      </div>

      {/* Main Navbar */}
      <nav className="border-b border-[#D4AF37]/25 bg-[#1A110B]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4 gold-glow">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RestoBarLogo size="md" />
          </div>

          <div className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
            <a href="#promos" className="hover:text-white transition-colors">Promociones</a>
            <a href="#horarios" className="hover:text-white transition-colors">Horarios</a>
            <a href="#ubicacion" className="hover:text-white transition-colors">Ubicación</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => MenuPDFService.generateMenuPDF(menuItems)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2A1B12] hover:bg-[#3D281A] border border-[#D4AF37]/40 text-[#FFDF00] text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <FileText className="h-4 w-4" /> Carta PDF
            </button>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] text-xs font-black shadow-lg hover:brightness-110 transition-all cursor-pointer gold-glow uppercase tracking-wider"
            >
              <Lock className="h-4 w-4" /> Acceso POS / Personal
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative py-20 px-6 overflow-hidden bg-gradient-to-b from-[#1A110B] via-[#0F0A07] to-[#0F0A07] border-b border-[#D4AF37]/20">
        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2A1B12] border border-[#D4AF37]/40 text-[#FFDF00] text-xs font-bold tracking-widest uppercase">
            <Star className="h-3.5 w-3.5 fill-[#FFDF00]" /> Gastronomía de Autor Frente al Teatro Municipal <Star className="h-3.5 w-3.5 fill-[#FFDF00]" />
          </div>

          <h1 className="font-serif text-5xl md:text-7xl font-extrabold text-[#FDFBF7] tracking-tight leading-tight">
            RESTO BAR <span className="text-[#FFDF00] drop-shadow-md">DEL TEATRO</span>
          </h1>

          <p className="text-base md:text-lg text-[#FDFBF7]/80 max-w-2xl mx-auto font-light leading-relaxed">
            Cafetería de especialidad por las mañanas, Menú Ejecutivo gourmet al mediodía y la mejor cocina de autor por las noches. Una experiencia única en Río Cuarto.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <button
              onClick={() => setViewMode("digital_menu")}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] font-black text-sm uppercase tracking-wider shadow-2xl hover:scale-105 transition-all cursor-pointer gold-glow"
            >
              <Utensils className="h-5 w-5" /> Ver Menú Digital & Pedir por WhatsApp
            </button>

            <button
              onClick={() => MenuPDFService.generateMenuPDF(menuItems)}
              className="flex items-center gap-3 px-7 py-4 rounded-2xl bg-[#2A1B12] hover:bg-[#3D281A] border border-[#D4AF37]/50 text-[#FFDF00] font-extrabold text-sm uppercase tracking-wider shadow-xl transition-all cursor-pointer"
            >
              <FileText className="h-5 w-5" /> Descargar Carta PDF Oficial
            </button>
          </div>
        </div>
      </header>

      {/* Featured Promo Cards Section */}
      <section id="promos" className="max-w-7xl mx-auto py-16 px-6 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">Propuestas Destacadas</span>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#FDFBF7]">Nuestras Especialidades del Día</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Menú Ejecutivo */}
          <div className="bg-[#1A110B] border border-[#D4AF37]/30 rounded-3xl p-6 space-y-4 shadow-xl gold-glow flex flex-col justify-between hover:border-[#D4AF37] transition-all">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-[#2A1B12] border border-[#D4AF37]/40 flex items-center justify-center text-[#FFDF00]">
                <ChefHat className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black uppercase text-[#D4AF37] tracking-widest">Lunes a Viernes (12 a 15hs)</span>
              <h3 className="font-serif text-2xl font-bold text-[#FFDF00]">⭐ Menú Ejecutivo Promocional</h3>
              <p className="text-xs text-[#FDFBF7]/70 leading-relaxed">
                Incluye Entrada de temporada, Plato Principal a elección (Carnes, Pastas o Milanesas), Bebida y Postre casero.
              </p>
            </div>
            <div className="pt-4 border-t border-[#D4AF37]/20 flex items-center justify-between">
              <span className="text-2xl font-black font-mono text-[#FFDF00]">$8.000</span>
              <button
                onClick={() => setViewMode("digital_menu")}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Pedir Ahora
              </button>
            </div>
          </div>

          {/* Card 2: Cafetería Bariloche */}
          <div className="bg-[#1A110B] border border-[#D4AF37]/30 rounded-3xl p-6 space-y-4 shadow-xl gold-glow flex flex-col justify-between hover:border-[#D4AF37] transition-all">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-[#2A1B12] border border-[#D4AF37]/40 flex items-center justify-center text-[#FFDF00]">
                <Coffee className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black uppercase text-[#D4AF37] tracking-widest">Desayunos & Meriendas</span>
              <h3 className="font-serif text-2xl font-bold text-[#FDFBF7]">☕ Submarino Bariloche & Repostería</h3>
              <p className="text-xs text-[#FDFBF7]/70 leading-relaxed">
                Leche entera espumada en jarro térmico con barra de chocolate amargo Bariloche 70% y medialunas artesanales.
              </p>
            </div>
            <div className="pt-4 border-t border-[#D4AF37]/20 flex items-center justify-between">
              <span className="text-2xl font-black font-mono text-[#FFDF00]">$4.200</span>
              <button
                onClick={() => setViewMode("digital_menu")}
                className="px-4 py-2 rounded-xl bg-[#2A1B12] border border-[#D4AF37]/40 text-[#FFDF00] text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Ver Opciones
              </button>
            </div>
          </div>

          {/* Card 3: Noches de Teatro */}
          <div className="bg-[#1A110B] border border-[#D4AF37]/30 rounded-3xl p-6 space-y-4 shadow-xl gold-glow flex flex-col justify-between hover:border-[#D4AF37] transition-all">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-[#2A1B12] border border-[#D4AF37]/40 flex items-center justify-center text-[#FFDF00]">
                <Wine className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black uppercase text-[#D4AF37] tracking-widest">Cenas & Cocktails</span>
              <h3 className="font-serif text-2xl font-bold text-[#FDFBF7]">🥩 Parrilla & Vinos Seleccionados</h3>
              <p className="text-xs text-[#FDFBF7]/70 leading-relaxed">
                Cortes de carne madurados, pastas hechas a mano y una selecta carta de vinos mendocinos y cordobeses.
              </p>
            </div>
            <div className="pt-4 border-t border-[#D4AF37]/20 flex items-center justify-between">
              <span className="text-xs font-bold text-[#D4AF37] font-mono">Consulte Carta</span>
              <button
                onClick={() => setViewMode("digital_menu")}
                className="px-4 py-2 rounded-xl bg-[#2A1B12] border border-[#D4AF37]/40 text-[#FFDF00] text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Ver Carta
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Info & Location Bar */}
      <section id="ubicacion" className="bg-[#1A110B] border-t border-b border-[#D4AF37]/30 py-12 px-6 gold-glow">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="space-y-2">
            <MapPin className="h-6 w-6 text-[#FFDF00] mx-auto md:mx-0" />
            <strong className="text-base font-bold text-[#FDFBF7] block">Ubicación Estratégica</strong>
            <p className="text-xs text-[#FDFBF7]/70">Constitución 944 (Frente al Teatro Municipal)<br />Río Cuarto, Córdoba</p>
          </div>

          <div className="space-y-2" id="horarios">
            <Clock className="h-6 w-6 text-[#FFDF00] mx-auto md:mx-0" />
            <strong className="text-base font-bold text-[#FDFBF7] block">Horarios de Atención</strong>
            <p className="text-xs text-[#FDFBF7]/70">
              Lunes a Sábados: 07:30 a 01:00 hs<br />
              Domingos: 08:30 a 00:00 hs
            </p>
          </div>

          <div className="space-y-2">
            <PhoneCall className="h-6 w-6 text-[#FFDF00] mx-auto md:mx-0" />
            <strong className="text-base font-bold text-[#FDFBF7] block">Reservas & Contacto</strong>
            <p className="text-xs text-[#FDFBF7]/70">
              WhatsApp: 358 5042311 / 358 4651847<br />
              Instagram: @restobardelteatro_rio4
            </p>
          </div>
        </div>
      </section>

      {/* Staff Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md">
            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute -top-4 -right-4 z-50 h-9 w-9 rounded-full bg-[#2A1B12] border border-[#D4AF37] text-[#FFDF00] hover:bg-[#3D281A] flex items-center justify-center text-xs font-black cursor-pointer shadow-lg"
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
