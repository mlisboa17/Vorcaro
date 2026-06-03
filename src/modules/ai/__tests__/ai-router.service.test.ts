import { describe, expect, it } from "vitest";
import { AiRouterService } from "../application/services/ai-router.service";
import type { AiProviderPort, AiTextInput, AiTextResult } from "../domain/ports/ai-provider.port";
import { AiProviderError } from "../domain/errors/ai-provider.error";

function mockProvider(
  name: AiProviderPort["name"],
  behavior: (input: AiTextInput) => Promise<AiTextResult>,
): AiProviderPort {
  return {
    name,
    generateText: behavior,
    generateJson: async () => ({ ok: true }) as never,
  };
}

describe("AiRouterService", () => {
  it("segue ordem Groq → Gemini → OpenRouter no fallback", async () => {
    const order: string[] = [];

    const groq = mockProvider("groq", async () => {
      order.push("groq");
      throw new AiProviderError("falha groq", "groq");
    });
    const gemini = mockProvider("gemini", async () => {
      order.push("gemini");
      throw new AiProviderError("falha gemini", "gemini");
    });
    const openrouter = mockProvider("openrouter", async () => {
      order.push("openrouter");
      return { provider: "openrouter", model: "openrouter/auto", text: "ok" };
    });

    const router = new AiRouterService([groq, gemini, openrouter]);
    const result = await router.generateText({ prompt: "teste" });

    expect(order).toEqual(["groq", "gemini", "openrouter"]);
    expect(result.text).toBe("ok");
    expect(result.provider).toBe("openrouter");
  });

  it("lança AiRouterExhaustedError quando todos falham", async () => {
    const router = new AiRouterService([
      mockProvider("groq", async () => {
        throw new AiProviderError("x", "groq");
      }),
    ]);

    await expect(router.generateText({ prompt: "q" })).rejects.toMatchObject({
      name: "AiRouterExhaustedError",
    });
  });
});
