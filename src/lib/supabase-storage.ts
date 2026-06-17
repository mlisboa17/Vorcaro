import { createClient } from "@supabase/supabase-js";

// Utilitário para inicializar o cliente do Supabase
// Usamos o SERVICE_ROLE_KEY para que o servidor backend tenha permissão de gravar no bucket,
// mesmo se não estiver usando o Supabase Auth para RLS ainda.
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check your .env file."
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Faz o upload de um arquivo diretamente via Buffer para o Supabase Storage.
 * Retorna a URL pública gerada para persistência.
 * 
 * @param buffer O conteúdo binário do arquivo em memória
 * @param mimeType O tipo MIME do arquivo (ex: "image/jpeg", "audio/ogg")
 * @param path O caminho lógico dentro do bucket (ex: "userId/uuid.jpg")
 * @returns A URL pública ou assinada do arquivo persistido
 */
export async function uploadReceipt(
  buffer: Buffer,
  mimeType: string,
  path: string
): Promise<string> {
  const supabase = getSupabaseClient();
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "receipts";

  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload para Supabase falhou: ${error.message}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Telegram Webhook Error] Falha de Storage:", message);
    throw new Error(`Storage Error: ${message}`);
  }

  // Retorna apenas o caminho multitenant para ser salvo com segurança no banco
  return path;
}

/**
 * Exclui fisicamente um arquivo do bucket de comprovantes.
 * 
 * @param path O caminho lógico dentro do bucket (ex: "userId/uuid.jpg")
 */
export async function deleteReceipt(path: string): Promise<void> {
  const supabase = getSupabaseClient();
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "receipts";

  const { error } = await supabase.storage
    .from(bucketName)
    .remove([path]);

  if (error) {
    console.error("[SupabaseStorage] Falha ao deletar arquivo:", error);
    throw new Error(`Deleção no Supabase falhou: ${error.message}`);
  }
}

/**
 * Gera uma URL assinada (temporária) para visualização segura do arquivo.
 * 
 * @param path O caminho lógico dentro do bucket (ex: "userId/uuid.jpg")
 * @param expiresIn Validade do link em segundos (padrão: 15 min = 900s)
 * @returns A URL assinada para visualização direta
 */
export async function getSignedReceiptUrl(path: string, expiresIn: number = 900): Promise<string> {
  const supabase = getSupabaseClient();
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "receipts";

  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(path, expiresIn);

  if (error || !data) {
    console.error("[SupabaseStorage] Falha ao gerar Signed URL:", error);
    throw new Error(`Geração de URL assinada falhou: ${error?.message}`);
  }

  return data.signedUrl;
}
