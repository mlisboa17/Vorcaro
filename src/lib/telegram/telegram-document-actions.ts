export type TelegramInlineKeyboardButton = {
  text: string;
  callback_data: string;
};

export function buildDocumentSuggestionKeyboard(suggestionId: string): TelegramInlineKeyboardButton[][] {
  return [
    [
      { text: "✅ Confirmar", callback_data: `doc_approve:${suggestionId}` },
      { text: "✏️ Editar", callback_data: `doc_edit:${suggestionId}` },
    ],
    [{ text: "❌ Rejeitar", callback_data: `doc_reject:${suggestionId}` }],
  ];
}

export function parseDocumentSuggestionCallback(
  data: string,
): { action: "approve" | "reject" | "edit"; suggestionId: string } | null {
  const approve = /^doc_approve:(.+)$/.exec(data);
  if (approve?.[1]) return { action: "approve", suggestionId: approve[1] };
  const reject = /^doc_reject:(.+)$/.exec(data);
  if (reject?.[1]) return { action: "reject", suggestionId: reject[1] };
  const edit = /^doc_edit:(.+)$/.exec(data);
  if (edit?.[1]) return { action: "edit", suggestionId: edit[1] };
  return null;
}
