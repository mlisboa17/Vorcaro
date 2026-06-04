import {
  VORCARO_ACTION_INTERPRETER_MAX_AGE_MINUTES,
  type VorcaroActionProposalRecord,
} from "../../domain/types/vorcaro-action";
import { PrismaVorcaroActionProposalRepository } from "../../infrastructure/repositories/prisma-vorcaro-action-proposal.repository";

export type VorcaroActionInterpretation = "CONFIRM" | "REJECT";

const CONFIRM_PATTERNS = [
  /^sim$/i,
  /^confirmar$/i,
  /^pode abrir$/i,
  /^abrir$/i,
  /^executar$/i,
  /^bora$/i,
  /^pode fazer$/i,
  /^ok$/i,
  /^pode$/i,
];

const REJECT_PATTERNS = [
  /^n[aã]o$/i,
  /^cancelar$/i,
  /^ignorar$/i,
  /^depois$/i,
  /^agora n[aã]o$/i,
  /^não quero$/i,
  /^nao quero$/i,
];

export class VorcaroActionInterpreterService {
  constructor(private readonly repo: PrismaVorcaroActionProposalRepository) {}

  interpret(message: string): VorcaroActionInterpretation | null {
    const text = message.trim();
    if (!text) return null;

    if (CONFIRM_PATTERNS.some((p) => p.test(text))) return "CONFIRM";
    if (REJECT_PATTERNS.some((p) => p.test(text))) return "REJECT";

    if (/^confirmar\b/i.test(text)) return "CONFIRM";
    if (/^cancelar\b/i.test(text)) return "REJECT";
    if (/^executar\b/i.test(text)) return "CONFIRM";
    if (/^abrir\b/i.test(text)) return "CONFIRM";

    return null;
  }

  async findEligiblePendingProposal(userId: string): Promise<VorcaroActionProposalRecord | null> {
    const maxAgeMs = VORCARO_ACTION_INTERPRETER_MAX_AGE_MINUTES * 60_000;
    return this.repo.findLatestPendingForUser(userId, maxAgeMs);
  }

  isInterpretable(message: string): boolean {
    return this.interpret(message) !== null;
  }
}
