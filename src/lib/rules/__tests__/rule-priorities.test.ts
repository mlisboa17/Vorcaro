import { describe, expect, it } from "vitest";
import {
  LEARNED_PATTERN_REFERENCE_PRIORITY,
  USER_RULE_DEFAULT_PRIORITY,
  partitionRulesByOrigin,
} from "../rule-priorities";
import { SYSTEM_DEFAULT_RULE_DESCRIPTION, SYSTEM_DEFAULT_RULE_PRIORITY } from "../default-categorization-rules";

describe("rule-priorities", () => {
  it("define prioridades USER > SYSTEM > LEARNED", () => {
    expect(USER_RULE_DEFAULT_PRIORITY).toBe(100);
    expect(SYSTEM_DEFAULT_RULE_PRIORITY).toBe(50);
    expect(LEARNED_PATTERN_REFERENCE_PRIORITY).toBe(10);
    expect(USER_RULE_DEFAULT_PRIORITY).toBeGreaterThan(SYSTEM_DEFAULT_RULE_PRIORITY);
    expect(SYSTEM_DEFAULT_RULE_PRIORITY).toBeGreaterThan(LEARNED_PATTERN_REFERENCE_PRIORITY);
  });

  it("separa regras do usuário e do sistema para a UI", () => {
    const rules = [
      { id: "1", description: null, name: "Minha regra" },
      { id: "2", description: `${SYSTEM_DEFAULT_RULE_DESCRIPTION}:delivery:UBER EATS`, name: "[Sistema] Delivery · UBER EATS" },
      { id: "3", description: "notas", name: "Outra" },
    ];

    const { userRules, systemRules } = partitionRulesByOrigin(rules);

    expect(userRules).toHaveLength(2);
    expect(systemRules).toHaveLength(1);
    expect(systemRules[0].name.startsWith("[Sistema]")).toBe(true);
    expect(userRules.every((r) => !r.description?.startsWith(SYSTEM_DEFAULT_RULE_DESCRIPTION))).toBe(true);
  });
});
