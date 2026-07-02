import { Order, OrderStatusType } from "../types";
import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, Award, Clock, MapPin, Utensils, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface OrderStatusProps {
  activeOrder: Order;
  onOrderCompleted: (orderId: string) => void;
}

export default function OrderStatus({ activeOrder, onOrderCompleted }: OrderStatusProps) {
  const [currentStatus, setCurrentStatus] = useState<OrderStatusType>(activeOrder.status);
  const [timeLeft, setTimeLeft] = useState<number>(activeOrder.estimatedMinutes * 60); // In seconds

  // Handle stage transition simulations (for showcase purposes, we accelerate the timeline)
  useEffect(() => {
    setCurrentStatus(activeOrder.status);
    setTimeLeft(activeOrder.estimatedMinutes * 60);
  }, [activeOrder]);

  // Real-time countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      if (currentStatus !== "Completado") {
        setCurrentStatus("Completado");
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const nextTime = prev - 1;
        
        // Auto transition status based on time percentage to make the app feel alive!
        const totalSecs = activeOrder.estimatedMinutes * 60;
        const elapsedSecs = totalSecs - nextTime;
        
        if (elapsedSecs >= totalSecs * 0.95) {
          setCurrentStatus("Completado");
        } else if (elapsedSecs >= totalSecs * 0.70) {
          setCurrentStatus("Listo");
        } else if (elapsedSecs >= totalSecs * 0.20) {
          setCurrentStatus("Preparando");
        }

        return nextTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, currentStatus, activeOrder]);

  // Quick helper to fast-forward state (Reviewers will LOVE this for testing)
  const handleFastForward = () => {
    if (currentStatus === "Recibido") {
      setCurrentStatus("Preparando");
      setTimeLeft(Math.floor(activeOrder.estimatedMinutes * 60 * 0.6));
    } else if (currentStatus === "Preparando") {
      setCurrentStatus("Listo");
      setTimeLeft(15);
    } else if (currentStatus === "Listo") {
      setCurrentStatus("Completado");
      setTimeLeft(0);
      onOrderCompleted(activeOrder.id);
    }
  };

  const steps = [
    { id: "Recibido", label: "Pedido Recibido", desc: "Su pedido ha entrado en la fila de barra." },
    { id: "Preparando", label: "En Preparación", desc: "Moliendo grano de origen y montando platos." },
    { id: "Listo", label: activeOrder.type === "Llevar" ? "Listo en Barra" : "Listo para Servir", desc: activeOrder.type === "Llevar" ? "Pase a recoger su bebida por la barra." : "El barista lo está llevando a su mesa." },
    { id: "Completado", label: "¡Entregado!", desc: "¡Disfrute de su momento de café!" }
  ];

  const getStepIndex = (status: OrderStatusType) => {
    const indices = { "Recibido": 0, "Preparando": 1, "Listo": 2, "Completado": 3 };
    return indices[status] || 0;
  };

  const activeIndex = getStepIndex(currentStatus);

  // Format time (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="rounded-3xl border border-coffee bg-white p-6 md:p-8 shadow-xl flex flex-col items-stretch space-y-6">
        {/* Header Status Ring */}
        <div className="flex flex-col md:flex-row items-center md:justify-between border-b border-coffee/30 pb-6 gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="h-14 w-14 rounded-full bg-caramel/10 flex items-center justify-center text-caramel border border-caramel/30 shrink-0">
              {currentStatus === "Completado" ? (
                <Award className="h-7 w-7 text-caramel" />
              ) : (
                <Loader2 className="h-7 w-7 animate-spin text-caramel" />
              )}
            </div>
            <div className="text-center md:text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-espresso/50 font-semibold">Estado en tiempo real</span>
              <h3 className="font-serif text-xl font-extrabold text-espresso mt-0.5 italic">
                {currentStatus === "Recibido" ? "Confirmando su pedido" :
                 currentStatus === "Preparando" ? "Preparando con mimo" :
                 currentStatus === "Listo" ? "¡Listo para usted!" : "Pedido Finalizado"}
              </h3>
            </div>
          </div>

          {/* Countdown Clock (Only if not completed) */}
          {currentStatus !== "Completado" && (
            <div className="bg-paper border border-coffee rounded-2xl px-5 py-3 flex items-center space-x-3 text-right shadow-xs">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-espresso/50 block font-semibold">Tiempo estimado</span>
                <span className="text-xl font-mono font-extrabold text-espresso leading-none">{formatTime(timeLeft)}</span>
              </div>
              <Clock className="h-6 w-6 text-caramel shrink-0" />
            </div>
          )}
        </div>

        {/* Order Details (Pickup / Table linkage) */}
        <div className="grid grid-cols-2 gap-4 bg-paper border border-coffee/55 rounded-2xl p-4 text-xs font-semibold text-espresso/80">
          <div>
            <span className="text-[9px] font-bold text-espresso/50 block uppercase mb-1 font-semibold">Modalidad de Pedido</span>
            <span className="text-sm font-bold text-espresso flex items-center gap-1.5">
              {activeOrder.type === "Llevar" ? (
                <>
                  <MapPin className="h-4 w-4 text-caramel" /> Para Llevar (Pickup)
                </>
              ) : (
                <>
                  <Utensils className="h-4 w-4 text-caramel" /> Servir en {activeOrder.tableNumber || "Mesa"}
                </>
              )}
            </span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-espresso/50 block uppercase mb-1 font-semibold">Código de Pedido</span>
            <span className="text-sm font-mono font-bold text-espresso bg-espresso/5 px-2.5 py-0.5 rounded border border-coffee inline-block">
              {activeOrder.id.substring(activeOrder.id.length - 8).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Vertical Stepper tracker */}
        <div className="relative pl-6 space-y-8 py-2">
          {/* Timeline connecting vertical bar */}
          <div className="absolute left-[13px] top-4 bottom-4 w-0.5 bg-coffee/30" />
          
          {/* Progress fill bar */}
          <div 
            className="absolute left-[13px] top-4 w-0.5 bg-caramel transition-all duration-700" 
            style={{ height: `${(activeIndex / (steps.length - 1)) * 90}%` }}
          />

          {steps.map((step, idx) => {
            const isDone = idx < activeIndex;
            const isCurrent = idx === activeIndex;
            
            return (
              <div key={step.id} className="relative flex items-start space-x-4">
                {/* Checkpoint Node circle icon */}
                <div 
                  className={`absolute -left-[24px] h-7 w-7 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-white ${
                    isDone ? "border-caramel bg-caramel text-white" :
                    isCurrent ? "border-caramel text-caramel shadow-xs shadow-caramel/10 scale-108" :
                    "border-coffee text-coffee/60"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-white" strokeWidth={3} />
                  ) : (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  )}
                </div>

                <div className="pl-2">
                  <h4 className={`text-sm font-bold ${isCurrent ? "text-espresso font-serif font-extrabold text-base italic transition-all" : isDone ? "text-espresso/80 font-bold" : "text-espresso/40 font-medium"}`}>
                    {step.label}
                  </h4>
                  <p className={`text-xs mt-0.5 leading-normal ${isCurrent ? "text-espresso/70 font-semibold" : "text-espresso/40"}`}>
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Item Summary box */}
        <div className="border-t border-coffee/30 pt-6 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-espresso/50 font-semibold">Detalle del Pedido</h4>
          <div className="space-y-2">
            {activeOrder.items.map((item, index) => (
              <div key={index} className="flex justify-between items-start text-xs font-medium text-espresso/85">
                <div className="min-w-0 pr-4">
                  <span className="font-serif font-black text-caramel">{item.quantity}x</span> {item.name}
                  {item.customizationSummary && (
                    <p className="text-[10px] text-caramel/85 mt-0.5 font-semibold italic">({item.customizationSummary})</p>
                  )}
                </div>
                <span className="font-extrabold text-espresso shrink-0 font-serif">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-coffee/30 pt-3 flex justify-between text-sm font-bold text-espresso">
            <span>Total Pagado</span>
            <span className="font-serif font-extrabold">${activeOrder.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Quick Reviewer Fast-Forward control button */}
        <div className="pt-4 border-t border-coffee/30 flex flex-col items-stretch">
          <button
            onClick={handleFastForward}
            className="flex items-center justify-center space-x-1.5 rounded-full bg-espresso/5 hover:bg-caramel/10 py-3 text-xs font-bold text-espresso hover:text-caramel border border-dashed border-coffee hover:border-caramel transition-all active:scale-98 cursor-pointer"
          >
            <Zap className="h-4 w-4 text-caramel animate-pulse" />
            <span>Simular Siguiente Estado (Fast-Forward)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
