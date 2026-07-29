import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type StaffRole = "administrador" | "dueño" | "cajero" | "barista" | "mesero";

const allowedRoles = new Set<StaffRole>([
  "administrador",
  "dueño",
  "cajero",
  "barista",
  "mesero"
]);

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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!appOrigin || request.headers.get("origin") !== appOrigin) {
    return json({ error: "origin not allowed" }, 403);
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 20_000) return json({ error: "payload too large" }, 413);

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
    error: userError
  } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "authentication required" }, 401);

  const { data: actor } = await adminClient
    .from("users_accounts")
    .select("id, role, active")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!actor?.active || !["administrador", "dueño"].includes(actor.role)) {
    return json({ error: "administrator role required" }, 403);
  }

  try {
    const body = await request.json();
    const action = body?.action;

    if (action === "create") {
      const profile = body?.profile || {};
      const email = String(profile.email || "").trim().toLowerCase();
      const password = String(profile.password || "");
      const name = String(profile.name || "").trim();
      const role = profile.role as StaffRole;

      if (!email.includes("@") || name.length < 2 || password.length < 12 || !allowedRoles.has(role)) {
        return json({ error: "invalid staff profile or weak password" }, 400);
      }

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role }
      });
      if (createError || !created.user) {
        return json({ error: createError?.message || "auth user creation failed" }, 400);
      }

      const staffId = crypto.randomUUID();
      const { data: saved, error: profileError } = await adminClient
        .from("users_accounts")
        .insert({
          id: staffId,
          auth_user_id: created.user.id,
          name,
          email,
          role,
          active: true,
          direccion: profile.direccion || null,
          telefono: profile.telefono || null,
          telefono_contacto: profile.telefono_contacto || null,
          sueldo: Number(profile.sueldo || 0),
          antiguedad: Number(profile.antiguedad || 0),
          permissions: Array.isArray(profile.permissions) ? profile.permissions : []
        })
        .select("id, auth_user_id, name, email, role, active, direccion, telefono, telefono_contacto, sueldo, antiguedad, permissions")
        .single();

      if (profileError) {
        await adminClient.auth.admin.deleteUser(created.user.id);
        return json({ error: profileError.message }, 400);
      }

      await adminClient.from("audit_logs").insert({
        actor_id: user.id,
        action: "staff.created",
        entity_name: "users_accounts",
        entity_id: staffId,
        payload: { email, role }
      });
      return json({ profile: saved }, 201);
    }

    if (action === "update") {
      const id = String(body?.id || "");
      const changes = body?.changes || {};
      const allowed: Record<string, unknown> = {};
      for (const key of [
        "name",
        "role",
        "active",
        "direccion",
        "telefono",
        "telefono_contacto",
        "sueldo",
        "antiguedad",
        "permissions"
      ]) {
        if (Object.prototype.hasOwnProperty.call(changes, key)) allowed[key] = changes[key];
      }
      if (allowed.role && !allowedRoles.has(allowed.role as StaffRole)) {
        return json({ error: "invalid role" }, 400);
      }

      const { data: saved, error } = await adminClient
        .from("users_accounts")
        .update({ ...allowed, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id, auth_user_id, name, email, role, active, direccion, telefono, telefono_contacto, sueldo, antiguedad, permissions")
        .single();
      if (error) return json({ error: error.message }, 400);

      await adminClient.from("audit_logs").insert({
        actor_id: user.id,
        action: "staff.updated",
        entity_name: "users_accounts",
        entity_id: id,
        payload: { fields: Object.keys(allowed) }
      });
      return json({ profile: saved });
    }

    if (action === "delete") {
      const id = String(body?.id || "");
      const { data: target } = await adminClient
        .from("users_accounts")
        .select("auth_user_id")
        .eq("id", id)
        .single();
      if (!target?.auth_user_id) return json({ error: "staff profile not found" }, 404);
      if (target.auth_user_id === user.id) return json({ error: "cannot delete active account" }, 409);

      const { error } = await adminClient.auth.admin.deleteUser(target.auth_user_id);
      if (error) return json({ error: error.message }, 400);
      await adminClient.from("audit_logs").insert({
        actor_id: user.id,
        action: "staff.deleted",
        entity_name: "users_accounts",
        entity_id: id
      });
      return json({ success: true });
    }

    return json({ error: "unsupported action" }, 400);
  } catch {
    return json({ error: "invalid request" }, 400);
  }
});
