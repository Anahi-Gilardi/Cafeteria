# Auditoría integral y plan de mejora

Fecha de corte: 1 de agosto de 2026 (America/Buenos_Aires)  
Repositorio: `Anahi-Gilardi/Cafeteria`  
Rama y commit auditados: `main` / `40ded96b2240a999b29ae46402a97e24af09f49c`  
Producción: `https://cafeteria-ten-pied.vercel.app/`  
Supabase: proyecto `qavpleanmjbxbwfzismp`

## Dictamen ejecutivo

La portada pública y la carta digital están disponibles, son responsivas y leen los 29 productos públicos. La base remota está saludable, las tres migraciones están sincronizadas y las seis Edge Functions están activas. Sin embargo, el sistema no está listo para operar cobros ni administración en producción de forma confiable.

Hay cuatro bloqueos P0:

1. La autenticación puede omitirse con contraseñas maestras triviales o un correo que contenga `admin`; además, una sesión guardada en `localStorage` se acepta sin revalidarla contra Supabase Auth.
2. El flujo de cobro agregado en el último commit elimina validaciones financieras y puede devolver `success: true` aunque hayan fallado tanto el RPC como la persistencia alternativa.
3. `npm run check` falla con siete errores TypeScript, pero Vite construye y Vercel despliega igualmente porque no existe CI ni protección de `main`.
4. Las Edge Functions permiten CORS solamente para `http://localhost:3000`; el dominio productivo recibe ese origen incorrecto y no puede invocarlas desde el navegador.

La recomendación es congelar nuevas funcionalidades y ejecutar primero la Fase 0 de este documento.

## Evidencia de pruebas

| Área | Prueba | Resultado |
|---|---|---|
| Tipos | `npm run lint` (`tsc --noEmit`) | **Falla**: 7 errores |
| Unitarias | Vitest | 5/5 pasan, un solo archivo de pruebas |
| E2E local | Playwright Chromium | 4/4 pasan |
| Build | Vite producción | Pasa; no ejecuta TypeScript |
| Dependencias | `npm audit --audit-level=high` | 0 vulnerabilidades conocidas |
| Supabase REST/RLS | `npm run test:db` | 24/24 contratos pasan |
| Migraciones | CLI local contra remoto | 3/3 sincronizadas |
| Edge Functions | CLI | 6/6 activas |
| PostgreSQL | locks, blocking, bloat, cache | Saludable; sin consultas bloqueadas |
| CORS producción | `OPTIONS` desde Vercel | **Falla** en 6/6 funciones |
| Funciones protegidas | llamada anónima | `manage-staff` y `arca-authorize`: 403 correcto |
| GitHub | rama/commit | Local y remoto sincronizados |
| GitHub Actions | workflows/runs | **No existen** |
| Rama `main` | branch protection | **No configurada** |
| Vercel | HTTP y rutas SPA | 200 para `/` y `/carta` |
| Web pública | escritorio y móvil | Portada/carta cargan, sin overflow ni imágenes rotas |
| Web interna | sesión existente | Carga visual, pero registra errores de consultas administrativas |

### Errores TypeScript actuales

- `AdminHub.tsx`: referencia a `setOrders` inexistente.
- `AdminHub.tsx`: referencia a `handleMergeTableToggle` inexistente.
- `ErrorBoundary.tsx` y `main.tsx`: tipos de `Component` incompletos; faltan dependencias explícitas `@types/react` y `@types/react-dom`.
- `SupabaseSyncService.ts`: se asigna `updatedAt` a un tipo que no lo declara y se usa `type: "Local"` aunque el contrato acepta `"Mesa" | "Llevar"`.

### Cobertura insuficiente

El proyecto tiene aproximadamente 23.643 líneas TypeScript/TSX y solamente 5 pruebas unitarias más 4 E2E. No hay pruebas automatizadas para:

- autenticación real, expiración de sesión y permisos por rol;
- alta de comanda, cambio de estado, archivo y restauración;
- cobro simple, pago mixto, descuento, cuenta corriente e idempotencia;
- fallos de red, cola offline y reconciliación;
- reservas, llamados al mozo, stock y cierres de caja;
- RPC y RLS con usuarios autenticados de cada rol;
- ARCA, Gemini y las Edge Functions desde el origen productivo.

Las E2E actuales simulan varias respuestas de Supabase. Son útiles para la presentación pública, pero no validan el circuito integrado real.

## Hallazgos priorizados

### P0 — Bloqueantes

#### P0.1 Autenticación insegura y sesión local confiada

`AuthService.loginWithCredentials` concede rol administrador cuando la contraseña es `1998`, `admin` o `1234`, o cuando el correo contiene `admin`. `getCurrentUser` y el listener de Auth aceptan el contenido de `castano_session_cache` sin verificar una sesión JWT válida.

Impacto: cualquier visitante que conozca o descubra el atajo puede abrir la interfaz administrativa. RLS evita parte del acceso remoto, pero el usuario ve y modifica estado local; además, el panel queda en un estado engañoso y registra errores al consultar Supabase.

Acción:

1. Eliminar completamente el bypass y toda autorización basada en `localStorage`.
2. Crear usuarios en Supabase Auth y enlazarlos a `users_accounts.auth_user_id`.
3. Hacer que el perfil y el rol siempre provengan de una sesión validada por Supabase.
4. Expirar y borrar cachés antiguas mediante una clave de versión.
5. Rotar todas las credenciales que fueron compartidas durante la configuración y revisar los tokens CLI activos.

Criterio de aceptación: ninguna contraseña especial ni correo especial abre el panel; una sesión ausente, vencida o sin perfil redirige al login; RLS permite los datos correspondientes a cada rol.

#### P0.2 Cobros con falso positivo e integridad financiera debilitada

El último commit:

- inventa un cupón si el operador no lo registra;
- elimina la validación de que un pago mixto coincida con el total;
- ignora `result.success` y completa la comanda igualmente;
- intenta un `upsert` directo desde el cliente si falla el RPC;
- devuelve `success: true` incluso cuando también falla ese fallback;
- cierra siempre la pantalla de cobro y muestra confirmación exitosa.

Impacto: una venta puede aparecer cobrada y archivada localmente sin asiento de caja ni persistencia en Supabase.

Acción:

1. Reponer las validaciones de cupón, importes positivos y suma exacta.
2. Usar un único RPC transaccional para pago, libro de caja, cuenta corriente, estado y auditoría.
3. Mantener idempotencia por `transaction_id`; nunca realizar un `upsert` financiero directo desde el navegador.
4. Ante error, conservar la comanda abierta, mostrar el fallo y permitir reintento seguro.
5. Agregar pruebas de fallo antes de volver a habilitar cobros productivos.

Criterio de aceptación: si Supabase falla no cambia el estado de la comanda ni se muestra éxito; el mismo `transaction_id` no duplica cobros; caja y pedido quedan consistentes en una sola transacción.

#### P0.3 CORS de Supabase incorrecto para producción

Las seis funciones responden `Access-Control-Allow-Origin: http://localhost:3000` incluso cuando el origen es `https://cafeteria-ten-pied.vercel.app`.

Acción: permitir una lista cerrada de orígenes (`localhost` para desarrollo y el dominio productivo), devolver el origen solicitado solamente si está autorizado y desplegar nuevamente las seis funciones.

Criterio de aceptación: el preflight del dominio productivo devuelve exactamente ese dominio y una solicitud desde un origen no autorizado no recibe permiso CORS.

#### P0.4 No existe puerta de calidad antes del deploy

GitHub no tiene workflows ni ejecuciones; `main` no está protegida. Vercel despliega aunque `tsc` falle.

Acción: crear GitHub Actions para instalación reproducible, TypeScript, unitarias, E2E, build, auditoría de dependencias y verificación de migraciones; configurar Vercel para depender del check y proteger `main`.

Criterio de aceptación: un commit con cualquiera de los errores actuales no puede fusionarse ni desplegarse a producción.

### P1 — Alta prioridad

#### P1.1 Cuenta y trazabilidad de Vercel

El repositorio registra un deployment exitoso del commit auditado, pero la CLI local está autenticada en otra cuenta/equipo y no puede inspeccionar el proyecto. El alias público tampoco coincide byte a byte con el build local, algo esperable si cambian variables, pero hoy no existe una trazabilidad reproducible.

Acción: vincular `.vercel/project.json` con el proyecto correcto, documentar propietario/equipo, sincronizar variables por ambiente y exponer SHA/versión en un endpoint o pie interno.

#### P1.2 Secretos funcionales incompletos

Supabase no tiene `GEMINI_API_KEY`, `GEMINI_MODEL` ni la configuración `ARCA_*` requerida. Las funciones están activas, pero esas capacidades no pueden completar su trabajo real.

Acción: configurar primero homologación ARCA, probar punta a punta y luego producción; cargar Gemini solo si el asistente quedará habilitado. Nunca colocar estos valores en Vite ni en el repositorio.

#### P1.3 Doble fuente de verdad y errores silenciosos

Hay 45 referencias a `localStorage`, 52 operaciones directas de Supabase y 13 bloques `catch` vacíos. El panel mostró datos locales mientras las consultas reales fallaban.

Acción: definir Supabase como fuente canónica; encapsular caché y cola offline en una capa con estados `pendiente/sincronizado/error/conflicto`; prohibir éxito silencioso y registrar errores estructurados.

#### P1.4 Monolito de interfaz

`AdminHub.tsx` tiene unas 9.535 líneas, `App.tsx` 1.040 y varios componentes superan 600–1.000 líneas. Esto aumenta regresiones y hace difícil probar dominios por separado.

Acción: separar por módulos (`orders`, `kitchen`, `cash`, `reservations`, `salon`, `inventory`, `staff`, `reports`) con hooks, servicios, validadores y componentes propios. Extraer primero cobros y comandas por criticidad.

#### P1.5 Datos maestros incompletos

Hay 29 productos, 5 pedidos, 8 ítems y 5 pedidos archivados. Permanecen vacías, entre otras, `business_profile`, `daily_menu`, `restaurant_tables`, `product_images`, reservas, inventario y caja.

Acción: definir qué tablas requieren datos iniciales, crear una migración/seed idempotente y un checklist de apertura. No confundir tabla existente con módulo operativo.

#### P1.6 Defectos de la web pública

- La portada muestra `0 Propuestas` aunque la carta carga 29 productos.
- La carta pública intenta leer `orders` anónimamente y genera un aviso 42501; la página pública no debería consultar comandas privadas.
- En la sesión interna fallaron dos imágenes remotas de Unsplash.

Acción: calcular el contador desde `menu_items`, desacoplar el tracker de pedidos del modo informativo y alojar imágenes críticas en Supabase Storage con optimización y fallback.

### P2 — Prioridad media

1. Activar `strict`, `noImplicitAny`, `strictNullChecks`, `noUnusedLocals` y `noUnusedParameters` en etapas; hoy hay 85 usos de `any`.
2. Agregar ESLint, Prettier y reglas para promesas ignoradas, `catch` vacíos y accesibilidad.
3. Reducir el bundle: 2,14 MB sin comprimir y unos 583 KB gzip. Cargar PDF, canvas y módulos administrativos solamente cuando se usan.
4. Añadir observabilidad: errores del frontend, Edge Functions, latencia, tasa de sincronización y fallos de cobro, sin registrar secretos ni datos sensibles.
5. Añadir pruebas de contratos TypeScript compartidos entre cliente, RPC y tablas.
6. Revisar dependencias menores; hacer las actualizaciones mayores por separado con pruebas de regresión.

### P3 — Calidad y mantenimiento

1. Cambiar `clean` por una alternativa multiplataforma; `rm -rf` no funciona nativamente en PowerShell.
2. Agregar `robots.txt`, `sitemap.xml`, política de caché para assets y cabeceras CSP, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`.
3. Mantener un runbook de despliegue, recuperación, rotación de secretos y restauración de base.
4. Versionar decisiones de arquitectura y contratos del dominio.

## Plan de implementación

### Fase 0 — Contención y seguridad

- Congelar cobros productivos.
- Eliminar bypass de login y caché confiada.
- Corregir los siete errores TypeScript.
- Revertir/reconstruir el flujo de cobro inseguro.
- Corregir CORS y rotar credenciales expuestas.
- Crear Auth real para administradores y perfiles enlazados.

Salida: `npm run check` verde, login real, cobro transaccional probado y preflight productivo correcto.

### Fase 1 — Entrega confiable

- GitHub Actions y protección de `main`.
- Proyecto Vercel vinculado a la cuenta/equipo correctos.
- Variables separadas para development, preview y production.
- Smoke test posterior al deploy y versión/SHA visible.

Salida: ningún deploy sin checks y cada publicación es trazable al commit y migraciones exactas.

### Fase 2 — Sincronización y dominio

- Fuente canónica única en Supabase.
- Cola offline explícita e idempotente.
- Refactor inicial de `orders`, `payments`, `cash` y `archive` fuera de `AdminHub`.
- Seeds de datos maestros y validación de apertura.

Salida: comandas, archivo, caja y stock permanecen consistentes entre dispositivos y después de reconexiones.

### Fase 3 — Cobertura funcional

- Unitarias para servicios críticos.
- Integración de RPC/RLS con roles reales.
- E2E para mozo → cocina → caja → archivo, reservas y cuenta corriente.
- Homologación ARCA con casos aprobados, rechazados y reintentos.

Salida: cobertura mínima de 80 % en los servicios financieros y todos los recorridos críticos automatizados.

### Fase 4 — Experiencia, rendimiento y observabilidad

- Corregir contador, lectura anónima y activos visuales.
- Lazy loading y presupuesto de bundle.
- Métricas, alertas y trazas de errores.
- Accesibilidad, SEO técnico y cabeceras.

Salida: cero errores de consola en recorridos públicos/internos, métricas de carga acordadas y alertas accionables.

## Orden recomendado de trabajo

1. Autenticación y rotación de credenciales.
2. Cobro/RPC transaccional y pruebas financieras.
3. TypeScript verde y CI obligatorio.
4. CORS, secretos y Auth real de Supabase.
5. Vinculación y trazabilidad de Vercel.
6. Sincronización/offline y refactor de comandas.
7. Seeds/tablas vacías y cobertura integral.
8. Página publicitaria, rendimiento, SEO y observabilidad.

## Límites de esta auditoría

No se ejecutaron acciones destructivas ni transacciones reales en producción: no se crearon pedidos/reservas, no se cobraron comandas, no se emitieron comprobantes ARCA y no se alteraron secretos. Esos recorridos requieren primero corregir los P0 y luego probarse en un ambiente de staging/homologación con datos desechables.

