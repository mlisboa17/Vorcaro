export type ReceivableTelegramHint = {
  detected: boolean;
  devedorNome: string | null;
  amount: number | null;
  message: string | null;
};

const PATTERNS: Array<{
  regex: RegExp;
  devedorGroup: number;
  amountGroup: number;
}> = [
  {
    regex: /comprei\s+r?\$?\s*([\d.,]+)\s+(?:para|pro|p\/)\s+([A-Za-zÀ-ú0-9 .'-]{2,40})/i,
    amountGroup: 1,
    devedorGroup: 2,
  },
  {
    regex: /gastei\s+r?\$?\s*([\d.,]+)\s+(?:para|pro|p\/)\s+([A-Za-zÀ-ú0-9 .'-]{2,40})/i,
    amountGroup: 1,
    devedorGroup: 2,
  },
  {
    regex: /r?\$?\s*([\d.,]+)\s+(?:para|pro)\s+([A-Za-zÀ-ú0-9 .'-]{2,40})/i,
    amountGroup: 1,
    devedorGroup: 2,
  },
];

function parseBrazilianAmount(raw: string): number | null {
  const normalized = raw.trim().replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function detectReceivableTelegramHint(text: string): ReceivableTelegramHint {
  const trimmed = text.trim();
  if (!trimmed) {
    return { detected: false, devedorNome: null, amount: null, message: null };
  }

  for (const pattern of PATTERNS) {
    const match = trimmed.match(pattern.regex);
    if (!match) continue;

    const amount = parseBrazilianAmount(match[pattern.amountGroup] ?? "");
    const devedorNome = match[pattern.devedorGroup]?.trim() ?? null;
    if (!devedorNome) continue;

    return {
      detected: true,
      devedorNome,
      amount,
      message:
        "Detectei possível conta a receber. Deseja registrar? Acesse Contas a Receber no painel web — nada foi criado automaticamente.",
    };
  }

  return { detected: false, devedorNome: null, amount: null, message: null };
}
