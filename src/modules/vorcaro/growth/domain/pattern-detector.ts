export interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: Date;
  description?: string;
}

export interface Pattern {
  type: 'spike' | 'trend' | 'anomaly' | 'recurring';
  category: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  insight: string;
}

export interface Opportunity {
  type: 'savings' | 'consolidation' | 'optimization';
  category: string;
  currentSpend: number;
  potentialSavings: number;
  percentage: number;
  suggestion: string;
  timeframe: string;
}

export class PatternDetector {
  /**
   * Detectar padrões nas transações
   */
  detectPatterns(transactions: Transaction[]): Pattern[] {
    const patterns: Pattern[] = [];

    if (transactions.length < 7) {
      return patterns; // Necessário histórico mínimo
    }

    // Padrão 1: Spike em categoria
    patterns.push(...this.detectCategorySpikes(transactions));

    // Padrão 2: Dia da semana específico
    patterns.push(...this.detectDayPatterns(transactions));

    // Padrão 3: Transações recorrentes
    patterns.push(...this.detectRecurringTransactions(transactions));

    // Padrão 4: Anomalias
    patterns.push(...this.detectAnomalies(transactions));

    return patterns;
  }

  /**
   * Detectar gastos acima da média em categorias
   */
  private detectCategorySpikes(transactions: Transaction[]): Pattern[] {
    const patterns: Pattern[] = [];
    const now = new Date();
    const last30Days = transactions.filter(
      (t) => (now.getTime() - t.date.getTime()) / (1000 * 60 * 60 * 24) <= 30
    );

    const categoryStats = this.groupByCategory(last30Days);

    for (const [category, txs] of Object.entries(categoryStats)) {
      const avg = this.calculateAverage(txs);
      const recent7 = txs.filter(
        (t) => (now.getTime() - t.date.getTime()) / (1000 * 60 * 60 * 24) <= 7
      );

      if (recent7.length === 0) continue;

      const recent7Avg = this.calculateAverage(recent7);
      const percentageIncrease = ((recent7Avg - avg) / avg) * 100;

      if (percentageIncrease > 50) {
        patterns.push({
          type: 'spike',
          category,
          message: `💰 Você está gastando ${Math.round(percentageIncrease)}% acima da média em ${category}`,
          severity: percentageIncrease > 100 ? 'high' : 'medium',
          insight: `Média de ${category}: R$ ${avg.toFixed(2)}\nÚltimos 7 dias: R$ ${recent7Avg.toFixed(2)}`,
        });
      }
    }

    return patterns;
  }

  /**
   * Detectar padrões por dia da semana
   */
  private detectDayPatterns(transactions: Transaction[]): Pattern[] {
    const patterns: Pattern[] = [];
    const daySpend: Record<string, number[]> = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: [],
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (const tx of transactions) {
      const day = dayNames[tx.date.getDay()];
      daySpend[day].push(tx.amount);
    }

    // Encontrar dia com maior gasto
    let maxDay = 'Monday';
    let maxSpend = 0;

    for (const [day, amounts] of Object.entries(daySpend)) {
      const total = amounts.reduce((a, b) => a + b, 0);
      if (total > maxSpend) {
        maxSpend = total;
        maxDay = day;
      }
    }

    if (maxSpend > 0) {
      const avgDaily = transactions.reduce((a, b) => a + b.amount, 0) / transactions.length;
      const dailyDayAvg = maxSpend / daySpend[maxDay].length;

      if (dailyDayAvg > avgDaily * 1.5) {
        patterns.push({
          type: 'trend',
          category: 'Weekly',
          message: `📊 ${maxDay} é seu dia com maior gasto`,
          severity: 'low',
          insight: `Você gasta em média R$ ${dailyDayAvg.toFixed(2)} às ${maxDay}s\nMedia diária: R$ ${avgDaily.toFixed(2)}`,
        });
      }
    }

    return patterns;
  }

  /**
   * Detectar transações recorrentes
   */
  private detectRecurringTransactions(transactions: Transaction[]): Pattern[] {
    const patterns: Pattern[] = [];
    const categoryStats = this.groupByCategory(transactions);

    for (const [category, txs] of Object.entries(categoryStats)) {
      if (txs.length < 3) continue;

      // Calcular intervalos entre transações
      const sortedTxs = txs.sort((a, b) => a.date.getTime() - b.date.getTime());
      const intervals: number[] = [];

      for (let i = 1; i < sortedTxs.length; i++) {
        const interval = (sortedTxs[i].date.getTime() - sortedTxs[i - 1].date.getTime()) / (1000 * 60 * 60 * 24);
        intervals.push(interval);
      }

      // Verificar se há intervalo recorrente
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const isRecurring = intervals.every((i) => Math.abs(i - avgInterval) < 5); // Tolerância de 5 dias

      if (isRecurring && avgInterval > 0 && txs.length >= 3) {
        patterns.push({
          type: 'recurring',
          category,
          message: `🔄 ${category} parece ser recorrente (a cada ${Math.round(avgInterval)} dias)`,
          severity: 'low',
          insight: `Próxima ocorrência prevista: ${this.formatDate(
            new Date(sortedTxs[sortedTxs.length - 1].date.getTime() + avgInterval * 24 * 60 * 60 * 1000)
          )}`,
        });
      }
    }

    return patterns;
  }

  /**
   * Detectar anomalias/outliers
   */
  private detectAnomalies(transactions: Transaction[]): Pattern[] {
    const patterns: Pattern[] = [];
    const categoryStats = this.groupByCategory(transactions);

    for (const [category, txs] of Object.entries(categoryStats)) {
      if (txs.length < 3) continue;

      const amounts = txs.map((t) => t.amount);
      const avg = this.calculateAverage(amounts);
      const stdDev = this.calculateStdDev(amounts, avg);

      // Transações > 2 desvios padrão são anomalias
      for (const tx of txs.slice(-5)) {
        // Verificar últimas 5
        if (tx.amount > avg + 2 * stdDev) {
          patterns.push({
            type: 'anomaly',
            category,
            message: `⚠️ Transação incomum em ${category}: R$ ${tx.amount.toFixed(2)}`,
            severity: 'high',
            insight: `Valor típico: R$ ${avg.toFixed(2)}\nValor observado: R$ ${tx.amount.toFixed(2)} (${Math.round(
              ((tx.amount - avg) / avg) * 100
            )}% acima)`,
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detectar oportunidades de economia
   */
  detectOpportunities(transactions: Transaction[]): Opportunity[] {
    const opportunities: Opportunity[] = [];

    if (transactions.length === 0) return opportunities;

    const now = new Date();
    const last30Days = transactions.filter(
      (t) => (now.getTime() - t.date.getTime()) / (1000 * 60 * 60 * 24) <= 30
    );

    const categoryStats = this.groupByCategory(last30Days);

    // Oportunidade 1: Comida muito alta
    if (categoryStats['Comida']) {
      const foodSpend = categoryStats['Comida'].reduce((a, b) => a + b.amount, 0);
      if (foodSpend > 300) {
        const potential = foodSpend * 0.2; // 20% de economia
        opportunities.push({
          type: 'savings',
          category: 'Comida',
          currentSpend: foodSpend,
          potentialSavings: potential,
          percentage: 20,
          suggestion: 'Preparar mais refeições em casa ou buscar restaurantes com melhor custo-benefício',
          timeframe: 'mensal',
        });
      }
    }

    // Oportunidade 2: Assinaturas/Recorrências
    const recurringTotal = this.calculateRecurringSpend(transactions);
    if (recurringTotal > 100) {
      opportunities.push({
        type: 'consolidation',
        category: 'Assinaturas',
        currentSpend: recurringTotal,
        potentialSavings: recurringTotal * 0.1, // 10% cortando serviços desnecessários
        percentage: 10,
        suggestion: 'Revisar assinaturas e cancelar as não utilizadas',
        timeframe: 'mensal',
      });
    }

    // Oportunidade 3: Transportes
    if (categoryStats['Transporte']) {
      const transportSpend = categoryStats['Transporte'].reduce((a, b) => a + b.amount, 0);
      if (transportSpend > 200) {
        opportunities.push({
          type: 'optimization',
          category: 'Transporte',
          currentSpend: transportSpend,
          potentialSavings: transportSpend * 0.15, // 15%
          percentage: 15,
          suggestion: 'Considerar passe de transporte ou caronas compartilhadas',
          timeframe: 'mensal',
        });
      }
    }

    return opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  // ===== Helpers =====

  private groupByCategory(transactions: Transaction[]): Record<string, Transaction[]> {
    return transactions.reduce(
      (acc, tx) => {
        if (!acc[tx.category]) acc[tx.category] = [];
        acc[tx.category].push(tx);
        return acc;
      },
      {} as Record<string, Transaction[]>
    );
  }

  private calculateAverage(amounts: number[]): number {
    if (amounts.length === 0) return 0;
    return amounts.reduce((a, b) => a + b, 0) / amounts.length;
  }

  private calculateStdDev(amounts: number[], avg: number): number {
    if (amounts.length <= 1) return 0;
    const squaredDiffs = amounts.map((x) => Math.pow(x - avg, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / amounts.length;
    return Math.sqrt(variance);
  }

  private calculateRecurringSpend(transactions: Transaction[]): number {
    // Simplificado: soma de transações que ocorrem regularmente
    const categoryStats = this.groupByCategory(transactions);
    let recurringTotal = 0;

    for (const [_, txs] of Object.entries(categoryStats)) {
      if (txs.length >= 3) {
        const avgAmount = this.calculateAverage(txs.map((t) => t.amount));
        recurringTotal += avgAmount;
      }
    }

    return recurringTotal;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('pt-BR');
  }
}

export default new PatternDetector();
