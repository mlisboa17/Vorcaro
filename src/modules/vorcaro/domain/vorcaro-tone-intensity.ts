import type { VorcaroTone } from "./types/vorcaro-personality";

/** Intensidade interna do tom — reutilizável em dashboard, telegram, chat, push e digest. */
export const VORCARO_TONE_INTENSITY: Record<VorcaroTone, number> = {
  PROFESSIONAL: 0,
  DIRECT: 25,
  BALANCED: 50,
  VORCARO: 70,
  IMPACT: 85,
  REALITY_AUDITOR: 100,
};

const TONE_BY_INTENSITY = (Object.entries(VORCARO_TONE_INTENSITY) as [VorcaroTone, number][])
  .sort((a, b) => a[1] - b[1])
  .map(([tone]) => tone);

export function getToneIntensity(tone: VorcaroTone): number {
  return VORCARO_TONE_INTENSITY[tone];
}

export function capToneIntensity(tone: VorcaroTone, maxIntensity: number): VorcaroTone {
  const current = getToneIntensity(tone);
  if (current <= maxIntensity) return tone;

  let capped: VorcaroTone = "PROFESSIONAL";
  for (const candidate of TONE_BY_INTENSITY) {
    if (VORCARO_TONE_INTENSITY[candidate] <= maxIntensity) {
      capped = candidate;
    }
  }
  return capped;
}
