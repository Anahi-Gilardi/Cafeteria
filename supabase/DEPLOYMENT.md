# Despliegue canónico de Supabase

Proyecto esperado: `qavpleanmjbxbwfzismp`.

## 1. Vincular y migrar

Se necesita una cuenta con acceso administrativo al proyecto.

```bash
npx supabase login
npx supabase link --project-ref qavpleanmjbxbwfzismp
npx supabase db push
```

La migración elimina las columnas heredadas `password` y `pin`, activa RLS, crea las tablas
faltantes y habilita Realtime. Antes de ejecutarla en producción, tome un backup desde el
Dashboard o con `backup_database.bat`.

## 2. Secretos del backend

```bash
npx supabase secrets set \
  APP_ORIGIN=https://su-dominio.example \
  RATE_LIMIT_SALT=un-valor-aleatorio-largo \
  GEMINI_API_KEY=... \
  GEMINI_MODEL=gemini-2.5-flash \
  ARCA_ENVIRONMENT=homologation \
  ARCA_CUIT=... \
  ARCA_POINT_OF_SALE=... \
  ARCA_AUTHORIZER_URL=https://su-backend-fiscal-interno.example/authorize \
  ARCA_AUTHORIZER_TOKEN=...
```

`ARCA_AUTHORIZER_URL` debe apuntar a un backend privado que gestione WSAA y WSMTXCA con el
certificado y la clave privada. La aplicación no autoriza ni imprime como fiscal si ese
servicio no devuelve un resultado ARCA `A` u `O`, CAE, vencimiento y número correlativo.
Primero debe completarse homologación; cambie a `production` sólo después de aprobarla.

## 3. Funciones

```bash
npx supabase functions deploy create-public-order --no-verify-jwt
npx supabase functions deploy create-public-reservation --no-verify-jwt
npx supabase functions deploy create-waiter-call --no-verify-jwt
npx supabase functions deploy barista-assistant --no-verify-jwt
npx supabase functions deploy manage-staff
npx supabase functions deploy arca-authorize
```

Las cuatro funciones públicas usan validación propia, CORS restringido y límites de frecuencia.
`manage-staff` y `arca-authorize` conservan la verificación JWT del gateway y además validan el
perfil y el rol dentro de la función.

## 4. Perfil real del comercio

Antes de habilitar pedidos o facturación, cargue los datos reales —no valores de ejemplo—:

```sql
insert into public.business_profile (
  id, name, cuit, address, city, province, phone, email, pos_number,
  delivery_fee, delivery_free_min
) values (
  'resto_bar_del_teatro',
  'RAZÓN SOCIAL REAL',
  'CUIT REAL',
  'DOMICILIO REAL',
  'CIUDAD',
  'PROVINCIA',
  'TELÉFONO',
  'EMAIL',
  1,
  0,
  0
)
on conflict (id) do update set
  name = excluded.name,
  cuit = excluded.cuit,
  address = excluded.address,
  city = excluded.city,
  province = excluded.province,
  phone = excluded.phone,
  email = excluded.email,
  pos_number = excluded.pos_number,
  delivery_fee = excluded.delivery_fee,
  delivery_free_min = excluded.delivery_free_min,
  updated_at = now();
```

El CUIT y el punto de venta deben coincidir con los configurados en ARCA.

## 5. Primer administrador

Créelo en Authentication > Users del Dashboard. Luego ejecute en SQL Editor, reemplazando
los valores:

```sql
insert into public.users_accounts (id, auth_user_id, name, email, role, active)
values (
  gen_random_uuid()::text,
  'UUID-DE-AUTH-USERS',
  'Nombre del administrador',
  'admin@dominio.example',
  'administrador',
  true
);
```

No cree contraseñas ni PIN en tablas públicas.

## 6. Verificación

```bash
npm run test:db
npm run check
npm run test:e2e
```

Además, complete conteos reales de `insumos` antes de habilitar ventas con descuento
automático de recetas, registre `cost_per_unit`, cargue proveedores y cree las mesas activas
en `restaurant_tables` antes de abrir reservas. Las tablas operativas pueden iniciar vacías;
la carta debe contener al menos un producto disponible.

Los ajustes de stock, fichajes y repartos de propinas deben realizarse desde la aplicación:
las RPC `adjust_inventory_stock`, `record_staff_attendance` y `distribute_tip_pool` aplican
bloqueos, permisos y auditoría que una escritura directa no ofrece.

Antes de habilitar facturación, revise cada producto y complete `vat_rate`,
`arca_item_code`, `arca_unit_code` y `fiscal_enabled = true`. Los productos sin ficha fiscal
aprobada son rechazados por el backend y no pueden obtener CAE.
