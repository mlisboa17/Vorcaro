import { prisma } from "@/lib/prisma";
import { VorcaroConversationService } from "@/modules/vorcaro/conversation/application/services/vorcaro-conversation.service";

export function buildVorcaroConversationService() {
  return new VorcaroConversationService(prisma);
}
