export type AiProviderName = "groq" | "gemini" | "openrouter";

export type AiTextInput = {
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
};

export type AiTextResult = {
  provider: AiProviderName;
  model: string;
  text: string;
  raw?: unknown;
};

export type AiJsonInput = AiTextInput & {
  schemaName?: string;
};

export interface AiProviderPort {
  name: AiProviderName;
  generateText(input: AiTextInput): Promise<AiTextResult>;
  generateJson<T>(input: AiJsonInput): Promise<T>;
}
