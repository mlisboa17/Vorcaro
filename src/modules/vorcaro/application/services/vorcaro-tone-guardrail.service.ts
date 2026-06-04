import type { VorcaroTone } from "../../domain/types/vorcaro-personality";
import { capToneIntensity } from "../../domain/vorcaro-tone-intensity";

/** Cenários que exigem clareza e orientação em vez de sarcasmo. */
export type VorcaroCriticalContext = {
  negativeCashflowDays?: number | null;
  overdueReceivableAmount?: number;
  goalsAtRisk?: number;
  highCommitmentPercent?: number;
  delinquency?: boolean;
  severeNegativeFlow?: boolean;
};

const CRITICAL_INTENSITY_CAP = 50; // BALANCED — máximo em cenários críticos

export class VorcaroToneGuardrailService {
  isCritical(context: VorcaroCriticalContext): boolean {
    if (context.severeNegativeFlow) return true;
    if (context.delinquency) return true;
    if (context.negativeCashflowDays != null && context.negativeCashflowDays <= 14) return true;
    if ((context.overdueReceivableAmount ?? 0) > 0) return true;
    if ((context.goalsAtRisk ?? 0) > 0) return true;
    if ((context.highCommitmentPercent ?? 0) >= 85) return true;
    return false;
  }

  /**
   * Reduz sarcasmo automaticamente em risco financeiro relevante.
   * Mantém tom do usuário se já estiver abaixo do teto crítico.
   */
  resolveEffectiveTone(preferredTone: VorcaroTone, context: VorcaroCriticalContext): VorcaroTone {
    if (!this.isCritical(context)) return preferredTone;
    return capToneIntensity(preferredTone, CRITICAL_INTENSITY_CAP);
  }

  buildGuardrailInstruction(preferredTone: VorcaroTone, effectiveTone: VorcaroTone): string | undefined {
    if (preferredTone === effectiveTone) return undefined;
    return `Cenário financeiro crítico detectado. O usuário prefere ${preferredTone}, mas nesta resposta use tom ${effectiveTone}: priorize clareza, ação e orientação. Evite sarcasmo, ironia e humor ácido.`;
  }
}
