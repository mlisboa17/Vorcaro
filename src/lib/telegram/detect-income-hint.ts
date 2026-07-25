/**
 * Detecção determinística de "entrada de valor" (receita) por verbos/expressões
 * comuns em pt-BR. Usado para corrigir a classificação quando a IA marca como
 * despesa algo que é claramente uma receita ("recebi 500 do cliente").
 *
 * Focado em sinais fortes de crédito — evita falsos positivos com gastos.
 */
const INCOME_PATTERNS: RegExp[] = [
  /\brecebi\b/i,
  /\brecebido[as]?\b/i,
  /\bganhei\b/i,
  /\bganho\b/i,
  /\bdep[óo]sito\b/i,
  /\bdepositaram\b/i,
  /\bdepositei\b/i,
  /\bcaiu\b.*\b(conta|pix|grana|dinheiro)\b/i,
  /\bentrou\b.*\b(na conta|pix|grana)\b/i,
  /\bpix\s+recebido\b/i,
  /\btransfer[êe]ncia\s+recebida\b/i,
  /\bsal[áa]rio\b/i,
  /\bpagamento\s+recebido\b/i,
  /\bme\s+pagaram\b/i,
  /\bvendi\b/i,
  /\bvenda\s+de\b/i,
  /\bfaturei\b/i,
  /\bcomiss[ãa]o\s+recebida\b/i,
];

// Verbos de saída que, se presentes, cancelam a heurística de receita
// (ex.: "recebi a fatura e paguei" não deve virar receita).
const EXPENSE_OVERRIDE: RegExp[] = [/\bpaguei\b/i, /\bgastei\b/i, /\bcomprei\b/i, /\bpagamento\s+de\b/i];

export function detectIncomeVerb(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim();
  if (!t) return false;
  if (EXPENSE_OVERRIDE.some((re) => re.test(t))) return false;
  return INCOME_PATTERNS.some((re) => re.test(t));
}
