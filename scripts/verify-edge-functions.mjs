import dotenv from "dotenv";

dotenv.config({ path: ".env.development.local" });
dotenv.config();

const baseUrl = (process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

if (!baseUrl || !anonKey) {
  throw new Error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY para probar Edge Functions.");
}

const allowedOrigins = [
  "https://cafeteria-ten-pied.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];
const functionNames = [
  "create-public-order",
  "create-public-reservation",
  "create-waiter-call",
  "barista-assistant",
  "manage-staff",
  "arca-authorize"
];

for (const functionName of functionNames) {
  const functionUrl = `${baseUrl}/functions/v1/${functionName}`;
  for (const origin of allowedOrigins) {
    const response = await fetch(functionUrl, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        apikey: anonKey
      }
    });
    const returnedOrigin = response.headers.get("access-control-allow-origin");
    if (response.status !== 204 || returnedOrigin !== origin) {
      throw new Error(`${functionName}: CORS permitido incorrecto para ${origin}: ${response.status} / ${returnedOrigin}`);
    }
  }
  console.log(`OK CORS permitido: ${functionName}`);

  const rejected = await fetch(functionUrl, {
    method: "OPTIONS",
    headers: {
      Origin: "https://example.invalid",
      "Access-Control-Request-Method": "POST",
      apikey: anonKey
    }
  });
  if (rejected.status !== 403 || rejected.headers.has("access-control-allow-origin")) {
    throw new Error(`${functionName}: CORS hostil no fue bloqueado (${rejected.status})`);
  }
  console.log(`OK CORS hostil bloqueado: ${functionName}`);
}

for (const publicFunction of ["create-public-order", "create-public-reservation", "create-waiter-call", "barista-assistant"]) {
  const response = await fetch(`${baseUrl}/functions/v1/${publicFunction}`, {
    method: "POST",
    headers: {
      Origin: "https://cafeteria-ten-pied.vercel.app",
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`
    },
    body: JSON.stringify({ padding: "x".repeat(31_000) })
  });
  if (response.status !== 413) {
    throw new Error(`${publicFunction} no rechazó una carga excesiva (${response.status})`);
  }
  console.log(`OK límite de carga: ${publicFunction}`);
}

for (const protectedFunction of ["manage-staff", "arca-authorize"]) {
  const response = await fetch(`${baseUrl}/functions/v1/${protectedFunction}`, {
    method: "POST",
    headers: {
      Origin: "https://cafeteria-ten-pied.vercel.app",
      "Content-Type": "application/json",
      apikey: anonKey
    },
    body: "{}"
  });
  if (![401, 403].includes(response.status)) {
    throw new Error(`${protectedFunction} aceptó una llamada anónima (${response.status})`);
  }
  console.log(`OK autenticación requerida: ${protectedFunction} (${response.status})`);
}
