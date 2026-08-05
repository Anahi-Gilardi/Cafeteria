import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
const globalHeaders = config.headers?.find((entry) => entry.source === "/(.*)")?.headers || [];
const headerValue = (name) =>
  globalHeaders.find((header) => header.key.toLowerCase() === name.toLowerCase())?.value || "";

const permissionsPolicy = headerValue("Permissions-Policy");
const contentSecurityPolicy = headerValue("Content-Security-Policy");
const errors = [];

if (!permissionsPolicy.includes("geolocation=(self)")) {
  errors.push("Permissions-Policy debe permitir geolocation para el propio sitio");
}
if (permissionsPolicy.includes("geolocation=()")) {
  errors.push("Permissions-Policy está bloqueando geolocation");
}
if (!contentSecurityPolicy.includes("https://*.tile.openstreetmap.org")) {
  errors.push("Content-Security-Policy debe permitir las teselas de OpenStreetMap");
}

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log("OK: Vercel permite geolocalización propia y mapas de OpenStreetMap");
}
