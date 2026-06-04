import { prisma } from "@/lib/prisma";
import { VorcaroMessagingService } from "@/modules/vorcaro/application/services/vorcaro-messaging.service";
import { PrismaVorcaroPreferenceRepository } from "@/modules/vorcaro/infrastructure/repositories/prisma-vorcaro-preference.repository";

export function buildVorcaroMessaging() {
  return new VorcaroMessagingService(prisma);
}

export function buildVorcaroPreferences() {
  return new PrismaVorcaroPreferenceRepository(prisma);
}
