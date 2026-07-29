# Auditoría integral y plan de mejora

Fecha: 29 de julio de 2026  
Aplicación: Castaño — Resto Bar & Cafetería  
Proyecto objetivo informado: `qavpleanmjbxbwfzismp.supabase.co`

> Este documento conserva los hallazgos de la auditoría inicial. El estado vigente y las
> correcciones aplicadas se detallan en “Implementación posterior a la auditoría”.

## Resultado ejecutivo

La interfaz compila y los módulos principales se pueden abrir, pero el sistema no está completamente sincronizado ni listo para producción.

Los bloqueos principales son:

1. La aplicación local usa por prioridad el proyecto Supabase anterior `idjecovmqlyjhflfakfr`, no el proyecto objetivo `qavpleanmjbxbwfzismp`.
2. El proyecto objetivo tiene tablas faltantes y otras con columnas incompatibles con el frontend.
3. La tabla `users_accounts` expone por acceso anónimo columnas `password` y `pin` en texto plano.
4. Una prueba controlada confirmó que la clave pública anónima puede crear, leer y borrar registros de `system_settings`.
5. La facturación ARCA real no está implementada: no existe backend fiscal, no se solicita un CAE real y algunos flujos presentan un borrador como comprobante autorizado.
6. Varias pantallas mezclan datos reales, datos locales y datos demostrativos sin diferenciarlos.
7. Las pruebas automáticas actuales no representan la aplicación vigente.

## Pruebas ejecutadas

| Validación | Resultado |
|---|---|
| TypeScript `tsc --noEmit` | Correcto |
| Build de producción Vite | Correcto |
| Errores de consola al recorrer módulos | No se observaron |
| Suite DB incluida en el proyecto | 7/8, pero consulta el Supabase anterior |
| Auditoría de dependencias | 3 vulnerabilidades: 1 alta, 1 moderada y 1 baja |
| Bundle principal | 1.648 MB sin comprimir; requiere división por módulos |
| E2E existente | No ejecutable de forma confiable |

La prueba E2E usa el puerto `5173` aunque el proyecto se ejecuta en `3000`, contiene selectores de una interfaz anterior y depende de `@playwright/test`, que no está instalado.

## Recorrido funcional

Se abrieron y revisaron sin realizar cobros ni emisiones fiscales:

- Portada pública.
- Menú digital y carrito público.
- Formulario de reserva pública.
- Acceso y cierre de sesión.
- Módulo Mozo.
- Cocina y Chef.
- Caja y Comandas.
- Reservas.
- Mapa de Salón.
- Dashboard.
- Carta y Recetas.
- Stock e Insumos.
- Proveedores.
- Personal.
- Reportes.

Hallazgos funcionales:

- Los módulos renderizan y la navegación responde.
- Cocina muestra comandas demostrativas aunque el Supabase configurado tiene cero pedidos.
- Reportes contiene históricos y distribuciones fijas que no provienen íntegramente de las transacciones.
- El indicador “Sincronizado Supabase” sólo consulta `navigator.onLine`; no comprueba la conexión, el proyecto, permisos, latencia ni la última sincronización.
- Hay 37 productos en el proyecto anterior con precios menores a ARS 1.000, por ejemplo `11.5`, `3.2` y `9.8`. La UI los muestra como `$11,5`, `$3,2`, etc. y llega a calcular márgenes negativos extremos.
- Inventario muestra un producto vencido, pero los contadores principales no lo clasifican como alerta crítica.
- Proveedores y varios historiales se guardan localmente y no tienen una fuente de verdad común en Supabase.

## Estado de Supabase

### Divergencia de proyectos

| Dato | Proyecto configurado localmente | Proyecto objetivo |
|---|---:|---:|
| Productos | 66 | 29 |
| Pedidos | 0 | 5 |
| Clientes | 0 | 3 |
| Usuarios | 4 | 3 |
| Insumos | 5 | 0 |

Los 29 productos del proyecto objetivo también existen en el anterior con el mismo precio. El proyecto anterior contiene 37 productos adicionales con precios aparentemente cargados en miles de pesos como si fueran unidades.

### Tablas operativas requeridas por el frontend

| Tabla | Existe en objetivo | Filas visibles | Compatibilidad |
|---|---:|---:|---|
| `menu_items` | Sí | 29 | Compatible |
| `product_images` | Sí | 0 | Compatible |
| `client_accounts` | Sí | 3 | Compatible |
| `reservations` | Sí | 0 | Compatible |
| `users_accounts` | Sí | 3 | Compatible técnicamente, insegura |
| `orders` | Sí | 5 | Compatible |
| `insumos` | Sí | 0 | Incompatible |
| `cash_ledger` | Sí | 0 | Incompatible |
| `barista_calibrations` | Sí | 0 | Compatible |
| `system_settings` | Sí | 0 | Compatible, permisos inseguros |
| `supplies` | No | — | Faltante |
| `staff_attendance` | Sí | 0 | Compatible |
| `daily_menu` | No | — | Faltante |

El bucket de Storage `product-images` responde correctamente, pero no tiene objetos visibles.

Incompatibilidades concretas:

- `insumos` usa `current_stock`, `min_stock` y `supplier`; el frontend también espera `quantity`, `min_limit`, `provider` y `expiration_date`.
- `cash_ledger` no tiene la columna `transactions` utilizada por Caja.
- Faltan `supplies` y `daily_menu`.
- También faltan tablas definidas en la migración unificada: `business_profile`, `order_items` y `audit_logs`.

Hay varios scripts SQL incompatibles entre sí. Algunos habilitan RLS y otros lo deshabilitan completamente, por lo que no existe una migración canónica confiable.

## Seguridad

Prioridad crítica:

- `users_accounts` permite lectura anónima de `email`, `password`, `role` y `pin`.
- Las contraseñas y PIN están guardados en texto plano y también hay credenciales de demostración embebidas en el frontend.
- La autenticación local permite entrar sin una sesión Supabase Auth válida.
- La prueba reversible sobre `system_settings` confirmó CRUD anónimo completo.
- Algunos scripts recomiendan deshabilitar RLS para que el POS funcione.
- La clave de Gemini puede guardarse en `localStorage`, accesible a cualquier script ejecutado en el origen.

La clave pública `anon` puede estar en el cliente únicamente si RLS y las políticas están correctamente configuradas. No debe otorgar acceso a credenciales, caja, personal, auditoría ni escritura administrativa global.

## Facturación ARCA

Ambiente efectivamente probado: ninguno.  
Ambiente pendiente: homologación y producción.  
Método fiscal implementado: ninguno de extremo a extremo.

Hallazgos:

- No existe `/api/arca/authorize` ni una Edge Function equivalente en el repositorio.
- `ARCAAdapter.authorizeInvoice()` no está conectado al flujo principal.
- `BillingAdapter.generateInvoice()` fabrica un CAE aleatorio y un QR; aunque actualmente no se importa, debe eliminarse o quedar imposibilitado de producir documentos fiscales.
- El flujo manual genera `SIN_AUTORIZACION_FISCAL`, pero luego imprime “Comprobante Autorizado por ARCA” y notifica éxito.
- No hay WSAA, WSMTXCA, certificado, clave privada, consulta de último comprobante, serialización por punto de venta ni reconciliación de resultados inciertos.
- No hay persistencia de estados `authorizing`, `observed`, `rejected` o `uncertain`.
- El frontend fija CUIT, punto de venta y ambiente, datos que debe determinar el servidor.
- Un generador usa el dominio histórico de AFIP para el QR en lugar del dominio técnico actual de ARCA.
- Los importes aplican IVA generalizado o inferido por nombre del producto; no existe una ficha fiscal validada por ítem.

No se emitió ningún comprobante ni se contactó ARCA durante esta auditoría.

## Plan priorizado

### P0 — Contención y seguridad

1. Elegir `qavpleanmjbxbwfzismp` como proyecto canónico y eliminar la ambigüedad de configuración.
2. Desactivar temporalmente botones y textos que afirmen emisión fiscal real.
3. Migrar personal a Supabase Auth; eliminar `password` y `pin` públicos.
4. Rotar todas las credenciales de usuarios expuestas.
5. Habilitar RLS en todas las tablas.
6. Crear políticas por rol y operación; impedir escritura administrativa con `anon`.
7. Eliminar credenciales y datos fiscales de demostración del bundle.
8. Corregir el indicador de nube para mostrar estado real o “Sin verificar”.

Criterio de aceptación: un usuario anónimo sólo puede leer carta/perfil/menú público y crear una solicitud pública validada; no puede leer personal, caja, auditoría o cuentas corrientes.

### P1 — Esquema y migración de datos

1. Crear una única migración versionada y retirar scripts SQL contradictorios.
2. Definir un modelo canónico para productos, insumos, recetas, pedidos, ítems, pagos, caja, reservas, personal y auditoría.
3. Crear las tablas faltantes y corregir columnas incompatibles.
4. Normalizar los 37 precios erróneos antes de migrarlos.
5. Migrar sólo datos aprobados del proyecto anterior al objetivo.
6. Agregar restricciones, claves foráneas, índices, estados válidos y timestamps.
7. Configurar políticas del bucket `product-images`.
8. Incorporar un script de verificación de esquema y conteos que use variables de entorno.

Criterio de aceptación: la app inicia contra el proyecto objetivo sin sembrar datos desde el navegador y sin recurrir a fallbacks por columnas faltantes.

### P2 — Sincronización y consistencia

1. Centralizar todas las lecturas/escrituras en una sola capa de repositorios.
2. Eliminar escrituras duplicadas desde `App`, componentes y servicios.
3. Implementar creación de pedido + ítems + descuento de stock mediante una transacción/RPC.
4. Conectar cambios de pedidos a Supabase Realtime.
5. Implementar cola offline idempotente con `upsert`, reintentos limitados, backoff y estado visible.
6. Reconciliar al reconectar antes de sobrescribir datos.
7. Separar claramente datos reales, datos de demostración y datos locales.
8. Mostrar proyecto conectado, último éxito, pendientes, errores y latencia.

Criterio de aceptación: una comanda creada en un terminal aparece una sola vez en otro terminal, descuenta stock una vez y sobrevive a una desconexión.

### P3 — Calidad, pruebas y rendimiento

1. Incorporar Vitest para cálculos, mapeos, permisos, precios, stock e idempotencia.
2. Reparar Playwright para puerto `3000` y selectores estables `data-testid`.
3. Usar un proyecto Supabase de pruebas aislado con limpieza automática.
4. Cubrir login por rol, pedido, KDS, caja, reserva, stock, offline y permisos.
5. Agregar pruebas contractuales del esquema REST.
6. Dividir `AdminHub.tsx` y cargar módulos en forma diferida.
7. Reducir el bundle principal y corregir las 3 dependencias vulnerables.
8. Añadir CI para lint, unitarias, integración, E2E y auditoría.

Criterio de aceptación: suite reproducible en una instalación limpia, sin datos de producción y con evidencia de permisos negativos.

### P4 — ARCA en homologación

1. Crear backend/Edge Function autenticada con secretos protegidos.
2. Implementar WSAA y WSMTXCA con detalle de ítems.
3. Consultar tablas dinámicas de ARCA.
4. Serializar numeración por CUIT, punto de venta y tipo.
5. Implementar idempotencia y reconciliación ante timeout.
6. Persistir solicitud, respuesta, CAE/CAEA, vencimiento, observaciones y errores sin secretos.
7. Generar QR versión 1 y PDF sólo después de autorización real.
8. Probar respuestas `A`, `O`, `R`, SOAP Fault, token vencido, timeout y concurrencia.
9. Pasar a producción sólo después de homologación, monitoreo y revisión tributaria profesional.

Criterio de aceptación: ningún documento puede decir “autorizado” sin CAE/CAEA real verificable y persistido.

## Orden recomendado de ejecución

1. Seguridad y proyecto canónico.
2. Migración única y normalización de datos.
3. Sincronización transaccional.
4. Suite automatizada.
5. Backend fiscal ARCA en homologación.
6. Rendimiento, observabilidad y despliegue controlado.

No se aplicaron migraciones ni cambios de políticas durante la auditoría. La clave pública anónima no es una credencial apropiada para alterar el esquema o administrar seguridad.

## Implementación posterior a la auditoría

Estado al 29 de julio de 2026:

- Proyecto local unificado en `qavpleanmjbxbwfzismp`.
- Autenticación migrada a Supabase Auth, sin PIN ni fallback de credenciales locales.
- Migración canónica creada con RLS por rol, Storage, Realtime, auditoría, caja,
  facturación, recetas e inventario transaccional.
- Pedidos públicos y reservas públicas movidos a Edge Functions con validación y límite
  atómico por IP.
- Pedidos, pagos, descuentos y abonos de cuenta corriente protegidos por RPC idempotentes.
- Cola offline con deduplicación, backoff, límite de reintentos y estado visible.
- CAE/QR simulados eliminados. ARCA sólo marca autorizado con respuesta `A`/`O` persistida;
  sin configuración o ficha fiscal aprobada genera un borrador no fiscal.
- Gemini movido al backend; la clave dejó de almacenarse o enviarse al navegador.
- Datos demostrativos operativos retirados de inventario, caja, cierres, personal y factura
  manual. También se retiraron las comandas ficticias del KDS, proveedores, ventas,
  medios de pago, alertas de stock y movimientos de merma simulados. El menú público usa
  Supabase o el último caché confirmado.
- Proveedores, mesas del salón, mermas y movimientos de inventario ahora tienen tablas
  canónicas y persistencia en Supabase. Las reservas públicas validan mesa activa y capacidad
  en el servidor.
- Fichaje migrado de PIN/localStorage a Supabase Auth + RPC con ingreso/egreso atómico y
  coordenadas reales del dispositivo; nunca sustituye un fallo de GPS por una ubicación falsa.
- Reportes de UI y PDF calculan ventas completadas, períodos y medios de pago reales. El
  reparto de propinas se ejecuta y audita mediante RPC.
- Apertura/cierre de caja, propinas y movimientos de stock son transaccionales. El carrito no
  captura datos de tarjeta, no suma IVA nuevamente sobre precios finales y el backend determina
  propina y envío. Las llamadas al mozo se sincronizan por tabla y Realtime.
- Scripts SQL contradictorios retirados; la fuente única es la secuencia versionada de
  `supabase/migrations/`.
- Vitest, Playwright, verificación REST y CI incorporados.
- Bundle inicial reducido de aproximadamente 1,65 MB a 254 KB sin comprimir; PDF,
  administración y módulos pesados cargan bajo demanda.
- Auditoría npm: 0 vulnerabilidades. TypeScript, 5 pruebas unitarias, build y 4 E2E pasan.
- Migraciones `202607290001`, `202607290002` y `202607290003` aplicadas al proyecto objetivo
  con respaldo previo verificable. El control REST remoto pasa 24/24 comprobaciones de tablas,
  columnas,
  RLS y bloqueo anónimo.
- Las 8 líneas históricas de los 5 pedidos existentes fueron normalizadas en `order_items`;
  no quedan pedidos heredados con líneas sin sincronizar.
- La portada, la carta digital y el modal ejecutivo ya no presentan precio `$0`, opciones
  vacías ni un menú ficticio cuando `daily_menu` no tiene una publicación activa.
- La experiencia publicitaria fue unificada con el sistema interno: bordó, vino, rosa
  empolvado, beige y crema. Portada, carta, reservas y acceso comparten la misma identidad;
  las promociones se generan desde productos y precios reales de Supabase, con validación
  responsive y accesibilidad para movimiento reducido y foco de teclado.
- La portada publicitaria fue reorganizada con jerarquía editorial, fotografías reales del
  catálogo, acciones principales claras, secciones de carta, experiencia y ubicación, y una
  navegación adaptada a móvil. La carta pública comparte el mismo encabezado y dispone de
  respaldo visual de marca cuando una imagen remota no carga, sin mostrar recursos rotos.
- Las seis Edge Functions están desplegadas y activas en el proyecto objetivo. Las funciones
  públicas validan origen, carga útil y límite de frecuencia; las funciones de personal y ARCA
  exigen JWT y rol autorizado.
- El checkout de la carta pública ahora persiste primero en Supabase y sólo después conserva
  la copia local y prepara el mensaje de WhatsApp. Una prueba remota creó una orden y su línea,
  repitió la solicitud con la misma clave idempotente sin duplicar registros y eliminó
  exclusivamente el dato de prueba.
- CORS fue verificado para las seis funciones con el origen local configurado. Las funciones
  protegidas rechazan solicitudes anónimas y las funciones públicas rechazan cargas inválidas.
- Cocina dispone de un Archivo de comandas consultable y buscable. `archived_orders` conserva
  una instantánea completa, los renglones normalizados, el usuario y la fecha sin eliminar la
  orden canónica. Las 5 comandas históricas completadas fueron incorporadas automáticamente.

Bloqueos externos pendientes:

1. Deben rotarse las credenciales de personal que estuvieron expuestas y crearse usuarios en
   Supabase Auth.
   Actualmente existen 3 perfiles de personal, 0 identidades Auth y 0 vínculos.
2. `business_profile`, `daily_menu` y `restaurant_tables` están creadas y protegidas, pero
   permanecen vacías hasta cargar datos reales verificados. La interfaz oculta el menú diario
   inexistente y no permite reservar cuando no hay mesas activas. No se inventaron CUIT, punto
   de venta, menú, precios ni distribución del salón.
3. El asistente Barista requiere configurar `GEMINI_API_KEY` como secreto; mientras falte,
   responde con indisponibilidad controlada sin exponer ninguna clave al navegador.
4. ARCA requiere certificado, clave privada, CUIT, punto de venta, homologación y el autorizador
   WSAA/WSMTXCA interno descrito en `supabase/functions/arca-authorize/README.md`.
5. Antes de publicar fuera del entorno local debe cambiarse `APP_ORIGIN` por el dominio HTTPS
   definitivo y volver a verificar CORS.
6. WhatsApp funciona como enlace `wa.me` precompletado. El envío automático requiere contratar
   y configurar un proveedor oficial del lado servidor; la aplicación ya no simula ni informa
   falsamente que el mensaje fue entregado.
