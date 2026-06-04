import { describe, expect, it } from "vitest";
import { SubscriptionNameNormalizer } from "../domain/services/subscription-name-normalizer";

describe("SubscriptionNameNormalizer", () => {
  const normalizer = new SubscriptionNameNormalizer();

  it.each([
    ["RENE*NETFLIX 102394", "Netflix"],
    ["NETFLIX ENTRETENIMEN", "Netflix"],
    ["SFTY*SPOTIFY PREMIUM", "Spotify"],
    ["AMZN PRIME BR", "Amazon Prime"],
    ["GOOGLE*ONE", "Google One"],
    ["APPLE.COM/BILL", "Apple One"],
  ])("normaliza %s como %s", (dirty, expected) => {
    expect(normalizer.normalize(dirty)).toBe(expected);
  });

  it("gera o mesmo normalizedName para descrições diferentes do mesmo serviço", () => {
    const a = normalizer.normalize("RENE*NETFLIX 102394");
    const b = normalizer.normalize("NETFLIX ENTRETENIMEN");
    expect(a).toBe("Netflix");
    expect(b).toBe("Netflix");
    expect(normalizer.toDuplicateGroup(a!)).toBe(normalizer.toDuplicateGroup(b!));
  });
});
