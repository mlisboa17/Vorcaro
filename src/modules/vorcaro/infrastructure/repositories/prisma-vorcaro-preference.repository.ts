/**
 * Preferência de tom Vorcaro persistida em `User.vorcaroTone`.
 * Não existe UserSettings/UserProfile separado — User é a estrutura canônica de configuração.
 */
import type { PrismaClient, VorcaroTone } from "@prisma/client";
import { VORCARO_TONES, type VorcaroTone as DomainTone } from "../../domain/types/vorcaro-personality";

function isVorcaroTone(value: string): value is DomainTone {
  return (VORCARO_TONES as readonly string[]).includes(value);
}

export class PrismaVorcaroPreferenceRepository {
  constructor(private readonly db: PrismaClient) {}

  async getTone(userId: string): Promise<DomainTone> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { vorcaroTone: true },
    });
    const tone = user?.vorcaroTone ?? "PROFESSIONAL";
    return isVorcaroTone(tone) ? tone : "PROFESSIONAL";
  }

  async updateTone(userId: string, tone: DomainTone): Promise<DomainTone> {
    const row = await this.db.user.update({
      where: { id: userId },
      data: { vorcaroTone: tone as VorcaroTone },
      select: { vorcaroTone: true },
    });
    return isVorcaroTone(row.vorcaroTone) ? row.vorcaroTone : "PROFESSIONAL";
  }
}
