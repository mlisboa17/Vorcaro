export interface TelegramConnectionRecord {
  id: string;
  userId: string;
  telegramChatId: bigint;
  telegramUserId: bigint | null;
  username: string | null;
  firstName: string | null;
  connectedAt: Date;
}

export interface TelegramConnectCodeRecord {
  code: string;
  expiresAt: Date;
}

export interface TelegramIntegrationPort {
  findActiveConnectionByChatId(telegramChatId: bigint): Promise<TelegramConnectionRecord | null>;
  findActiveConnectionByUserId(userId: string): Promise<TelegramConnectionRecord | null>;
  createConnectCode(userId: string, code: string, expiresAt: Date): Promise<TelegramConnectCodeRecord>;
  consumeConnectCode(
    code: string,
    telegramChatId: bigint,
    telegramUserId: bigint | null,
    username: string | null,
    firstName: string | null,
  ): Promise<{ userId: string }>;
  disconnect(userId: string): Promise<void>;
}
