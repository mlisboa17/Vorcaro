import { prisma } from "@/lib/prisma";
import { VorcaroActionInterpreterService } from "@/modules/vorcaro/actions/application/services/vorcaro-action-interpreter.service";
import { VorcaroActionProposalService } from "@/modules/vorcaro/actions/application/services/vorcaro-action-proposal.service";
import { PrismaVorcaroActionProposalRepository } from "@/modules/vorcaro/actions/infrastructure/repositories/prisma-vorcaro-action-proposal.repository";

export function buildVorcaroActionProposalRepository() {
  return new PrismaVorcaroActionProposalRepository(prisma);
}

export function buildVorcaroActionProposalService() {
  return new VorcaroActionProposalService(buildVorcaroActionProposalRepository());
}

export function buildVorcaroActionInterpreterService() {
  return new VorcaroActionInterpreterService(buildVorcaroActionProposalRepository());
}
