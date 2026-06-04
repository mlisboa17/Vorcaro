import type { PrismaClient } from "@prisma/client";
import { generateResetToken, hashPassword } from "@/lib/auth/password";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export class PasswordResetService {
  constructor(private readonly db: PrismaClient) {}

  async requestReset(email: string): Promise<{ token?: string }> {
    const user = await this.db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return {};
    }

    await this.db.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.db.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    return { token };
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const row = await this.db.passwordResetToken.findUnique({ where: { token } });
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      return false;
    }

    const passwordHash = hashPassword(newPassword);

    await this.db.$transaction([
      this.db.user.update({
        where: { id: row.userId },
        data: { passwordHash },
      }),
      this.db.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      this.db.passwordResetToken.updateMany({
        where: { userId: row.userId, usedAt: null, id: { not: row.id } },
        data: { usedAt: new Date() },
      }),
    ]);

    return true;
  }
}
