import type { VorcaroAggregatedContext } from "./vorcaro-context-aggregator.service";
import type { VorcaroChatTopic } from "../../domain/types/vorcaro-conversation";

const MAX_CONTEXT_CHARS = 14_000;

export type VorcaroBuiltPrompt = {
  contextMarkdown: string;
  truncated: boolean;
};

export class VorcaroPromptBuilderService {
  build(input: {
    aggregated: VorcaroAggregatedContext;
    historyBlock: string;
    activeTopic?: VorcaroChatTopic | null;
    userMessage: string;
  }): VorcaroBuiltPrompt {
    const prioritySections: string[] = [];

    if (input.activeTopic) {
      prioritySections.push(`## Tópico ativo da conversa\n${input.activeTopic}`);
    }

    if (input.historyBlock) {
      prioritySections.push(`## Histórico recente\n${input.historyBlock}`);
    }

    prioritySections.push(input.aggregated.markdown);

    let contextMarkdown = prioritySections.join("\n\n");
    let truncated = false;

    if (contextMarkdown.length > MAX_CONTEXT_CHARS) {
      contextMarkdown = contextMarkdown.slice(0, MAX_CONTEXT_CHARS) + "\n\n[Contexto truncado por limite de tokens]";
      truncated = true;
    }

    return { contextMarkdown, truncated };
  }

  buildUserPrompt(input: {
    built: VorcaroBuiltPrompt;
    userMessage: string;
    topicHint?: string;
  }): string {
    const parts = [input.built.contextMarkdown, "", "---", "", "Pergunta do usuário:"];

    if (input.topicHint) {
      parts.push(`(Continuação sobre: ${input.topicHint})`);
    }

    parts.push(input.userMessage);
    return parts.join("\n");
  }
}
