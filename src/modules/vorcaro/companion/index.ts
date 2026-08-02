/**
 * Companheiro Vorcaro: Friendly Financial Companion
 * Exports all public APIs
 */

export { VORCARO_COMPANION_SYSTEM_PROMPT, buildCompanionPrompt, type CompanionPromptOptions } from './domain/vorcaro-companion-system-prompt';
export { extractCompanionIntent, generateIntentSuggestion, type ParsedCompanionIntent, type CompanionIntentType } from './domain/vorcaro-companion-intent';
export { VorcaroCompanionMemoryService, type ConversationContext, type ConversationMessage } from './application/services/vorcaro-companion-memory.service';
export { VorcaroCompanionService, type CompanionChatRequest, type CompanionChatResponse } from './application/services/vorcaro-companion.service';
