import { beforeEach, describe, expect, it, vi } from "vitest";
import { CASTANO_LOCATION, type GPSResult } from "./GeofencingService";

const rpc = vi.hoisted(() => vi.fn());

vi.mock("../lib/supabase", () => ({
  supabase: { rpc }
}));

import { AttendanceService } from "./AttendanceService";

const validGps: GPSResult = {
  latitude: CASTANO_LOCATION.latitude,
  longitude: CASTANO_LOCATION.longitude,
  accuracy: 12,
  distanceMeters: 0,
  isWithinFence: true,
  permissionStatus: "granted",
  provider: "browser_geolocation"
};

describe("AttendanceService", () => {
  beforeEach(() => rpc.mockReset());

  it("rechaza el fichaje sin GPS antes de llamar al servidor", async () => {
    const result = await AttendanceService.recordAttendance(
      "staff-1",
      "Agustín",
      "INGRESO",
      { ...validGps, latitude: null, longitude: null, isWithinFence: false }
    );
    expect(result.success).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("usa exclusivamente la RPC transaccional y la hora confirmada por servidor", async () => {
    rpc.mockResolvedValue({
      error: null,
      data: {
        id: "attendance-1",
        staff_id: "staff-1",
        staff_name: "Agustín",
        check_in_time: "2026-08-04T20:00:00.000Z",
        check_in_latitude: CASTANO_LOCATION.latitude,
        check_in_longitude: CASTANO_LOCATION.longitude,
        check_in_accuracy: 12,
        check_in_distance_meters: 0,
        check_in_location_address: CASTANO_LOCATION.address
      }
    });

    const result = await AttendanceService.recordAttendance(
      "staff-1",
      "Agustín",
      "INGRESO",
      validGps
    );

    expect(result.success).toBe(true);
    expect(result.data?.timestamp_servidor).toBe("2026-08-04T20:00:00.000Z");
    expect(rpc).toHaveBeenCalledWith("record_staff_attendance", {
      p_staff_id: "staff-1",
      p_action: "INGRESO",
      p_latitude: CASTANO_LOCATION.latitude,
      p_longitude: CASTANO_LOCATION.longitude,
      p_location_address: CASTANO_LOCATION.address,
      p_gps_accuracy: 12
    });
  });

  it("no inventa éxito cuando Supabase rechaza la ubicación", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "22023", message: "outside attendance geofence" }
    });
    const result = await AttendanceService.recordAttendance(
      "staff-1",
      "Agustín",
      "EGRESO",
      validGps
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain("radio permitido");
  });
});
