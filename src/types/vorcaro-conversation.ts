import { z } from "zod";

export const vorcaroChatMessageBodySchema = z
  .object({
    message: z.string().min(1).max(2000),
    conversationId: z.string().cuid().optional(),
  })
  .strict();

export const vorcaroChatResponseSchema = z.object({
  conversationId: z.string(),
  messageId: z.string(),
  answer: z.string(),
  provider: z.string(),
  model: z.string(),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
  usedSources: z.array(z.string()),
  activeTopic: z.string().nullable(),
  responseMode: z.enum(["tool", "llm"]).optional(),
  intent: z.string().optional(),
  toolsUsed: z.array(z.string()).optional(),
});

export type VorcaroChatResponseDto = z.infer<typeof vorcaroChatResponseSchema>;

export const vorcaroConversationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  channel: z.enum(["WEB", "TELEGRAM"]),
  title: z.string().nullable(),
  activeTopic: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const vorcaroMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(["USER", "VORCARO", "SYSTEM"]),
  content: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
});
