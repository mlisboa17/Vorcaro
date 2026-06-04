import { describe, expect, it } from "vitest";
import {
  buildActionProposalKeyboard,
  parseActionProposalCallback,
  parseFollowUpDismissCallback,
} from "@/lib/telegram/telegram-inline-actions";

describe("telegram-inline-actions", () => {
  it("monta teclado inline approve/reject", () => {
    const keyboard = buildActionProposalKeyboard([{ id: "prop-abc" }]);
    expect(keyboard[0][0]).toEqual({ text: "✅ Aprovar", callback_data: "approve:prop-abc" });
    expect(keyboard[0][1]).toEqual({ text: "❌ Rejeitar", callback_data: "reject:prop-abc" });
  });

  it("parseia callbacks de proposta", () => {
    expect(parseActionProposalCallback("approve:prop-1")).toEqual({
      action: "approve",
      proposalId: "prop-1",
    });
    expect(parseActionProposalCallback("reject:prop-2")).toEqual({
      action: "reject",
      proposalId: "prop-2",
    });
    expect(parseActionProposalCallback("invalid")).toBeNull();
  });

  it("parseia dismiss de follow-up", () => {
    expect(parseFollowUpDismissCallback("dismiss_fu:fu-1")).toBe("fu-1");
    expect(parseFollowUpDismissCallback("approve:x")).toBeNull();
  });
});
