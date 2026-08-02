/**
 * Intent Extraction for Companheiro Vorcaro
 * Parses natural language to extract financial intent
 */

export type CompanionIntentType = 'gasto' | 'receita' | 'pergunta' | 'contexto' | 'celebracao' | 'stresse' | 'outro';

export interface ParsedCompanionIntent {
  type: CompanionIntentType;
  amount?: number;
  category?: string;
  isPeople?: string[]; // ["irmão", "João"] se split
  confidence: number;
  original: string;
  suggestedResponse?: string;
}

/**
 * Regex patterns para detectar diferentes intents
 */
const PATTERNS = {
  // "Gastei 150 com comida" | "Gasto 150" | "150 em comida"
  expense: /(?:gastei|gasto|paguei|pago|dei|dei|cusou|custou)\s+(?:r?\$?\s*)?(\d+(?:[.,]\d{2})?)\s*(?:em|com)?\s*(.+)?/i,

  // "Recebi 500" | "Ganhei 1000" | "Entrou 200"
  income: /(?:recebi|recebo|ganhei|ganho|entrou|entra|depositei|deposito)\s+(?:r?\$?\s*)?(\d+(?:[.,]\d{2})?)\s*(?:de|em)?\s*(.+)?/i,

  // "com João", "com meu irmão", "com a Maria"
  splitPattern: /(?:com|junto com|com meu|com minha|com o|com a)\s+(.+?)(?:\s+e\s+.+|\s*$)/i,

  // "Qual meu saldo?" | "Quanto tenho?" | "Como estou?"
  question: /(?:\?$|^(?:qual|quanto|como|onde|quem|por que|o que))/i,

  // Emotional cues
  stressed: /(?:gasto muito|endividei|quebrei|completo caos|desespero|quanto isso custa|não aguento mais|que desastre)/i,
  celebration: /(?:consegui|conquistei|economizei|pouparei|eba|uau|legal|top|show|sucesso)/i,
};

/**
 * Extract amount from string, handling both "," and "." as decimals
 */
function extractAmount(str: string): number {
  if (!str) return 0;
  // Replace comma with dot for parsing
  const normalized = str.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Extract category from text
 */
function extractCategory(text?: string): string | undefined {
  if (!text) return undefined;

  const categories: Record<string, string[]> = {
    Alimentação: ['comida', 'restaurante', 'pizza', 'açaí', 'café', 'almoço', 'janta', 'lanche', 'supermercado'],
    Transporte: ['uber', 'táxi', 'metrô', 'ônibus', 'combustível', 'gasolina', 'passagem', 'viagem'],
    Entretenimento: ['cinema', 'show', 'festa', 'bar', 'jogo', 'diversão', 'lazer', 'game', 'netflix'],
    Saúde: ['farmácia', 'médico', 'dentista', 'academia', 'saúde', 'hospital', 'medicamento'],
    Moda: ['roupa', 'sapato', 'vestuário', 'loja', 'moda', 'beleza', 'cabelo'],
    Casa: ['aluguel', 'água', 'luz', 'internet', 'gás', 'condomínio', 'empréstimo', 'conta'],
    Trabalho: ['freelance', 'salário', 'projeto', 'cliente', 'bico'],
  };

  const lowerText = text.toLowerCase();
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      return category;
    }
  }

  return undefined;
}

/**
 * Extract people names from "com João e Maria" pattern
 */
function extractPeople(text?: string): string[] {
  if (!text) return [];

  const people: string[] = [];

  // Match patterns like "com João", "com a Maria", "com meu irmão"
  const matches = text.matchAll(/(?:com|junto com|com meu|com minha|com o|com a)\s+([^,\s]+(?:\s+\w+)?)/gi);

  for (const match of matches) {
    if (match[1]) {
      people.push(match[1].trim());
    }
  }

  return people;
}

export function extractCompanionIntent(message: string): ParsedCompanionIntent {
  const original = message;
  let type: CompanionIntentType = 'outro';
  let amount: number | undefined;
  let category: string | undefined;
  let isPeople: string[] | undefined;
  let confidence = 0;

  // Check for celebration
  if (PATTERNS.celebration.test(message)) {
    type = 'celebracao';
    confidence = 0.8;
  }

  // Check for stress
  if (PATTERNS.stressed.test(message)) {
    type = 'stresse';
    confidence = 0.8;
  }

  // Check for expense
  const expenseMatch = message.match(PATTERNS.expense);
  if (expenseMatch) {
    type = 'gasto';
    amount = extractAmount(expenseMatch[1]);
    category = extractCategory(expenseMatch[2] || extractCategory(message));
    isPeople = extractPeople(message);
    confidence = 0.9;
  }

  // Check for income
  const incomeMatch = message.match(PATTERNS.income);
  if (incomeMatch) {
    type = 'receita';
    amount = extractAmount(incomeMatch[1]);
    category = extractCategory(incomeMatch[2] || extractCategory(message));
    confidence = 0.85;
  }

  // Check for question
  if (PATTERNS.question.test(message)) {
    type = 'pergunta';
    confidence = 0.8;
  }

  // Check for context/pattern (no specific action, just context)
  if (!amount && (message.includes('gasto') || message.includes('ganho') || message.includes('economizo'))) {
    type = 'contexto';
    category = extractCategory(message);
    confidence = 0.6;
  }

  return {
    type,
    amount,
    category,
    isPeople: isPeople && isPeople.length > 0 ? isPeople : undefined,
    confidence,
    original,
  };
}

/**
 * Generate suggested responses based on intent
 */
export function generateIntentSuggestion(intent: ParsedCompanionIntent): string | undefined {
  if (intent.type === 'gasto' && intent.amount) {
    if (intent.isPeople && intent.isPeople.length > 0) {
      const divided = (intent.amount / (intent.isPeople.length + 1)).toFixed(2).replace('.', ',');
      return `Quer que eu divida R$ ${intent.amount.toFixed(2).replace('.', ',')} com ${intent.isPeople.join(', ')}? Cada um paga R$ ${divided}`;
    }
    return `Registrado: Gasto de R$ ${intent.amount.toFixed(2).replace('.', ',')} ${intent.category ? `em ${intent.category}` : ''}`;
  }

  if (intent.type === 'receita' && intent.amount) {
    return `Ótimo! Receita de R$ ${intent.amount.toFixed(2).replace('.', ',')} ${intent.category ? `de ${intent.category}` : ''}`;
  }

  if (intent.type === 'celebracao') {
    return `🎉 Que legal! Quer contar mais sobre isso?`;
  }

  if (intent.type === 'stresse') {
    return `Entendo, pode ser estressante. Como posso ajudar? Quer ver um resumo dos seus gastos?`;
  }

  return undefined;
}
