const CONFIRM_PATTERNS = [
  /^sim$/i,
  /^confirmar$/i,
  /^pode abrir$/i,
  /^abrir$/i,
  /^executar$/i,
  /^bora$/i,
  /^pode fazer$/i,
  /^ok$/i,
  /^pode$/i,
  /^confirmar\b/i,
  /^executar\b/i,
  /^abrir\b/i,
];

const REJECT_PATTERNS = [
  /^n[aã]o$/i,
  /^cancelar$/i,
  /^ignorar$/i,
  /^depois$/i,
  /^agora n[aã]o$/i,
  /^não quero$/i,
  /^nao quero$/i,
  /^cancelar\b/i,
];

export function isLikelyActionConfirmationMessage(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return (
    CONFIRM_PATTERNS.some((p) => p.test(trimmed)) ||
    REJECT_PATTERNS.some((p) => p.test(trimmed))
  );
}
