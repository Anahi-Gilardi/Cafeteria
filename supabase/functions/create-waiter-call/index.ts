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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const rateSalt = Deno.env.get("RATE_LIMIT_SALT");
  if (!supabaseUrl || !serviceKey || !rateSalt) {
    return json({ error: "server configuration incomplete" }, 503);
  }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const forwarded = request.headers.get("x-forwarded-for") || "unknown";
  const clientHash = `waiter:${await sha256(`${rateSalt}:${forwarded.split(",")[0].trim()}`)}`;
  const { data: allowed, error: rateError } = await admin.rpc("consume_public_rate_limit", {
    p_client_hash: clientHash,
    p_window_seconds: 600,
    p_max_requests: 10
  });
  if (rateError) return json({ error: "rate limit unavailable" }, 503);
  if (!allowed) return json({ error: "too many requests" }, 429);

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return json({ error: "invalid request" }, 400);
  }
  const tableName = String(input.tableName || "").trim().slice(0, 80);
  const callType = String(input.type || "");
  const customerName = String(input.customerName || "").trim().slice(0, 120) || null;
  if (!tableName || !["call_waiter", "request_bill"].includes(callType)) {
    return json({ error: "invalid waiter call" }, 400);
  }
  const { data: table, error: tableError } = await admin
    .from("restaurant_tables")
    .select("name")
    .eq("name", tableName)
    .eq("active", true)
    .maybeSingle();
  if (tableError) return json({ error: "table validation unavailable" }, 503);
  if (!table) return json({ error: "active table not found" }, 404);

  const { data, error } = await admin
    .from("waiter_calls")
    .insert({
      table_name: table.name,
      call_type: callType,
      customer_name: customerName,
      status: "pending"
    })
    .select("*")
    .single();
  if (error) return json({ error: error.message }, 409);
  return json({ call: data }, 201);
});
