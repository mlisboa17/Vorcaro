import { describe, expect, it } from "vitest";
import {
  buildNormalizedSearchText,
  isAmbiguousKeywordBlocked,
  ruleMatchesSearchText,
  sortRulesForMatching,
  buildRuleFieldContext,
} from "../rule-match-guards";

describe("rule-match-guards", () => {
  describe("buildNormalizedSearchText", () => {
    it("combina campos disponíveis ignorando vazios", () => {
      expect(
        buildNormalizedSearchText({
          description: "UBER EATS",
          rawContent: "fatura cartão",
          descricaoBase: "pedido 123",
        }),
      ).toBe("UBER EATS fatura cartão pedido 123");
    });

    it("aceita campos futuros sem quebrar quando ausentes", () => {
      expect(buildNormalizedSearchText({ description: "NETFLIX" })).toBe("NETFLIX");
    });
  });

  describe("isAmbiguousKeywordBlocked", () => {
    it("bloqueia UBER quando texto indica Uber Eats", () => {
      expect(isAmbiguousKeywordBlocked("UBER", "UBER EATS SP")).toBe(true);
    });

    it("não bloqueia UBER para corrida", () => {
      expect(isAmbiguousKeywordBlocked("UBER", "UBER TRIP SAO PAULO")).toBe(false);
    });

    it("bloqueia 99 quando texto indica 99Food", () => {
      expect(isAmbiguousKeywordBlocked("99", "99FOOD PEDIDO")).toBe(true);
    });

    it("não bloqueia 99 para mobilidade", () => {
      expect(isAmbiguousKeywordBlocked("99", "99APP CORRIDA")).toBe(false);
    });
  });

  describe("ruleMatchesSearchText", () => {
    it("busca keyword no texto normalizado combinado", () => {
      const context = buildRuleFieldContext({
        description: "outro",
        rawContent: "assinatura netflix mensal",
      });
      const haystack = buildNormalizedSearchText({
        description: "outro",
        rawContent: "assinatura netflix mensal",
      });
      const condition = { operator: "contains", field: "description", value: "netflix" };
      expect(ruleMatchesSearchText(condition, haystack, context)).toBe(true);
    });
  });

  describe("sortRulesForMatching", () => {
    it("ordena por prioridade desc e keyword mais longa", () => {
      const rules = [
        { priority: 50, condition: { operator: "contains", field: "description", value: "UBER" }, createdAt: new Date(1) },
        { priority: 90, condition: { operator: "contains", field: "description", value: "UBER EATS" }, createdAt: new Date(2) },
        { priority: 90, condition: { operator: "contains", field: "description", value: "UBER TRIP" }, createdAt: new Date(3) },
      ];

      const sorted = sortRulesForMatching(rules);
      expect(sorted[0].condition).toEqual(expect.objectContaining({ value: "UBER EATS" }));
      expect(sorted[1].condition).toEqual(expect.objectContaining({ value: "UBER TRIP" }));
    });
  });
});
