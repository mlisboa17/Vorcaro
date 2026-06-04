export type TelegramInlineKeyboardButton = {
  text: string;
  callback_data: string;
};

export function buildActionProposalKeyboard(
  proposals: Array<{ id: string }>,
): TelegramInlineKeyboardButton[][] {
  return proposals.map((p) => [
    { text: "✅ Aprovar", callback_data: `approve:${p.id}` },
    { text: "❌ Rejeitar", callback_data: `reject:${p.id}` },
  ]);
}

export function parseActionProposalCallback(
  data: string,
): { action: "approve" | "reject"; proposalId: string } | null {
  const match = /^approve:(.+)$/.exec(data);
  if (match?.[1]) return { action: "approve", proposalId: match[1] };
  const reject = /^reject:(.+)$/.exec(data);
  if (reject?.[1]) return { action: "reject", proposalId: reject[1] };
  return null;
}

export function buildFollowUpDismissKeyboard(
  followUpId: string,
): TelegramInlineKeyboardButton[][] {
  return [[{ text: "✅ Dispensar pendência", callback_data: `dismiss_fu:${followUpId}` }]];
}

export function parseFollowUpDismissCallback(data: string): string | null {
  const match = /^dismiss_fu:(.+)$/.exec(data);
  return match?.[1] ?? null;
}
