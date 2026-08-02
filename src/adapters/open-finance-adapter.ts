import { Router, Request, Response } from 'express';
import { OpenFinanceService } from '../lib/open-finance/open-finance.service';
import { CategorizerService } from '../lib/open-finance/categorizer.service';
import { getSyncJob } from '../jobs/sync-bank-transactions.job';

export class OpenFinanceAdapter {
  public router: Router;

  constructor(
    private openFinance: OpenFinanceService,
    private categorizer: CategorizerService
  ) {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes() {
    // Gerar link de autorização
    this.router.post('/connect', this.handleConnect.bind(this));

    // Callback após autorização no banco
    this.router.get('/callback', this.handleCallback.bind(this));

    // Listar transações importadas
    this.router.get('/transactions', this.getImportedTransactions.bind(this));

    // Listar contas conectadas
    this.router.get('/accounts', this.getConnectedAccounts.bind(this));

    // Desconectar banco
    this.router.post('/disconnect', this.handleDisconnect.bind(this));

    // Sincronizar manualmente
    this.router.post('/sync-now', this.syncNow.bind(this));

    // Obter insights
    this.router.get('/insights', this.getInsights.bind(this));

    // Health check
    this.router.get('/health', this.healthCheck.bind(this));
  }

  /**
   * Gerar link de autorização para conectar banco
   */
  private async handleConnect(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const bankCode = req.body?.bankCode; // Opcional

      const authLink = await this.openFinance.generateAuthLink(userId, bankCode);

      res.json({
        success: true,
        authLink,
        message: 'Redirecione o usuário para esse link para conectar seu banco',
      });
    } catch (error) {
      console.error('❌ Connect error:', error);
      res.status(500).json({ error: 'Failed to generate auth link' });
    }
  }

  /**
   * Callback após usuário autorizar no banco
   */
  private async handleCallback(req: Request, res: Response) {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        return res.status(400).json({ error: 'Missing code or state' });
      }

      const userId = await this.openFinance.handleAuthCallback(
        code as string,
        state as string
      );

      // Marcar como conectado no banco
      await this.updateUserBankStatus(userId, true);

      // Puxar primeira vez as transações (últimos 90 dias)
      const transactions = await this.openFinance.getTransactions(userId, 90);
      const categorized = this.categorizer.categorizeTransactions(transactions);

      // Salvar no banco
      await this.saveTransactionsToDB(userId, categorized);

      res.redirect(`${process.env.APP_URL || 'https://vorcaro.app'}/dashboard?bank=connected`);
    } catch (error) {
      console.error('❌ Callback error:', error);
      res.redirect(
        `${process.env.APP_URL || 'https://vorcaro.app'}/dashboard?error=bank_auth_failed`
      );
    }
  }

  /**
   * Obter transações importadas do banco
   */
  private async getImportedTransactions(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const days = parseInt(req.query.days as string) || 30;

      // Buscar transações importadas do banco
      const transactions = await this.queryDB(
        `SELECT * FROM transactions
         WHERE user_id = ? AND source = 'bank_import'
         AND date >= DATE_SUB(NOW(), INTERVAL ? DAY)
         ORDER BY date DESC`,
        [userId, days]
      );

      // Agrupar por categoria
      const byCategory = this.categorizer.groupByCategory(transactions);

      // Calcular stats
      const stats = this.categorizer.calculateCategoryStats(transactions);

      res.json({
        success: true,
        total: transactions.length,
        recent: transactions.slice(0, 20),
        byCategory,
        stats,
      });
    } catch (error) {
      console.error('❌ Get transactions error:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }

  /**
   * Obter contas bancárias conectadas
   */
  private async getConnectedAccounts(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const accounts = await this.openFinance.getUserBankAccounts(userId);

      res.json({
        success: true,
        accounts,
        total: accounts.length,
      });
    } catch (error) {
      console.error('❌ Get accounts error:', error);
      res.status(500).json({ error: 'Failed to fetch accounts' });
    }
  }

  /**
   * Desconectar banco
   */
  private async handleDisconnect(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const syncJob = getSyncJob();
      if (syncJob) {
        await syncJob.disconnectBank(userId);
      }

      await this.updateUserBankStatus(userId, false);

      res.json({
        success: true,
        message: 'Banco desconectado com sucesso',
      });
    } catch (error) {
      console.error('❌ Disconnect error:', error);
      res.status(500).json({ error: 'Failed to disconnect bank' });
    }
  }

  /**
   * Sincronizar transações manualmente (on-demand)
   */
  private async syncNow(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const syncJob = getSyncJob();
      if (!syncJob) {
        return res.status(500).json({ error: 'Sync job not initialized' });
      }

      const result = await syncJob.syncNow(userId);

      res.json({
        success: true,
        result,
        message: `Sincronizei ${result.imported} transações`,
      });
    } catch (error) {
      console.error('❌ Sync error:', error);
      res.status(500).json({ error: 'Failed to sync transactions' });
    }
  }

  /**
   * Obter insights sobre gastos
   */
  private async getInsights(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const days = parseInt(req.query.days as string) || 30;

      const transactions = await this.queryDB(
        `SELECT * FROM transactions
         WHERE user_id = ? AND source = 'bank_import'
         AND date >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [userId, days]
      );

      const categorized = this.categorizer.categorizeTransactions(transactions);
      const patterns = this.categorizer.detectPatterns(categorized);
      const suggestions = this.categorizer.suggestSavings(categorized);
      const stats = this.categorizer.calculateCategoryStats(categorized);

      res.json({
        success: true,
        patterns,
        suggestions,
        stats,
        period: `last_${days}_days`,
      });
    } catch (error) {
      console.error('❌ Insights error:', error);
      res.status(500).json({ error: 'Failed to fetch insights' });
    }
  }

  /**
   * Health check
   */
  private async healthCheck(req: Request, res: Response) {
    res.json({
      status: 'healthy',
      service: 'OpenFinance',
      timestamp: new Date(),
    });
  }

  // ===== HELPERS =====

  private async updateUserBankStatus(userId: string, connected: boolean): Promise<void> {
    await this.queryDB('UPDATE users SET bank_connected = ? WHERE id = ?', [connected, userId]);
  }

  private async saveTransactionsToDB(userId: string, transactions: any[]): Promise<void> {
    for (const tx of transactions) {
      try {
        // Verificar se já existe
        const exists = await this.queryDB(
          'SELECT id FROM transactions WHERE user_id = ? AND bank_id = ?',
          [userId, tx.id]
        );

        if (!exists || exists.length === 0) {
          await this.queryDB(
            `INSERT INTO transactions
             (user_id, amount, category, description, date, source, bank_id, confidence)
             VALUES (?, ?, ?, ?, ?, 'bank_import', ?, ?)`,
            [userId, tx.amount, tx.category, tx.description, tx.date, tx.id, tx.confidence]
          );
        }
      } catch (error) {
        console.error('Error saving transaction:', error);
      }
    }
  }

  private async queryDB(query: string, params: any[] = []): Promise<any[]> {
    // Isso deve ser implementado conforme seu banco de dados
    // Exemplo usando seu setup existente:
    // return await Database.query(query, params);
    return [];
  }
}

export default new OpenFinanceAdapter(
  new OpenFinanceService(),
  new CategorizerService()
);
