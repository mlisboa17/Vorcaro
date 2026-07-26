import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Fake Redis (in-memory, respeita del/get/setex) ──────────────────────────
class FakeRedis {
  private store = new Map<string, string>();
  async setex(key: string, _ttl: number, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async get(key: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
  /** setnx: define só se ausente; retorna 1 se definiu, 0 se já existia (idempotência). */
  async setnx(key: string, value: string): Promise<number> {
    if (this.store.has(key)) return 0;
    this.store.set(key, value);
    return 1;
  }
  /** Assinatura real do redis (define TTL) — no-op neste fake. */
  async expire(_key: string, _ttl: number): Promise<void> {
    // TTL não simulado em tempo real.
  }
  /** Simula expiração explícita nos testes. */
  simulateExpiry(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}
const fakeRedis = new FakeRedis();

// ─── Mocks de módulos externos ────────────────────────────────────────────────
const sentMessages: string[] = [];

vi.mock("@/lib/telegram/telegram-bot.client", () => ({
  sendTelegramMessage: vi.fn(async (_chatId: number, text: string) => {
    sentMessages.push(text);
  }),
  sendTelegramMessageWithMode: vi.fn(async (_chatId: number, text: string) => {
    sentMessages.push(text);
  }),
  answerTelegramCallbackQuery: vi.fn(async () => undefined),
  editTelegramMessageText: vi.fn(async () => undefined),
  downloadTelegramFile: vi.fn(async () => ({ buffer: Buffer.from(""), mimeType: "" })),
}));

vi.mock("@/lib/queue", () => ({
  getRedisConnection: () => fakeRedis,
  enqueueStatementImport: vi.fn(async () => undefined),
}));

const processInboxMock = vi.fn(async (_id: string, _userId: string) => undefined);
vi.mock("@/lib/queue/process-financial-inbox-item", () => ({
  processFinancialInboxItem: (id: string, userId: string) => processInboxMock(id, userId),
}));

/** Extrai `handled` do resultado (união com ramo `skipped`). */
function handledOf(r: { ok: boolean } & Record<string, unknown>): string | undefined {
  return "handled" in r ? (r.handled as string) : undefined;
}

import { ProcessTelegramUpdateService } from "@/modules/telegram/application/process-telegram-update.service";

// ─── Prisma stub mínimo (só o que o fluxo toca) ──────────────────────────────
const USER_ID = "user-1";
const CHAT_ID = 555;

function buildPrismaStub() {
  const state = { accounts: 0, payments: 0, inboxCreated: 0 };
  const decimal = (n: number) => ({ toNumber: () => n });
  const accountCreate = vi.fn(async ({ data }: any) => {
    state.accounts += 1;
    return {
      id: `acc-${state.accounts}`,
      institutionName: null,
      currency: "BRL",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
      balance: decimal(0),
      saldoInicial: decimal(0),
    };
  });
  const paymentCreate = vi.fn(async ({ data }: any) => {
    state.payments += 1;
    return { id: `pay-${state.payments}`, ...data };
  });
  const inboxCreate = vi.fn(async ({ data }: any) => {
    state.inboxCreated += 1;
    return { id: `inbox-${state.inboxCreated}`, ...data };
  });
  const prisma = {
    financialAccount: {
      count: vi.fn(async () => state.accounts),
      create: accountCreate,
    },
    paymentMethod: { create: paymentCreate },
    financialInbox: { create: inboxCreate },
  } as any;
  return { prisma, state, accountCreate, paymentCreate, inboxCreate };
}

const telegramIntegration = {
  findActiveConnectionByChatId: vi.fn(async () => ({
    id: "conn-1",
    userId: USER_ID,
    telegramChatId: BigInt(CHAT_ID),
    telegramUserId: BigInt(1),
    username: "u",
    firstName: "U",
    connectedAt: new Date(),
  })),
} as any;

// ─── Builders de update ──────────────────────────────────────────────────────
function textMsg(text: string): any {
  return {
    message_id: Math.floor(Math.random() * 1e6),
    from: { id: 1, first_name: "U", username: "u" },
    chat: { id: CHAT_ID, type: "private" },
    date: Math.floor(Date.now() / 1000),
    text,
  };
}
function callback(data: string): any {
  return {
    id: `cb-${Math.random()}`,
    data,
    message: { chat: { id: CHAT_ID, type: "private" }, message_id: 10 },
  };
}

describe("Onboarding E2E (17.3) — conta → forma de pagamento → 1º lançamento", () => {
  beforeEach(() => {
    fakeRedis.clear();
    sentMessages.length = 0;
    processInboxMock.mockClear();
  });

  it("fluxo completo bem-sucedido, sem regressão no lançamento", async () => {
    const { prisma, accountCreate, paymentCreate, inboxCreate } = buildPrismaStub();
    const svc = new ProcessTelegramUpdateService(prisma, telegramIntegration);

    // 1) usuário sem conta manda algo → welcome
    const r1 = await svc.execute(textMsg("oi"));
    expect(handledOf(r1)).toBe("onboarding_welcome");
    expect(sentMessages.join(" ")).toContain("Bem-vindo");

    // 2) toca "Cadastrar conta" → prompt
    const r2 = await svc.executeCallback(callback("onb_account"));
    expect(handledOf(r2)).toBe("onboarding_account_prompt");

    // 3) envia o nome → cria conta (CHECKING) + oferece forma de pagamento
    const r3 = await svc.execute(textMsg("Nubank"));
    expect(handledOf(r3)).toBe("onboarding_account_created");
    expect(accountCreate).toHaveBeenCalledTimes(1);
    expect(accountCreate.mock.calls[0][0].data).toMatchObject({ userId: USER_ID, name: "Nubank", type: "CHECKING" });

    // 4) toca "Cadastrar forma de pagamento" → prompt
    const r4 = await svc.executeCallback(callback("onb_payment"));
    expect(handledOf(r4)).toBe("onboarding_payment_prompt");

    // 5) envia a forma → cria (PIX, default)
    const r5 = await svc.execute(textMsg("Pix"));
    expect(handledOf(r5)).toBe("onboarding_payment_created");
    expect(paymentCreate).toHaveBeenCalledTimes(1);
    expect(paymentCreate.mock.calls[0][0].data).toMatchObject({ userId: USER_ID, name: "Pix", type: "PIX", isDefault: true });

    // 6) REGRESSÃO ZERO: agora com conta, um lançamento normal NÃO é interceptado
    const r6 = await svc.execute(textMsg("Mercado 50,00"));
    expect(handledOf(r6)).toBe("text_enqueued");
    expect(inboxCreate).toHaveBeenCalledTimes(1);
    expect(processInboxMock).toHaveBeenCalledTimes(1);
  });

  it("cancelamento na etapa de conta limpa o estado e não cria nada", async () => {
    const { prisma, accountCreate } = buildPrismaStub();
    const svc = new ProcessTelegramUpdateService(prisma, telegramIntegration);

    await svc.executeCallback(callback("onb_account"));
    const r = await svc.execute(textMsg("cancelar"));
    expect(handledOf(r)).toBe("onboarding_account_cancelled");
    expect(accountCreate).not.toHaveBeenCalled();
    expect(await fakeRedis.get(`telegram:onboard:${CHAT_ID}`)).toBeNull();
  });

  it("cancelamento na etapa de pagamento mantém a conta já criada", async () => {
    const { prisma, accountCreate, paymentCreate } = buildPrismaStub();
    const svc = new ProcessTelegramUpdateService(prisma, telegramIntegration);

    await svc.executeCallback(callback("onb_account"));
    await svc.execute(textMsg("Carteira")); // cria conta
    await svc.executeCallback(callback("onb_payment"));
    const r = await svc.execute(textMsg("cancelar"));
    expect(handledOf(r)).toBe("onboarding_payment_cancelled");
    expect(accountCreate).toHaveBeenCalledTimes(1);
    expect(paymentCreate).not.toHaveBeenCalled();
    expect(await fakeRedis.get(`telegram:onboard:${CHAT_ID}`)).toBeNull();
  });

  it("timeout (TTL expirado) não interfere: com conta existente, lançamento flui", async () => {
    const { prisma, inboxCreate } = buildPrismaStub();
    // Simula usuário que JÁ tem conta (onboarding concluído em sessão anterior).
    prisma.financialAccount.count = vi.fn(async () => 1);
    const svc = new ProcessTelegramUpdateService(prisma, telegramIntegration);

    // Havia um estado pendente que expirou (removido do Redis).
    await fakeRedis.setex(`telegram:onboard:${CHAT_ID}`, 300, JSON.stringify({ step: "payment_name" }));
    fakeRedis.simulateExpiry(`telegram:onboard:${CHAT_ID}`);

    const r = await svc.execute(textMsg("Uber 25,90"));
    expect(handledOf(r)).toBe("text_enqueued");
    expect(inboxCreate).toHaveBeenCalledTimes(1);
  });

  it("timeout na etapa de conta: sem estado e sem conta → re-exibe welcome (gracioso)", async () => {
    const { prisma } = buildPrismaStub();
    const svc = new ProcessTelegramUpdateService(prisma, telegramIntegration);
    // Nenhum estado no Redis (expirou) e 0 contas.
    const r = await svc.execute(textMsg("Nubank"));
    expect(handledOf(r)).toBe("onboarding_welcome");
  });

  it("infere tipo de conta pelo nome (Carteira → CASH)", async () => {
    const { prisma, accountCreate } = buildPrismaStub();
    const svc = new ProcessTelegramUpdateService(prisma, telegramIntegration);
    await svc.executeCallback(callback("onb_account"));
    await svc.execute(textMsg("Carteira"));
    expect(accountCreate.mock.calls[0][0].data.type).toBe("CASH");
  });
});
