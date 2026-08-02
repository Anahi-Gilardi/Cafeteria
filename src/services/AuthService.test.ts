import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn()
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      updateUser: mocks.updateUser
    }
  }
}));

import { AuthService } from "./AuthService";

describe("AuthService password recovery", () => {
  beforeEach(() => {
    mocks.resetPasswordForEmail.mockReset();
    mocks.updateUser.mockReset();
  });

  it("requests a recovery email with the production recovery route", async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });

    const result = await AuthService.requestPasswordReset("admin@example.com");

    expect(result.success).toBe(true);
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "admin@example.com",
      { redirectTo: "https://cafeteria-ten-pied.vercel.app/?reset-password=1" }
    );
  });

  it("rejects weak replacement passwords before calling Supabase", async () => {
    const result = await AuthService.updatePassword("short");

    expect(result.success).toBe(false);
    expect(result.error).toContain("12 caracteres");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("updates a strong password through the authenticated recovery session", async () => {
    mocks.updateUser.mockResolvedValue({ error: null });

    const result = await AuthService.updatePassword("NuevaClaveSegura!2026");

    expect(result.success).toBe(true);
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "NuevaClaveSegura!2026" });
  });
});
