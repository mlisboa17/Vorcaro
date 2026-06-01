import type {
  InboxRepositoryPort,
  ListInboxItemsFilters,
  ListInboxItemsResult,
} from "../../domain/ports/inbox-repository.port";

export interface ListInboxItemsInput {
  userId: string;
  filters?: ListInboxItemsFilters;
}

export class ListInboxItemsUseCase {
  constructor(private readonly inboxRepository: InboxRepositoryPort) {}

  execute(input: ListInboxItemsInput): Promise<ListInboxItemsResult> {
    return this.inboxRepository.listByUserId(input.userId, input.filters);
  }
}
