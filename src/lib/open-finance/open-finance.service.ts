import axios, { AxiosInstance } from 'axios';
import Redis from 'ioredis';

export interface BankTransaction {
  id: string;
  amount: number;
  date: Date;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  merchant?: string;
  status: 'POSTED' | 'PENDING';
}

export interface BankAccount {
  accountId: string;
  accountNumber: string;
  accountType: string;
  balance: number;
  currency: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  expiresAt: Date;
  scope: string;
}

export class OpenFinanceService {
  private client: AxiosInstance;
  private redis: Redis;
  private apiKey: string;
  private clientId: string;

  constructor(redisUrl?: string) {
    this.apiKey = process.env.OPEN_FINANCE_API_KEY || '';
    this.clientId = process.env.OPEN_FINANCE_CLIENT_ID || '';
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');

    this.client = axios.create({
      baseURL: 'https://api.openfinancebrasil.org.br/open-banking/v1',
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Gerar URL de autorização para o usuário conectar conta bancária
   */
  async generateAuthLink(userId: string, bankCode?: string): Promise<string> {
    const state = `vorcaro_${userId}_${Date.now()}`;

    // Salvar state no Redis pra validar depois (10 minutos)
    await this.redis.setex(`auth_state:${state}`, 600, userId);

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: `${process.env.API_URL || 'https://vorcaro.app'}/api/banking/callback`,
      scope: 'accounts:read transactions:read',
      state,
      ...(bankCode && { bank: bankCode }),
    });

    return `https://api.openfinancebrasil.org.br/oauth/authorize?${params.toString()}`;
  }

  /**
   * Processar callback após usuário autorizar no banco
   */
  async handleAuthCallback(code: string, state: string): Promise<string> {
    try {
      // Validar state
      const userId = await this.redis.get(`auth_state:${state}`);
      if (!userId) {
        throw new Error('Invalid or expired state');
      }

      // Trocar código por token
      const response = await axios.post(
        'https://api.openfinancebrasil.org.br/oauth/token',
        {
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${process.env.API_URL || 'https://vorcaro.app'}/api/banking/callback`,
          client_id: this.clientId,
          client_secret: process.env.OPEN_FINANCE_CLIENT_SECRET,
        },
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const token: AuthToken = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
        scope: response.data.scope,
      };

      // Salvar token criptografado
      await this.saveUserBankToken(userId, token);

      // Puxar contas do usuário
      const accounts = await this.getAccounts(token.accessToken);
      await this.saveUserBankAccounts(userId, accounts);

      // Limpar state
      await this.redis.del(`auth_state:${state}`);

      console.log(`✅ Bank auth successful for user ${userId}`);
      return userId;
    } catch (error) {
      console.error('❌ Auth callback error:', error);
      throw error;
    }
  }

  /**
   * Obter contas bancárias do usuário
   */
  async getAccounts(accessToken: string): Promise<BankAccount[]> {
    try {
      const response = await axios.get('https://api.openfinancebrasil.org.br/open-banking/v1/accounts', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return response.data.data.map((account: any) => ({
        accountId: account.id,
        accountNumber: account.number,
        accountType: account.type,
        balance: account.balances?.[0]?.amount || 0,
        currency: 'BRL',
      }));
    } catch (error) {
      console.error('❌ Error fetching accounts:', error);
      return [];
    }
  }

  /**
   * Obter transações do banco
   */
  async getTransactions(userId: string, days: number = 90): Promise<BankTransaction[]> {
    try {
      const token = await this.getUserBankToken(userId);
      if (!token) {
        console.warn(`No bank token found for user ${userId}`);
        return [];
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const response = await axios.get(
        'https://api.openfinancebrasil.org.br/open-banking/v1/transactions',
        {
          params: {
            from: startDate.toISOString().split('T')[0],
            to: new Date().toISOString().split('T')[0],
          },
          headers: { Authorization: `Bearer ${token.accessToken}` },
        }
      );

      return response.data.data.map((tx: any) => ({
        id: tx.id,
        amount: Math.abs(tx.amount),
        date: new Date(tx.transactionDate),
        description: tx.description,
        type: tx.type === 'DEBIT' ? 'DEBIT' : 'CREDIT',
        merchant: tx.merchant || tx.description,
        status: 'POSTED',
      }));
    } catch (error) {
      console.error(`❌ Error fetching transactions for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Sincronizar transações recentes (últimas 24h)
   */
  async syncRecentTransactions(userId: string): Promise<BankTransaction[]> {
    return this.getTransactions(userId, 1);
  }

  /**
   * Validar se token ainda é válido
   */
  async isTokenValid(userId: string): Promise<boolean> {
    const token = await this.getUserBankToken(userId);
    if (!token) return false;

    // Se token expira em menos de 5 minutos, renovar
    if (token.expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
      return await this.refreshToken(userId);
    }

    return true;
  }

  /**
   * Renovar token usando refresh token
   */
  async refreshToken(userId: string): Promise<boolean> {
    try {
      const oldToken = await this.getUserBankToken(userId);
      if (!oldToken || !oldToken.refreshToken) {
        return false;
      }

      const response = await axios.post(
        'https://api.openfinancebrasil.org.br/oauth/token',
        {
          grant_type: 'refresh_token',
          refresh_token: oldToken.refreshToken,
          client_id: this.clientId,
          client_secret: process.env.OPEN_FINANCE_CLIENT_SECRET,
        }
      );

      const newToken: AuthToken = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
        scope: response.data.scope,
      };

      await this.saveUserBankToken(userId, newToken);
      console.log(`✅ Token refreshed for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`❌ Token refresh failed for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Desconectar banco (revogar acesso)
   */
  async disconnectBank(userId: string): Promise<boolean> {
    try {
      await this.redis.del(`user_bank_token:${userId}`);
      await this.redis.del(`user_bank_accounts:${userId}`);
      console.log(`✅ Bank disconnected for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`❌ Disconnect error for user ${userId}:`, error);
      return false;
    }
  }

  // ===== HELPERS (Redis Storage) =====

  private async saveUserBankToken(userId: string, token: AuthToken): Promise<void> {
    await this.redis.setex(
      `user_bank_token:${userId}`,
      token.expiresIn + 3600, // 1 hora de buffer
      JSON.stringify(token)
    );
  }

  private async getUserBankToken(userId: string): Promise<AuthToken | null> {
    const data = await this.redis.get(`user_bank_token:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  private async saveUserBankAccounts(userId: string, accounts: BankAccount[]): Promise<void> {
    await this.redis.setex(
      `user_bank_accounts:${userId}`,
      86400 * 7, // 7 dias
      JSON.stringify(accounts)
    );
  }

  async getUserBankAccounts(userId: string): Promise<BankAccount[]> {
    const data = await this.redis.get(`user_bank_accounts:${userId}`);
    return data ? JSON.parse(data) : [];
  }
}

export default new OpenFinanceService();
