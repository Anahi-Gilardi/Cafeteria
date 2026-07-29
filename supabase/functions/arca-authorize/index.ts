import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type FiscalStatus =
  | "draft"
  | "authorizing"
  | "authorized"
  | "observed"
  | "rejected"
  | "uncertain";

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

function responseFromRow(row: Record<string, unknown>) {
  const pointOfSale = Number(row.point_of_sale || 0);
  const invoiceNumber = row.invoice_number ? Number(row.invoice_number) : null;
  return {
    success: row.status === "authorized" || row.status === "observed",
    status: row.status as FiscalStatus,
    cae: row.cae || undefined,
    caeExpiration: row.cae_expiration || undefined,
    invoiceNumber: invoiceNumber
      ? `${String(pointOfSale).padStart(5, "0")}-${String(invoiceNumber).padStart(8, "0")}`
      : undefined,
    qrCodeUrl: row.qr_url || undefined,
    issuerCuit: row.issuer_cuit || undefined,
    issuerName: row.issuer_name || undefined,
    issuerAddress: row.issuer_address || undefined,
    observations: row.observations || [],
    errors: row.errors || [],
    environment: row.environment
  };
}

function buildQrUrl(data: Record<string, unknown>) {
  return `https://www.arca.gob.ar/fe/qr/?p=${btoa(JSON.stringify(data))}`;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!appOrigin || request.headers.get("origin") !== appOrigin) {
    return json({ error: "origin not allowed" }, 403);
  }
  if (Number(request.headers.get("content-length") || 0) > 20_000) {
    return json({ error: "payload too large" }, 413);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "server configuration incomplete" }, 503);
  }

  const bearer = request.headers.get("authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: bearer } },
    auth: { persistSession: false }
  });
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });
  const {
    data: { user },
    error: authError
  } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: "authentication required" }, 401);

  const { data: actor } = await adminClient
    .from("users_accounts")
    .select("role, active")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!actor?.active || !["administrador", "dueño", "cajero"].includes(actor.role)) {
    return json({ error: "billing role required" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const orderId = String(body.orderId || "").trim();
  const invoiceType = String(body.invoiceType || "");
  const cleanDocument = String(body.customerCuitDni || "").replace(/\D/g, "");
  const customerName = String(body.customerName || "").trim().slice(0, 160);
  const idempotencyKey = String(body.idempotencyKey || "").trim().slice(0, 180);
  if (
    !orderId ||
    !["A", "B", "C"].includes(invoiceType) ||
    ![8, 11].includes(cleanDocument.length) ||
    !customerName ||
    !idempotencyKey
  ) {
    return json({ error: "invalid fiscal request" }, 400);
  }

  const { data: existing } = await adminClient
    .from("fiscal_invoices")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing && !["draft", "uncertain"].includes(existing.status)) {
    return json(responseFromRow(existing));
  }

  const { data: order, error: orderError } = await adminClient
    .from("orders")
    .select("id, total, items, created_at")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError || !order) return json({ error: "order not found" }, 404);
  if (!(Number(order.total) > 0) || !Array.isArray(order.items) || order.items.length === 0) {
    return json({ error: "order is not billable" }, 409);
  }

  const itemIds = [
    ...new Set(
      order.items
        .map((item: any) => String(item?.itemId || ""))
        .filter(Boolean)
    )
  ];
  if (order.items.some((item: any) => !String(item?.itemId || ""))) {
    return json({
      success: false,
      status: "draft",
      errors: [
        "Los conceptos manuales requieren ficha fiscal de ítem y unidad antes de solicitar CAE."
      ]
    });
  }
  const { data: fiscalCatalog, error: catalogError } = await adminClient
    .from("menu_items")
    .select("id, name, vat_rate, arca_item_code, arca_unit_code, fiscal_enabled")
    .in("id", itemIds);
  if (catalogError || !fiscalCatalog || fiscalCatalog.length !== itemIds.length) {
    return json({
      success: false,
      status: "draft",
      errors: ["No se pudo validar la ficha fiscal completa de los productos."]
    });
  }
  const catalogById = new Map(fiscalCatalog.map((item) => [item.id, item]));
  const allowedVatRates = new Set([0, 10.5, 21, 27]);
  const unconfigured = fiscalCatalog.filter(
    (item) =>
      !item.fiscal_enabled ||
      !allowedVatRates.has(Number(item.vat_rate)) ||
      !item.arca_item_code ||
      !item.arca_unit_code
  );
  if (unconfigured.length) {
    return json({
      success: false,
      status: "draft",
      errors: [
        `Ficha fiscal pendiente: ${unconfigured.map((item) => item.name).join(", ")}.`
      ]
    });
  }

  const environment =
    Deno.env.get("ARCA_ENVIRONMENT") === "production" ? "production" : "homologation";
  const issuerCuit = String(Deno.env.get("ARCA_CUIT") || "").replace(/\D/g, "");
  const pointOfSale = Number(Deno.env.get("ARCA_POINT_OF_SALE") || 0);
  const authorizerUrl = Deno.env.get("ARCA_AUTHORIZER_URL") || "";
  const authorizerToken = Deno.env.get("ARCA_AUTHORIZER_TOKEN") || "";
  const { data: businessProfile, error: businessError } = await adminClient
    .from("business_profile")
    .select("name,cuit,address,city,province,pos_number")
    .limit(1)
    .maybeSingle();
  if (businessError || !businessProfile) {
    return json({
      success: false,
      status: "draft",
      errors: ["El perfil fiscal real del comercio no está configurado."]
    });
  }
  const profileCuit = String(businessProfile.cuit || "").replace(/\D/g, "");
  if (profileCuit !== issuerCuit || Number(businessProfile.pos_number) !== pointOfSale) {
    return json({
      success: false,
      status: "draft",
      errors: ["El CUIT o punto de venta del perfil no coincide con la configuración fiscal del servidor."]
    });
  }
  const voucherType = invoiceType === "A" ? 1 : invoiceType === "B" ? 6 : 11;
  const documentType = cleanDocument.length === 11 ? 80 : 96;
  const total = Number(Number(order.total).toFixed(2));
  const grossBeforeDiscount = order.items.reduce(
    (sum: number, item: any) => sum + Number(item.price) * Number(item.quantity),
    0
  );
  if (!(grossBeforeDiscount > 0) || total > grossBeforeDiscount + 0.01) {
    return json({
      success: false,
      status: "draft",
      errors: ["Los importes de la comanda no concilian con sus ítems."]
    });
  }
  const discountFactor = total / grossBeforeDiscount;
  const fiscalItems = order.items.map((item: any) => {
    const profile = catalogById.get(String(item.itemId))!;
    const vatRate = Number(profile.vat_rate);
    const gross = Number(
      (Number(item.price) * Number(item.quantity) * discountFactor).toFixed(2)
    );
    const net = Number((gross / (1 + vatRate / 100)).toFixed(2));
    return {
      itemId: profile.id,
      itemCode: profile.arca_item_code,
      unitCode: profile.arca_unit_code,
      description: profile.name,
      quantity: Number(item.quantity),
      unitPrice: Number(item.price),
      vatRate,
      gross,
      net,
      vat: Number((gross - net).toFixed(2))
    };
  });
  const roundedGross = fiscalItems.reduce((sum, item) => sum + item.gross, 0);
  const roundingDelta = Number((total - roundedGross).toFixed(2));
  if (roundingDelta !== 0 && fiscalItems.length > 0) {
    const last = fiscalItems[fiscalItems.length - 1];
    last.gross = Number((last.gross + roundingDelta).toFixed(2));
    last.net = Number((last.gross / (1 + last.vatRate / 100)).toFixed(2));
    last.vat = Number((last.gross - last.net).toFixed(2));
  }
  const net = Number(fiscalItems.reduce((sum, item) => sum + item.net, 0).toFixed(2));
  const vat = Number((total - net).toFixed(2));
  const snapshot = {
    orderId,
    invoiceType: voucherType,
    documentType,
    documentNumber: cleanDocument,
    customerName,
    total,
    net,
    vat,
    currency: "PES",
    currencyRate: 1,
    concept: 1,
    items: fiscalItems
  };

  const baseRecord = {
    order_id: orderId,
    idempotency_key: idempotencyKey,
    environment,
    authorization_method: "CAE",
    status: "authorizing",
    invoice_type: voucherType,
    point_of_sale: pointOfSale || 1,
    issuer_cuit: profileCuit,
    issuer_name: businessProfile.name,
    issuer_address: [businessProfile.address, businessProfile.city, businessProfile.province]
      .filter(Boolean)
      .join(", "),
    total,
    request_snapshot: snapshot,
    requested_by: user.id,
    updated_at: new Date().toISOString()
  };
  const { data: fiscalRow, error: fiscalError } = await adminClient
    .from("fiscal_invoices")
    .upsert(baseRecord, { onConflict: "idempotency_key" })
    .select("*")
    .single();
  if (fiscalError || !fiscalRow) {
    return json({ error: fiscalError?.message || "fiscal persistence failed" }, 500);
  }

  if (
    issuerCuit.length !== 11 ||
    !Number.isInteger(pointOfSale) ||
    pointOfSale <= 0 ||
    !authorizerUrl ||
    !authorizerToken
  ) {
    const errors = [
      "ARCA no está configurado en el servidor. Faltan CUIT, punto de venta o autorizador fiscal seguro."
    ];
    const { data: draft } = await adminClient
      .from("fiscal_invoices")
      .update({ status: "draft", errors, updated_at: new Date().toISOString() })
      .eq("id", fiscalRow.id)
      .select("*")
      .single();
    return json(responseFromRow(draft || { ...fiscalRow, status: "draft", errors }));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45_000);
  try {
    const providerResponse = await fetch(authorizerUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${authorizerToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify({
        environment,
        issuerCuit,
        pointOfSale,
        ...snapshot
      }),
      signal: controller.signal
    });
    const providerData = await providerResponse.json().catch(() => ({}));
    const result = String(providerData.result || "").toUpperCase();
    const observations = Array.isArray(providerData.observations)
      ? providerData.observations.map(String)
      : [];
    const errors = Array.isArray(providerData.errors)
      ? providerData.errors.map(String)
      : [];

    if (!providerResponse.ok || !["A", "O", "R"].includes(result)) {
      const { data: rejected } = await adminClient
        .from("fiscal_invoices")
        .update({
          status: "rejected",
          observations,
          errors: errors.length ? errors : ["Respuesta fiscal rechazada o inválida."],
          response_snapshot: providerData,
          updated_at: new Date().toISOString()
        })
        .eq("id", fiscalRow.id)
        .select("*")
        .single();
      return json(responseFromRow(rejected || fiscalRow));
    }

    if (result === "R") {
      const { data: rejected } = await adminClient
        .from("fiscal_invoices")
        .update({
          status: "rejected",
          observations,
          errors,
          response_snapshot: providerData,
          updated_at: new Date().toISOString()
        })
        .eq("id", fiscalRow.id)
        .select("*")
        .single();
      return json(responseFromRow(rejected || fiscalRow));
    }

    const cae = String(providerData.cae || "").replace(/\D/g, "");
    const caeExpiration = String(providerData.caeExpiration || "");
    const invoiceNumber = Number(providerData.invoiceNumber);
    if (
      cae.length < 12 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(caeExpiration) ||
      !Number.isSafeInteger(invoiceNumber) ||
      invoiceNumber <= 0
    ) {
      throw new Error("La autorización no contiene CAE, vencimiento o número válidos.");
    }

    const qrUrl = buildQrUrl({
      ver: 1,
      fecha: new Date(order.created_at).toISOString().slice(0, 10),
      cuit: Number(issuerCuit),
      ptoVta: pointOfSale,
      tipoCmp: voucherType,
      nroCmp: invoiceNumber,
      importe: total,
      moneda: "PES",
      ctz: 1,
      tipoDocRec: documentType,
      nroDocRec: Number(cleanDocument),
      tipoCodAut: "E",
      codAut: Number(cae)
    });
    const status: FiscalStatus = result === "O" ? "observed" : "authorized";
    const { data: authorized, error: updateError } = await adminClient
      .from("fiscal_invoices")
      .update({
        status,
        invoice_number: invoiceNumber,
        cae,
        cae_expiration: caeExpiration,
        qr_url: qrUrl,
        observations,
        errors,
        response_snapshot: providerData,
        updated_at: new Date().toISOString()
      })
      .eq("id", fiscalRow.id)
      .select("*")
      .single();
    if (updateError || !authorized) throw updateError || new Error("authorization was not persisted");
    return json(responseFromRow(authorized));
  } catch (error) {
    const errors = [
      error instanceof Error ? error.message : "Resultado fiscal desconocido; requiere conciliación."
    ];
    const { data: uncertain } = await adminClient
      .from("fiscal_invoices")
      .update({ status: "uncertain", errors, updated_at: new Date().toISOString() })
      .eq("id", fiscalRow.id)
      .select("*")
      .single();
    return json(responseFromRow(uncertain || { ...fiscalRow, status: "uncertain", errors }));
  } finally {
    clearTimeout(timeoutId);
  }
});
