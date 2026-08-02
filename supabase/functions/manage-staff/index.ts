import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, isAllowedOrigin } from "../_shared/cors.ts";

type StaffRole = "administrador" | "dueño" | "cajero" | "barista" | "mesero";

const allowedRoles = new Set<StaffRole>([
  "administrador",
  "dueño",
  "cajero",
  "barista",
  "mesero"
]);

Deno.serve(async (request) => {
  const corsHeaders = getCorsHeaders(request);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
  if (request.method === "OPTIONS") {
    return new Response(null, { status: isAllowedOrigin(request) ? 204 : 403, headers: corsHeaders });
  }
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!isAllowedOrigin(request)) {
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
      if (role === "dueño" && actor.role !== "dueño") {
        return json({ error: "only an owner can create another owner" }, 403);
      }
      if (
        profile.permissions !== undefined &&
        (!Array.isArray(profile.permissions) ||
          profile.permissions.length > 50 ||
          profile.permissions.some((permission: unknown) =>
            typeof permission !== "string" || permission.length > 80
          ))
      ) {
        return json({ error: "invalid permissions" }, 400);
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
      const { data: target } = await adminClient
        .from("users_accounts")
        .select("id, auth_user_id, role, active")
        .eq("id", id)
        .maybeSingle();
      if (!target) return json({ error: "staff profile not found" }, 404);
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
      if (
        target.auth_user_id === user.id &&
        (Object.prototype.hasOwnProperty.call(allowed, "role") || allowed.active === false)
      ) {
        return json({ error: "cannot change role or deactivate active account" }, 409);
      }
      if (
        actor.role !== "dueño" &&
        (target.role === "dueño" || allowed.role === "dueño")
      ) {
        return json({ error: "only an owner can manage owner accounts" }, 403);
      }
      if (allowed.name !== undefined && String(allowed.name).trim().length < 2) {
        return json({ error: "invalid name" }, 400);
      }
      for (const numericField of ["sueldo", "antiguedad"]) {
        if (
          allowed[numericField] !== undefined &&
          (!Number.isFinite(Number(allowed[numericField])) || Number(allowed[numericField]) < 0)
        ) {
          return json({ error: `invalid ${numericField}` }, 400);
        }
      }
      if (
        allowed.permissions !== undefined &&
        (!Array.isArray(allowed.permissions) ||
          allowed.permissions.length > 50 ||
          allowed.permissions.some((permission) =>
            typeof permission !== "string" || permission.length > 80
          ))
      ) {
        return json({ error: "invalid permissions" }, 400);
      }
      const removesActiveOwner =
        target.role === "dueño" &&
        (allowed.active === false || (allowed.role !== undefined && allowed.role !== "dueño"));
      if (removesActiveOwner && target.active) {
        const { count } = await adminClient
          .from("users_accounts")
          .select("id", { count: "exact", head: true })
          .eq("role", "dueño")
          .eq("active", true);
        if ((count || 0) <= 1) return json({ error: "cannot remove the last active owner" }, 409);
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
        .select("auth_user_id, email, role")
        .eq("id", id)
        .single();
      if (!target?.auth_user_id) return json({ error: "staff profile not found" }, 404);
      if (target.auth_user_id === user.id) return json({ error: "cannot delete active account" }, 409);
      if (target.role === "dueño" && actor.role !== "dueño") {
        return json({ error: "only an owner can delete owner accounts" }, 403);
      }
      if (target.role === "dueño") {
        const { count } = await adminClient
          .from("users_accounts")
          .select("id", { count: "exact", head: true })
          .eq("role", "dueño")
          .eq("active", true);
        if ((count || 0) <= 1) return json({ error: "cannot delete the last active owner" }, 409);
      }

      // Remove authorization first. If Auth cleanup fails afterwards, the orphaned
      // identity cannot access the application because it no longer has a profile.
      const { error: profileDeleteError } = await adminClient
        .from("users_accounts")
        .delete()
        .eq("id", id);
      if (profileDeleteError) return json({ error: profileDeleteError.message }, 400);

      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(target.auth_user_id);
      if (authDeleteError) {
        await adminClient.from("audit_logs").insert({
          actor_id: user.id,
          action: "staff.auth_cleanup_failed",
          entity_name: "users_accounts",
          entity_id: id,
          payload: { email: target.email, error: authDeleteError.message }
        });
        return json({ error: "profile removed but auth cleanup failed" }, 500);
      }
      await adminClient.from("audit_logs").insert({
        actor_id: user.id,
        action: "staff.deleted",
        entity_name: "users_accounts",
        entity_id: id,
        payload: { email: target.email, role: target.role }
      });
      return json({ success: true });
    }

    return json({ error: "unsupported action" }, 400);
  } catch {
    return json({ error: "invalid request" }, 400);
  }
});
