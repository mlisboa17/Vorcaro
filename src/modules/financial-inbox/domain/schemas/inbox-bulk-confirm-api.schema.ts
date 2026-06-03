import { z } from "zod";

export const inboxBulkConfirmApiSchema = z
  .object({
    inboxItemIds: z.array(z.string().min(1)).min(1).max(200),
  })
  .strict();

export type InboxBulkConfirmApiRequest = z.infer<typeof inboxBulkConfirmApiSchema>;
