"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function registerDetectedAccount(suggestionId: string): Promise<{
  success: boolean;
  accountId?: string;
  name?: string;
  type?: "CHECKING" | "CREDIT_CARD";
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Não autorizado" };
    }
    const userId = session.user.id;

    // Busca o sentinel do staging
    const suggestion = await prisma.statementLineSuggestion.findFirst({
      where: { id: suggestionId, userId, score: -99, processed: false }
    });

    if (!suggestion || !suggestion.suggestedName) {
      return { success: false, error: "Conta pendente não encontrada ou já processada." };
    }

    const parts = suggestion.suggestedName.split(":");
    if (parts[0] !== "__PENDING_ACCOUNT__") {
      return { success: false, error: "Formato de sugestão inválido." };
    }

    const bankName = parts[1] || "Banco";
    const type = parts[2] as "CHECKING" | "CREDIT_CARD";
    const agency = parts[3] || null;
    const accountNumber = parts[4] || null;
    const cardLastFour = parts[5] || null;

    let createdId = "";
    let createdName = "";

    if (type === "CREDIT_CARD") {
      createdName = `${bankName}${cardLastFour ? ` Final ${cardLastFour}` : " Card"}`;
      const newCard = await prisma.card.create({
        data: {
          userId,
          name: createdName,
          institutionName: bankName,
          brand: "OTHER",
          type: "CREDITO",
          lastFourDigits: cardLastFour,
          isActive: true
        }
      });
      createdId = newCard.id;
    } else {
      createdName = `${bankName}${accountNumber ? ` - ${accountNumber}` : ""}`;
      const newAcc = await prisma.financialAccount.create({
        data: {
          userId,
          name: createdName,
          institutionName: bankName,
          type: "CHECKING",
          balance: 0,
          isActive: true
        }
      });
      createdId = newAcc.id;
    }

    // Remove do staging
    await prisma.statementLineSuggestion.deleteMany({
      where: { id: suggestionId, userId }
    });

    revalidatePath("/dashboard/statements");

    return {
      success: true,
      accountId: createdId,
      name: createdName,
      type
    };
  } catch (error) {
    console.error("[registerDetectedAccount] Erro ao cadastrar conta:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido ao cadastrar conta."
    };
  }
}
