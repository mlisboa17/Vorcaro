import { TransactionExtractorService, StructuredTransaction } from "@/modules/ai/services/transaction-extractor.service";
import { prisma } from "@/lib/prisma";
import { InboxChannel } from "@prisma/client";

export class RegisterCognitiveTransactionUseCase {
  private extractor: TransactionExtractorService;

  constructor() {
    this.extractor = new TransactionExtractorService();
  }

  /**
   * Extrai e registra transações oriundas de comandos de texto natural ou faturas (via OCR/IA).
   * Caso a IA não consiga inferir completamente os dados, os salva em estado PENDING na Inbox (Caixa de Entrada).
   * Caso sucesso absoluto (HIGH), salva em NEEDS_CONFIRMATION para aprovação final humana.
   */
  async execute(userId: string, input: string | Buffer, channel: InboxChannel = "WEB", mediaUrl?: string) {
    // 1. Extração Cognitiva via LLM e Zod Validation
    const structuredData = await this.extractor.extract(input);

    let rawContent = "";
    if (typeof input === "string") {
      rawContent = input;
    } else {
      rawContent = "[Conteúdo Binário / Imagem / Documento]";
    }

    // 2. Fallback de Segurança (Salvamento na Inbox invés de estourar Erro Runtime)
    // Se LOW, a extração falhou ou está ambígua. Status PENDING indica que o usuário precisa preencher manualmente.
    // Se HIGH, os dados estão prontos mas o fluxo financeiro ainda carece de conta e categoria (NEEDS_CONFIRMATION).
    const status = structuredData.confidence === "HIGH" ? "NEEDS_CONFIRMATION" : "PENDING";

    const inboxItem = await prisma.financialInbox.create({
      data: {
        userId,
        channel,
        rawContent,
        status,
        metadata: {
          extractedData: structuredData as Record<string, any>,
          ...(mediaUrl && { mediaUrl })
        }
      }
    });

    // 3. Salva o rastro de auditoria da IA na tabela de resultados dedicados
    await prisma.extractionResult.create({
      data: {
        inboxItemId: inboxItem.id,
        provider: "GEMINI_1_5_FLASH",
        extractedData: structuredData as Record<string, any>,
        confidence: { level: structuredData.confidence },
      }
    });

    return {
      success: true,
      inboxItemId: inboxItem.id,
      status,
      extractedData: structuredData
    };
  }
}
