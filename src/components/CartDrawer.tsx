import { useState, useMemo, ChangeEvent, FormEvent } from "react";
import { CartItem, Order, Reservation, OrderStatusType, ClientAccount } from "../types";
import { X, Trash2, Plus, Minus, ShoppingBag, CreditCard, ArrowRight, Table, Coffee, Truck, MapPin, User, Phone, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onCheckout: (order: Order) => void;
  activeBookings: Reservation[];
  clientAccounts?: ClientAccount[];
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  activeBookings,
  clientAccounts = []
}: CartDrawerProps) {
  const [checkoutMode, setCheckoutMode] = useState<"view_cart" | "checkout">("view_cart");
  const [orderType, setOrderType] = useState<"Llevar" | "Mesa">("Mesa");
  const [fulfillmentMode, setFulfillmentMode] = useState<"salon" | "takeaway" | "delivery">("salon");
  const [takeawayChannel, setTakeawayChannel] = useState<"Takeaway" | "Delivery">("Takeaway");
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [customTableNumber, setCustomTableNumber] = useState<string>("");
  
  // Delivery & Customer fields
  const [deliveryStreet, setDeliveryStreet] = useState<string>("");
  const [deliveryNumber, setDeliveryNumber] = useState<string>("");
  const [deliveryNotes, setDeliveryNotes] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [pickupMinutes, setPickupMinutes] = useState<number>(20);

  // Payment Form States
  const [paymentMethod, setPaymentMethod] = useState<"Efectivo" | "Tarjeta" | "MercadoPago" | "Fiado / Cta Cte">("Tarjeta");
  const [receivedCash, setReceivedCash] = useState<string>("");
  const [selectedClientAccountId, setSelectedClientAccountId] = useState<string>("");
  const [cardName, setCardName] = useState<string>("");
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardExpiry, setCardExpiry] = useState<string>("");
  const [cardCVV, setCardCVV] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [tipPercent, setTipPercent] = useState<number>(10);
  const [customTip, setCustomTip] = useState<string>("");
  const [splitDinersCount, setSplitDinersCount] = useState<number>(1);

  // Helper function to resolve price list channel base price
  const getBaseItemPrice = (menuItem: any, list: "Salon" | "Takeaway" | "Delivery") => {
    if (list === "Takeaway") {
      return menuItem.takeawayPrice !== undefined ? menuItem.takeawayPrice : Number((menuItem.price * 0.90).toFixed(2));
    }
    if (list === "Delivery") {
      return menuItem.deliveryPrice !== undefined ? menuItem.deliveryPrice : Number((menuItem.price * 1.15).toFixed(2));
    }
    return menuItem.price; // Salon standard
  };

  const getItemPriceWithCustomizations = (item: CartItem, list: "Salon" | "Takeaway" | "Delivery") => {
    let itemPrice = getBaseItemPrice(item.menuItem, list);
    
    if (item.customization.size === "L") itemPrice += 0.50;
    if (item.customization.size === "XL") itemPrice += 0.90;
    
    if (item.customization.milk === "Almendra" || item.customization.milk === "Avena") itemPrice += 0.50;
    if (item.customization.milk === "Deslactosada") itemPrice += 0.20;

    if (item.customization.extras) {
      if (item.customization.extras.includes("Extra Espresso Shot")) itemPrice += 0.80;
      if (item.customization.extras.includes("Sirope de Caramelo")) itemPrice += 0.50;
      if (item.customization.extras.includes("Crema Batida")) itemPrice += 0.40;
    }

    return Number(itemPrice.toFixed(2));
  };

  const activePriceList = useMemo(() => {
    return orderType === "Mesa" ? "Salon" : takeawayChannel;
  }, [orderType, takeawayChannel]);

  // Math totals
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const price = getItemPriceWithCustomizations(item, activePriceList);
      return sum + (price * item.quantity);
    }, 0);
  }, [cartItems, activePriceList]);

  const tipAmount = useMemo(() => {
    if (tipPercent === -1) {
      return Math.max(0, parseFloat(customTip) || 0);
    }
    return Number((subtotal * (tipPercent / 100)).toFixed(2));
  }, [subtotal, tipPercent, customTip]);

  const deliveryFee = useMemo(() => {
    if (fulfillmentMode === "delivery") {
      const configuredFee = parseFloat(localStorage.getItem("puglia_delivery_fee") || "1200");
      const freeMin = parseFloat(localStorage.getItem("puglia_delivery_free_min") || "25000");
      if (subtotal >= freeMin && freeMin > 0) return 0;
      return configuredFee;
    }
    return 0;
  }, [fulfillmentMode, subtotal]);

  const tax = useMemo(() => Number((subtotal * 0.21).toFixed(2)), [subtotal]); // 21% IVA Argentina
  const total = useMemo(() => Number((subtotal + tax + tipAmount + deliveryFee).toFixed(2)), [subtotal, tax, tipAmount, deliveryFee]);

  // Handle formatted card numbers
  const handleCardNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = value.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNumber(parts.join(" "));
    } else {
      setCardNumber(value);
    }
  };

  const handleExpiryChange = (e: ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (value.length >= 2) {
      value = value.substring(0, 2) + "/" + value.substring(2, 4);
    }
    setCardExpiry(value.substring(0, 5));
  };

  const handleCheckoutSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (paymentMethod === "Tarjeta") {
      if (!cardName.trim()) {
        setErrorMsg("Introduce el nombre del titular de la tarjeta.");
        return;
      }
      if (cardNumber.replace(/\s/g, "").length < 16) {
        setErrorMsg("Introduce un número de tarjeta de crédito válido (16 dígitos).");
        return;
      }
      if (cardExpiry.length < 5) {
        setErrorMsg("Introduce la fecha de caducidad en formato MM/AA.");
        return;
      }
      if (cardCVV.length < 3) {
        setErrorMsg("Introduce el código CVV (3 dígitos).");
        return;
      }
    } else if (paymentMethod === "Efectivo") {
      const cashVal = parseFloat(receivedCash) || 0;
      if (cashVal < total) {
        setErrorMsg(`El efectivo recibido ($${cashVal}) debe ser igual o mayor al total ($${total}).`);
        return;
      }
    } else if (paymentMethod === "Fiado / Cta Cte") {
      if (!selectedClientAccountId) {
        setErrorMsg("Por favor, selecciona un cliente para registrar el fiado.");
        return;
      }
      const client = clientAccounts.find(c => c.id === selectedClientAccountId);
      if (client) {
        const potentialBalance = client.balance - total;
        if (Math.abs(potentialBalance) > client.creditLimit) {
          setErrorMsg(`Límite de crédito excedido. El límite es de $${client.creditLimit} y el saldo estimado sería -$${Math.abs(potentialBalance).toFixed(2)}.`);
          return;
        }
      }
    }

    if (orderType === "Mesa" && !selectedTableId && !customTableNumber) {
      setErrorMsg("Por favor, selecciona una de tus reservas activas o ingresa tu número de mesa física.");
      return;
    }

    // Simulate Payment delay
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      
      const tableValue = orderType === "Mesa"
        ? (selectedTableId ? activeBookings.find(b => b.id === selectedTableId)?.tableName : `Mesa ${customTableNumber}`)
        : undefined;

      const clientObj = paymentMethod === "Fiado / Cta Cte"
        ? clientAccounts.find(c => c.id === selectedClientAccountId)
        : undefined;

      const order: Order = {
        id: "order-" + Date.now(),
        items: cartItems.map(item => {
          const parts: string[] = [];
          if (item.customization.courseStep) parts.push(`📌 ${item.customization.courseStep}`);
          if (item.customization.cookingPoint) parts.push(`🔥 Punto: ${item.customization.cookingPoint}`);
          if (item.customization.sideDish) parts.push(`🥔 Guarnición: ${item.customization.sideDish}`);
          if (item.customization.size) parts.push(`Tam: ${item.customization.size}`);
          if (item.customization.milk) parts.push(item.customization.milk);
          if (item.customization.sweetness) parts.push(`Dulce: ${item.customization.sweetness}`);
          if (item.customization.warmed) parts.push("Caliente");
          if (item.customization.extras) {
            parts.push(...item.customization.extras);
          }
          if (item.customization.specialInstructions) {
            parts.push(`📝 Note: ${item.customization.specialInstructions}`);
          }
          if (item.customization.executiveChoices) {
            const ex = item.customization.executiveChoices;
            parts.push(`1° Entrada: ${ex.starter || '-'} | 2° Principal: ${ex.main || '-'} | 3° Bebida: ${ex.drink || '-'} | 4° Postre: ${ex.dessert || '-'}`);
          }
          return {
            name: item.menuItem.name,
            quantity: item.quantity,
            customizationSummary: parts.join(" • "),
            price: getItemPriceWithCustomizations(item, activePriceList)
          };
        }),
        subtotal,
        tax,
        total,
        type: orderType,
        priceList: activePriceList,
        tableReservationId: orderType === "Mesa" && selectedTableId ? selectedTableId : undefined,
        tableNumber: tableValue,
        status: "Recibido",
        createdAt: new Date().toISOString(),
        estimatedMinutes: fulfillmentMode === "delivery" ? 35 : fulfillmentMode === "takeaway" ? pickupMinutes : 8,
        tipAmount,
        paymentMethod,
        couponNumber: paymentMethod === "Tarjeta" ? "CUP-" + Math.floor(Math.random() * 900000 + 100000) : undefined,
        clientAccountName: clientObj?.name,
        fulfillmentType: fulfillmentMode,
        deliveryFee: fulfillmentMode === "delivery" ? deliveryFee : 0,
        deliveryAddress: fulfillmentMode === "delivery" ? {
          street: deliveryStreet,
          number: deliveryNumber,
          notes: deliveryNotes
        } : undefined,
        customerName: customerName || (clientObj ? clientObj.name : undefined),
        customerPhone: customerPhone || (clientObj ? clientObj.phone : undefined)
      };

      // Add to digital tip pool in Supabase
      if (tipAmount > 0) {
        (async () => {
          try {
            const { data } = await supabase.from("system_settings").select("*").eq("key", "tip_pool").single();
            const currentPool = data ? Number(data.value) : 0;
            await supabase.from("system_settings").upsert({ key: "tip_pool", value: currentPool + tipAmount });
            localStorage.setItem("origen_tip_pool", (currentPool + tipAmount).toString());
          } catch (err) {
            console.error("Error updating tip pool in Supabase:", err);
          }
        })();
      }

      onCheckout(order);
      // Reset State
      setCheckoutMode("view_cart");
      setPaymentMethod("Tarjeta");
      setCardName("");
      setCardNumber("");
      setCardExpiry("");
      setCardCVV("");
      setReceivedCash("");
      setSelectedClientAccountId("");
      onClose();
    }, 1800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-espresso/60 backdrop-blur-xs"
          />

          {/* Drawer Container */}
          <div className="absolute inset-y-0 right-0 max-w-full pl-10 flex">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="w-screen max-w-md bg-paper shadow-2xl flex flex-col h-full border-l border-coffee"
            >
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-coffee bg-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="h-5 w-5 text-caramel" />
                  <h2 className="font-serif text-lg font-bold text-espresso italic">
                    {checkoutMode === "view_cart" ? "Bolsa de Pedido" : "Confirmar Pedido"}
                  </h2>
                </div>
                <button
                  id="close-cart-btn"
                  onClick={onClose}
                  className="rounded-full p-1.5 text-espresso/40 hover:text-espresso hover:bg-espresso/5 transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {cartItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <div className="h-16 w-16 rounded-full bg-espresso/5 flex items-center justify-center text-espresso/40 mb-4">
                      <ShoppingBag className="h-8 w-8" />
                    </div>
                    <h3 className="font-serif text-lg font-bold text-espresso">Su bolsa está vacía</h3>
                    <p className="text-xs text-espresso/50 mt-1 max-w-xs leading-normal italic">
                      Explore nuestro menú interactivo y agregue sus bebidas de especialidad o platillos de brunch favoritos.
                    </p>
                    <button
                      id="cart-start-shopping-btn"
                      onClick={onClose}
                      className="mt-6 rounded-full bg-espresso px-6 py-2.5 text-xs font-bold text-paper shadow-xs hover:bg-caramel cursor-pointer transition-all"
                    >
                      Ver el menú
                    </button>
                  </div>
                ) : checkoutMode === "view_cart" ? (
                  /* VIEW CART STEP */
                  <div className="space-y-4">
                    {cartItems.map((item) => {
                      // Total item pricing including modifications
                      let individualPrice = item.menuItem.price;
                      if (item.customization.size === "L") individualPrice += 0.50;
                      if (item.customization.size === "XL") individualPrice += 0.90;
                      if (item.customization.milk === "Almendra" || item.customization.milk === "Avena") individualPrice += 0.50;
                      if (item.customization.milk === "Deslactosada") individualPrice += 0.20;

                      if (item.customization.extras) {
                        if (item.customization.extras.includes("Extra Espresso Shot")) individualPrice += 0.80;
                        if (item.customization.extras.includes("Sirope de Caramelo")) individualPrice += 0.50;
                        if (item.customization.extras.includes("Crema Batida")) individualPrice += 0.40;
                      }

                      const lineTotal = individualPrice * item.quantity;

                      return (
                        <div
                          key={item.id}
                          className="flex items-start space-x-3 p-3 rounded-xl border border-coffee bg-white shadow-xs"
                        >
                          <img
                            src={item.menuItem.image}
                            alt={item.menuItem.name}
                            className="h-14 w-14 rounded-lg object-cover bg-espresso/5 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-serif text-sm font-bold text-espresso truncate">{item.menuItem.name}</h4>
                            
                            {/* Render customizations */}
                            <p className="text-[11px] text-caramel mt-0.5 leading-tight font-semibold italic">
                              {item.customization.size && `Size: ${item.customization.size}`}
                              {item.customization.milk && ` • ${item.customization.milk}`}
                              {item.customization.sweetness && ` • ${item.customization.sweetness}`}
                              {item.customization.warmed && " • Servir Caliente"}
                              {item.customization.extras && ` • ${item.customization.extras.join(", ")}`}
                            </p>

                            <div className="flex items-center justify-between mt-2.5">
                              {/* Quantity Editors */}
                              <div className="flex items-center border border-coffee rounded-full bg-paper/50">
                                <button
                                  id={`qty-minus-${item.id}`}
                                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                  className="p-1 hover:bg-espresso/10 rounded-full text-espresso/70 transition-all cursor-pointer"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="text-xs font-bold text-espresso px-2.5">{item.quantity}</span>
                                <button
                                  id={`qty-plus-${item.id}`}
                                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                  className="p-1 hover:bg-espresso/10 rounded-full text-espresso/70 transition-all cursor-pointer"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>

                              {/* Price and trash */}
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-extrabold text-espresso font-serif">${lineTotal.toFixed(2)}</span>
                                <button
                                  id={`remove-item-${item.id}`}
                                  onClick={() => onRemoveItem(item.id)}
                                  className="text-espresso/40 hover:text-rose-700 p-1 rounded-md transition-all cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* SECURE CHECKOUT FORM STEP */
                  <form onSubmit={handleCheckoutSubmit} className="space-y-5">
                    {/* Select order style: Salón, Takeaway, Delivery */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-espresso/50 block mb-1.5 font-semibold">Modalidad de Consumo & Entrega</label>
                      <div className="grid grid-cols-3 gap-1 bg-coffee/20 rounded-xl p-1 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setFulfillmentMode("salon");
                            setOrderType("Mesa");
                          }}
                          className={`py-2 text-[10px] font-bold rounded-lg transition-all flex flex-col items-center justify-center cursor-pointer ${
                            fulfillmentMode === "salon"
                              ? "bg-white text-espresso shadow-xs font-black"
                              : "text-espresso/70 hover:text-espresso"
                          }`}
                        >
                          <Table className="h-3.5 w-3.5 mb-0.5" />
                          <span>En Salón</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFulfillmentMode("takeaway");
                            setOrderType("Llevar");
                            setTakeawayChannel("Takeaway");
                          }}
                          className={`py-2 text-[10px] font-bold rounded-lg transition-all flex flex-col items-center justify-center cursor-pointer ${
                            fulfillmentMode === "takeaway"
                              ? "bg-white text-espresso shadow-xs font-black"
                              : "text-espresso/70 hover:text-espresso"
                          }`}
                        >
                          <Coffee className="h-3.5 w-3.5 mb-0.5" />
                          <span>Retiro Local</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFulfillmentMode("delivery");
                            setOrderType("Llevar");
                            setTakeawayChannel("Delivery");
                          }}
                          className={`py-2 text-[10px] font-bold rounded-lg transition-all flex flex-col items-center justify-center cursor-pointer ${
                            fulfillmentMode === "delivery"
                              ? "bg-[#2C1810] text-[#F59E0B] shadow-xs font-black"
                              : "text-espresso/70 hover:text-espresso"
                          }`}
                        >
                          <Truck className="h-3.5 w-3.5 mb-0.5" />
                          <span>Delivery</span>
                        </button>
                      </div>
                    </div>

                    {/* Delivery Address Fields */}
                    {fulfillmentMode === "delivery" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-amber-700" /> Dirección de Entrega (Río Cuarto)
                          </span>
                          <span className="text-[9px] bg-amber-200 text-amber-950 font-mono font-bold px-2 py-0.5 rounded-full">
                            Envío: {deliveryFee === 0 ? "¡GRATIS!" : `$${deliveryFee.toFixed(0)}`}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="text-[8px] uppercase tracking-wider block mb-0.5 font-bold text-stone-600">Calle / Av.</label>
                            <input
                              type="text"
                              required
                              placeholder="Ej: Constitución"
                              value={deliveryStreet}
                              onChange={(e) => setDeliveryStreet(e.target.value)}
                              className="w-full p-2 text-xs border border-stone-300 rounded-xl bg-white font-medium focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] uppercase tracking-wider block mb-0.5 font-bold text-stone-600">Número</label>
                            <input
                              type="text"
                              required
                              placeholder="944"
                              value={deliveryNumber}
                              onChange={(e) => setDeliveryNumber(e.target.value)}
                              className="w-full p-2 text-xs border border-stone-300 rounded-xl bg-white font-medium focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[8px] uppercase tracking-wider block mb-0.5 font-bold text-stone-600">Piso / Dpto / Notas de Timbre</label>
                          <input
                            type="text"
                            placeholder="Ej: 3B / Portón negro frente al teatro"
                            value={deliveryNotes}
                            onChange={(e) => setDeliveryNotes(e.target.value)}
                            className="w-full p-2 text-xs border border-stone-300 rounded-xl bg-white font-medium focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[8px] uppercase tracking-wider block mb-0.5 font-bold text-stone-600">Nombre Cliente</label>
                            <input
                              type="text"
                              required
                              placeholder="Nombre y Apellido"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              className="w-full p-2 text-xs border border-stone-300 rounded-xl bg-white font-medium focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] uppercase tracking-wider block mb-0.5 font-bold text-stone-600">WhatsApp Contacto</label>
                            <input
                              type="tel"
                              required
                              placeholder="358 154..."
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              className="w-full p-2 text-xs border border-stone-300 rounded-xl bg-white font-medium focus:outline-none"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Takeaway Fields */}
                    {fulfillmentMode === "takeaway" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-3"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-stone-600" /> Horario Estimado de Retiro por Mostrador
                        </span>

                        <div className="flex gap-2">
                          {[15, 20, 30, 45].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => setPickupMinutes(mins)}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                                pickupMinutes === mins
                                  ? "bg-[#2C1810] text-white border-[#2C1810]"
                                  : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                              }`}
                            >
                              en {mins} min
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[8px] uppercase tracking-wider block mb-0.5 font-bold text-stone-600">Nombre Cliente</label>
                            <input
                              type="text"
                              required
                              placeholder="Nombre..."
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              className="w-full p-2 text-xs border border-stone-300 rounded-xl bg-white font-medium focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] uppercase tracking-wider block mb-0.5 font-bold text-stone-600">WhatsApp para Avisar</label>
                            <input
                              type="tel"
                              placeholder="358 154..."
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              className="w-full p-2 text-xs border border-stone-300 rounded-xl bg-white font-medium focus:outline-none"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Select price list channel if Takeaway */}
                    {orderType === "Llevar" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="rounded-xl border border-coffee bg-stone-50 p-3.5 space-y-2 overflow-hidden"
                      >
                        <label className="text-[10px] font-bold uppercase tracking-wider text-espresso/50 block font-semibold">Canal de Precios Takeaway/App</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setTakeawayChannel("Takeaway")}
                            className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                              takeawayChannel === "Takeaway"
                                ? "bg-espresso text-white border-espresso shadow-xs"
                                : "bg-white text-espresso border-stone-200 hover:bg-stone-50"
                            }`}
                          >
                            Mostrador / Retiro (-10%)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTakeawayChannel("Delivery")}
                            className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                              takeawayChannel === "Delivery"
                                ? "bg-espresso text-white border-espresso shadow-xs"
                                : "bg-white text-espresso border-stone-200 hover:bg-stone-50"
                            }`}
                          >
                            App de Delivery (+15%)
                          </button>
                        </div>
                        <p className="text-[9px] text-espresso/50 italic leading-relaxed">
                          La tarifa se ajustará de acuerdo al canal seleccionado. Las medialunas y sándwiches tienen precios adaptados.
                        </p>
                      </motion.div>
                    )}

                    {/* Table-specific options if Dine-in */}
                    {orderType === "Mesa" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="rounded-xl border border-caramel/25 bg-caramel/5 p-4 space-y-3 overflow-hidden"
                      >
                        {activeBookings.length > 0 ? (
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-caramel block mb-1 font-semibold">Vincular a su Reserva Activa</label>
                            <select
                              id="checkout-booking-select"
                              value={selectedTableId}
                              onChange={(e) => {
                                setSelectedTableId(e.target.value);
                                setCustomTableNumber("");
                              }}
                              className="w-full rounded-lg border border-coffee bg-white py-2 px-3 text-xs font-medium text-espresso focus:outline-none focus:border-caramel"
                            >
                              <option value="">-- Elige una reserva --</option>
                              {activeBookings.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.tableName} ({b.timeSlot})
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : null}

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-caramel block mb-1 font-semibold">
                            {activeBookings.length > 0 ? "O ingrese su número de mesa física:" : "Ingrese su número de mesa física:"}
                          </label>
                          <input
                            type="text"
                            id="checkout-table-num"
                            value={customTableNumber}
                            onChange={(e) => {
                              setCustomTableNumber(e.target.value);
                              setSelectedTableId("");
                            }}
                            placeholder="Ej. Mesa 4 o Mesa Terraza"
                            className="w-full rounded-lg border border-coffee bg-white py-2 px-3 text-xs outline-none focus:border-caramel text-espresso font-medium"
                          />
                          <p className="text-[10px] text-espresso/45 mt-1 italic">Llevaremos el pedido directamente a donde esté sentado.</p>
                        </div>
                      </motion.div>
                    )}

                    {/* Módulo de Gestión de Propinas Virtuales (Sec. III.2) */}
                    <div className="border border-coffee rounded-xl bg-white p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between border-b border-coffee/30 pb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-espresso/50 flex items-center gap-1.5 font-semibold">
                          ☕ Propina Digital Colectiva
                        </span>
                        <span className="text-[9px] bg-caramel/10 text-caramel px-2 py-0.5 rounded font-bold uppercase">
                          Reparto Equitativo
                        </span>
                      </div>
                      <p className="text-[10px] text-espresso/60 leading-tight">
                        La propina se derivará automáticamente al Fondo de Propinas para el reparto equitativo del viernes.
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {[0, 10, 15, -1].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setTipPercent(pct)}
                            className={`py-1.5 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
                              tipPercent === pct
                                ? "bg-espresso text-white border-espresso"
                                : "bg-white text-espresso/80 border-stone-200 hover:bg-stone-50"
                            }`}
                          >
                            {pct === 0 ? "0%" : pct === -1 ? "Otro" : `${pct}%`}
                          </button>
                        ))}
                      </div>
                      {tipPercent === -1 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="pt-1 overflow-hidden"
                        >
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-espresso/50">$</span>
                            <input
                              type="number"
                              value={customTip}
                              onChange={(e) => setCustomTip(e.target.value)}
                              placeholder="Monto de propina"
                              className="w-full pl-6 pr-3 py-1.5 border border-coffee bg-white rounded-lg text-xs font-bold focus:ring-1 focus:ring-caramel focus:outline-hidden"
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Payment Selector Option Buttons */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-espresso/50 block mb-1.5 font-semibold">Medio de Pago</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "Tarjeta", label: "💳 Tarjeta", desc: "Crédito o Débito" },
                          { id: "Efectivo", label: "💵 Efectivo", desc: "Pago en caja" },
                          { id: "MercadoPago", label: "📱 Mercado Pago", desc: "Transferencia / QR" },
                          { id: "Fiado / Cta Cte", label: "👤 Cuenta Corriente", desc: "Fiado Puglia" }
                        ].map((pm) => (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => {
                              setPaymentMethod(pm.id as any);
                              setErrorMsg("");
                            }}
                            className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                              paymentMethod === pm.id
                                ? "bg-espresso text-paper border-espresso shadow-xs"
                                : "bg-white text-espresso/80 border-stone-200 hover:bg-stone-50"
                            }`}
                          >
                            <span className="text-xs font-bold block">{pm.label}</span>
                            <span className={`text-[9px] block ${paymentMethod === pm.id ? "text-paper/60" : "text-espresso/50"}`}>{pm.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tarjeta Card form */}
                    {paymentMethod === "Tarjeta" && (
                      <div className="border border-coffee rounded-xl bg-white p-4 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-coffee/30 pb-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-espresso/50 flex items-center gap-1.5 font-semibold">
                            <CreditCard className="h-3.5 w-3.5 text-caramel" /> Pago de Pruebas Seguro
                          </span>
                          <div className="flex gap-1 text-[9px] font-bold bg-emerald-700 text-white px-2.5 py-0.5 rounded shadow-xs uppercase tracking-wider font-mono">
                            Sandbox
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-espresso/60 uppercase tracking-wider block mb-1 font-semibold">Nombre en Tarjeta</label>
                          <input
                            type="text"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            placeholder="Juan Pérez"
                            className="w-full rounded-lg border border-coffee bg-paper/30 py-2 px-3 text-xs outline-none focus:border-caramel focus:bg-white text-espresso font-medium"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-espresso/60 uppercase tracking-wider block mb-1 font-semibold">Número de Tarjeta</label>
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            placeholder="4000 1234 5678 9010"
                            maxLength={19}
                            className="w-full rounded-lg border border-coffee bg-paper/30 py-2 px-3 text-xs font-mono outline-none focus:border-caramel focus:bg-white text-espresso"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-espresso/60 uppercase tracking-wider block mb-1 font-semibold">Caducidad</label>
                            <input
                              type="text"
                              value={cardExpiry}
                              onChange={handleExpiryChange}
                              placeholder="MM/AA"
                              maxLength={5}
                              className="w-full rounded-lg border border-coffee bg-paper/30 py-2 px-3 text-xs font-mono text-center outline-none focus:border-caramel focus:bg-white text-espresso"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-espresso/60 uppercase tracking-wider block mb-1 font-semibold">CVV</label>
                            <input
                              type="password"
                              value={cardCVV}
                              onChange={(e) => setCardCVV(e.target.value.replace(/[^0-9]/g, "").substring(0, 3))}
                              placeholder="***"
                              maxLength={3}
                              className="w-full rounded-lg border border-coffee bg-paper/30 py-2 px-3 text-xs font-mono text-center outline-none focus:border-caramel focus:bg-white text-espresso"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Efectivo cash form */}
                    {paymentMethod === "Efectivo" && (
                      <div className="border border-coffee rounded-xl bg-white p-4 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-coffee/30 pb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-espresso/50 flex items-center gap-1.5 font-semibold">
                            💵 Registro de Pago en Efectivo
                          </span>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-espresso/60 uppercase tracking-wider block mb-1 font-semibold">Monto Recibido</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-espresso/50">$</span>
                            <input
                              type="number"
                              value={receivedCash}
                              onChange={(e) => setReceivedCash(e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-7 pr-3 py-2 border border-coffee bg-paper/30 rounded-lg text-xs font-bold focus:ring-1 focus:ring-caramel focus:outline-hidden text-espresso"
                            />
                          </div>
                        </div>
                        {parseFloat(receivedCash) >= total && (
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-2.5 rounded-lg text-xs flex justify-between font-bold">
                            <span>Vuelto a devolver:</span>
                            <span className="font-mono">${(parseFloat(receivedCash) - total).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mercado Pago QR form */}
                    {paymentMethod === "MercadoPago" && (
                      <div className="border border-coffee rounded-xl bg-white p-4 space-y-3 shadow-xs flex flex-col items-center">
                        <div className="w-full flex items-center justify-between border-b border-coffee/30 pb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-espresso/50 flex items-center gap-1.5 font-semibold">
                            📱 Pago Digital por QR
                          </span>
                        </div>
                        
                        {/* Beautiful QR Code Mockup */}
                        <div className="p-3 bg-white border border-stone-200 rounded-2xl my-2 shadow-xs">
                          <svg className="w-32 h-32 text-espresso" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="2" width="6" height="6" rx="1" />
                            <rect x="16" y="2" width="6" height="6" rx="1" />
                            <rect x="2" y="16" width="6" height="6" rx="1" />
                            <path d="M16 16h2v2h-2zm2 2h2v2h-2zm-2 2h2v-2h-2zm4-4h2v2h-2zm0 4h2v-2h-2zm-4-4h-2v2h2zm2-2h-2v2h2zm2 2v2M9 5h1v1H9zm1 4V8h1v2h-2zm4-5h1v1h-1zm1 4v-1h1v2h-2zm-6 7H9v1h1zm-1 3v-2H8v2h1zm4-1h1v1h-1zm1 3v-2h-1v2h1zm2-7h1v1h-1zm-6 2h1v1H9zm1 3v-1h1v2h-2zm-3-3H6v1h2zm2 4H8v1h2zm6-4h2v1h-2z" />
                          </svg>
                        </div>
                        
                        <p className="text-[10px] text-espresso/60 text-center leading-normal italic font-medium">
                          Escanee el código QR desde la app de Mercado Pago o realice transferencia directa. Al presionar "Confirmar" se registrará la operación.
                        </p>
                      </div>
                    )}

                    {/* Cuenta Corriente (Fiado) form */}
                    {paymentMethod === "Fiado / Cta Cte" && (
                      <div className="border border-coffee rounded-xl bg-white p-4 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-coffee/30 pb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-espresso/50 flex items-center gap-1.5 font-semibold">
                            👤 Cuenta de Confianza (Fiado)
                          </span>
                        </div>
                        
                        <div>
                          <label className="text-[10px] font-bold text-espresso/60 uppercase tracking-wider block mb-1 font-semibold">Seleccionar Cliente</label>
                          <select
                            value={selectedClientAccountId}
                            onChange={(e) => setSelectedClientAccountId(e.target.value)}
                            className="w-full rounded-lg border border-coffee bg-white py-2 px-3 text-xs font-semibold text-espresso focus:outline-none focus:border-caramel"
                          >
                            <option value="">-- Seleccionar Cuenta Corriente --</option>
                            {clientAccounts.map((c) => {
                              const remainingLimit = c.creditLimit - Math.abs(c.balance);
                              return (
                                <option key={c.id} value={c.id}>
                                  {c.name} (Saldo: ${c.balance.toFixed(2)} | Límite: ${c.creditLimit})
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {selectedClientAccountId && (() => {
                          const client = clientAccounts.find(c => c.id === selectedClientAccountId);
                          if (!client) return null;
                          const potBal = client.balance - total;
                          const isOver = Math.abs(potBal) > client.creditLimit;
                          
                          return (
                            <div className={`p-2.5 rounded-lg text-xs space-y-1 ${isOver ? "bg-rose-50 border border-rose-200 text-rose-950 font-bold" : "bg-caramel/5 border border-caramel/20 text-espresso font-semibold"}`}>
                              <div className="flex justify-between">
                                <span>Saldo Estimado:</span>
                                <span className="font-mono">${potBal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-[10px] text-espresso/60">
                                <span>Límite disponible:</span>
                                <span className="font-mono">${(client.creditLimit - Math.abs(client.balance)).toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {errorMsg && (
                      <p className="text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 p-2 rounded-lg">{errorMsg}</p>
                    )}
                  </form>
                )}
              </div>

              {/* Drawer Footer (Price Breakdown) */}
              {cartItems.length > 0 && (
                <div className="border-t border-coffee bg-white p-6 space-y-4 shadow-2xl z-10">
                  {/* Prices */}
                  <div className="space-y-1.5 text-xs font-medium text-espresso/70">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="text-espresso font-serif font-bold">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Impuestos (21% IVA)</span>
                      <span className="text-espresso font-serif font-bold">${tax.toFixed(2)}</span>
                    </div>
                    {tipAmount > 0 && (
                      <div className="flex justify-between text-caramel font-semibold">
                        <span>Propina Digital Colectiva</span>
                        <span className="font-serif font-bold">${tipAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-coffee pt-2 text-sm font-extrabold text-espresso">
                      <span>Total del pedido</span>
                      <span className="font-serif text-lg font-black text-espresso">${total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {checkoutMode === "view_cart" ? (
                    <button
                      id="cart-go-checkout-btn"
                      onClick={() => setCheckoutMode("checkout")}
                      className="w-full rounded-full bg-espresso py-3.5 text-sm font-bold text-paper shadow-md hover:bg-caramel hover:scale-101 transition-all active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <span>Ir a la caja</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        id="checkout-back-btn"
                        onClick={() => setCheckoutMode("view_cart")}
                        className="flex-1 rounded-full border border-coffee py-3 text-xs font-bold text-espresso/70 bg-white hover:bg-paper transition-all cursor-pointer"
                        disabled={isProcessing}
                      >
                        Atrás
                      </button>
                      <button
                        type="button"
                        id="checkout-pay-btn"
                        onClick={handleCheckoutSubmit}
                        className="flex-2 rounded-full bg-espresso py-3 text-xs font-bold text-paper shadow-md hover:bg-caramel hover:scale-101 transition-all disabled:bg-espresso/20 disabled:text-espresso/45 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer"
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-1.5" />
                            <span>Procesando...</span>
                          </>
                        ) : (
                          <>
                            <span>Pagar ${total.toFixed(2)}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
