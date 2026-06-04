import { describe, expect, it } from "vitest";
import {
  buildDefaultRuleDrafts,
  DEFAULT_CATEGORIZATION_RULE_GROUPS,
  ruleFingerprint,
  SYSTEM_DEFAULT_RULE_DESCRIPTION,
} from "../default-categorization-rules";

describe("default-categorization-rules", () => {
  it("gera uma regra por palavra-chave com prioridade 50 e marcador de sistema", () => {
    const drafts = buildDefaultRuleDrafts();
    const keywordCount = DEFAULT_CATEGORIZATION_RULE_GROUPS.reduce(
      (sum, g) => sum + g.keywords.length,
      0,
    );

    expect(drafts).toHaveLength(keywordCount);
    expect(drafts[0].priority).toBe(50);
    expect(drafts[0].description).toContain(SYSTEM_DEFAULT_RULE_DESCRIPTION);
    expect(drafts[0].name.startsWith("[Sistema]")).toBe(true);
  });

  it("fingerprint é estável para mesma condição e ação", () => {
    const draft = buildDefaultRuleDrafts().find((d) => d.keyword === "NETFLIX");
    expect(draft).toBeDefined();
    const fp1 = ruleFingerprint(draft!.condition, draft!.action);
    const fp2 = ruleFingerprint(draft!.condition, draft!.action);
    expect(fp1).toBe(fp2);
  });

  it("não inclui keywords obsoletas UBER/99 soltos em mobilidade", () => {
    const mobility = DEFAULT_CATEGORIZATION_RULE_GROUPS.find((g) => g.groupId === "mobility");
    expect(mobility?.keywords).not.toContain("UBER");
    expect(mobility?.keywords).not.toContain("99");
    expect(mobility?.keywords).toContain("UBER TRIP");
    expect(mobility?.keywords).toContain("99APP");
  });
});
