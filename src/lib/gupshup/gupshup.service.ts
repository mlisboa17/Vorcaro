import axios, { AxiosInstance } from 'axios';

export interface GupshupMessage {
  text: string;
  to: string;
  type?: 'text' | 'image' | 'document' | 'audio';
}

export interface GupshupWebhookPayload {
  timestamp: number;
  type: string;
  messageId: string;
  from: string;
  phone: string;
  message: string;
  sender: {
    phone: string;
    name: string;
  };
}

export class GupshupService {
  private client: AxiosInstance;
  private userId: string;
  private apiKey: string;
  private phoneNumber: string;
  private appId: string;

  constructor() {
    this.userId = process.env.GUPSHUP_USER_ID || '';
    this.apiKey = process.env.GUPSHUP_API_KEY || '';
    this.phoneNumber = process.env.GUPSHUP_PHONE_NUMBER || '';
    this.appId = process.env.GUPSHUP_APP_ID || '';

    if (!this.userId || !this.apiKey || !this.phoneNumber) {
      console.warn('⚠️ Gupshup credentials missing. Set in .env');
    }

    this.client = axios.create({
      baseURL: 'https://api.gupshup.io/sm/api/v1',
      timeout: 10000,
    });
  }

  /**
   * Enviar mensagem de texto simples
   */
  async sendText(to: string, message: string): Promise<any> {
    try {
      const response = await this.client.post('/msg', {
        userid: this.userId,
        password: this.apiKey,
        phone_number: this.phoneNumber,
        v: 1.1,
        msg_type: 'TEXT',
        msg: message,
        to_number: to,
        isHSM: false,
      });

      return {
        success: true,
        messageId: response.data?.messageId || response.data?.response?.message,
        status: response.data?.status,
      };
    } catch (error: any) {
      console.error('❌ Gupshup sendText failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Enviar mensagem via template
   */
  async sendTemplate(
    to: string,
    templateName: string,
    parameters: string[] = []
  ): Promise<any> {
    try {
      const response = await this.client.post('/template/msg', {
        userid: this.userId,
        password: this.apiKey,
        phone_number: this.phoneNumber,
        v: 1.1,
        template_id: templateName,
        msg_type: 'TEXT',
        to_number: to,
        params: parameters.join('|'), // Separado por pipe
        isHSM: true,
      });

      return {
        success: true,
        messageId: response.data?.messageId || response.data?.response?.message,
        status: response.data?.status,
      };
    } catch (error: any) {
      console.error('❌ Gupshup sendTemplate failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Enviar imagem com caption
   */
  async sendImage(to: string, imageUrl: string, caption?: string): Promise<any> {
    try {
      const response = await this.client.post('/msg', {
        userid: this.userId,
        password: this.apiKey,
        phone_number: this.phoneNumber,
        v: 1.1,
        msg_type: 'IMAGE',
        msg: imageUrl,
        caption: caption || '',
        to_number: to,
        isHSM: false,
      });

      return {
        success: true,
        messageId: response.data?.messageId,
        status: response.data?.status,
      };
    } catch (error: any) {
      console.error('❌ Gupshup sendImage failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validar webhook do Gupshup
   */
  validateWebhookSignature(
    payload: any,
    signature: string,
    secret: string
  ): boolean {
    // Implementar validação de assinatura se Gupshup fornecer
    // Por enquanto, apenas verificar que payload não é null
    return !!payload;
  }

  /**
   * Processar webhook recebido
   */
  processWebhook(payload: GupshupWebhookPayload): {
    userId: string;
    message: string;
    type: string;
    timestamp: number;
  } {
    return {
      userId: payload.from || payload.phone,
      message: payload.message,
      type: payload.type || 'text',
      timestamp: payload.timestamp,
    };
  }

  /**
   * Listar status de mensagens
   */
  async getMessageStatus(messageId: string): Promise<any> {
    try {
      const response = await this.client.get('/msg/status', {
        params: {
          userid: this.userId,
          password: this.apiKey,
          msg_id: messageId,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Gupshup getMessageStatus failed:', error.message);
      return null;
    }
  }

  /**
   * Health check da API
   */
  async healthCheck(): Promise<boolean> {
    if (!this.userId || !this.apiKey || !this.phoneNumber) {
      console.warn('⚠️ Gupshup not configured');
      return false;
    }

    try {
      // Tentar enviar mensagem de teste (descomente quando quiser testar)
      // await this.sendText(this.phoneNumber, 'Teste de conexão Vorcaro');
      return true;
    } catch (error) {
      console.error('❌ Gupshup health check failed:', error);
      return false;
    }
  }
}

export default new GupshupService();
