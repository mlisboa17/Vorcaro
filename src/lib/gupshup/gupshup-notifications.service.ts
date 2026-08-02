import { GupshupService } from './gupshup.service';

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  paymentMethod?: string;
  date: Date;
}

export interface Alert {
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  actionUrl?: string;
}

export interface WeeklySummary {
  income: number;
  expense: number;
  balance: number;
  topCategory: string;
  transactionCount: number;
}

export interface PatternInsight {
  category: string;
  insight: string;
  savingsPotential: number;
  actionSuggestion: string;
}

export class GupshupNotificationService {
  constructor(private gupshup: GupshupService) {}

  /**
   * Notificar confirmação de transação
   */
  async notifyTransactionConfirmation(userPhone: string, tx: Transaction): Promise<boolean> {
    const message = `✅ Registrei!
💰 R$ ${tx.amount.toFixed(2)}
🏷️ ${tx.category}
${tx.paymentMethod ? `🏦 ${tx.paymentMethod}\n` : ''}📅 ${tx.date.toLocaleDateString('pt-BR')}`;

    const result = await this.gupshup.sendText(userPhone, message);
    return result.success;
  }

  /**
   * Notificar alerta crítico
   */
  async notifyCriticalAlert(userPhone: string, alert: Alert): Promise<boolean> {
    const emoji = alert.type === 'critical' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️';
    const message = `${emoji} ${alert.title}\n${alert.message}${
      alert.actionUrl ? `\n\n👉 Clique: ${alert.actionUrl}` : ''
    }`;

    const result = await this.gupshup.sendText(userPhone, message);
    return result.success;
  }

  /**
   * Notificar saldo baixo
   */
  async notifyLowBalance(userPhone: string, currentBalance: number, threshold: number): Promise<boolean> {
    const daysUntilNegative = Math.ceil(Math.abs(currentBalance) / 50); // Estimativa
    const message = `⚠️ Saldo Baixo!
💰 Seu saldo: R$ ${currentBalance.toFixed(2)}
📉 Limite crítico: R$ ${threshold.toFixed(2)}
⏰ Em ~${daysUntilNegative} dias você pode ficar negativo

👉 Aumente receitas ou reduza despesas`;

    const result = await this.gupshup.sendText(userPhone, message);
    return result.success;
  }

  /**
   * Enviar resumo semanal
   */
  async sendWeeklySummary(userPhone: string, summary: WeeklySummary): Promise<boolean> {
    const message = `📊 Resumo da Semana

📈 Receita: R$ ${summary.income.toFixed(2)}
📉 Despesa: R$ ${summary.expense.toFixed(2)}
💰 Saldo: R$ ${summary.balance.toFixed(2)}

🏆 Top Categoria: ${summary.topCategory}
📋 Total de transações: ${summary.transactionCount}

${summary.balance >= 0 ? '✅ Semana positiva!' : '⚠️ Despesas maiores que receitas'}`;

    const result = await this.gupshup.sendText(userPhone, message);
    return result.success;
  }

  /**
   * Enviar resumo mensal
   */
  async sendMonthlySummary(userPhone: string, month: string, summary: WeeklySummary): Promise<boolean> {
    const message = `📈 Resumo de ${month}

Receita Total: R$ ${summary.income.toFixed(2)}
Despesa Total: R$ ${summary.expense.toFixed(2)}
Saldo do Mês: R$ ${summary.balance.toFixed(2)}

📊 Gastos por categoria:
🍔 ${summary.topCategory}: maior categoria

💡 Dica: Veja seu histórico completo no app`;

    const result = await this.gupshup.sendText(userPhone, message);
    return result.success;
  }

  /**
   * Notificar padrão detectado
   */
  async notifyPatternInsight(userPhone: string, pattern: PatternInsight): Promise<boolean> {
    const message = `💡 Insight de Padrão

${pattern.insight}

💰 Potencial de economia: R$ ${pattern.savingsPotential.toFixed(2)}/mês

Sugestão: ${pattern.actionSuggestion}

👉 Veja mais detalhes no app`;

    const result = await this.gupshup.sendText(userPhone, message);
    return result.success;
  }

  /**
   * Notificar oportunidade
   */
  async notifyOpportunity(userPhone: string, title: string, description: string): Promise<boolean> {
    const message = `🎯 Oportunidade!

${title}

${description}

Quer aproveitar? Abra o app!`;

    const result = await this.gupshup.sendText(userPhone, message);
    return result.success;
  }

  /**
   * Notificar meta atingida
   */
  async notifyGoalReached(userPhone: string, goalName: string, targetAmount: number): Promise<boolean> {
    const message = `🎉 Parabéns!

Você atingiu a meta: ${goalName}
💰 R$ ${targetAmount.toFixed(2)}

Isso é incrível! Continue assim! 🚀`;

    const result = await this.gupshup.sendText(userPhone, message);
    return result.success;
  }

  /**
   * Notificar referência de amigo
   */
  async notifyReferralReward(userPhone: string, friendName: string, rewardAmount: number): Promise<boolean> {
    const message = `🎁 Você ganhou prêmio de referência!

Seu amigo ${friendName} se cadastrou via seu código!
💰 Você ganhou: R$ ${rewardAmount.toFixed(2)}

Convide mais amigos e ganhe mais! 👯`;

    const result = await this.gupshup.sendText(userPhone, message);
    return result.success;
  }

  /**
   * Notificar lembrete de transação recorrente
   */
  async notifyRecurringReminder(userPhone: string, description: string, dueDate: Date): Promise<boolean> {
    const message = `📅 Lembrete de Transação Recorrente

${description}
Vence em: ${dueDate.toLocaleDateString('pt-BR')}

Registrar agora? Abra o app!`;

    const result = await this.gupshup.sendText(userPhone, message);
    return result.success;
  }

  /**
   * Notificar dupla suspeita
   */
  async notifyDuplicateSuspicion(
    userPhone: string,
    amount: number,
    category: string,
    minutesAgo: number
  ): Promise<boolean> {
    const message = `⚠️ Transação Duplicada?

Você registrou R$ ${amount.toFixed(2)} em ${category} há ${minutesAgo} minutos

Já enviei essa mesma transação? 🤔

Responda: "sim" pra cancelar ou "não" pra confirmar`;

    const result = await this.gupshup.sendText(userPhone, message);
    return result.success;
  }

  /**
   * Notificar novo documento pendente
   */
  async notifyPendingDocument(userPhone: string, documentType: string): Promise<boolean> {
    const message = `📄 Documento Pendente

Precisamos de: ${documentType}

Envie no app para melhorar sua experiência!`;

    const result = await this.gupshup.sendText(userPhone, message);
    return result.success;
  }

  /**
   * Notificar conquista/achievement
   */
  async notifyAchievementUnlocked(
    userPhone: string,
    achievementName: string,
    points: number
  ): Promise<boolean> {
    const message = `🏆 Conquista Desbloqueada!

${achievementName}
🎯 +${points} pontos!

Você está no caminho certo! 💪`;

    const result = await this.gupshup.sendText(userPhone, message);
    return result.success;
  }
}

export default GupshupNotificationService;
