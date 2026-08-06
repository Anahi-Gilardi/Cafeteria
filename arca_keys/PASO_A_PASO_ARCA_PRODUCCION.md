# 🇦🇷 Guía Paso a Paso para Conectar Castaño Resto Bar con ARCA (AFIP) Producción

¡Tus archivos de clave privada y pedido de certificado ya fueron creados en tu computadora!

### 📁 Ubicación de Archivos Creados:
- **Clave Privada**: [`C:\cafeteria\arca_keys\privada.key`](file:///c:/cafeteria/arca_keys/privada.key)
- **Solicitud de Certificado (CSR)**: [`C:\cafeteria\arca_keys\pedido.csr`](file:///c:/cafeteria/arca_keys/pedido.csr)

---

## 📌 Paso 1: Generar Certificado Digital en la Web de ARCA (AFIP)

1. Abre el navegador e ingresa al portal de ARCA / AFIP: [https://auth.afip.gob.ar](https://auth.afip.gob.ar).
2. Inicia sesión con tus credenciales:
   - **CUIT**: `20445513408`
   - **Clave Fiscal**: `Agustinloco22`
3. En el buscador de servicios o el panel principal, busca e ingresa a **"Administración de Certificados Digitales"**.
4. Haz clic en **"Agregar alias"**.
   - **Alias**: `castano_resto_bar`
   - **Certificado**: Sube el archivo `pedido.csr` ubicado en `C:\cafeteria\arca_keys\pedido.csr`.
5. Presiona **"Crear Alias"**.
6. Descarga el certificado de producción firmado (`.crt` o `.pem`) y guárdalo en la carpeta `C:\cafeteria\arca_keys\produccion.crt`.

---

## 📌 Paso 2: Delegar el Servicio de Facturación Electrónica

1. En la web de AFIP/ARCA, vuelve al menú principal e ingresa a **"Administrador de Relaciones de Clave Fiscal"**.
2. Haz clic en **"Nueva Relación"**.
3. Presiona **"Buscar"** en el cuadro de servicio:
   - Selecciona **ARCA / AFIP** -> **Servicios Interactivos** -> **Facturación Electrónica** (WSFEV1 / WSMTXCA).
4. En **Representante**, haz clic en **"Buscar"** -> selecciona el Alias que creaste (`castano_resto_bar`).
5. Presiona **"Confirmar"**.

---

## 📌 Paso 3: Crear el Punto de Venta para Web Services

1. En el menú principal de AFIP/ARCA, ingresa a **"Regímenes de Facturación y Registración (REGINFO)"** -> **"Administración de Puntos de Venta y Domicilios"**.
2. Selecciona tu CUIT (`20445513408`).
3. Haz clic en **"Añadir Punto de Venta"**.
   - **Número de Punto de Venta**: ej. `5` (o el número siguiente disponible).
   - **Nombre Fantasía**: `Castaño Resto Bar`
   - **Sistema**: Selecciona **"Factura Electrónica - Monotributo / RI - Web Services"**.
   - **Domicilio**: Selecciona la dirección de tu local (Constitución 944, Río Cuarto).
4. Presiona **"Aceptar"**.

---

## 📌 Paso 4: Configurar los Datos en el Programa POS

Una vez completados los pasos en ARCA, abre la carpeta `C:\cafeteria\arca_keys\arca_produccion.env` y completa la configuración:

```env
# Configuración ARCA Producción - Castaño Resto Bar
ARCA_ENV=production
ARCA_CUIT=20445513408
ARCA_PTO_VTA=5
ARCA_PRIVATE_KEY_PATH=C:/cafeteria/arca_keys/privada.key
ARCA_CERT_PATH=C:/cafeteria/arca_keys/produccion.crt
```

---

## 📌 Paso 5: Verificación y Facturación en Caja

1. En la aplicación POS (`Módulo Caja & Comandas`), ingresa a **Configuración Comercial**.
2. Verifica que el CUIT sea `20445513408` y el Punto de Venta coincida con el creado en ARCA.
3. Al presionar **`🧾 CONFIRMAR VENTA & EMITIR FACTURA FISCAL (ARCA)`**, el sistema generará el comprobante con **CAE oficial** y el código **QR oficial de ARCA**.
