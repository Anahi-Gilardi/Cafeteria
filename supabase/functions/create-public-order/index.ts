import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, isAllowedOrigin } from "../_shared/cors.ts";

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (request) => {
  const corsHeaders = getCorsHeaders(request);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
  if (request.method === "OPTIONS") return new Response(null, { status: isAllowedOrigin(request) ? 204 : 403, headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!isAllowedOrigin(request)) {
    return json({ error: "origin not allowed" }, 403);
  }
  if (Number(request.headers.get("content-length") || 0) > 30_000) {
    return json({ error: "payload too large" }, 413);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const rateSalt = Deno.env.get("RATE_LIMIT_SALT");
  if (!supabaseUrl || !serviceKey || !rateSalt) {
    return json({ error: "server configuration incomplete" }, 503);
  }
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  try {
    const forwarded = request.headers.get("x-forwarded-for") || "unknown";
    const clientHash = await sha256(`${rateSalt}:${forwarded.split(",")[0].trim()}`);
    const now = new Date();
    const { data: allowed, error: rateError } = await admin.rpc(
      "consume_public_rate_limit",
      {
        p_client_hash: `order:${clientHash}`,
        p_window_seconds: 600,
        p_max_requests: 5
      }
    );
    if (rateError) return json({ error: "rate limit unavailable" }, 503);
    if (!allowed) {
      return json({ error: "too many requests" }, 429);
    }

    const input = await request.json();
    const requestedItems = Array.isArray(input?.items) ? input.items : [];
    if (requestedItems.length < 1 || requestedItems.length > 20) {
      return json({ error: "invalid item count" }, 400);
    }

    const orderType = String(input?.orderType || "");
    const customerName = String(input?.customerName || "").trim().slice(0, 120);
    const customerPhone = String(input?.customerPhone || "")
      .replace(/[^\d+ ()-]/g, "")
      .trim()
      .slice(0, 30);
    const tableNumber = String(input?.tableNumber || "").trim().slice(0, 80);
    const clientAddress = String(input?.clientAddress || "").trim().slice(0, 300);
    const providedIdempotencyKey = String(input?.idempotencyKey || "").trim();
    if (
      !["salon", "takeaway", "delivery"].includes(orderType) ||
      customerName.length < 2 ||
      customerPhone.replace(/\D/g, "").length < 7 ||
      !/^[A-Za-z0-9:_-]{8,180}$/.test(providedIdempotencyKey) ||
      (orderType === "salon" && !tableNumber) ||
      (orderType === "delivery" && clientAddress.length < 5)
    ) {
      return json({ error: "invalid order contact or fulfillment details" }, 400);
    }

    if (orderType === "salon") {
      const { data: table, error: tableError } = await admin
        .from("restaurant_tables")
        .select("name")
        .eq("name", tableNumber)
        .eq("active", true)
        .maybeSingle();
      if (tableError) return json({ error: "table validation unavailable" }, 503);
      if (!table) return json({ error: "active table not found" }, 404);
    }

    const ids = [...new Set(requestedItems.map((item: any) => String(item.itemId || "")))];
    if (ids.some((id) => !id)) return json({ error: "itemId is required" }, 400);

    const { data: catalog, error: catalogError } = await admin
      .from("menu_items")
      .select("id, name, price, takeaway_price, delivery_price, stock, is_available")
      .in("id", ids);
    if (catalogError || !catalog || catalog.length !== ids.length) {
      return json({ error: "catalog validation failed" }, 400);
    }

    let total = 0;
    const items = requestedItems.map((requested: any) => {
      const item = catalog.find((candidate) => candidate.id === requested.itemId);
      const quantity = Number(requested.quantity);
      if (!item?.is_available || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        throw new Error("invalid catalog item");
      }
      if (Number(item.stock) < quantity) throw new Error("insufficient stock");
      const price =
        orderType === "delivery"
          ? Number(item.delivery_price ?? item.price)
          : orderType === "takeaway"
            ? Number(item.takeaway_price ?? item.price)
            : Number(item.price);
      total += price * quantity;
      return {
        itemId: item.id,
        name: item.name,
        quantity,
        price,
        customizationSummary: String(requested.customizationSummary || "").slice(0, 500)
      };
    });
    const requestedTip = Number(input?.tipAmount || 0);
    if (
      !Number.isFinite(requestedTip) ||
      requestedTip < 0 ||
      requestedTip > Math.min(total * 0.5, 100_000)
    ) {
      return json({ error: "invalid tip amount" }, 400);
    }
    const { data: businessProfile, error: profileError } = await admin
      .from("business_profile")
      .select("delivery_fee,delivery_free_min")
      .limit(1)
      .maybeSingle();
    if (profileError) return json({ error: "business configuration unavailable" }, 503);
    const configuredDeliveryFee = Number(businessProfile?.delivery_fee || 0);
    const deliveryFreeMin = Number(businessProfile?.delivery_free_min || 0);
    const deliveryFee =
      orderType === "delivery" && !(deliveryFreeMin > 0 && total >= deliveryFreeMin)
        ? configuredDeliveryFee
        : 0;
    const grandTotal = Number((total + deliveryFee + requestedTip).toFixed(2));

    const orderId = `web-${crypto.randomUUID()}`;
    const idempotencyKey = `public:${await sha256(
      `${rateSalt}:${clientHash}:${providedIdempotencyKey}`
    )}`;
    const payload = {
      id: orderId,
      idempotency_key: idempotencyKey,
      created_at: now.toISOString(),
      source: "public_menu",
      order_type: orderType,
      type: orderType === "salon" ? "Mesa" : "Llevar",
      price_list:
        orderType === "delivery" ? "Delivery" : orderType === "takeaway" ? "Takeaway" : "Salon",
      table_number: tableNumber || null,
      client_name: customerName,
      client_phone: customerPhone,
      client_address: clientAddress || null,
      items,
      status: "Recibido",
      subtotal: Number(total.toFixed(2)),
      discount: 0,
      tax: 0,
      total: grandTotal,
      tip_amount: Number(requestedTip.toFixed(2)),
      delivery_fee: Number(deliveryFee.toFixed(2))
    };

    const { data: saved, error } = await admin.rpc("save_order_transaction", {
      p_order: payload,
      p_idempotency_key: idempotencyKey
    });
    if (error) return json({ error: error.message }, 409);
    return json({ order: saved }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid request";
    return json({ error: message }, 400);
  }
});
