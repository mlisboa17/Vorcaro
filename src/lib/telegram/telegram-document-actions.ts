export type TelegramInlineKeyboardButton = {
  text: string;
  callback_data: string;
};

const CATEGORY_EMOJIS = ["1️⃣", "2️⃣", "3️⃣"];

/** Teclado inicial: sempre 3 botões — Confirmar, Alterar, Cancelar. */
export function buildDocumentSuggestionKeyboard(suggestionId: string): TelegramInlineKeyboardButton[][] {
  return [
    [
      { text: "✅ Confirmar", callback_data: `doc_approve:${suggestionId}` },
      { text: "🔄 Alterar", callback_data: `doc_alter:${suggestionId}` },
      { text: "❌ Cancelar", callback_data: `doc_reject:${suggestionId}` },
    ],
  ];
}

/** Teclado exibido após tocar em "Alterar": as opções de categoria sugeridas pela IA. */
export function buildCategoryOptionsKeyboard(
  suggestionId: string,
  categoryOptions: Array<{ label: string; confidence: number }>,
): TelegramInlineKeyboardButton[][] {
  const rows: TelegramInlineKeyboardButton[][] = categoryOptions.map((opt, i) => {
    const emoji = CATEGORY_EMOJIS[i] ?? "•";
    const label = opt.label.length > 28 ? `${opt.label.slice(0, 27)}…` : opt.label;
    return [{ text: `${emoji} ${label} (${opt.confidence}%)`, callback_data: `doc_cat:${suggestionId}:${i}` }];
  });
  rows.push([
    { text: "✏️ Editar no dashboard", callback_data: `doc_edit:${suggestionId}` },
    { text: "❌ Cancelar", callback_data: `doc_reject:${suggestionId}` },
  ]);
  return rows;
}

export function parseDocumentSuggestionCallback(
  data: string,
):
  | { action: "approve" | "reject" | "edit" | "alter"; suggestionId: string }
  | { action: "select_category"; suggestionId: string; optionIndex: number }
  | null {
  const approve = /^doc_approve:(.+)$/.exec(data);
  if (approve?.[1]) return { action: "approve", suggestionId: approve[1] };
  const reject = /^doc_reject:(.+)$/.exec(data);
  if (reject?.[1]) return { action: "reject", suggestionId: reject[1] };
  const edit = /^doc_edit:(.+)$/.exec(data);
  if (edit?.[1]) return { action: "edit", suggestionId: edit[1] };
  const alter = /^doc_alter:(.+)$/.exec(data);
  if (alter?.[1]) return { action: "alter", suggestionId: alter[1] };
  const cat = /^doc_cat:(.+):(\d+)$/.exec(data);
  if (cat?.[1] && cat[2]) {
    return { action: "select_category", suggestionId: cat[1], optionIndex: Number(cat[2]) };
  }
  return null;
}
