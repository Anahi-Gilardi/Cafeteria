import { expect, test } from "@playwright/test";

const STAFF_ID = "staff-e2e";
const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const STORE = { latitude: -33.1256089, longitude: -64.350237 };

function base64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

test("el fichaje exige permiso, usa la identidad autenticada y registra ingreso/egreso", async ({
  page,
  context
}) => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const accessToken = `${base64Url({ alg: "HS256", typ: "JWT" })}.${base64Url({
    sub: AUTH_USER_ID,
    role: "authenticated",
    exp: nowSeconds + 3600
  })}.test-signature`;
  const authUser = {
    id: AUTH_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "dueno@example.com",
    created_at: "2026-08-04T18:00:00.000Z",
    app_metadata: {},
    user_metadata: {}
  };

  await context.grantPermissions(["geolocation"], { origin: "http://127.0.0.1:3100" });
  await context.setGeolocation({ latitude: STORE.latitude, longitude: STORE.longitude, accuracy: 12 });

  await page.addInitScript(({ token, user, expiresAt }) => {
    localStorage.setItem(
      "sb-qavpleanmjbxbwfzismp-auth-token",
      JSON.stringify({
        access_token: token,
        refresh_token: "test-refresh-token",
        expires_at: expiresAt,
        expires_in: 3600,
        token_type: "bearer",
        user
      })
    );
  }, { token: accessToken, user: authUser, expiresAt: nowSeconds + 3600 });

  const actions: string[] = [];
  await page.route("**/auth/v1/user", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(authUser) })
  );
  await page.route("**/rest/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/rpc/record_staff_attendance")) {
      const payload = route.request().postDataJSON();
      actions.push(payload.p_action);
      const isEntry = payload.p_action === "INGRESO";
      const row = {
        id: "attendance-e2e",
        staff_id: STAFF_ID,
        staff_name: "Dueño de prueba",
        check_in_time: "2026-08-04T20:00:00.000Z",
        check_out_time: isEntry ? null : "2026-08-04T21:00:00.000Z",
        check_in_latitude: STORE.latitude,
        check_in_longitude: STORE.longitude,
        check_in_accuracy: 12,
        check_in_distance_meters: 0,
        check_in_location_address: "Constitución 944, Río Cuarto, Córdoba",
        check_out_latitude: STORE.latitude,
        check_out_longitude: STORE.longitude,
        check_out_accuracy: 12,
        check_out_distance_meters: 0,
        check_out_location_address: "Constitución 944, Río Cuarto, Córdoba"
      };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(row) });
      return;
    }
    const isProfile = url.pathname.endsWith("/users_accounts") && url.searchParams.has("auth_user_id");
    const body = isProfile
      ? JSON.stringify([{
          id: STAFF_ID,
          auth_user_id: AUTH_USER_ID,
          email: "dueno@example.com",
          name: "Dueño de prueba",
          role: "dueño",
          active: true
        }])
      : "[]";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": "0-0/0" },
      body
    });
  });

  await page.goto("/#/personal");
  await expect(page.getByRole("heading", { name: "Gestión de Personal" })).toBeVisible();
  await expect(page.getByText("Empleado autenticado: Dueño de prueba")).toBeVisible();
  await expect(page.getByText("Usar Ubicación Sucursal Castaño")).toHaveCount(0);

  const clockIn = page.getByTestId("clock-in");
  const clockOut = page.getByTestId("clock-out");
  await expect(clockIn).toBeDisabled();
  await page.getByTestId("request-geolocation").click();
  await expect(page.getByText("Ubicación válida", { exact: true })).toBeVisible();
  await expect(clockIn).toBeEnabled();

  await clockIn.click();
  await expect.poll(() => actions).toEqual(["INGRESO"]);
  await clockOut.click();
  await expect.poll(() => actions).toEqual(["INGRESO", "EGRESO"]);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("request-geolocation")).toBeVisible();
  await expect(page.getByTestId("clock-in")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
