const DEFAULT_ALLOWED_ORIGINS = [
  "https://cafeteria-ten-pied.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

function allowedOrigins(): Set<string> {
  const configured = [
    Deno.env.get("APP_ORIGINS") || "",
    Deno.env.get("APP_ORIGIN") || ""
  ]
    .join(",")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);
}

export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")?.replace(/\/$/, "") || "";
  return Boolean(origin) && allowedOrigins().has(origin);
}

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin")?.replace(/\/$/, "") || "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
  if (origin && allowedOrigins().has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}
