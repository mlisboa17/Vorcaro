import { describe, expect, it, vi, beforeEach } from "vitest";
import { PasswordResetService } from "../application/services/password-reset.service";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("PasswordResetService", () => {
  const userId = "user-1";
  let db: {
    user: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    passwordResetToken: {
      updateMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let service: PasswordResetService;

  beforeEach(() => {
    db = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      passwordResetToken: {
        updateMany: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
    };
    service = new PasswordResetService(db as never);
  });

  it("requestReset não revela ausência de usuário", async () => {
    db.user.findUnique.mockResolvedValue(null);
    const result = await service.requestReset("missing@example.com");
    expect(result.token).toBeUndefined();
  });

  it("requestReset cria token para usuário existente", async () => {
    db.user.findUnique.mockResolvedValue({ id: userId, email: "a@b.com" });
    db.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    db.passwordResetToken.create.mockResolvedValue({});

    const result = await service.requestReset("a@b.com");
    expect(result.token).toBeTruthy();
    expect(db.passwordResetToken.create).toHaveBeenCalled();
  });

  it("resetPassword aplica hash e invalida token", async () => {
    const token = "a".repeat(64);
    db.passwordResetToken.findUnique.mockResolvedValue({
      id: "tok-1",
      userId,
      token,
      usedAt: null,
      expiresAt: new Date(Date.now() + 600_000),
    });

    const ok = await service.resetPassword(token, "nova-senha-123");
    expect(ok).toBe(true);
    expect(db.$transaction).toHaveBeenCalled();
  });

  it("resetPassword rejeita token expirado", async () => {
    db.passwordResetToken.findUnique.mockResolvedValue({
      id: "tok-1",
      userId,
      token: "x",
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(await service.resetPassword("x", "nova-senha-123")).toBe(false);
  });
});

describe("password hash", () => {
  it("verifica senha corretamente", () => {
    const hash = hashPassword("teste1234");
    expect(verifyPassword("teste1234", hash)).toBe(true);
    expect(verifyPassword("errada", hash)).toBe(false);
  });
});
