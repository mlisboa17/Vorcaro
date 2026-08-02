export interface BankTransaction {
  id: string;
  amount: number;
  date: Date;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  merchant?: string;
}

export interface CategorizedTransaction extends BankTransaction {
  category: string;
  confidence: number;
}

export class CategorizerService {
  private categoryMap = {
    comida: [
      'restaurante', 'delivery', 'uber eats', 'ifood', 'pizza', 'burguer', 'lanche',
      'mcdonald', 'pizza hut', 'subway', 'poke', 'sushi', 'bar', 'cerveja', 'chopp',
      'padaria', 'confeitaria', 'pastel', 'açaí', 'sorvete', 'cafe',
    ],
    transporte: [
      'uber', '99', 'passagem', 'combustível', 'gasolina', 'etanol', 'moto táxi',
      'táxi', 'bus', 'ônibus', 'metrô', 'estacionamento', 'pedágio', 'via rápida',
      'viagem', 'passagem aérea', 'passagem ônibus',
    ],
    assinatura: [
      'netflix', 'spotify', 'disney', 'youtube premium', 'adobe', 'microsoft',
      'canva', 'dropbox', 'icloud', 'cloud', 'subscription', 'mensal', 'anual',
      'vimeo', 'scribd', 'audible', 'prime video',
    ],
    saúde: [
      'farmácia', 'médico', 'dentista', 'hospital', 'clínica', 'psicólogo',
      'laboratório', 'radiologia', 'oftalmologista', 'dermatologista', 'farmacia',
      'medicamento', 'vacina', 'cirurgia',
    ],
    moradia: [
      'aluguel', 'condo', 'condominio', 'água', 'sanepar', 'sabesp', 'luz',
      'energia', 'eletropaulo', 'internet', 'telefone', 'telefonica', 'oi',
      'vivo', 'claro', 'tim', 'gás',
    ],
    educação: [
      'escola', 'curso', 'livro', 'udemy', 'coursera', 'universidade',
      'faculdade', 'aula', 'professor', 'tutor', 'educação', 'estude',
      'kindle', 'livros', 'material escolar', 'uniforme',
    ],
    lazer: [
      'cinema', 'teatro', 'show', 'museu', 'parque', 'viagem', 'hotel',
      'resort', 'praia', 'turismo', 'hospedagem', 'bilhete', 'ingressso',
      'evento', 'festa', 'boate', 'academia', 'gym', 'esporte',
    ],
    compras: [
      'amazon', 'magazine luiza', 'shopee', 'mercado livre', 'b2brasil',
      'shein', 'ali express', 'wish', 'ebay', 'loja', 'loja online',
      'supermercado', 'mercado', 'carrefour', 'pão de açúcar', 'extra',
      'walmart', 'jumbo', 'eletrodoméstico', 'mobile', 'celular',
    ],
    trabalho: [
      'freelancer', 'gig', 'cliente', 'projeto', 'consultoria', 'serviço',
      'trabalho', 'profissional', 'empresa', 'negócio', 'paypal',
    ],
    investimento: [
      'investimento', 'bolsa', 'ação', 'fundo', 'cdb', 'lci', 'lca',
      'bitcoin', 'cripto', 'ethereum', 'criptomoeda', 'broker',
    ],
    bem_estar: [
      'perfume', 'cosméticos', 'maquiagem', 'cabelo', 'corte', 'salão',
      'spa', 'massagem', 'manicure', 'pedicure', 'beleza', 'shampoo',
    ],
  };

  /**
   * Categorizar uma transação
   */
  categorizeTransaction(tx: BankTransaction): CategorizedTransaction {
    const description = tx.description.toLowerCase();
    const merchant = (tx.merchant || '').toLowerCase();
    const combined = `${description} ${merchant}`;

    let bestCategory = 'outro';
    let bestConfidence = 0;

    // Procurar match em cada categoria
    for (const [category, keywords] of Object.entries(this.categoryMap)) {
      for (const keyword of keywords) {
        if (combined.includes(keyword)) {
          // Confidence baseada em exatidão da match
          const confidence = keyword.length > 5 ? 0.9 : 0.7;

          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            bestCategory = category;
          }
        }
      }
    }

    return {
      ...tx,
      category: bestCategory,
      confidence: bestConfidence,
    };
  }

  /**
   * Categorizar múltiplas transações
   */
  categorizeTransactions(transactions: BankTransaction[]): CategorizedTransaction[] {
    return transactions.map((tx) => this.categorizeTransaction(tx));
  }

  /**
   * Agrupar transações por categoria
   */
  groupByCategory(transactions: CategorizedTransaction[]): Record<string, CategorizedTransaction[]> {
    return transactions.reduce(
      (acc, tx) => {
        if (!acc[tx.category]) acc[tx.category] = [];
        acc[tx.category].push(tx);
        return acc;
      },
      {} as Record<string, CategorizedTransaction[]>
    );
  }

  /**
   * Calcular estatísticas por categoria
   */
  calculateCategoryStats(transactions: CategorizedTransaction[]): Record<string, { total: number; count: number; average: number }> {
    const grouped = this.groupByCategory(transactions);
    const stats: Record<string, { total: number; count: number; average: number }> = {};

    for (const [category, txs] of Object.entries(grouped)) {
      const total = txs.reduce((sum, tx) => sum + tx.amount, 0);
      const count = txs.length;
      const average = total / count;

      stats[category] = { total, count, average };
    }

    return stats;
  }

  /**
   * Detectar padrões em gastos
   */
  detectPatterns(
    transactions: CategorizedTransaction[]
  ): Array<{ category: string; type: string; message: string; severity: 'low' | 'medium' | 'high' }> {
    const patterns: Array<{ category: string; type: string; message: string; severity: 'low' | 'medium' | 'high' }> = [];
    const grouped = this.groupByCategory(transactions);

    for (const [category, txs] of Object.entries(grouped)) {
      if (txs.length < 2) continue;

      const amounts = txs.map((t) => t.amount);
      const total = amounts.reduce((a, b) => a + b, 0);
      const avg = total / amounts.length;
      const stdDev = Math.sqrt(amounts.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) / amounts.length);

      // Verificar últimas 7 transações
      const recent7 = txs.slice(-7);
      const recent7Avg = recent7.reduce((sum, t) => sum + t.amount, 0) / recent7.length;

      // Padrão 1: Spike (50% acima da média)
      if (recent7Avg > avg * 1.5) {
        const percentage = Math.round(((recent7Avg - avg) / avg) * 100);
        patterns.push({
          category,
          type: 'spike',
          message: `💰 Você gastou ${percentage}% acima da média em ${category} (últimos 7 dias)`,
          severity: percentage > 100 ? 'high' : 'medium',
        });
      }

      // Padrão 2: Anomalia (2+ desvios padrão)
      if (stdDev > 0) {
        const lastTx = txs[txs.length - 1];
        if (lastTx.amount > avg + 2 * stdDev) {
          patterns.push({
            category,
            type: 'anomaly',
            message: `⚠️ Gasto incomum em ${category}: R$ ${lastTx.amount.toFixed(2)} (${Math.round(
              ((lastTx.amount - avg) / avg) * 100
            )}% acima da média)`,
            severity: 'medium',
          });
        }
      }

      // Padrão 3: Oportunidade de economia (se gasta > R$300)
      if (total > 300) {
        const potential = total * 0.15; // 15% de economia
        patterns.push({
          category,
          type: 'opportunity',
          message: `💡 Pode economizar ~R$ ${potential.toFixed(2)}/mês em ${category}`,
          severity: 'low',
        });
      }

      // Padrão 4: Recorrência (mesma categoria, múltiplas vezes)
      if (txs.length >= 4) {
        patterns.push({
          category,
          type: 'recurring',
          message: `🔄 ${category} é recorrente (${txs.length} vezes), média R$ ${avg.toFixed(2)}`,
          severity: 'low',
        });
      }
    }

    return patterns.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Sugerir economia
   */
  suggestSavings(transactions: CategorizedTransaction[]): Array<{ category: string; currentSpend: number; potential: number; suggestion: string }> {
    const suggestions: Array<{ category: string; currentSpend: number; potential: number; suggestion: string }> = [];
    const stats = this.calculateCategoryStats(transactions);

    // Oportunidades por categoria
    const opportunities = {
      comida: {
        threshold: 300,
        savings: 0.2,
        suggestion: 'Preparar refeições em casa 1x por semana',
      },
      transporte: {
        threshold: 200,
        savings: 0.15,
        suggestion: 'Usar transporte público ou caronas compartilhadas',
      },
      assinatura: {
        threshold: 50,
        savings: 0.3,
        suggestion: 'Cancelar serviços não usados',
      },
      lazer: {
        threshold: 200,
        savings: 0.25,
        suggestion: 'Buscar atividades gratuitas ou mais baratas',
      },
      compras: {
        threshold: 300,
        savings: 0.1,
        suggestion: 'Fazer lista antes de comprar, evitar impulso',
      },
    };

    for (const [category, opp] of Object.entries(opportunities)) {
      const categoryStats = stats[category];
      if (!categoryStats) continue;

      if (categoryStats.total > opp.threshold) {
        const potential = categoryStats.total * opp.savings;
        suggestions.push({
          category,
          currentSpend: categoryStats.total,
          potential,
          suggestion: opp.suggestion,
        });
      }
    }

    return suggestions.sort((a, b) => b.potential - a.potential);
  }
}

export default new CategorizerService();
