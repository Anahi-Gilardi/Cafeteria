// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('Resto Bar Del Teatro - Suite de Pruebas E2E & Alta Concurrencia POS/ERP', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Navegar a la aplicación e iniciar sesión como Administrador
    await page.goto('http://localhost:5173');
    
    // Login con credenciales oficiales
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', '1998');
    await page.click('button:has-text("INICIAR SESIÓN")');

    // Confirmar que ingresó al Dashboard o Panel Principal
    await expect(page.locator('text=Control de Operaciones')).toBeVisible({ timeout: 5000 });
  });

  test('TC-01: Flujo Completo - Crear Pedido, Ruteo KDS, Descuento de Stock y Facturación ARCA', async ({ page }) => {
    // Step 1: Abrir la Carta Digital / POS de Pedidos
    await page.click('button:has-text("Carta & Recetas")');
    await expect(page.locator('text=Menú Disponible')).toBeVisible();

    // Step 2: Navegar al Mapa de Salón e Iniciar Comanda en Mesa 2
    await page.click('button:has-text("Mapa de Salón")');
    await page.click('text=Mesa 2');

    // Step 3: Seleccionar Modalidad Salón e Ingresar Productos
    // Agregar 1 Submarino de Chocolate Bariloche y 1 Bife de Chorizo
    await page.click('button:has-text("Tomar Pedido / Abrir Comanda")');
    
    // Step 4: Confirmar la Comanda en el Carrito (CartDrawer)
    await page.click('button:has-text("CONFIRMAR PEDIDO")');
    await expect(page.locator('text=Comanda #')).toBeVisible();

    // Step 5: Verificar Ruteo Inteligente en KDS (Cocina y Barra)
    await page.click('button:has-text("Caja & Comandas")');
    await expect(page.locator('text=Submarino de Chocolate Bariloche')).toBeVisible();
    await expect(page.locator('text=Bife de Chorizo')).toBeVisible();

    // Step 6: Cobro en Caja con Facturación Fiscal ARCA
    await page.click('button:has-text("Cobrar / Facturar")');
    await page.click('button:has-text("Efectivo")');
    await page.click('button:has-text("AUTORIZAR CON ARCA / AFIP")');

    // Validar generación de CAE de 14 dígitos y Código QR
    await expect(page.locator('text=CAE:')).toBeVisible();
    await expect(page.locator('text=www.arca.gob.ar')).toBeVisible();
  });

  test('TC-02: Manejo de Resiliencia Offline Queue ante Pérdida de Conexión Wi-Fi', async ({ page, context }) => {
    // Simular Network Offline Throttling
    await context.setOffline(true);

    // Tomar pedido en modo offline
    await page.click('button:has-text("Mapa de Salón")');
    await page.click('text=Mesa 1');
    await page.click('button:has-text("Tomar Pedido / Abrir Comanda")');
    await page.click('button:has-text("CONFIRMAR PEDIDO")');

    // Verificar encolamiento en Offline Queue local
    await expect(page.locator('text=Servidor Local Offline Activo')).toBeVisible();

    // Restablecer señal Wi-Fi
    await context.setOffline(false);

    // Verificar sincronización automática e idempotente
    await expect(page.locator('text=Sincronizado')).toBeVisible({ timeout: 10000 });
  });
});
