"use server";

import { auth } from "@/lib/auth";
import { getSignedReceiptUrl } from "@/lib/supabase-storage";

/**
 * Server Action dedicada para gerar a URL assinada segura de uma mídia (comprovante/recibo).
 * 
 * @param path O caminho lógico do arquivo armazenado no Supabase (ex: "userId/uuid.jpg").
 * @returns A URL temporária que expira em 15 minutos, caso validado com sucesso.
 */
export async function getTransactionFileUrl(path: string): Promise<string> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized: Requer usuário autenticado para acessar a mídia.");
  }

  const userId = session.user.id;

  // Isolamento Multitenant Rigoroso:
  // Garante que o arquivo sendo acessado pertence estritamente ao inquilino logado,
  // prevenindo ataques de enumeração ou acesso indevido a arquivos de terceiros.
  if (!path.startsWith(`${userId}/`)) {
    throw new Error("Forbidden: Caminho não pertence ao escopo multitenant do usuário.");
  }

  // Se passou pelas travas, gera a Signed URL
  return getSignedReceiptUrl(path);
}
