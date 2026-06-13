"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

export type ActionResponse = {
  success: boolean;
  message: string;
  token?: string;
};

export async function generateWebhookToken(accountId: string): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Não autorizado" };
  }

  const account = await prisma.financialAccount.findUnique({
    where: { id: accountId, userId: session.user.id },
  });

  if (!account) {
    return { success: false, message: "Conta não encontrada ou acesso negado." };
  }

  const token = randomBytes(32).toString("hex");

  await prisma.financialAccount.update({
    where: { id: accountId },
    data: { webhookToken: token },
  });

  revalidatePath("/dashboard/settings/integrations");

  return {
    success: true,
    message: "Token gerado com sucesso.",
    token,
  };
}

export async function revokeWebhookToken(accountId: string): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Não autorizado" };
  }

  const account = await prisma.financialAccount.findUnique({
    where: { id: accountId, userId: session.user.id },
  });

  if (!account) {
    return { success: false, message: "Conta não encontrada ou acesso negado." };
  }

  await prisma.financialAccount.update({
    where: { id: accountId },
    data: { webhookToken: null },
  });

  revalidatePath("/dashboard/settings/integrations");

  return {
    success: true,
    message: "Integração revogada com sucesso.",
  };
}
