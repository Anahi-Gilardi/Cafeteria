# Revisión integral y plan de fichaje — 4 de agosto de 2026

## Resultado de esta iteración

El módulo de Personal quedó preparado para un fichaje verificable con:

- mapa gratuito Leaflet + OpenStreetMap, con atribución visible;
- punto del local en Constitución 944, Río Cuarto (`-33.1256089, -64.3502370`);
- permiso de ubicación solicitado por una acción explícita del usuario;
- compatibilidad con la API web estándar de geolocalización en computadora y teléfono;
- lectura nueva al confirmar cada ingreso y cada egreso;
- radio operativo de 100 m y precisión máxima de 150 m;
- identidad tomada de la sesión Supabase Auth, sin selector libre de empleado;
- validación de identidad, distancia, precisión, secuencia y hora en PostgreSQL;
- coordenadas separadas para ingreso y egreso;
- historial, CSV y PDF basados en `staff_attendance`;
- rechazo explícito ante GPS bloqueado, impreciso, fuera de rango, sin red o sin sesión.

Se retiraron los reemplazos que asignaban las coordenadas del local cuando el GPS fallaba y los
scripts heredados que creaban tablas alternativas sin RLS.

## Evidencia de pruebas

| Control | Resultado |
|---|---|
| TypeScript + unitarias + build (`npm run check`) | Correcto |
| Vitest | 55/55 |
| Playwright | 6/6 |
| Fichaje E2E | Permiso, identidad, ingreso, egreso y vista móvil correctos |
| Edge Functions | CORS, límites de carga y autenticación correctos |
| Dependencias (`npm audit --audit-level=high`) | 0 vulnerabilidades conocidas |
| Navegador local | Portada sin errores de consola |

## Bloqueo antes de publicar

El proyecto Supabase remoto todavía presenta drift: `npm run test:db` detectó lectura anónima en
9 tablas privadas (`insumos`, `suppliers`, `client_accounts`, `users_accounts`, `orders`,
`reservations`, `cash_ledger`, `barista_calibrations` y `system_settings`). El frontend no debe
publicarse hasta aplicar y verificar las migraciones nuevas:

1. `202608040001_secure_attendance_geofence.sql`;
2. `202608040002_restore_private_rls.sql`.

## Orden de despliegue recomendado (P0)

1. Realizar un respaldo verificable del Supabase canónico.
2. Aplicar todas las migraciones pendientes en orden.
3. Ejecutar `npm run test:db`; el resultado debe ser `LISTO`.
4. Confirmar que cada empleado tiene una identidad Supabase Auth vinculada a su perfil activo.
5. Probar físicamente en Constitución 944 con una computadora y un teléfono:
   - permiso concedido;
   - permiso denegado;
   - ingreso válido;
   - segundo ingreso rechazado;
   - egreso válido;
   - segundo egreso rechazado;
   - ubicación fuera de 100 m rechazada;
   - precisión mayor a 150 m rechazada.
6. Ajustar el punto o radio sólo después de medir la entrada real del local.
7. Desplegar el frontend y repetir un smoke test sin efectuar cobros ni facturación fiscal real.

## Revisión general del programa

Durante la revisión se corrigieron regresiones que devolvían éxito local cuando Supabase rechazaba
una comanda, un cobro, un pago mixto o una apertura/cierre de caja. También se eliminaron
credenciales embebidas y la lectura directa de contraseñas desde `users_accounts`; Supabase Auth
vuelve a ser la única fuente de sesión.

Pendientes priorizados:

- **P0 — Seguridad remota:** aplicar la restauración de RLS y rotar cualquier credencial histórica.
- **P1 — Datos operativos:** sólo 6 de 29 productos tienen receta lista y 0 de 29 tienen ficha fiscal
  completa; no habilitar descuento automático de stock ni ARCA para los restantes.
- **P1 — Configuración:** mover punto, radio y precisión del fichaje a una configuración administrable
  y auditada, manteniendo la validación en servidor.
- **P1 — Excepciones:** diseñar un flujo de corrección del dueño con motivo obligatorio y auditoría;
  nunca un botón que sustituya el GPS por la sucursal.
- **P2 — Privacidad:** definir retención y acceso a coordenadas de personal en la política interna.
- **P2 — Rendimiento:** dividir `AdminHub` (aprox. 490 kB) y mantener PDF/mapa bajo carga diferida.
- **P2 — Observabilidad:** medir rechazos de GPS, precisión, latencia de RPC y fallos de sincronización
  sin registrar credenciales.

## Criterio de aceptación final

Una marca es válida únicamente cuando el empleado está autenticado con su propia cuenta, el
navegador entrega una coordenada reciente y suficientemente precisa, PostgreSQL confirma que está
dentro de la geocerca y la RPC devuelve la hora oficial. Ningún error puede transformarse en éxito
local ni en una ubicación inventada.
