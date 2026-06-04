import { buildNavigationTarget } from "../../domain/services/vorcaro-action-navigation";
import type { VorcaroActionProposalRecord } from "../../domain/types/vorcaro-action";
import type { VorcaroActionExecutionResult } from "../../domain/types/vorcaro-action";
import { VORCARO_ACTION_TYPES, type VorcaroActionType } from "../../domain/types/vorcaro-action";

export class VorcaroActionExecutorService {
  execute(proposal: VorcaroActionProposalRecord): VorcaroActionExecutionResult {
    if (!VORCARO_ACTION_TYPES.includes(proposal.actionType as VorcaroActionType)) {
      return {
        status: "FAILED",
        title: proposal.title,
        message: "Tipo de ação não suportado.",
      };
    }

    try {
      const nav = buildNavigationTarget(
        proposal.actionType as VorcaroActionType,
        proposal.payload,
      );
      return {
        status: "EXECUTED",
        targetUrl: nav.targetUrl,
        navigationPayload: nav.navigationPayload,
        title: nav.title,
        message: nav.message,
      };
    } catch {
      return {
        status: "FAILED",
        title: proposal.title,
        message: "Não foi possível montar o destino de navegação.",
      };
    }
  }
}
