import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.development.local", override: true });
dotenv.config({ path: ".env", override: false });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Faltan VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
const expectedRef = process.env.EXPECTED_SUPABASE_PROJECT_REF || "qavpleanmjbxbwfzismp";
if (projectRef !== expectedRef) {
  console.error(`Proyecto incorrecto: ${projectRef}. Se esperaba ${expectedRef}.`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const publicTables = [
  ["business_profile", "id"],
  ["daily_menu", "day_of_week,active"],
  ["menu_items", "id,name,price,stock,is_available,recipe"],
  ["product_images", "id,product_id"],
  ["restaurant_tables", "id,name,capacity,active"]
];
const protectedTables = [
  "insumos",
  "suppliers",
  "inventory_movements",
  "inventory_audits",
  "client_accounts",
  "users_accounts",
  "orders",
  "order_items",
  "archived_orders",
  "reservations",
  "waiter_calls",
  "cash_ledger",
  "cash_closures",
  "barista_calibrations",
  "system_settings",
  "staff_attendance",
  "audit_logs",
  "fiscal_invoices",
  "public_order_rate_limits"
];

let failures = 0;
console.log(`Supabase canónico: ${projectRef}`);

for (const [table, columns] of publicTables) {
  const { error } = await supabase.from(table).select(columns).limit(1);
  if (error) {
    failures += 1;
    console.error(
      `❌ ${table}: ${error.code || "sin-código"} ${error.message || JSON.stringify(error)}`
    );
  } else {
    const { count } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    console.log(`✅ ${table}: accesible (${count ?? 0} registros)`);
  }
}

for (const table of protectedTables) {
  const { error } = await supabase.from(table).select("*").limit(1);
  if (!error) {
    failures += 1;
    console.error(`❌ ${table}: lectura anónima habilitada; RLS/grants inseguros`);
  } else if (["PGRST205", "42P01"].includes(error.code)) {
    failures += 1;
    console.error(`❌ ${table}: tabla ausente`);
  } else {
    console.log(`✅ ${table}: existe y bloquea lectura anónima`);
  }
}

const { data: exposedUsers, error: sensitiveError } = await supabase
  .from("users_accounts")
  .select("password,pin")
  .limit(1);
if (!sensitiveError && exposedUsers?.length) {
  failures += 1;
  console.error("❌ users_accounts expone password/pin al cliente anónimo");
} else {
  console.log("✅ users_accounts no expone credenciales heredadas");
}

const { count: menuCount, error: menuError } = await supabase
  .from("menu_items")
  .select("id", { count: "exact", head: true });
if (menuError || !menuCount) {
  failures += 1;
  console.error("❌ La carta canónica está vacía o no responde");
}

const { error: protectedOrderRpcError } = await supabase.rpc(
  "persist_order_transaction",
  {
    p_order: {
      id: "anonymous-integrity-probe",
      items: [{ itemId: "probe", name: "Probe", quantity: 1, price: 0 }]
    },
    p_idempotency_key: "anonymous-integrity-probe"
  }
);
if (!protectedOrderRpcError) {
  failures += 1;
  console.error("❌ persist_order_transaction permite escritura anónima");
} else if (["PGRST202", "42883"].includes(protectedOrderRpcError.code)) {
  failures += 1;
  console.error("❌ persist_order_transaction no está instalada en Supabase");
} else {
  console.log("✅ persist_order_transaction existe y bloquea escritura anónima");
}

const { data: menuIntegrityRows } = await supabase
  .from("menu_items")
  .select("id,recipe,fiscal_enabled");
if (menuIntegrityRows) {
  const recipes = menuIntegrityRows.filter(
    (item) => Array.isArray(item.recipe) && item.recipe.length > 0
  ).length;
  const fiscal = menuIntegrityRows.filter((item) => item.fiscal_enabled).length;
  console.log(`ℹ️ Carta operativa: ${recipes}/${menuIntegrityRows.length} recetas; ${fiscal}/${menuIntegrityRows.length} fichas fiscales`);
}

console.log(`\nResultado: ${failures === 0 ? "LISTO" : `${failures} bloqueo(s)`}`);
process.exitCode = failures === 0 ? 0 : 1;
