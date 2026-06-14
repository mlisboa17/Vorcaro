import { prisma } from "@/lib/prisma";

export type ConfirmCognitiveTransactionResult = 
  | { success: true; message: string; reviewRequired: boolean }
  | { success: false; alreadyProcessed: true; message: string }
  | { success: false; error: "NOT_FOUND" | "UNAUTHORIZED" };

export class ConfirmCognitiveTransactionUseCase {
  async execute(
    userId: string,
    inboxItemId: string
  ): Promise<ConfirmCognitiveTransactionResult> {
    const item = await prisma.financialInbox.findUnique({
      where: { id: inboxItemId }
    });

    // 1. Isolamento Multitenant Estrito
    if (!item) {
      return { success: false, error: "NOT_FOUND" };
    }
    if (item.userId !== userId) {
      return { success: false, error: "UNAUTHORIZED" };
    }

    // 2. Idempotência e Concorrência de Clique
    if (item.status === "SAVED" || item.status === "ERROR") {
      return { success: false, alreadyProcessed: true, message: "Ação já processada anteriormente." };
    }

    // 3. Auditoria de Confiança
    const metadata = (item.metadata as Record<string, any>) || {};
    const confidence = metadata.extractedData?.confidence;
    const isLowConfidence = confidence === "LOW";

    const updatedMetadata = {
      ...metadata,
      reviewRequired: isLowConfidence
    };

    await prisma.financialInbox.update({
      where: { id: inboxItemId },
      data: {
        status: "SAVED",
        metadata: updatedMetadata
      }
    });

    if (isLowConfidence) {
       return { 
         success: true, 
         reviewRequired: true,
         message: "⚠️ Lançamento registrado! Detectamos baixa nitidez nos dados. Recomendamos revisar este lançamento no seu painel da Web."
       };
    }

    return { 
      success: true, 
      reviewRequired: false,
      message: "✅ Lançamento consolidado com sucesso!"
    };
  }
}
