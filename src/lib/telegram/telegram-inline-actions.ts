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

export function buildCognitiveTransactionKeyboard(
  inboxItemId: string,
): TelegramInlineKeyboardButton[][] {
  return [
    [
      { text: "✅ Confirmar", callback_data: `cog_ack:${inboxItemId}` },
      { text: "❌ Descartar", callback_data: `cog_rej:${inboxItemId}` },
    ],
    [
      { text: "✏️ Categoria", callback_data: `cog_edit:cat:${inboxItemId}` },
      { text: "📍 Local", callback_data: `cog_edit:local:${inboxItemId}` },
      { text: "💰 Valor", callback_data: `cog_edit:valor:${inboxItemId}` },
    ],
  ];
}

export function parseCognitiveTransactionCallback(
  data: string,
): { action: "ack" | "rej"; inboxItemId: string } | null {
  const ack = /^cog_ack:(.+)$/.exec(data);
  if (ack?.[1]) return { action: "ack", inboxItemId: ack[1] };
  const rej = /^cog_rej:(.+)$/.exec(data);
  if (rej?.[1]) return { action: "rej", inboxItemId: rej[1] };
  return null;
}

export type CognitiveEditField = "cat" | "local" | "valor";

export function parseCognitiveEditCallback(
  data: string,
): { field: CognitiveEditField; inboxItemId: string } | null {
  const match = /^cog_edit:(cat|local|valor):(.+)$/.exec(data);
  if (match?.[1] && match[2]) {
    return { field: match[1] as CognitiveEditField, inboxItemId: match[2] };
  }
  return null;
}

/** Grade de categorias (2 por linha) para o usuário escolher ao editar. */
export function buildCategoryPickerKeyboard(
  categories: Array<{ id: string; name: string }>,
): TelegramInlineKeyboardButton[][] {
  const rows: TelegramInlineKeyboardButton[][] = [];
  for (let i = 0; i < categories.length; i += 2) {
    const row = categories.slice(i, i + 2).map((c) => ({
      text: c.name.length > 22 ? `${c.name.slice(0, 21)}…` : c.name,
      callback_data: `cog_cat:${c.id}`,
    }));
    rows.push(row);
  }
  return rows;
}

/** callback_data = cog_cat:<categoryId> (o inboxItem vem do estado no Redis). */
export function parseCategoryPickCallback(data: string): { categoryId: string } | null {
  const match = /^cog_cat:(.+)$/.exec(data);
  return match?.[1] ? { categoryId: match[1] } : null;
}
