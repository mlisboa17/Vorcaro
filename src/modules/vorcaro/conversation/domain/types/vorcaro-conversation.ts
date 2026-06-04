export const VORCARO_CONVERSATION_CHANNELS = ["WEB", "TELEGRAM"] as const;
export type VorcaroConversationChannel = (typeof VORCARO_CONVERSATION_CHANNELS)[number];

export const VORCARO_MESSAGE_ROLES = ["USER", "VORCARO", "SYSTEM"] as const;
export type VorcaroMessageRole = (typeof VORCARO_MESSAGE_ROLES)[number];

export type VorcaroConversationRecord = {
  id: string;
  userId: string;
  channel: VorcaroConversationChannel;
  title: string | null;
  activeTopic: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type VorcaroMessageRecord = {
  id: string;
  conversationId: string;
  role: VorcaroMessageRole;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

export type VorcaroChatActionProposalDto = {
  id: string;
  actionType: string;
  title: string;
  description: string;
  status: string;
  expiresAt: string;
};

export type VorcaroChatActionExecutionDto = {
  status: "EXECUTED" | "FAILED";
  targetUrl?: string;
  navigationPayload?: Record<string, unknown>;
  title: string;
  message: string;
};

export type VorcaroChatResponse = {
  conversationId: string;
  messageId: string;
  answer: string;
  provider: string;
  model: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  usedSources: string[];
  activeTopic: string | null;
  responseMode?: "tool" | "llm" | "action";
  intent?: string;
  toolsUsed?: string[];
  actionProposals?: VorcaroChatActionProposalDto[];
  actionExecution?: VorcaroChatActionExecutionDto;
};

export const VORCARO_CHAT_TOPICS = [
  "cashflow",
  "health",
  "goals",
  "receivables",
  "commitments",
  "alerts",
  "savings",
  "patrimony",
  "timeline",
  "evolution",
  "achievements",
  "trends",
  "general",
] as const;

export type VorcaroChatTopic = (typeof VORCARO_CHAT_TOPICS)[number];

export const VORCARO_INSUFFICIENT_DATA_MESSAGE =
  "Não tenho dados suficientes para responder isso com segurança.";

export const VORCARO_CHAT_RATE_LIMIT_WEB_PER_HOUR = 60;
export const VORCARO_CHAT_RATE_LIMIT_TELEGRAM_PER_HOUR = 30;
export const VORCARO_CHAT_MAX_HISTORY_FOR_LLM = 12;
export const VORCARO_CONTEXT_CACHE_TTL_MS = 60_000;
