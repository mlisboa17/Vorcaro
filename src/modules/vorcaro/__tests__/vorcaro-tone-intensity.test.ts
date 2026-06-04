import { describe, expect, it } from "vitest";
import { capToneIntensity, getToneIntensity, VORCARO_TONE_INTENSITY } from "../domain/vorcaro-tone-intensity";

describe("Vorcaro tone intensity", () => {
  it("mapeia intensidade crescente dos 6 tons", () => {
    expect(VORCARO_TONE_INTENSITY.PROFESSIONAL).toBe(0);
    expect(VORCARO_TONE_INTENSITY.BALANCED).toBe(50);
    expect(VORCARO_TONE_INTENSITY.REALITY_AUDITOR).toBe(100);
    expect(getToneIntensity("VORCARO")).toBe(70);
  });

  it("limita tom acima do teto", () => {
    expect(capToneIntensity("REALITY_AUDITOR", 50)).toBe("BALANCED");
    expect(capToneIntensity("DIRECT", 50)).toBe("DIRECT");
  });
});
