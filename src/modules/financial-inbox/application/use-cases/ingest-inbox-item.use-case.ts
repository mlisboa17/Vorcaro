import type { InboxRepositoryPort, CreateInboxItemInput } from "../../domain/ports/inbox-repository.port";

export interface IngestInboxItemInput {
  userId: string;
  channel: CreateInboxItemInput["channel"];
  rawContent: string;
  channelMeta?: Record<string, unknown>;
  metadata?: CreateInboxItemInput["metadata"];
}
export class IngestInboxItemUseCase {
  constructor(private readonly inboxRepository: InboxRepositoryPort) {}

  async execute(input: IngestInboxItemInput) {
    return this.inboxRepository.save(input);
  }
}
