import { expect, test } from "@playwright/test";

test.describe("Resto Bar Del Teatro", () => {
  test("carga la portada y abre la carta pública sin errores de consola", async ({ page }) => {
    const errors: string[] = [];
    // UI E2E is deterministic; the separate test:db suite owns the live schema contract.
    await page.route("**/rest/v1/daily_menu?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "content-range": "0-0/0" },
        body: "[]"
      });
    });
    await page.route("**/rest/v1/restaurant_tables?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "content-range": "0-0/0" },
        body: "[]"
      });
    });
    await page.route("**/rest/v1/business_profile?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "content-range": "0-0/0" },
        body: "[]"
      });
    });
    page.on("console", (message) => {
      if (message.type() === "error") {
        const location = message.location().url;
        errors.push(`${message.text()}${location ? ` (${location})` : ""}`);
      }
    });

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "El sabor también sale a escena." })
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Ver carta y pedir" })
      .click();
    await expect(
      page.getByRole("button", { name: /Volver a la portada/i })
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("la experiencia publicitaria es responsive y conserva la paleta del sistema", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/rest/v1/daily_menu?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "content-range": "0-0/0" },
        body: "[]"
      });
    });

    await page.goto("/");
    await expect(page.getByRole("button", { name: "Abrir menú de navegación móvil" })).toBeVisible();
    await expect(page.getByText("Propuestas", { exact: true })).toBeVisible();
    await expect(page.getByText(/\$0(?:\D|$)/)).toHaveCount(0);

    await page
      .getByRole("button", { name: "Ver carta y pedir" })
      .click();
    await expect(page.getByRole("heading", { name: "Destacados de la Carta" })).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    ).toBe(true);
  });

  test("el acceso del personal exige email y no ofrece credenciales rápidas", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Acceso a POS y Personal" }).click();
    await expect(page.getByLabel("Correo electrónico")).toBeVisible();
    await expect(page.locator("#staff-password")).toBeVisible();
    await expect(page.getByText(/PIN rápido|admin.*1998/i)).toHaveCount(0);
  });

  test("el antiguo acceso admin/1998 ya no concede acceso administrativo", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Acceso a POS y Personal" }).click();
    await page.getByLabel("Correo electrónico").fill("admin");
    await page.locator("#staff-password").fill("1998");
    await page.getByRole("button", { name: "Ingresar al sistema POS" }).click();
    await expect(page.getByRole("dialog", { name: "Acceso del personal" })).toBeVisible();
    await expect(page.getByLabel("Correo electrónico")).toHaveValue("admin");
    await expect(page.getByText("Control de Operaciones")).toHaveCount(0);
  });
});
