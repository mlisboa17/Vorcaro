import { AiProviderError } from "../../domain/errors/ai-provider.error";
import type { AiProviderName } from "../../domain/ports/ai-provider.port";

export const AI_PROVIDER_TIMEOUT_MS = 10_000;

export async function withProviderTimeout<T>(
  provider: AiProviderName,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_PROVIDER_TIMEOUT_MS);

  try {
    return await operation(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new AiProviderError(`Timeout após ${AI_PROVIDER_TIMEOUT_MS}ms`, provider, error);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function extractJsonFromText<T>(text: string): T {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence?.[1]?.trim() ?? trimmed;
  return JSON.parse(candidate) as T;
}

export async function callOpenAiCompatibleChat(params: {
  url: string;
  apiKey: string;
  model: string;
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  signal: AbortSignal;
  extraHeaders?: Record<string, string>;
}): Promise<{ text: string; raw: unknown }> {
  const messages: { role: string; content: string }[] = [];
  if (params.system) {
    messages.push({ role: "system", content: params.system });
  }
  messages.push({ role: "user", content: params.prompt });

  const response = await fetch(params.url, {
    method: "POST",
    signal: params.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
      ...params.extraHeaders,
    },
    body: JSON.stringify({
      model: params.model,
      messages,
      temperature: params.temperature ?? 0.2,
      max_tokens: params.maxTokens ?? 2048,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
  }

  const raw = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = raw.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) {
    throw new Error("Resposta vazia do provedor");
  }
  return { text, raw };
}
