/**
 * Tests for Companheiro Vorcaro Intent Extraction
 */

import { describe, it, expect } from 'vitest';
import {
  extractCompanionIntent,
  generateIntentSuggestion,
  type ParsedCompanionIntent,
} from '../domain/vorcaro-companion-intent';

describe('Companheiro Vorcaro Intent Extraction', () => {
  describe('Expense detection', () => {
    it('should detect simple expense', () => {
      const intent = extractCompanionIntent('Gastei 150 com comida');
      expect(intent.type).toBe('gasto');
      expect(intent.amount).toBe(150);
      expect(intent.category).toBe('Alimentação');
      expect(intent.confidence).toBeGreaterThan(0.8);
    });

    it('should detect expense with split indication', () => {
      const intent = extractCompanionIntent('Gastei 150 com meu irmão no uber');
      expect(intent.type).toBe('gasto');
      expect(intent.amount).toBe(150);
      expect(intent.isPeople).toContain('irmão');
      expect(intent.category).toBe('Transporte');
    });

    it('should handle comma decimal format', () => {
      const intent = extractCompanionIntent('Paguei R$ 50,75 em comida');
      expect(intent.type).toBe('gasto');
      expect(intent.amount).toBeCloseTo(50.75);
    });

    it('should detect multiple people in split', () => {
      const intent = extractCompanionIntent('Gastei 300 com João e Maria e Pedro');
      expect(intent.type).toBe('gasto');
      expect(intent.amount).toBe(300);
      expect(intent.isPeople?.length).toBeGreaterThan(0);
    });
  });

  describe('Income detection', () => {
    it('should detect simple income', () => {
      const intent = extractCompanionIntent('Recebi 500 de freelance');
      expect(intent.type).toBe('receita');
      expect(intent.amount).toBe(500);
      expect(intent.category).toBe('Trabalho');
    });

    it('should detect income with salary keyword', () => {
      const intent = extractCompanionIntent('Ganhei 3000 do meu salário');
      expect(intent.type).toBe('receita');
      expect(intent.amount).toBe(3000);
    });

    it('should detect "entrou" variation', () => {
      const intent = extractCompanionIntent('Entrou 200 na conta');
      expect(intent.type).toBe('receita');
      expect(intent.amount).toBe(200);
    });
  });

  describe('Question detection', () => {
    it('should detect balance question', () => {
      const intent = extractCompanionIntent('Qual meu saldo?');
      expect(intent.type).toBe('pergunta');
      expect(intent.confidence).toBeGreaterThan(0.7);
    });

    it('should detect "how am I?" question', () => {
      const intent = extractCompanionIntent('Como estou financeiramente?');
      expect(intent.type).toBe('pergunta');
    });

    it('should detect spending question', () => {
      const intent = extractCompanionIntent('Quanto gastei este mês?');
      expect(intent.type).toBe('pergunta');
    });
  });

  describe('Emotional cues', () => {
    it('should detect celebration', () => {
      const intent = extractCompanionIntent('Consegui economizar 500!');
      expect(intent.type).toBe('celebracao');
      expect(intent.confidence).toBeGreaterThan(0.7);
    });

    it('should detect stress', () => {
      const intent = extractCompanionIntent('Gasto muito em comida, não aguento mais');
      expect(intent.type).toBe('stresse');
      expect(intent.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Suggestion generation', () => {
    it('should generate split suggestion', () => {
      const intent: ParsedCompanionIntent = {
        type: 'gasto',
        amount: 100,
        isPeople: ['João'],
        confidence: 0.9,
        original: 'Gastei 100 com João',
      };

      const suggestion = generateIntentSuggestion(intent);
      expect(suggestion).toContain('divida');
      expect(suggestion).toContain('R$');
    });

    it('should generate income celebration', () => {
      const intent: ParsedCompanionIntent = {
        type: 'receita',
        amount: 500,
        confidence: 0.9,
        original: 'Recebi 500',
      };

      const suggestion = generateIntentSuggestion(intent);
      expect(suggestion).toContain('Ótimo');
    });

    it('should generate stress response', () => {
      const intent: ParsedCompanionIntent = {
        type: 'stresse',
        confidence: 0.8,
        original: 'Não aguento mais de gastos',
      };

      const suggestion = generateIntentSuggestion(intent);
      expect(suggestion).toContain('Entendo');
    });
  });

  describe('Category extraction', () => {
    const testCases = [
      ['Gastei 30 em pizza', 'Alimentação'],
      ['Paguei uber', 'Transporte'],
      ['Fui no cinema', 'Entretenimento'],
      ['Farmácia', 'Saúde'],
      ['Comprei uma blusa', 'Moda'],
      ['Aluguel', 'Casa'],
    ];

    testCases.forEach(([message, expectedCategory]) => {
      it(`should extract category for "${message}"`, () => {
        const intent = extractCompanionIntent(message);
        expect(intent.category).toBe(expectedCategory);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle message with no intent', () => {
      const intent = extractCompanionIntent('olá como vai?');
      expect(intent.type).toBe('outro');
      expect(intent.confidence).toBeLessThan(0.7);
    });

    it('should handle empty string', () => {
      const intent = extractCompanionIntent('');
      expect(intent.confidence).toBeLessThan(0.7);
    });

    it('should handle large amounts', () => {
      const intent = extractCompanionIntent('Paguei 10000 de aluguel');
      expect(intent.amount).toBe(10000);
      expect(intent.type).toBe('gasto');
    });

    it('should handle decimal amounts', () => {
      const intent = extractCompanionIntent('Gastei 12,50 em café');
      expect(intent.amount).toBe(12.5);
    });
  });
});
