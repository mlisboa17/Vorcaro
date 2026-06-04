import { VORCARO_INSUFFICIENT_DATA_MESSAGE } from "../../domain/types/vorcaro-conversation";

const FORBIDDEN_PATTERNS = [
  /garant(o|ia) retorno/i,
  /enriquecimento r[aá]pido/i,
  /100% de lucro/i,
  /com certeza vai/i,
  /prometo que/i,
];

export class VorcaroChatGuardrailService {
  readonly insufficientDataMessage = VORCARO_INSUFFICIENT_DATA_MESSAGE;

  shouldBlockInsufficientData(dataScore: number, usedSources: string[]): boolean {
    return dataScore < 3 || usedSources.length === 0;
  }

  sanitizeAnswer(answer: string): string {
    if (FORBIDDEN_PATTERNS.some((p) => p.test(answer))) {
      return `${answer}\n\nObservação: projeções dependem dos dados atuais do sistema — sem garantias de retorno.`;
    }
    return answer;
  }

  resolveConfidence(dataScore: number, usedSources: string[]): "LOW" | "MEDIUM" | "HIGH" {
    if (dataScore < 3 || usedSources.length === 0) return "LOW";
    if (dataScore < 7 || usedSources.length < 3) return "MEDIUM";
    return "HIGH";
  }
}
