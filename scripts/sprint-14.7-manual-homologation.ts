/**
 * Sprint 14.7 — homologação funcional manual via API + sessão NextAuth.
 * Complementa blocos UI/Telegram; gera evidências para o relatório E2E.
 */
import { PrismaClient, CategoryType, AccountType, PaymentMethodType } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { hashPassword } from "../src/lib/auth/password";
import { buildVorcaroActionProposalService } from "../src/lib/api/vorcaro-actions";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const DEV_PASSWORD = process.env.AUTH_DEV_PASSWORD ?? "dev123";
const prisma = new PrismaClient();

export type HomologResult = {
  block: string;
  flow: string;
  status: "PASS" | "FAIL" | "SKIP" | "MANUAL";
  detail: string;
};

const results: HomologResult[] = [];

function record(block: string, flow: string, status: HomologResult["status"], detail: string) {
  results.push({ block, flow, status, detail });
  const icon = { PASS: "✓", FAIL: "✗", SKIP: "○", MANUAL: "?" }[status];
  console.log(`${icon} [${block}] ${flow}: ${detail}`);
}

function mergeCookies(existing: string, setCookie: string | null): string {
  if (!setCookie) return existing;
  const jar = new Map<string, string>();
  for (const part of existing.split("; ").filter(Boolean)) {
    const [k, ...v] = part.split("=");
    jar.set(k, v.join("="));
  }
  for (const raw of setCookie.split(/,(?=\s*[^;]+=[^;]+)/)) {
    const pair = raw.split(";")[0]?.trim();
    if (!pair) continue;
    const [k, ...v] = pair.split("=");
    jar.set(k, v.join("="));
  }
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

class SessionClient {
  cookies = "";

  async logout() {
    await this.api("/api/auth/signout", { method: "POST", body: "{}" });
    this.cookies = "";
  }

  async login(email: string, password: string): Promise<boolean> {
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { redirect: "manual" });
    this.cookies = mergeCookies(this.cookies, csrfRes.headers.get("set-cookie"));
    const csrfBody = (await csrfRes.json()) as { csrfToken: string };

    const signInRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: this.cookies,
      },
      body: new URLSearchParams({
        csrfToken: csrfBody.csrfToken,
        email,
        password,
        callbackUrl: `${BASE}/dashboard`,
        json: "true",
      }),
    });
    this.cookies = mergeCookies(this.cookies, signInRes.headers.get("set-cookie"));

    const sessionRes = await this.api("/api/auth/session");
    return sessionRes.status === 200 && !!(sessionRes.body as { user?: { id?: string } })?.user?.id;
  }

  async api(path: string, init: RequestInit = {}) {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Cookie: this.cookies,
        ...(init.headers as Record<string, string>),
      },
    });
    this.cookies = mergeCookies(this.cookies, res.headers.get("set-cookie"));
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body };
  }
}

type SeedIds = {
  userId: string;
  email: string;
  accountId: string;
  expenseCategoryId: string;
  incomeCategoryId: string;
  paymentMethodId: string;
  cardPaymentMethodId: string;
  cardId: string;
};

async function seedUser(prefix: string, withPassword?: string): Promise<SeedIds> {
  const email = `${prefix}-${Date.now()}@homolog.local`;
  const user = await prisma.user.create({
    data: {
      email,
      name: prefix,
      ...(withPassword ? { passwordHash: hashPassword(withPassword) } : {}),
    },
  });

  const account = await prisma.financialAccount.create({
    data: {
      userId: user.id,
      name: "Conta Homolog",
      type: AccountType.CORRENTE,
      balance: 1000,
      currency: "BRL",
      isActive: true,
    },
  });

  const expenseRoot = await prisma.category.create({
    data: { userId: user.id, name: "Despesas", type: CategoryType.DESPESA, isActive: true },
  });
  const expenseCategory = await prisma.category.create({
    data: {
      userId: user.id,
      name: "Mercado",
      type: CategoryType.DESPESA,
      parentCategoryId: expenseRoot.id,
      isActive: true,
    },
  });
  const incomeRoot = await prisma.category.create({
    data: { userId: user.id, name: "Receita", type: CategoryType.RECEITA, isActive: true },
  });
  const incomeCategory = await prisma.category.create({
    data: {
      userId: user.id,
      name: "Salário",
      type: CategoryType.RECEITA,
      parentCategoryId: incomeRoot.id,
      isActive: true,
    },
  });
  const paymentMethod = await prisma.paymentMethod.create({
    data: {
      userId: user.id,
      name: "PIX",
      type: PaymentMethodType.PIX,
      isDefault: true,
      isActive: true,
    },
  });
  const cardPaymentMethod = await prisma.paymentMethod.create({
    data: {
      userId: user.id,
      name: "Cartão Crédito",
      type: PaymentMethodType.CARTAO,
      isDefault: false,
      isActive: true,
    },
  });
  const card = await prisma.card.create({
    data: {
      userId: user.id,
      financialAccountId: account.id,
      name: "Cartão Homolog",
      brand: "VISA",
      type: "CREDITO",
      lastFourDigits: "4242",
      closingDay: 1,
      dueDay: 10,
      isActive: true,
    },
  });

  return {
    userId: user.id,
    email,
    accountId: account.id,
    expenseCategoryId: expenseCategory.id,
    incomeCategoryId: incomeCategory.id,
    paymentMethodId: paymentMethod.id,
    cardPaymentMethodId: cardPaymentMethod.id,
    cardId: card.id,
  };
}

async function cleanupUser(userId: string) {
  await prisma.vorcaroActionProposal.deleteMany({ where: { userId } });
  await prisma.vorcaroFollowUp.deleteMany({ where: { userId } });
  await prisma.financialAlert.deleteMany({ where: { userId } });
  await prisma.receivable.deleteMany({ where: { userId } });
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.financialGoal.deleteMany({ where: { userId } });
  await prisma.financialInbox.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.card.deleteMany({ where: { userId } });
  await prisma.paymentMethod.deleteMany({ where: { userId } });
  await prisma.category.deleteMany({ where: { userId } });
  await prisma.financialAccount.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
}

async function cleanupUserB(userId: string) {
  await cleanupUser(userId);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  console.log("=== Sprint 14.7 Manual Homologation ===\n");

  try {
    await fetch(`${BASE}/api/auth/session`);
    record("0-Ambiente", "dev server", "PASS", BASE);
  } catch {
    record("0-Ambiente", "dev server", "FAIL", "indisponível");
    process.exit(1);
  }

  const userA = await seedUser("homolog-a", "SenhaHomolog123");
  const userB = await seedUser("homolog-b", "SenhaHomolog123");
  const clientA = new SessionClient();
  const clientB = new SessionClient();

  try {
    // BLOCO 1 — Login
    const loginOk = await clientA.login(userA.email, "SenhaHomolog123");
    record("1-Auth", "login válido", loginOk ? "PASS" : "FAIL", loginOk ? "sessão criada" : "falhou");

    const badClient = new SessionClient();
    const badPass = await badClient.login(userA.email, "senha-errada");
    record("1-Auth", "senha inválida", !badPass ? "PASS" : "FAIL", badPass ? "aceitou senha errada" : "rejeitado");

    const ghostClient = new SessionClient();
    const ghostEmail = `ghost-${Date.now()}@homolog.local`;
    const ghostLogin = await ghostClient.login(ghostEmail, "senha-errada-xyz");
    record(
      "1-Auth",
      "usuário inexistente (senha errada)",
      !ghostLogin ? "PASS" : "FAIL",
      ghostLogin ? "criou sessão indevida" : "rejeitado",
    );

    await clientA.login(userA.email, "SenhaHomolog123");

    const forgot = await clientA.api("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: userA.email }),
    });
    record("1-Auth", "forgot-password", forgot.status === 200 ? "PASS" : "FAIL", `HTTP ${forgot.status}`);

    const resetToken = (forgot.body as { devResetToken?: string })?.devResetToken;
    if (resetToken) {
      const reset = await clientA.api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: resetToken, password: "NovaSenha123" }),
      });
      record("1-Auth", "reset senha", reset.status === 200 ? "PASS" : "FAIL", `HTTP ${reset.status}`);
      await clientA.login(userA.email, "NovaSenha123");
    }

    // BLOCO 2 — Lançamentos
    const income = await clientA.api("/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        descricao: "Receita homolog",
        valor: 500,
        tipo: "INCOME",
        data: todayIso(),
        categoriaId: userA.incomeCategoryId,
        contaFinanceiraId: userA.accountId,
        formaPagamentoId: userA.paymentMethodId,
      }),
    });
    record("2-Lançamentos", "criar receita", income.status === 201 ? "PASS" : "FAIL", `HTTP ${income.status}`);
    const incomeId = (income.body as { id?: string })?.id;

    const expense = await clientA.api("/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        descricao: "Despesa homolog",
        valor: 120,
        tipo: "EXPENSE",
        data: todayIso(),
        categoriaId: userA.expenseCategoryId,
        contaFinanceiraId: userA.accountId,
        formaPagamentoId: userA.paymentMethodId,
      }),
    });
    record("2-Lançamentos", "criar despesa", expense.status === 201 ? "PASS" : "FAIL", `HTTP ${expense.status}`);
    const expenseId = (expense.body as { id?: string })?.id;

    if (expenseId) {
      const edit = await clientA.api(`/api/transactions/${expenseId}`, {
        method: "PATCH",
        body: JSON.stringify({
          descricao: "Despesa editada",
          valor: 130,
          tipo: "EXPENSE",
          data: todayIso(),
          categoriaId: userA.expenseCategoryId,
          contaFinanceiraId: userA.accountId,
          metodoPagamentoId: userA.paymentMethodId,
          parcelas: 1,
        }),
      });
      record("2-Lançamentos", "editar despesa", edit.status === 200 ? "PASS" : "FAIL", `HTTP ${edit.status}`);
    }

    const list = await clientA.api("/api/transactions?limit=10");
    const listItems = (list.body as { items?: unknown[] })?.items ?? [];
    record(
      "2-Lançamentos",
      "listar/filtrar",
      list.status === 200 && listItems.length >= 2 ? "PASS" : "FAIL",
      `${listItems.length} itens`,
    );

    const dash = await clientA.api("/api/executive-dashboard");
    record(
      "2-Lançamentos",
      "dashboard atualizado",
      dash.status === 200 ? "PASS" : "FAIL",
      `HTTP ${dash.status}`,
    );

    // BLOCO 3 — Parcelamentos
    const inst = await clientA.api("/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        descricao: "Compra parcelada homolog",
        valor: 300,
        tipo: "EXPENSE",
        data: todayIso(),
        categoriaId: userA.expenseCategoryId,
        contaFinanceiraId: userA.accountId,
        formaPagamentoId: userA.cardPaymentMethodId,
        cartaoId: userA.cardId,
        parcelas: 3,
      }),
    });
    record("3-Parcelamentos", "criar parcelamento", inst.status === 201 ? "PASS" : "FAIL", `HTTP ${inst.status}`);

    const instList = await clientA.api("/api/installments");
    const groups = Array.isArray(instList.body) ? instList.body : [];
    const groupCount = groups.length;
    record(
      "3-Parcelamentos",
      "listar grupos",
      instList.status === 200 && groupCount >= 1 ? "PASS" : "FAIL",
      `${groupCount} grupo(s)`,
    );

    if (Array.isArray(groups) && groups[0] && typeof groups[0] === "object" && "installmentGroup" in groups[0]) {
      const groupId = encodeURIComponent(String((groups[0] as { installmentGroup: string }).installmentGroup));
      const detail = await clientA.api(`/api/installments/${groupId}`);
      record("3-Parcelamentos", "detalhe grupo", detail.status === 200 ? "PASS" : "FAIL", `HTTP ${detail.status}`);

      await clientB.login(userB.email, "SenhaHomolog123");
      const crossInst = await clientB.api(`/api/installments/${groupId}`);
      record(
        "3-Parcelamentos",
        "ownership cross-tenant",
        crossInst.status === 404 ? "PASS" : "FAIL",
        `HTTP ${crossInst.status}`,
      );
      await clientA.login(userA.email, "NovaSenha123");
    }

    // BLOCO 4 — Recebíveis
    const recv = await clientA.api("/api/receivables", {
      method: "POST",
      body: JSON.stringify({
        descricao: "Recebível homolog",
        devedorNome: "Cliente Teste",
        valorOriginal: 200,
      }),
    });
    record("4-Recebíveis", "criar", recv.status === 201 ? "PASS" : "FAIL", `HTTP ${recv.status}`);
    const recvId = (recv.body as { id?: string })?.id;

    if (recvId) {
      const partial = await clientA.api(`/api/receivables/${recvId}?action=collect`, {
        method: "POST",
        body: JSON.stringify({
          amount: 80,
          accountId: userA.accountId,
          date: todayIso(),
        }),
      });
      record("4-Recebíveis", "receber parcial", partial.status === 200 ? "PASS" : "FAIL", `HTTP ${partial.status}`);

      const full = await clientA.api(`/api/receivables/${recvId}?action=collect`, {
        method: "POST",
        body: JSON.stringify({
          amount: 120,
          accountId: userA.accountId,
          date: todayIso(),
        }),
      });
      const recvStatus = (full.body as { receivable?: { status?: string } })?.receivable?.status;
      record(
        "4-Recebíveis",
        "receber integral",
        full.status === 200 && recvStatus === "RECEIVED" ? "PASS" : "FAIL",
        `status=${recvStatus}`,
      );

      const recv2 = await clientA.api("/api/receivables", {
        method: "POST",
        body: JSON.stringify({
          descricao: "Recebível cancel",
          devedorNome: "Cliente B",
          valorOriginal: 50,
        }),
      });
      const recv2Id = (recv2.body as { id?: string })?.id;
      if (recv2Id) {
        const cancel = await clientA.api(`/api/receivables/${recv2Id}?action=cancel`, { method: "POST" });
        record("4-Recebíveis", "cancelar/excluir", cancel.status === 200 ? "PASS" : "FAIL", `HTTP ${cancel.status}`);
      }
    }

    // BLOCO 5 — Metas
    const goal = await clientA.api("/api/planning/goals", {
      method: "POST",
      body: JSON.stringify({
        nome: "Meta Reserva",
        tipo: "EMERGENCY_FUND",
        valorObjetivo: "10000.00",
        valorAtual: "1000.00",
        aporteMensal: "500.00",
        prioridade: "HIGH",
      }),
    });
    record("5-Metas", "criar meta", goal.status === 201 ? "PASS" : "FAIL", `HTTP ${goal.status}`);
    const goalId = (goal.body as { id?: string })?.id;

    if (goalId) {
      const editGoal = await clientA.api(`/api/planning/goals/${goalId}`, {
        method: "PATCH",
        body: JSON.stringify({ nome: "Meta Reserva Editada" }),
      });
      record("5-Metas", "editar meta", editGoal.status === 200 ? "PASS" : "FAIL", `HTTP ${editGoal.status}`);

      const complete = await clientA.api(`/api/planning/goals/${goalId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ACHIEVED", valorAtual: "10000.00" }),
      });
      record("5-Metas", "concluir meta", complete.status === 200 ? "PASS" : "FAIL", `HTTP ${complete.status}`);
    }

    const riskGoal = await clientA.api("/api/planning/goals", {
      method: "POST",
      body: JSON.stringify({
        nome: "Meta Risco",
        tipo: "CUSTOM",
        valorObjetivo: "50000.00",
        valorAtual: "100.00",
        aporteMensal: "50.00",
        prioridade: "HIGH",
        dataObjetivo: new Date(Date.now() + 30 * 86400000).toISOString(),
      }),
    });
    record("5-Metas", "meta em risco (seed)", riskGoal.status === 201 ? "PASS" : "FAIL", `HTTP ${riskGoal.status}`);

    // BLOCO 6 — Alertas
    const alert = await prisma.financialAlert.create({
      data: {
        userId: userA.userId,
        type: "GOAL_AT_RISK",
        severity: "WARNING",
        title: "Alerta homolog",
        description: "Teste homologação",
        fingerprint: `homolog-${Date.now()}`,
        status: "OPEN",
      },
    });
    const alertList = await clientA.api("/api/alerts");
    record(
      "6-Alertas",
      "listar alertas",
      alertList.status === 200 ? "PASS" : "FAIL",
      `HTTP ${alertList.status}`,
    );

    const resolveAlert = await clientA.api(`/api/alerts/${alert.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    record("6-Alertas", "resolver alerta", resolveAlert.status === 200 ? "PASS" : "FAIL", `HTTP ${resolveAlert.status}`);

    const alert2 = await prisma.financialAlert.create({
      data: {
        userId: userA.userId,
        type: "CASHFLOW_WARNING",
        severity: "INFO",
        title: "Alerta dismiss",
        description: "Teste dismiss",
        fingerprint: `homolog-dismiss-${Date.now()}`,
        status: "OPEN",
      },
    });
    const dismissAlert = await clientA.api(`/api/alerts/${alert2.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "DISMISSED" }),
    });
    record("6-Alertas", "dismiss alerta", dismissAlert.status === 200 ? "PASS" : "FAIL", `HTTP ${dismissAlert.status}`);

    // BLOCO 7 — Timeline (API)
    const timeline = await clientA.api("/api/vorcaro/timeline");
    record("7-Timeline", "GET timeline API", timeline.status === 200 ? "PASS" : "FAIL", `HTTP ${timeline.status}`);

    const evolution = await clientA.api("/api/vorcaro/evolution");
    record("7-Timeline", "GET evolution API", evolution.status === 200 ? "PASS" : "FAIL", `HTTP ${evolution.status}`);

    for (const q of [
      "Meu patrimônio cresceu?",
      "Como estava há 90 dias?",
      "O que mudou este mês?",
    ]) {
      const chat = await clientA.api("/api/vorcaro/chat", {
        method: "POST",
        body: JSON.stringify({ message: q }),
      });
      const body = chat.body as { answer?: string; provider?: string };
      record(
        "7-Timeline",
        `chat: ${q}`,
        chat.status === 200 && (body.answer?.length ?? 0) > 5 ? "PASS" : "FAIL",
        `provider=${body.provider}`,
      );
    }

    // BLOCO 8 — Follow-ups
    const fu = await prisma.vorcaroFollowUp.create({
      data: {
        userId: userA.userId,
        fingerprint: `HOMOLOG:fu:${Date.now()}`,
        relatedEntityType: "RECEIVABLE",
        relatedEntityId: recvId ?? "rec-fake",
        title: "Follow-up homolog",
        description: "Teste dismiss",
        status: "ACTIVE",
        nextCheckAt: new Date(Date.now() + 86400000),
      },
    });
    const dismissFu = await clientA.api(`/api/vorcaro/followups/${fu.id}/dismiss`, { method: "POST" });
    record("8-Follow-ups", "dismiss manual", dismissFu.status === 200 ? "PASS" : "FAIL", `HTTP ${dismissFu.status}`);

    const fuList = await clientA.api("/api/vorcaro/followups");
    record("8-Follow-ups", "listar follow-ups", fuList.status === 200 ? "PASS" : "FAIL", `HTTP ${fuList.status}`);

    // BLOCO 9 — Vorcaro Chat
    const toolMsgs = [
      ["Como estou financeiramente?", "tool"],
      ["Tenho alertas?", "tool"],
      ["Tenho pendências?", "tool"],
      ["Quais metas estão em risco?", "tool"],
    ] as const;
    for (const [msg, mode] of toolMsgs) {
      const chat = await clientA.api("/api/vorcaro/chat", {
        method: "POST",
        body: JSON.stringify({ message: msg }),
      });
      const body = chat.body as { provider?: string; responseMode?: string; answer?: string };
      const ok =
        chat.status === 200 &&
        body.provider === "deterministic" &&
        body.responseMode === mode &&
        (body.answer?.length ?? 0) > 10;
      record("9-Vorcaro", `tool: ${msg.slice(0, 28)}`, ok ? "PASS" : "FAIL", `mode=${body.responseMode} provider=${body.provider}`);
    }

    const llmMsg = await clientA.api("/api/vorcaro/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Como acelerar meu patrimônio?" }),
    });
    const llmBody = llmMsg.body as { responseMode?: string; provider?: string };
    record(
      "9-Vorcaro",
      "LLM strategic advice",
      llmMsg.status === 200 && llmBody.responseMode === "llm" ? "PASS" : "FAIL",
      `mode=${llmBody.responseMode} provider=${llmBody.provider}`,
    );

    // BLOCO 10 — Execução assistida
    const actionService = buildVorcaroActionProposalService();
    const proposal = await actionService.createProposal({
      userId: userA.userId,
      type: "OPEN_TIMELINE",
      title: "Abrir timeline",
      description: "Proposta homolog",
      payload: { section: "timeline" },
    });
    record("10-Execução", "proposta criada", proposal.status === "PENDING" ? "PASS" : "FAIL", `id=${proposal.id}`);

    const approve = await clientA.api(`/api/vorcaro/actions/${proposal.id}/approve`, { method: "POST" });
    record("10-Execução", "aprovar proposta", approve.status === 200 ? "PASS" : "FAIL", `HTTP ${approve.status}`);

    const execute = await clientA.api(`/api/vorcaro/actions/${proposal.id}/execute`, { method: "POST" });
    const execBody = execute.body as { execution?: { status?: string }; proposal?: { status?: string } };
    const execStatus = execBody.execution?.status ?? execBody.proposal?.status;
    record(
      "10-Execução",
      "executar proposta",
      execute.status === 200 && execStatus === "EXECUTED" ? "PASS" : "FAIL",
      `execution=${execBody.execution?.status} proposal=${execBody.proposal?.status}`,
    );

    const rejectProposal = await actionService.createProposal({
      userId: userA.userId,
      type: "OPEN_ALERT",
      title: "Rejeitar teste",
      description: "Proposta rejeição",
      payload: {},
    });
    const reject = await clientA.api(`/api/vorcaro/actions/${rejectProposal.id}/reject`, { method: "POST" });
    record("10-Execução", "rejeitar proposta", reject.status === 200 ? "PASS" : "FAIL", `HTTP ${reject.status}`);

    const expired = await prisma.vorcaroActionProposal.create({
      data: {
        userId: userA.userId,
        actionType: "OPEN_GOAL",
        title: "Expirada",
        description: "Teste expiração",
        payload: { fingerprint: `exp-${Date.now()}` },
        status: "PENDING",
        expiresAt: new Date(Date.now() - 60000),
      },
    });
    const expiredTry = await clientA.api(`/api/vorcaro/actions/${expired.id}/approve`, { method: "POST" });
    record(
      "10-Execução",
      "proposta expirada",
      expiredTry.status === 409 || expiredTry.status === 400 || expiredTry.status === 410 ? "PASS" : "FAIL",
      `HTTP ${expiredTry.status}`,
    );

    // BLOCO 11 — Telegram
    const tgToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!tgToken) {
      record("11-Telegram", "comandos bot", "SKIP", "TELEGRAM_BOT_TOKEN não configurado");
      record("11-Telegram", "inline buttons", "SKIP", "requer bot real + chat vinculado");
    } else {
      record("11-Telegram", "comandos bot", "MANUAL", "token presente — validar no app Telegram");
      record("11-Telegram", "inline buttons", "MANUAL", "validar callbacks no chat real");
    }

    // BLOCO 13 — IDOR
    await clientB.login(userB.email, "SenhaHomolog123");

    const inboxB = await prisma.financialInbox.create({
      data: {
        userId: userB.userId,
        status: "READY",
        channel: "WEB",
        rawContent: "item B",
      },
    });

    const crossInbox = await clientA.api(`/api/inbox/${inboxB.id}`);
    record("13-Segurança", "inbox cross-tenant", crossInbox.status === 404 ? "PASS" : "FAIL", `HTTP ${crossInbox.status}`);

    if (goalId) {
      const crossGoal = await clientB.api(`/api/planning/goals/${goalId}`, {
        method: "PATCH",
        body: JSON.stringify({ nome: "Hack" }),
      });
      record("13-Segurança", "meta cross-tenant", crossGoal.status === 404 ? "PASS" : "FAIL", `HTTP ${crossGoal.status}`);
    }

    if (recvId) {
      const crossRecv = await clientB.api(`/api/receivables/${recvId}?action=collect`, {
        method: "POST",
        body: JSON.stringify({ amount: 1, accountId: userB.accountId, date: todayIso() }),
      });
      record("13-Segurança", "recebível cross-tenant", crossRecv.status === 404 ? "PASS" : "FAIL", `HTTP ${crossRecv.status}`);
    }

    const crossAlert = await clientB.api(`/api/alerts/${alert.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "DISMISSED" }),
    });
    record("13-Segurança", "alerta cross-tenant", crossAlert.status === 404 ? "PASS" : "FAIL", `HTTP ${crossAlert.status}`);

    const crossFuTarget = await prisma.vorcaroFollowUp.create({
      data: {
        userId: userA.userId,
        fingerprint: `HOMOLOG:cross:${Date.now()}`,
        relatedEntityType: "RECEIVABLE",
        relatedEntityId: recvId ?? "rec-fake",
        title: "Follow-up IDOR",
        description: "Teste cross-tenant",
        status: "ACTIVE",
        nextCheckAt: new Date(Date.now() + 86400000),
      },
    });
    const crossFu = await clientB.api(`/api/vorcaro/followups/${crossFuTarget.id}/dismiss`, { method: "POST" });
    record("13-Segurança", "follow-up cross-tenant", crossFu.status === 404 ? "PASS" : "FAIL", `HTTP ${crossFu.status}`);

    const no403 = results
      .filter((r) => r.block === "13-Segurança")
      .every((r) => !r.detail.includes("HTTP 403"));
    record("13-Segurança", "sem 403 ownership", no403 ? "PASS" : "FAIL", "padrão 404");

    // BLOCO 14 — Performance
    const t1 = await clientA.api("/api/vorcaro/timeline");
    const t2 = await clientA.api("/api/vorcaro/timeline");
    record(
      "14-Performance",
      "timeline repetida",
      t1.status === 200 && t2.status === 200 ? "PASS" : "FAIL",
      `HTTP ${t1.status}/${t2.status}`,
    );

    const e1 = await clientA.api("/api/vorcaro/evolution");
    const e2 = await clientA.api("/api/vorcaro/evolution");
    record(
      "14-Performance",
      "evolution repetida",
      e1.status === 200 && e2.status === 200 ? "PASS" : "FAIL",
      `HTTP ${e1.status}/${e2.status}`,
    );

    // Cleanup transação despesa
    if (expenseId) {
      const del = await clientA.api(`/api/transactions/${expenseId}`, { method: "DELETE" });
      record("2-Lançamentos", "excluir despesa", del.status === 200 ? "PASS" : "FAIL", `HTTP ${del.status}`);
    }

    // BLOCO 12 — UI (placeholder; Playwright complementa)
    record("12-Dashboards", "navegação visual", "MANUAL", "validar via Playwright/browser");

    await prisma.financialInbox.delete({ where: { id: inboxB.id } }).catch(() => undefined);
  } finally {
    await cleanupUser(userA.userId);
    await cleanupUserB(userB.userId);
    await prisma.$disconnect();
  }

  const fails = results.filter((r) => r.status === "FAIL").length;
  const outPath = join(process.cwd(), "scripts", "sprint-14.7-manual-results.json");
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n=== ${results.length} checks | ${fails} FAIL ===`);
  console.log(`Resultados: ${outPath}`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
