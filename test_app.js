import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://idjecovmqlyjhflfakfr.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkamVjb3ZtcWx5amhmbGZha2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NDgzMDYsImV4cCI6MjA5ODUyNDMwNn0.ERhlMTS-ElRhghi10ZNXPi8IvUw9N3O-p8yuPJk6GIY";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testApp() {
  console.log("====================================================");
  console.log("   CAFÉ PUGLIA PRO - SUITE DE TEST INTEGRADO (DB)   ");
  console.log("====================================================");
  console.log("Fecha/Hora:", new Date().toLocaleString("es-AR"));
  console.log("URL de Conexión:", supabaseUrl);
  console.log("----------------------------------------------------\n");

  const tables = [
    { name: "users_accounts", desc: "Cuentas del personal y roles" },
    { name: "menu_items", desc: "Carta de productos y stock" },
    { name: "orders", desc: "Comandas y estados" },
    { name: "client_accounts", desc: "Cuentas corrientes (Fiado)" },
    { name: "reservations", desc: "Reservas de mesas del salón" },
    { name: "barista_calibrations", desc: "Calibración diaria del barista" },
    { name: "system_settings", desc: "Configuraciones globales" }
  ];

  let successCount = 0;

  for (const table of tables) {
    process.stdout.write(`Testing [${table.name}] (${table.desc})... `);
    try {
      const { data, error } = await supabase.from(table.name).select("*").limit(1);
      if (error) {
        console.log(`❌ ERROR: ${error.message}`);
      } else {
        const { count, error: countError } = await supabase.from(table.name).select("*", { count: 'exact', head: true });
        const size = countError ? "?" : count;
        console.log(`✅ OK (${size} registros)`);
        successCount++;
      }
    } catch (err) {
      console.log(`❌ EXCEPCIÓN: ${err.message}`);
    }
  }

  console.log("\n----------------------------------------------------");
  console.log(`RESULTADO FINAL: ${successCount}/${tables.length} tablas verificadas con éxito.`);
  console.log("====================================================");
}

testApp();
