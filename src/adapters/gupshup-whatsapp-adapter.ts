import { Router, Request, Response } from 'express';
import GupshupService from '../lib/gupshup/gupshup.service';
import GupshupNotificationService, { Transaction, Alert } from '../lib/gupshup/gupshup-notifications.service';

export class GupshupWhatsAppAdapter {
  private gupshupService = GupshupService;
  private notificationService: GupshupNotificationService;
  public router: Router;

  constructor() {
    this.notificationService = new GupshupNotificationService(this.gupshupService);
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes() {
    // Webhook para receber mensagens do Gupshup
    this.router.post('/webhook', this.handleWebhook.bind(this));

    // Health check
    this.router.get('/health', this.healthCheck.bind(this));

    // Endpoints de teste
    this.router.post('/test/transaction', this.testTransactionNotification.bind(this));
    this.router.post('/test/alert', this.testAlertNotification.bind(this));
    this.router.post('/test/summary', this.testSummaryNotification.bind(this));
  }

  /**
   * Notificar confirmação de transação
   */
  async notifyTransactionConfirmation(userPhone: string, transaction: Transaction): Promise<boolean> {
    try {
      return await this.notificationService.notifyTransactionConfirmation(userPhone, transaction);
    } catch (error) {
      console.error('Error notifying transaction:', error);
      return false;
    }
  }

  /**
   * Notificar alerta
   */
  async notifyAlert(userPhone: string, alert: Alert): Promise<boolean> {
    try {
      return await this.notificationService.notifyCriticalAlert(userPhone, alert);
    } catch (error) {
      console.error('Error notifying alert:', error);
      return false;
    }
  }

  /**
   * Enviar resumo semanal
   */
  async sendWeeklySummary(userPhone: string, summary: any): Promise<boolean> {
    try {
      return await this.notificationService.sendWeeklySummary(userPhone, summary);
    } catch (error) {
      console.error('Error sending weekly summary:', error);
      return false;
    }
  }

  /**
   * Enviar resumo mensal
   */
  async sendMonthlySummary(userPhone: string, month: string, summary: any): Promise<boolean> {
    try {
      return await this.notificationService.sendMonthlySummary(userPhone, month, summary);
    } catch (error) {
      console.error('Error sending monthly summary:', error);
      return false;
    }
  }

  /**
   * Notificar insight de padrão
   */
  async notifyPatternInsight(userPhone: string, pattern: any): Promise<boolean> {
    try {
      return await this.notificationService.notifyPatternInsight(userPhone, pattern);
    } catch (error) {
      console.error('Error notifying pattern insight:', error);
      return false;
    }
  }

  /**
   * Notificar meta atingida
   */
  async notifyGoalReached(userPhone: string, goalName: string, targetAmount: number): Promise<boolean> {
    try {
      return await this.notificationService.notifyGoalReached(userPhone, goalName, targetAmount);
    } catch (error) {
      console.error('Error notifying goal reached:', error);
      return false;
    }
  }

  /**
   * Notificar achievement/conquista
   */
  async notifyAchievementUnlocked(
    userPhone: string,
    achievementName: string,
    points: number
  ): Promise<boolean> {
    try {
      return await this.notificationService.notifyAchievementUnlocked(userPhone, achievementName, points);
    } catch (error) {
      console.error('Error notifying achievement:', error);
      return false;
    }
  }

  /**
   * Handle webhook do Gupshup (quando usuário responde)
   */
  private async handleWebhook(req: Request, res: Response) {
    try {
      const payload = req.body;

      if (!payload) {
        return res.status(400).json({ error: 'Missing payload' });
      }

      // Processar webhook
      const processed = this.gupshupService.processWebhook(payload);

      console.log('📱 WhatsApp message received:', {
        from: processed.userId,
        message: processed.message,
        timestamp: new Date(processed.timestamp * 1000),
      });

      // Aqui você pode:
      // 1. Salvar no banco de dados
      // 2. Processar comando (se usuário respondeu algo)
      // 3. Rotear para conversação IA (Companheiro Vorcaro)

      res.json({ success: true, messageId: processed.userId });
    } catch (error) {
      console.error('❌ Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Health check
   */
  private async healthCheck(req: Request, res: Response) {
    const isHealthy = await this.gupshupService.healthCheck();
    res.json({
      service: 'GupshupWhatsApp',
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
    });
  }

  /**
   * Teste: Notificação de transação
   */
  private async testTransactionNotification(req: Request, res: Response) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ error: 'Phone number required' });
      }

      const testTx: Transaction = {
        id: 'test-001',
        amount: 50.0,
        category: 'Comida',
        description: 'Almoço com friends',
        paymentMethod: 'Crédito',
        date: new Date(),
      };

      const success = await this.notifyTransactionConfirmation(phone, testTx);

      res.json({
        success,
        message: success ? 'Notification sent!' : 'Failed to send notification',
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  }

  /**
   * Teste: Alerta crítico
   */
  private async testAlertNotification(req: Request, res: Response) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ error: 'Phone number required' });
      }

      const testAlert: Alert = {
        type: 'critical',
        title: 'Saldo Baixo!',
        message: 'Você tem apenas R$ 50 disponível',
        actionUrl: 'https://vorcaro.app/dashboard',
      };

      const success = await this.notifyAlert(phone, testAlert);

      res.json({
        success,
        message: success ? 'Alert sent!' : 'Failed to send alert',
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  }

  /**
   * Teste: Resumo semanal
   */
  private async testSummaryNotification(req: Request, res: Response) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ error: 'Phone number required' });
      }

      const testSummary = {
        income: 5000,
        expense: 1200,
        balance: 3800,
        topCategory: 'Comida',
        transactionCount: 42,
      };

      const success = await this.sendWeeklySummary(phone, testSummary);

      res.json({
        success,
        message: success ? 'Summary sent!' : 'Failed to send summary',
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  }
}

export default new GupshupWhatsAppAdapter();
