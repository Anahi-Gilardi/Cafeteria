import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const appOrigin = Deno.env.get("APP_ORIGIN") || "";
const corsHeaders = {
  "Access-Control-Allow-Origin": appOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!appOrigin || request.headers.get("origin") !== appOrigin) {
    return json({ error: "origin not allowed" }, 403);
  }
  if (Number(request.headers.get("content-length") || 0) > 10_000) {
    return json({ error: "payload too large" }, 413);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const rateSalt = Deno.env.get("RATE_LIMIT_SALT");
  if (!supabaseUrl || !serviceKey || !rateSalt) {
    return json({ error: "server configuration incomplete" }, 503);
  }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const forwarded = request.headers.get("x-forwarded-for") || "unknown";
  const clientHash = `reservation:${await sha256(
    `${rateSalt}:${forwarded.split(",")[0].trim()}`
  )}`;
  const { data: allowed, error: rateError } = await admin.rpc(
    "consume_public_rate_limit",
    {
      p_client_hash: clientHash,
      p_window_seconds: 1800,
      p_max_requests: 5
    }
  );
  if (rateError) return json({ error: "rate limit unavailable" }, 503);
  if (!allowed) {
    return json({ error: "Se alcanzó el límite temporal de reservas." }, 429);
  }

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Solicitud inválida." }, 400);
  }
  const tableId = String(input.tableId || "").trim().slice(0, 60);
  const date = String(input.date || "");
  const timeSlot = String(input.timeSlot || "");
  const guests = Number(input.guests);
  const customerName = String(input.customerName || "").trim().slice(0, 120);
  const customerPhone = String(input.customerPhone || "")
    .replace(/[^\d+ ()-]/g, "")
    .trim()
    .slice(0, 30);
  const allowedSlots = new Set([
    "Desayuno",
    "Media Mañana",
    "Almuerzo",
    "Tarde",
    "Cena"
  ]);
  const requestedDate = new Date(`${date}T12:00:00Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const latestDate = new Date(today.getTime() + 180 * 86_400_000);
  if (
    !tableId ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(requestedDate.getTime()) ||
    requestedDate < today ||
    requestedDate > latestDate ||
    !allowedSlots.has(timeSlot) ||
    !Number.isInteger(guests) ||
    guests < 1 ||
    guests > 20 ||
    customerName.length < 2 ||
    customerPhone.replace(/\D/g, "").length < 7
  ) {
    return json({ error: "Los datos de la reserva no son válidos." }, 400);
  }

  const { data: table, error: tableError } = await admin
    .from("restaurant_tables")
    .select("id,name,capacity,active")
    .eq("id", tableId)
    .eq("active", true)
    .maybeSingle();
  if (tableError) return json({ error: "No se pudo validar la mesa." }, 503);
  if (!table || guests > Number(table.capacity)) {
    return json({ error: "La mesa no está disponible para esa cantidad de personas." }, 409);
  }

  const { data: collision, error: collisionError } = await admin
    .from("reservations")
    .select("id")
    .eq("table_id", tableId)
    .eq("date", date)
    .eq("time_slot", timeSlot)
    .in("status", ["pendiente", "confirmada"])
    .limit(1);
  if (collisionError) return json({ error: "No se pudo validar disponibilidad." }, 503);
  if (collision?.length) {
    return json({ error: "La mesa ya está reservada para ese turno." }, 409);
  }

  const id = `res-${crypto.randomUUID()}`;
  const referenceCode = `REF-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const { data: saved, error } = await admin
    .from("reservations")
    .insert({
      id,
      table_id: tableId,
      table_name: table.name,
      date,
      time_slot: timeSlot,
      guests,
      customer_name: customerName,
      customer_phone: customerPhone,
      reference_code: referenceCode,
      status: "confirmada"
    })
    .select("*")
    .single();
  if (error || !saved) return json({ error: error?.message || "No se pudo reservar." }, 409);

  return json(
    {
      reservation: {
        id: saved.id,
        tableId: saved.table_id,
        tableName: saved.table_name,
        date: saved.date,
        timeSlot: saved.time_slot,
        guests: saved.guests,
        customerName: saved.customer_name,
        customerPhone: saved.customer_phone,
        createdAt: saved.created_at,
        referenceCode: saved.reference_code
      }
    },
    201
  );
});
