import React, { useState, useMemo, useEffect, useRef } from "react";
import { MENU_ITEMS } from "../data/menu";
import { MenuItem, MenuItemCustomization } from "../types";
import { Coffee, Bot, ArrowRight, ArrowLeft, Check, Sparkles, ShoppingBag, Send, Trash2, Info, HelpCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";

interface BaristaAIProps {
  onAddToBag: (item: MenuItem, customization: MenuItemCustomization) => void;
  menuItems?: MenuItem[];
}

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

export default function BaristaAI({ onAddToBag, menuItems = MENU_ITEMS }: BaristaAIProps) {
  // Mode toggle: "quiz" (original) vs "chat" (Gemini conversation)
  const [activeMode, setActiveMode] = useState<"quiz" | "chat">("quiz");

  // Quiz States (Original)
  const [step, setStep] = useState<number>(1);
  const [tempPref, setTempPref] = useState<"hot" | "cold" | null>(null);
  const [intensityPref, setIntensityPref] = useState<"strong" | "creamy" | "no-coffee" | null>(null);
  const [hungerPref, setHungerPref] = useState<"drink" | "sweet" | "savory" | null>(null);
  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [showResult, setShowResult] = useState<boolean>(false);

  // Chat state. Provider credentials remain exclusively in the backend.
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  // Initialize chat with welcome message if empty
  useEffect(() => {
    if (activeMode === "chat" && chatMessages.length === 0) {
      setChatMessages([
        {
          id: "welcome",
          role: "model",
          text: "Buenas tardes. Sea bienvenido a Resto Bar Del Teatro. ☕ Soy su Sommelier & Barista Virtual. Estoy a su entera disposición para sugerirle el café de especialidad ideal, recomendarle un maridaje exquisito con nuestra cocina o presentarle nuestro Menú Ejecutivo del Día. Por favor, dígame: ¿qué tipo de bebida o plato prefiere degustar hoy?",
          timestamp: new Date()
        }
      ]);
    }
  }, [activeMode, chatMessages]);

  // Original Quiz Recommendation Logic
  const recommendations = useMemo(() => {
    if (!showResult) return [];

    let drinkMatch: MenuItem | null = null;
    let foodMatch: MenuItem | null = null;

    if (tempPref === "hot") {
      if (intensityPref === "strong") {
        drinkMatch = menuItems.find(item => item.id === "arg-cafecito-jarrito") || menuItems[0];
      } else if (intensityPref === "creamy") {
        drinkMatch = menuItems.find(item => item.id === "arg-cortado") || menuItems[1];
      } else {
        drinkMatch = menuItems.find(item => item.id === "arg-submarino") || menuItems[2];
      }
    } else {
      if (intensityPref === "strong") {
        drinkMatch = menuItems.find(item => item.id === "arg-pomelo-tonica") || menuItems[6];
      } else if (intensityPref === "creamy") {
        drinkMatch = menuItems.find(item => item.id === "arg-iced-dulce-leche") || menuItems[7];
      } else {
        drinkMatch = menuItems.find(item => item.id === "arg-mate-cocido-helado") || menuItems[8];
      }
    }

    if (hungerPref === "sweet") {
      foodMatch = menuItems.find(item => item.id === "arg-medialuna-manteca") || menuItems[10];
    } else if (hungerPref === "savory") {
      foodMatch = menuItems.find(item => item.id === "arg-tostado-mixto") || menuItems[12];
    }

    const matches: MenuItem[] = [];
    if (drinkMatch) matches.push(drinkMatch);
    if (foodMatch) matches.push(foodMatch);
    return matches;
  }, [showResult, tempPref, intensityPref, hungerPref, menuItems]);

  const handleNextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      setIsMatching(true);
      setTimeout(() => {
        setIsMatching(false);
        setShowResult(true);
      }, 1500);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleResetQuiz = () => {
    setStep(1);
    setTempPref(null);
    setIntensityPref(null);
    setHungerPref(null);
    setShowResult(false);
  };

  const handleAddRecToCart = (item: MenuItem) => {
    const customization: MenuItemCustomization = {};
    if (item.category === "coffee" || item.category === "cold" || item.category === "traditional") {
      customization.size = "M";
      customization.milk = "Regular";
      customization.sweetness = "100%";
    } else if (item.category === "bakery") {
      customization.warmed = true;
    }
    onAddToBag(item, customization);
  };

  // Gemini API Conversation Logic
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isTyping) return;

    const userText = inputMessage.trim();
    setInputMessage("");
    setChatError(null);

    // Add user message to screen
    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      role: "user",
      text: userText,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const historyToPass = chatMessages.concat(userMsg).slice(-10).map((message) => ({
        role: message.role,
        text: message.text.slice(0, 2_000)
      }));
      const { data, error } = await supabase.functions.invoke<{ text?: string; error?: string }>(
        "barista-assistant",
        { body: { messages: historyToPass } }
      );
      if (error || !data?.text) {
        throw new Error(
          data?.error || error?.message || "No se obtuvo una respuesta válida del Barista."
        );
      }
      const responseText = data.text;

      // Add model response
      setChatMessages(prev => [
        ...prev,
        {
          id: "model-" + Date.now(),
          role: "model",
          text: responseText,
          timestamp: new Date()
        }
      ]);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      setChatError(error.message || "Error al conectar con el servidor de inteligencia artificial.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleResetChat = () => {
    setChatMessages([
      {
        id: "welcome-reset",
        role: "model",
        text: "Entendido. Iniciemos una nueva consulta. ☕ Por favor, dígame qué le gustaría tomar o comer hoy en Café Puglia.",
        timestamp: new Date()
      }
    ]);
    setChatError(null);
  };

  // Helper to parse text messages and inject clickable buying buttons
  const renderMessageText = (text: string) => {
    const regex = /\[COMPRAR:\s*([a-zA-Z0-9_-]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      const itemId = match[1];

      if (matchIndex > lastIndex) {
        parts.push(<span key={lastIndex} className="whitespace-pre-line">{text.substring(lastIndex, matchIndex)}</span>);
      }

      const item = menuItems.find(m => m.id === itemId);
      if (item) {
        parts.push(
          <motion.button
            key={"btn-" + matchIndex}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleAddRecToCart(item)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 mx-1 my-1 bg-caramel hover:bg-espresso text-paper text-xs font-bold rounded-full transition-all shadow-sm cursor-pointer align-middle"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Pedir {item.name} (${item.price.toFixed(2)})</span>
          </motion.button>
        );
      } else {
        // Fallback if item is not found
        parts.push(<span key={"missing-" + matchIndex} className="text-xs text-red-500 font-semibold">(Producto no disponible)</span>);
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={lastIndex} className="whitespace-pre-line">{text.substring(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header and Toggle */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-espresso text-paper shadow-md">
          <Bot className="h-7 w-7 text-caramel animate-pulse" />
        </div>
        <h1 className="font-serif text-3xl font-extrabold tracking-tight text-espresso sm:text-4xl italic">Barista Virtual Inteligente</h1>
        <p className="mx-auto mt-2.5 max-w-xl text-espresso/70 text-sm leading-relaxed italic font-medium">
          ¿No sabés qué pedir? Dejale la sugerencia a nuestro Barista. Podés hacer el maridaje guiado clásico o conversar por chat en tiempo real.
        </p>

        {/* Tab Toggle */}
        <div className="mt-8 inline-flex p-1 bg-espresso/5 border border-coffee/30 rounded-full">
          <button
            onClick={() => setActiveMode("quiz")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeMode === "quiz"
                ? "bg-espresso text-paper shadow-sm"
                : "text-espresso/60 hover:text-espresso"
            }`}
          >
            📋 Maridaje Rápido
          </button>
          <button
            onClick={() => setActiveMode("chat")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeMode === "chat"
                ? "bg-espresso text-paper shadow-sm"
                : "text-espresso/60 hover:text-espresso"
            }`}
          >
            💬 Conversar con IA (Gemini)
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeMode === "quiz" ? (
          /* ========================================================================= */
          /* ORIGINAL QUIZ INTERFACE                                                   */
          /* ========================================================================= */
          <motion.div
            key="quiz-mode-container"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            {isMatching ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-coffee rounded-3xl p-8 shadow-md">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-caramel border-t-transparent animate-spin" />
                  <Bot className="h-6 w-6 text-caramel absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h3 className="font-serif text-xl font-bold text-espresso mt-6 italic">Consultando al Barista...</h3>
                <p className="text-xs text-espresso/60 mt-1 max-w-xs leading-normal italic">
                  Analizando tuestes, notas ácidas y dulzuras para crear la combinación perfecta porteña.
                </p>
              </div>
            ) : !showResult ? (
              <div className="rounded-3xl border border-coffee bg-white p-6 md:p-10 shadow-md">
                <div className="flex justify-between items-center border-b border-coffee/30 pb-5 mb-8">
                  <span className="text-xs font-bold text-espresso uppercase tracking-widest bg-caramel/10 px-3 py-1 rounded-full border border-caramel/20">
                    Pregunta {step} de 3
                  </span>
                  <div className="flex space-x-1.5">
                    {[1, 2, 3].map(i => (
                      <span 
                        key={i} 
                        className={`h-2 rounded-full transition-all duration-300 ${i === step ? "w-6 bg-caramel" : i < step ? "w-2 bg-caramel/40" : "w-2 bg-coffee/20"}`} 
                      />
                    ))}
                  </div>
                </div>

                <div className="min-h-[180px]">
                  {step === 1 && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                      <h3 className="font-serif text-xl font-extrabold text-espresso italic">1. ¿Qué temperatura prefiere degustar hoy?</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          onClick={() => setTempPref("hot")}
                          className={`flex items-center space-x-4 p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                            tempPref === "hot"
                              ? "border-caramel bg-caramel/5 text-espresso shadow-xs"
                              : "border-coffee/50 hover:border-coffee bg-paper/20"
                          }`}
                        >
                          <span className="text-3xl">☕</span>
                          <div>
                            <h4 className="font-serif font-extrabold text-sm text-espresso">Caliente y reconfortante</h4>
                            <p className="text-xs text-espresso/60 mt-0.5 leading-tight italic">Espressos vaporizados, lattes y el clásico Submarino caliente.</p>
                          </div>
                        </button>

                        <button
                          onClick={() => setTempPref("cold")}
                          className={`flex items-center space-x-4 p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                            tempPref === "cold"
                              ? "border-caramel bg-caramel/5 text-espresso shadow-xs"
                              : "border-coffee/50 hover:border-coffee bg-paper/20"
                          }`}
                        >
                          <span className="text-3xl">❄️</span>
                          <div>
                            <h4 className="font-serif font-extrabold text-sm text-espresso">Frío y refrescante</h4>
                            <p className="text-xs text-espresso/60 mt-0.5 leading-tight italic">Cafés fríos con hielo, licuados agitados y mate cocido helado.</p>
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                      <h3 className="font-serif text-xl font-extrabold text-espresso italic">2. ¿Qué nivel de intensidad y cuerpo buscas?</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { id: "strong", emoji: "💪", label: "Intenso, directo y con carácter", desc: "Doble espresso, granos tostados con carácter, notas intensas." },
                          { id: "creamy", emoji: "🥛", label: "Dulce, balanceado y cremoso", desc: "Leche vaporizada cremosa regular, avena o almendra y toques de dulce de leche." },
                          { id: "no-coffee", emoji: "🍃", label: "Bajo en cafeína o infusión tradicional", desc: "Un buen submarino de chocolate o servicio tradicional de mate." },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setIntensityPref(opt.id as any)}
                            className={`flex items-center space-x-4 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                              intensityPref === opt.id
                                ? "border-caramel bg-caramel/5 text-espresso shadow-xs"
                                : "border-coffee/50 hover:border-coffee bg-paper/20"
                            }`}
                          >
                            <span className="text-2xl">{opt.emoji}</span>
                            <div className="flex-1">
                              <h4 className="font-serif font-extrabold text-sm text-espresso">{opt.label}</h4>
                              <p className="text-xs text-espresso/60 mt-0.5 leading-tight italic">{opt.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                      <h3 className="font-serif text-xl font-extrabold text-espresso italic">3. ¿Qué apetito tiene para acompañar su taza?</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { id: "drink", emoji: "☕", label: "Solo quiero la bebida líquida", desc: "Sin comida, solo busco disfrutar de una buena infusión, café o mate." },
                          { id: "sweet", emoji: "🥐", label: "Quiero un antojo dulce de repostería", desc: "Medialunas de manteca caseras, alfajores de chocolate o porciones de torta." },
                          { id: "savory", emoji: "🥪", label: "Tengo un hambre salada (Tostados / Salados)", desc: "Tostados mixtos de jamón y queso o sándwiches calientes en mesa." },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setHungerPref(opt.id as any)}
                            className={`flex items-center space-x-4 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                              hungerPref === opt.id
                                ? "border-caramel bg-caramel/5 text-espresso shadow-xs"
                                : "border-coffee/50 hover:border-coffee bg-paper/20"
                            }`}
                          >
                            <span className="text-2xl">{opt.emoji}</span>
                            <div className="flex-1">
                              <h4 className="font-serif font-extrabold text-sm text-espresso">{opt.label}</h4>
                              <p className="text-xs text-espresso/60 mt-0.5 leading-tight italic">{opt.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="mt-10 pt-6 border-t border-coffee/30 flex items-center justify-between">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="flex items-center space-x-1 px-4 py-2 text-xs font-bold text-espresso/60 hover:bg-espresso/5 rounded-full transition-all cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Atrás</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={
                      (step === 1 && !tempPref) ||
                      (step === 2 && !intensityPref) ||
                      (step === 3 && !hungerPref)
                    }
                    className={`flex items-center space-x-1 px-6 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md ${
                      ((step === 1 && tempPref) || (step === 2 && intensityPref) || (step === 3 && hungerPref))
                        ? "bg-espresso text-paper hover:bg-caramel"
                        : "bg-espresso/10 text-espresso/40 cursor-not-allowed shadow-none"
                    }`}
                  >
                    <span>{step === 3 ? "Ver mi Maridaje" : "Siguiente"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-caramel/25 bg-caramel/5 p-6 md:p-8 shadow-xl flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-700 text-white shadow-xs mb-3">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-espresso text-center italic">¡Su Maridaje Ideal!</h2>
                <p className="text-xs text-espresso/60 text-center mt-1 italic font-medium">El barista virtual ha diseñado el siguiente dúo para usted:</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-8 max-w-2xl">
                  {recommendations.map((item) => (
                    <div 
                      key={item.id} 
                      className="rounded-2xl border border-coffee bg-white overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-all"
                    >
                      <div className="relative h-44 overflow-hidden">
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        <div className="absolute top-2 left-2 bg-espresso/90 rounded-md text-[9px] font-extrabold text-paper uppercase tracking-wider px-2.5 py-0.5">
                          {item.category === "coffee" || item.category === "cold" || item.category === "traditional" ? "La Bebida" : "El Acompañamiento"}
                        </div>
                      </div>
                      <div className="p-4 flex flex-col flex-1 bg-white">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-serif font-bold text-espresso text-sm leading-tight">{item.name}</h4>
                          <span className="text-sm font-extrabold text-espresso shrink-0 font-serif">${item.price.toFixed(2)}</span>
                        </div>
                        <p className="text-[11px] text-espresso/65 line-clamp-2 mt-1.5 leading-normal flex-1 italic">
                          {item.description}
                        </p>
                        <button
                          onClick={() => handleAddRecToCart(item)}
                          className="mt-4 w-full rounded-full bg-espresso hover:bg-caramel text-paper text-xs font-bold py-2 flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          <span>Agregar al pedido</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-coffee/30 w-full flex flex-col sm:flex-row justify-center items-center gap-3">
                  <button
                    onClick={handleResetQuiz}
                    className="rounded-full border border-coffee bg-white text-espresso font-bold text-xs px-6 py-3 shadow-xs hover:bg-paper transition-all cursor-pointer"
                  >
                    Rehacer Test Barista
                  </button>
                  <p className="text-[10px] text-espresso/40 font-medium max-w-xs text-center sm:text-left leading-normal italic">
                    * Las sugerencias se añaden en su receta base recomendada. Puede editarlas libremente desde su bolsa de compras.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* ========================================================================= */
          /* LIVE CHAT INTERFACE WITH GEMINI                                           */
          /* ========================================================================= */
          <motion.div
            key="chat-mode-container"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col border border-coffee bg-white rounded-3xl overflow-hidden shadow-lg h-[600px]"
          >
            {/* Top toolbar */}
            <div className="bg-espresso text-paper px-6 py-4 flex items-center justify-between border-b border-coffee/20">
              <div className="flex items-center space-x-3">
                <Bot className="h-5 w-5 text-caramel" />
                <div>
                  <h3 className="font-serif text-sm font-bold italic">Barista Conversacional</h3>
                  <span className="text-[10px] text-paper/60 block">Impulsado por Gemini 2.5 Flash</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleResetChat}
                  title="Reiniciar conversación"
                  className="p-2 text-paper/70 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <span
                  className="p-2 rounded-full text-emerald-400 bg-white/5"
                  title="Credenciales protegidas en el servidor"
                >
                  <ShieldCheck className="h-4 w-4" />
                </span>
              </div>
            </div>

            {/* Chat Messages Stream */}
            <div className="flex-1 p-4 overflow-y-auto bg-stone-50/50 flex flex-col gap-3 min-h-0">
              {chatMessages.map((msg) => {
                const isModel = msg.role === "model";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isModel ? "justify-start" : "justify-end"}`}
                  >
                    <div className="flex items-start gap-2 max-w-[85%]">
                      {isModel && (
                        <div className="h-8 w-8 rounded-full bg-espresso text-caramel flex items-center justify-center shrink-0 border border-coffee shadow-xs">
                          <Bot className="h-4.5 w-4.5" />
                        </div>
                      )}
                      
                      <div
                        className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                          isModel
                            ? "bg-white border border-coffee/65 text-espresso shadow-xs"
                            : "bg-espresso text-paper font-semibold shadow-xs"
                        }`}
                      >
                        {isModel ? (
                          <div className="space-y-1">
                            {renderMessageText(msg.text)}
                          </div>
                        ) : (
                          <p className="whitespace-pre-line">{msg.text}</p>
                        )}
                        <span
                          className={`text-[8px] block mt-1.5 ${
                            isModel ? "text-espresso/45" : "text-paper/40"
                          } text-right font-medium`}
                        >
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2 max-w-[85%]">
                    <div className="h-8 w-8 rounded-full bg-espresso text-caramel flex items-center justify-center shrink-0 border border-coffee shadow-xs">
                      <Bot className="h-4.5 w-4.5 animate-pulse" />
                    </div>
                    <div className="bg-white border border-coffee/65 text-espresso rounded-2xl px-4 py-3 shadow-xs flex items-center space-x-1.5 h-10">
                      <span className="w-1.5 h-1.5 bg-espresso/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-espresso/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-espresso/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              {chatError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-950 rounded-xl text-xs flex items-start gap-2.5">
                  <Info className="h-4.5 w-4.5 text-red-700 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-normal font-semibold">
                    {chatError}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form 
              onSubmit={handleSendMessage}
              className="border-t border-coffee/20 p-3 bg-white flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                placeholder="Escriba su consulta al Barista..."
                value={inputMessage}
                disabled={isTyping}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-coffee/70 bg-paper/20 rounded-full text-xs focus:ring-1 focus:ring-caramel focus:outline-hidden disabled:bg-stone-100 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isTyping}
                className="h-9 w-9 rounded-full bg-espresso text-paper hover:bg-caramel active:scale-95 disabled:bg-espresso/15 disabled:text-espresso/30 disabled:scale-100 transition-all flex items-center justify-center shrink-0 shadow-sm cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
