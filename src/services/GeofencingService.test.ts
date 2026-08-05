import { afterEach, describe, expect, it, vi } from "vitest";
import { CASTANO_LOCATION, GeofencingService, type GPSResult } from "./GeofencingService";

describe("GeofencingService", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("calcula cero en el punto del local y detecta puntos lejanos", () => {
    expect(
      GeofencingService.calculateHaversineDistance(
        CASTANO_LOCATION.latitude,
        CASTANO_LOCATION.longitude,
        CASTANO_LOCATION.latitude,
        CASTANO_LOCATION.longitude
      )
    ).toBe(0);
    expect(
      GeofencingService.calculateHaversineDistance(
        -33.123,
        -64.348,
        CASTANO_LOCATION.latitude,
        CASTANO_LOCATION.longitude
      )
    ).toBeGreaterThan(CASTANO_LOCATION.radiusMeters);
  });

  it("rechaza una lectura sin precisión suficiente", () => {
    const result: GPSResult = {
      latitude: CASTANO_LOCATION.latitude,
      longitude: CASTANO_LOCATION.longitude,
      accuracy: CASTANO_LOCATION.maxAccuracyMeters + 1,
      distanceMeters: 0,
      isWithinFence: true,
      permissionStatus: "granted"
    };
    expect(GeofencingService.validateForAttendance(result).ok).toBe(false);
  });

  it("nunca reemplaza un error del dispositivo por las coordenadas del local", async () => {
    const getCurrentPosition = vi.fn((_success, error) => {
      error({
        code: 2,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      });
    });
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    const result = await GeofencingService.getCurrentPosition();
    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
    expect(result.isWithinFence).toBe(false);
  });
});
