# Castaño — Resto Bar

Aplicación web de carta pública, POS, comandas, cocina, caja, inventario y facturación electrónica.

## Desarrollo local

Requisitos: Node.js 20 o superior.

```bash
npm install
copy .env.example .env.development.local
npm run dev
```

Complete en `.env.development.local` únicamente las variables públicas `VITE_SUPABASE_*`.
Las claves de servicio, Gemini y ARCA se configuran como secretos de Supabase Edge Functions;
nunca deben llevar el prefijo `VITE_` ni almacenarse en el navegador.

## Validación

```bash
npm run check
npm run test:db
npm run test:e2e
```

- `check`: TypeScript, pruebas unitarias y build.
- `test:db`: verifica el proyecto canónico `qavpleanmjbxbwfzismp`, las tablas y el aislamiento anónimo.
- `test:e2e`: comprueba portada, carta y autenticación con Chromium.

## Supabase

La única fuente de verdad del esquema es la secuencia versionada de `supabase/migrations/`.
Los esquemas heredados con usuarios, PIN o contraseñas locales fueron retirados.

Consulte [DEPLOYMENT.md](./supabase/DEPLOYMENT.md) para aplicar la migración, desplegar las
funciones y crear el primer administrador.
