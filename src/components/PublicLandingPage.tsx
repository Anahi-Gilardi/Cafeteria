import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Coffee,
  ExternalLink,
  FileText,
  Lock,
  MapPin,
  Menu,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Star,
  Utensils,
  X
} from "lucide-react";
import { DailyExecutiveMenu, MenuItem } from "../types";
import RestoBarLogo from "./RestoBarLogo";
import LoginScreen from "./LoginScreen";
import TableReservation from "./TableReservation";
import { PublicDigitalMarquee } from "./PublicDigitalMarquee";
import { ReservationService } from "../services/ReservationService";
import { supabase } from "../lib/supabase";
import type { UserRoleProfile } from "../services/AuthService";

interface PublicLandingPageProps {
  menuItems: MenuItem[];
  isMenuLoading: boolean;
  onLoginSuccess: (user: UserRoleProfile) => void;
  onShowNotification: (message: string, type: "success" | "info" | "warning") => void;
}

const formatPrice = (value: number) => `$${value.toLocaleString("es-AR")}`;

const CatalogImage: React.FC<{
  src?: string;
  alt: string;
  className: string;
  loading?: "eager" | "lazy";
}> = ({ src, alt, className, loading = "lazy" }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className} flex items-center justify-center bg-gradient-to-br from-[#EBDAC5] via-[#D1AD95] to-[#5C1D27]`}>
        <div className="rounded-2xl border border-white/25 bg-[#2D0E13]/80 px-4 py-3 text-center text-[#FAF2E6] backdrop-blur-sm">
          <Coffee className="mx-auto h-5 w-5 text-[#EBDAC5]" />
          <span className="mt-2 block text-[9px] font-black uppercase tracking-[0.16em]">Castaño</span>
        </div>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const PublicLandingPage: React.FC<PublicLandingPageProps> = ({
  menuItems,
  isMenuLoading,
  onLoginSuccess,
  onShowNotification
}) => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"landing" | "digital_menu">("landing");
  const [todayMenu, setTodayMenu] = useState<DailyExecutiveMenu | null>(null);

  const publicItems = useMemo(
    () =>
      [...menuItems]
        .filter((item) => item.price > 0 && (item.stock === undefined || item.stock > 0))
        .sort((a, b) => {
          const offerDifference = Number(Boolean(b.isOffer)) - Number(Boolean(a.isOffer));
          if (offerDifference !== 0) return offerDifference;
          const executiveDifference = Number(b.category === "executive") - Number(a.category === "executive");
          if (executiveDifference !== 0) return executiveDifference;
          return a.name.localeCompare(b.name, "es");
        }),
    [menuItems]
  );
  const heroItem = publicItems[0];
  const supportingVisuals = publicItems.slice(1, 3);
  const featuredPublicItems = publicItems.slice(0, todayMenu ? 2 : 3);

  useEffect(() => {
    const loadTodayMenu = async () => {
      const days: DailyExecutiveMenu["dayOfWeek"][] = [
        "Domingo",
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado"
      ];
      const dayOfWeek = days[new Date().getDay()];
      const { data, error } = await supabase
        .from("daily_menu")
        .select("*")
        .eq("day_of_week", dayOfWeek)
        .eq("active", true)
        .maybeSingle();

      if (error || !data) {
        try {
          const saved = localStorage.getItem("puglia_weekly_menus");
          if (saved) {
            const list: DailyExecutiveMenu[] = JSON.parse(saved);
            const found = list.find(m => m.dayOfWeek === dayOfWeek && m.active);
            if (found) {
              setTodayMenu(found);
              return;
            }
          }
        } catch (e) {}
        setTodayMenu(null);
        return;
      }
      setTodayMenu({
        dayOfWeek: data.day_of_week,
        title: data.title,
        description: data.description || "",
        price: Number(data.price),
        image: data.image || undefined,
        starters: data.starters || [],
        mains: data.mains || [],
        drinks: data.drinks || [],
        desserts: data.desserts || [],
        active: data.active
      });
    };

    const handleUpdate = () => void loadTodayMenu();
    void loadTodayMenu();
    window.addEventListener("daily_menus_updated", handleUpdate);
    return () => window.removeEventListener("daily_menus_updated", handleUpdate);
  }, []);

  useEffect(() => {
    const hasOpenModal = isReservationModalOpen || isLoginModalOpen;
    document.body.style.overflow = hasOpenModal ? "hidden" : "";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsReservationModalOpen(false);
      setIsLoginModalOpen(false);
      setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isReservationModalOpen, isLoginModalOpen]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [viewMode]);

  const handleDownloadPDF = async () => {
    try {
      onShowNotification("📄 Generando Carta PDF con Fotos y Código QR...", "info");
      const { MenuPDFService } = await import("../services/MenuPDFService");
      await MenuPDFService.generateMenuPDF(menuItems);
      onShowNotification("✅ Carta oficial descargada correctamente.", "success");
    } catch (error) {
      console.error("Error generating menu PDF:", error);
      onShowNotification("⚠️ No hay una carta sincronizada disponible para descargar.", "warning");
    }
  };

  if (viewMode === "digital_menu") {
    return (
      <div className="relative min-h-screen bg-[#F4E8D7]">
        <div className="fixed left-4 top-4 z-50 sm:left-6 sm:top-6">
          <button
            type="button"
            onClick={() => setViewMode("landing")}
            className="flex items-center gap-2 rounded-full border border-[#5C1D27]/25 bg-[#FAF2E6]/95 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#5C1D27] shadow-xl backdrop-blur-md transition-colors hover:bg-white"
            aria-label="Volver a la portada"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Volver
          </button>
        </div>
        <PublicDigitalMarquee menuItems={menuItems} onShowNotification={onShowNotification} />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F4E8D7] pb-20 font-sans text-[#2D0E13] selection:bg-[#5C1D27] selection:text-white sm:pb-0">
      <div className="border-b border-white/10 bg-[#4A151D] px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#FAF2E6] sm:text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#EBDAC5]" />
          <span>
            {todayMenu
              ? `${todayMenu.title} · ${formatPrice(todayMenu.price)} · disponible hoy`
              : "Carta digital y reservas · Constitución 944 · Río Cuarto"}
          </span>
        </div>
      </div>

      <nav className="sticky top-0 z-40 border-b border-[#CFB5A0]/80 bg-[#FAF2E6]/95 px-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4">
          <a href="#inicio" className="rounded-xl" aria-label="Ir al inicio">
            <RestoBarLogo size="lg" />
          </a>

          <div className="hidden items-center gap-7 text-[10px] font-black uppercase tracking-[0.14em] text-[#5E393F] lg:flex">
            <a href="#carta" className="transition-colors hover:text-[#5C1D27]">La carta</a>
            <a href="#experiencia" className="transition-colors hover:text-[#5C1D27]">La experiencia</a>
            <a href="#visitanos" className="transition-colors hover:text-[#5C1D27]">Visitanos</a>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 rounded-full border border-[#5C1D27]/25 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-[#5C1D27] transition-colors hover:bg-[#EBDAC5]/50"
            >
              <FileText className="h-4 w-4" />
              Carta PDF
            </button>
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              aria-label="Acceso a POS y Personal"
              className="flex items-center gap-2 rounded-full bg-[#5C1D27] px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#4A151D]"
            >
              <Lock className="h-4 w-4" />
              Personal
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="rounded-xl border border-[#CFB5A0] bg-white p-2.5 text-[#5C1D27] sm:hidden"
            aria-label="Abrir menú de navegación móvil"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="mx-auto max-w-7xl space-y-1 border-t border-[#CFB5A0] py-3 text-xs font-bold text-[#2D0E13] sm:hidden">
            {[
              ["#carta", "La carta"],
              ["#experiencia", "La experiencia"],
              ["#visitanos", "Visitanos"]
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-xl px-3 py-2.5 hover:bg-[#EBDAC5]/40"
              >
                {label}
              </a>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  void handleDownloadPDF();
                }}
                className="rounded-xl border border-[#CFB5A0] bg-white px-3 py-2.5 text-[#5C1D27]"
              >
                Carta PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsLoginModalOpen(true);
                }}
                className="rounded-xl bg-[#5C1D27] px-3 py-2.5 text-white"
              >
                Acceso personal
              </button>
            </div>
          </div>
        )}
      </nav>

      <main>
        <header id="inicio" className="relative isolate border-b border-[#CFB5A0] bg-[#FAF2E6]">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(231,200,207,0.55),transparent_34%),radial-gradient(circle_at_92%_82%,rgba(209,173,149,0.35),transparent_30%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-6 sm:py-18 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 lg:py-20">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#5C1D27]/15 bg-[#EBDAC5]/55 px-3.5 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#5C1D27] sm:text-[10px]">
                <Star className="h-3.5 w-3.5 fill-[#5C1D27]" />
                Gastronomía frente al Teatro Municipal
              </div>

              <h1 className="mt-7 font-serif text-[2.8rem] font-black leading-[0.98] tracking-[-0.045em] text-[#2D0E13] sm:text-6xl lg:text-7xl">
                El sabor también
                <span className="mt-2 block font-script text-5xl sm:text-6xl lg:text-7xl text-[#5C1D27] font-bold tracking-normal">sale a escena.</span>
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-7 text-[#5E393F] sm:text-base">
                Cafetería, cocina y encuentros en un espacio con identidad propia. Elegí tu
                mesa, explorá la carta actualizada y hacé tu pedido desde el mismo lugar.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setViewMode("digital_menu")}
                  className="group flex items-center justify-center gap-3 rounded-2xl bg-[#5C1D27] px-6 py-4 text-xs font-black uppercase tracking-[0.1em] text-white shadow-[0_14px_35px_rgba(132,55,71,0.25)] transition-all hover:-translate-y-0.5 hover:bg-[#4A151D]"
                >
                  <Utensils className="h-4.5 w-4.5" />
                  Ver carta y pedir
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsReservationModalOpen(true)}
                  className="flex items-center justify-center gap-3 rounded-2xl border border-[#5C1D27]/30 bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.1em] text-[#5C1D27] transition-colors hover:bg-[#EBDAC5]/35"
                >
                  <Calendar className="h-4.5 w-4.5" />
                  Reservar una mesa
                </button>
              </div>

              <div className="mt-8 grid max-w-xl grid-cols-2 divide-x divide-[#CFB5A0] border-y border-[#CFB5A0] py-4">
                <div className="pr-3">
                  <strong className="block font-serif text-xl text-[#5C1D27]">
                    {isMenuLoading ? "…" : publicItems.length}
                  </strong>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#5E393F]">Propuestas</span>
                </div>
                <div className="pl-3">
                  <strong className="block font-serif text-xl text-[#5C1D27]">944</strong>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#5E393F]">Constitución</span>
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-2xl lg:mx-0">
              <div className="absolute -left-5 -top-5 h-24 w-24 rounded-full border border-[#5C1D27]/15 bg-[#EBDAC5]/60" />
              <div className="relative grid h-[430px] grid-cols-[1fr_0.43fr] gap-3 sm:h-[540px]">
                <button
                  type="button"
                  onClick={() => todayMenu ? setIsExecutiveModalOpen(true) : setViewMode("digital_menu")}
                  className="group relative overflow-hidden rounded-[2rem] bg-[#2D0E13] text-left shadow-[0_28px_70px_rgba(51,36,36,0.2)]"
                  aria-label={todayMenu ? `Ver Menú del Día: ${todayMenu.title}` : heroItem ? `Ver ${heroItem.name} en la carta` : "Ver la carta digital"}
                >
                  {(todayMenu?.image || heroItem?.image) ? (
                    <CatalogImage
                      src={todayMenu?.image || heroItem?.image || ""}
                      alt={todayMenu?.title || heroItem?.name || "Menú del Día"}
                      loading="eager"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full bg-gradient-to-br from-[#5C1D27] to-[#2D0E13]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#241819] via-transparent to-black/5" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
                    <span className="inline-block rounded-full bg-[#EBDAC5]/30 backdrop-blur-md border border-[#EBDAC5]/40 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#FAF2E6]">
                      {todayMenu ? `⭐ Menú del Día (${todayMenu.dayOfWeek})` : "Selección de la casa"}
                    </span>
                    <strong className="mt-2 block font-serif text-xl leading-tight sm:text-3xl">
                      {todayMenu?.title || heroItem?.name || "Carta Castaño"}
                    </strong>
                    {todayMenu?.description && (
                      <p className="mt-1 text-xs text-[#EBDAC5] line-clamp-2 font-medium">
                        {todayMenu.description}
                      </p>
                    )}
                    {(todayMenu || heroItem) && (
                      <span className="mt-3 inline-flex rounded-full bg-[#FAF2E6] px-3 py-1.5 text-xs font-black text-[#5C1D27]">
                        {formatPrice(todayMenu ? todayMenu.price : (heroItem!.isOffer && heroItem!.offerPrice ? heroItem!.offerPrice : heroItem!.price))}
                      </span>
                    )}
                  </div>
                </button>

                <div className="grid grid-rows-2 gap-3">
                  {supportingVisuals.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setViewMode("digital_menu")}
                      className="group relative overflow-hidden rounded-[1.5rem] bg-[#EBDAC5]"
                      aria-label={`Ver ${item.name} en la carta`}
                    >
                      <CatalogImage
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#2D0E13]/80 via-transparent to-transparent" />
                      <span className="absolute inset-x-0 bottom-0 line-clamp-2 p-3 text-left text-[10px] font-black leading-tight text-white sm:p-4 sm:text-xs">
                        {item.name}
                      </span>
                    </button>
                  ))}
                  {supportingVisuals.length < 2 && (
                    <div className="flex items-center justify-center rounded-[1.5rem] bg-[#4A151D] p-4 text-center text-[#FAF2E6]">
                      <div>
                        <Coffee className="mx-auto h-6 w-6 text-[#EBDAC5]" />
                        <span className="mt-2 block text-[10px] font-black uppercase tracking-wider">
                          Café, cocina y teatro
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {todayMenu && (
          <section className="bg-[#4A151D] px-5 py-6 text-[#FAF2E6] sm:px-6">
            <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex max-w-3xl items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EBDAC5] text-[#5C1D27]">
                  <Utensils className="h-5 w-5" />
                </span>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#EBDAC5]">
                    Menú activo · {todayMenu.dayOfWeek}
                  </span>
                  <h2 className="mt-1 font-serif text-xl font-black sm:text-2xl">{todayMenu.title}</h2>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#FAF2E6]/70">
                    {todayMenu.description || todayMenu.mains.join(" · ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-5 border-t border-white/15 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <strong className="font-serif text-2xl text-[#EBDAC5]">{formatPrice(todayMenu.price)}</strong>
                <button
                  type="button"
                  onClick={() => setViewMode("digital_menu")}
                  className="rounded-full bg-[#FAF2E6] px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-[#5C1D27] transition-colors hover:bg-[#EBDAC5]"
                >
                  Ver opciones
                </button>
              </div>
            </div>
          </section>
        )}

        <section id="carta" className="px-5 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5C1D27]">
                  Elegidos de la carta
                </span>
                <h2 className="mt-3 max-w-2xl font-serif text-3xl font-black leading-tight text-[#2D0E13] sm:text-5xl">
                  Propuestas que hablan por nuestra cocina.
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewMode("digital_menu")}
                className="group flex w-fit items-center gap-2 border-b border-[#5C1D27] pb-1 text-xs font-black uppercase tracking-wider text-[#5C1D27]"
              >
                Explorar toda la carta
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            <div className={`mt-10 grid gap-5 ${featuredPublicItems.length > 2 ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
              {featuredPublicItems.map((item, index) => {
                const displayPrice = item.isOffer && item.offerPrice ? item.offerPrice : item.price;
                return (
                  <article
                    key={item.id}
                    className="group overflow-hidden rounded-[1.75rem] border border-[#CFB5A0] bg-[#FAF2E6] shadow-[0_12px_35px_rgba(51,36,36,0.07)] transition-all hover:-translate-y-1 hover:border-[#5C1D27]/45"
                  >
                    <button
                      type="button"
                      onClick={() => setViewMode("digital_menu")}
                      className="block w-full text-left"
                      aria-label={`Ver ${item.name} en la carta`}
                    >
                      <div className="relative h-64 overflow-hidden bg-[#EBDAC5]">
                        <CatalogImage
                          src={item.image}
                          alt={item.name}
                          loading={index === 0 ? "eager" : "lazy"}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#2D0E13]/45 via-transparent to-transparent" />
                        <span className="absolute left-4 top-4 rounded-full bg-[#FAF2E6]/95 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-[#5C1D27]">
                          {item.isOffer ? "Oferta vigente" : "Selección Castaño"}
                        </span>
                      </div>
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="font-serif text-xl font-black leading-tight text-[#2D0E13]">
                            {item.name}
                          </h3>
                          <strong className="shrink-0 text-sm font-black text-[#5C1D27]">
                            {formatPrice(displayPrice)}
                          </strong>
                        </div>
                        <p className="mt-3 line-clamp-3 text-xs leading-6 text-[#5E393F]">{item.description}</p>
                        <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#5C1D27]">
                          Ver detalle <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="experiencia" className="px-5 pb-20 sm:px-6">
          <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2.25rem] bg-[#2D0E13] text-[#FAF2E6] shadow-[0_25px_70px_rgba(51,36,36,0.2)] lg:grid-cols-[0.95fr_1.05fr]">
            <div className="relative min-h-[340px] overflow-hidden bg-[#4A151D] lg:min-h-[540px]">
              {publicItems[3]?.image || heroItem?.image ? (
                <CatalogImage
                  src={publicItems[3]?.image || heroItem?.image}
                  alt={publicItems[3]?.name || heroItem?.name || "Experiencia Castaño"}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-[#2D0E13]/80 via-transparent to-transparent lg:bg-gradient-to-r" />
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/15 bg-[#2D0E13]/75 p-4 backdrop-blur-md sm:bottom-8 sm:left-8 sm:right-auto sm:max-w-xs">
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#EBDAC5]">Nuestra casa</span>
                <p className="mt-2 text-xs leading-5 text-white/80">
                  Un punto de encuentro entre la vida cultural de la ciudad y una cocina hecha con dedicación.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#EBDAC5]">
                La experiencia
              </span>
              <h2 className="mt-4 font-serif text-3xl font-black leading-tight sm:text-5xl">
                Antes o después de la función, la mesa ya está servida.
              </h2>
              <p className="mt-6 text-sm leading-7 text-[#FAF2E6]/70">
                Frente al Teatro Municipal de Río Cuarto, combinamos cafetería, platos para compartir
                y atención cercana en un salón pensado para quedarse.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  ["Café y sobremesa", "Una pausa cálida durante todo el día."],
                  ["Cocina con identidad", "Productos reales y una carta en movimiento."],
                  ["Reserva directa", "Elegí tu mesa desde la página."],
                  ["Ubicación central", "Constitución 944, frente al teatro."]
                ].map(([title, copy]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <CheckCircle2 className="h-4 w-4 text-[#EBDAC5]" />
                    <strong className="mt-3 block text-xs">{title}</strong>
                    <span className="mt-1 block text-[10px] leading-5 text-white/55">{copy}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="visitanos" className="border-y border-[#CFB5A0] bg-[#FAF2E6] px-5 py-20 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5C1D27]">Visitanos</span>
              <h2 className="mt-3 font-serif text-3xl font-black leading-tight sm:text-5xl">
                En el corazón cultural de Río Cuarto.
              </h2>
              <p className="mt-5 text-sm leading-7 text-[#5E393F]">
                Estamos en Constitución 944, frente al Teatro Municipal. Reservá online o escribinos
                para coordinar tu pedido.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Constituci%C3%B3n+944%2C+R%C3%ADo+Cuarto%2C+C%C3%B3rdoba"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full bg-[#5C1D27] px-5 py-3 text-[10px] font-black uppercase tracking-wider text-white transition-colors hover:bg-[#4A151D]"
                >
                  <MapPin className="h-4 w-4" />
                  Cómo llegar
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setIsReservationModalOpen(true)}
                  className="flex items-center gap-2 rounded-full border border-[#5C1D27]/30 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-wider text-[#5C1D27]"
                >
                  <Calendar className="h-4 w-4" />
                  Reservar
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: MapPin,
                  eyebrow: "Dirección",
                  title: "Constitución 944",
                  body: "Frente al Teatro Municipal · Río Cuarto, Córdoba"
                },
                {
                  icon: Clock,
                  eyebrow: "Horarios",
                  title: "Todos los días",
                  body: "Lun. a sáb. 07:30–01:00 · Dom. 08:30–00:00"
                },
                {
                  icon: PhoneCall,
                  eyebrow: "Contacto",
                  title: "Reservas y pedidos",
                  body: "WhatsApp 358 5042311 · Instagram @restobardelteatro_rio4"
                }
              ].map(({ icon: Icon, eyebrow, title, body }) => (
                <div key={eyebrow} className="rounded-[1.75rem] border border-[#CFB5A0] bg-white p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EBDAC5] text-[#5C1D27]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="mt-5 block text-[9px] font-black uppercase tracking-[0.16em] text-[#5C1D27]">{eyebrow}</span>
                  <strong className="mt-2 block font-serif text-lg text-[#2D0E13]">{title}</strong>
                  <p className="mt-3 text-[11px] leading-5 text-[#5E393F]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#4A151D] px-5 py-10 text-[#FAF2E6] sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <RestoBarLogo
              size="lg"
              className="[&_span:first-child]:!text-[#FAF2E6] [&_span:last-child]:!text-[#EBDAC5]"
            />
            <p className="mt-4 max-w-md text-[11px] leading-5 text-white/60">
              Cafetería y cocina frente al Teatro Municipal de Río Cuarto.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-[10px] font-black uppercase tracking-wider text-[#EBDAC5]">
            <button type="button" onClick={() => setViewMode("digital_menu")}>Carta digital</button>
            <button type="button" onClick={() => setIsReservationModalOpen(true)}>Reservas</button>
            <button type="button" onClick={() => setIsLoginModalOpen(true)}>Acceso personal</button>
          </div>
        </div>
      </footer>

      <div className="fixed inset-x-3 bottom-3 z-40 sm:hidden">
        <button
          type="button"
          onClick={() => setIsReservationModalOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5C1D27] px-5 py-4 text-[10px] font-black uppercase tracking-wider text-white shadow-2xl"
          aria-label="Reservar mesa"
        >
          <Calendar className="h-4 w-4" />
          Reservar una mesa
        </button>
      </div>

      {isReservationModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#241819]/90 p-3 backdrop-blur-md sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Reserva de mesa"
        >
          <div className="relative my-auto w-full max-w-4xl rounded-[2rem] border border-[#EBDAC5]/30 bg-[#2D0E13] p-4 shadow-2xl sm:p-6">
            <button
              type="button"
              onClick={() => setIsReservationModalOpen(false)}
              className="absolute right-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[#4A151D] text-white shadow-xl hover:bg-[#5C1D27]"
              aria-label="Cerrar reserva"
            >
              <X className="h-4 w-4" />
            </button>
            <TableReservation
              bookings={[]}
              onConfirmReservation={async (reservation) => {
                const result = await ReservationService.createPublic(reservation);
                if (!result.success || !result.reservation) {
                  onShowNotification(result.error || "No se pudo confirmar la reserva.", "warning");
                  return false;
                }
                setIsReservationModalOpen(false);
                onShowNotification(
                  `Reserva ${result.reservation.referenceCode} confirmada para ${result.reservation.customerName}.`,
                  "success"
                );
                return true;
              }}
            />
          </div>
        </div>
      )}

      {isLoginModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#241819]/90 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Acceso del personal"
        >
          <div className="relative my-auto w-full max-w-lg">
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute -right-2 -top-2 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[#4A151D] text-white shadow-xl hover:bg-[#5C1D27]"
              aria-label="Cerrar acceso"
            >
              <X className="h-4 w-4" />
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
