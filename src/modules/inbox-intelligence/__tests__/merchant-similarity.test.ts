import { describe, expect, it } from "vitest";
import {
  bestMerchantMatch,
  merchantSimilarity,
  normalizeMerchantText,
} from "../domain/services/merchant-similarity";

describe("merchant-similarity", () => {
  it("normaliza descrições de cartão", () => {
    expect(normalizeMerchantText("OUTBACK TACARUNA SHOPP 02/05")).toBe("OUTBACK TACARUNA SHOPP");
  });

  it("detecta fornecedores similares (OUTBACK)", () => {
    const score = merchantSimilarity("OUTBACK TACARUNA SHOPP", "OUTBACK TACARUNA");
    expect(score).toBeGreaterThanOrEqual(0.5);
  });

  it("retorna null quando similaridade é baixa", () => {
    const match = bestMerchantMatch(
      "FARMACIA SAO PAULO",
      [{ keyword: "OUTBACK TACARUNA", score: 10 }],
      0.45,
    );
    expect(match).toBeNull();
  });

  it("escolhe o candidato com maior similaridade", () => {
    const match = bestMerchantMatch(
      "OUTBACK TACARUNA SHOPPING",
      [
        { keyword: "OUTBACK TACARUNA", score: 20 },
        { keyword: "POSTO SHELL", score: 5 },
      ],
      0.42,
    );
    expect(match?.keyword).toBe("OUTBACK TACARUNA");
    expect(match?.similarity).toBeGreaterThan(0.42);
  });
});
