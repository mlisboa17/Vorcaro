/**
 * Sprint 14.7 — validação E2E automatizada (DB + APIs locais).
 * Complementa homologação manual; não substitui blocos UI/Telegram.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { VorcaroIntentEngineService } from "../src/modules/vorcaro/intent/application/services/vorcaro-intent-engine.service";
import { FinancialMemoryQueryService } from "../src/modules/financial-memory/application/services/financial-memory-query.service";
import { VorcaroEntityStateChangedHandlerImpl } from "../src/modules/vorcaro/followups/application/handlers/vorcaro-entity-state-changed.handler.impl";
import { VorcaroFollowUpService } from "../src/modules/vorcaro/followups/application/services/vorcaro-followup.service";
import { PrismaVorcaroFollowUpRepository } from "../src/modules/vorcaro/followups/infrastructure/repositories/prisma-vorcaro-followup.repository";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();

export type E2ECheck = {
  block: string;
  flow: string;
  status: "PASS" | "FAIL" | "SKIP" | "MANUAL";
  detail: string;
};

const results: E2ECheck[] = [];

function record(block: string, flow: string, status: E2ECheck["status"], detail: string) {
  results.push({ block, flow, status, detail });
  const icon = { PASS: "✓", FAIL: "✗", SKIP: "○", MANUAL: "?" }[status];
  console.log(`${icon} [${block}] ${flow}: ${detail}`);
}

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers as Record<string, string>) },
  });
  let body: Record<string, unknown> | null = null;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function main() {
  console.log("=== Sprint 14.7 E2E Validation ===\n");

  // Ambiente
  try {
    const health = await fetch(`${BASE}/api/auth/session`);
    record("0-Ambiente", "dev server", health.ok || health.status === 200 ? "PASS" : "FAIL", `HTTP ${health.status}`);
  } catch {
    record("0-Ambiente", "dev server", "FAIL", "servidor indisponível em " + BASE);
    await prisma.$disconnect();
    process.exit(1);
  }

  const email = `e2e-${Date.now()}@homolog.local`;
  const user = await prisma.user.create({ data: { email, name: "E2E User" } });

  // BLOCO 1
  const forgot = await api("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  record(
    "1-Auth",
    "POST forgot-password",
    forgot.status === 200 ? "PASS" : "FAIL",
    `HTTP ${forgot.status}`,
  );

  const token = forgot.body?.devResetToken as string | undefined;
  if (token) {
    const reset = await api("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password: "novaSenha123" }),
    });
    record("1-Auth", "reset token válido", reset.status === 200 ? "PASS" : "FAIL", `HTTP ${reset.status}`);

    const reuse = await api("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password: "outraSenha123" }),
    });
    record("1-Auth", "token reutilizado", reuse.status === 404 ? "PASS" : "FAIL", `HTTP ${reuse.status}`);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    record("1-Auth", "passwordHash", updated?.passwordHash ? "PASS" : "FAIL", "hash persistido");
  }

  const expiredTok = await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: `expired-${randomBytes(16).toString("hex")}`,
      expiresAt: new Date(Date.now() - 60_000),
    },
  });
  const expiredRes = await api("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token: expiredTok.token, password: "x12345678" }),
  });
  record("1-Auth", "token expirado", expiredRes.status === 404 ? "PASS" : "FAIL", `HTTP ${expiredRes.status}`);

  const invalidEmail = await api("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: "invalid" }),
  });
  record("1-Auth", "e-mail inválido", invalidEmail.status === 400 ? "PASS" : "FAIL", `HTTP ${invalidEmail.status}`);

  record("1-Auth", "cadastro dedicado", "MANUAL", "auto-create via Credentials no primeiro login (sem rota signup)");
  record("1-Auth", "login UI", "MANUAL", "validar em /api/auth/signin com AUTH_DEV_PASSWORD");

  // BLOCO 8 + 13
  const followUp = await prisma.vorcaroFollowUp.create({
    data: {
      userId: user.id,
      fingerprint: `RECEIVABLE:rec-e2e-${Date.now()}:OPEN_RECEIVABLE`,
      relatedEntityType: "RECEIVABLE",
      relatedEntityId: `rec-e2e-${Date.now()}`,
      title: "E2E follow-up",
      description: "teste",
      status: "ACTIVE",
      nextCheckAt: new Date(Date.now() + 86400000),
    },
  });

  const handler = new VorcaroEntityStateChangedHandlerImpl(
    new VorcaroFollowUpService(new PrismaVorcaroFollowUpRepository(prisma)),
  );
  await handler.onEntityStateChanged({
    userId: user.id,
    entityType: "RECEIVABLE",
    entityId: followUp.relatedEntityId!,
    newStatus: "RECEIVED",
  });
  const completed = await prisma.vorcaroFollowUp.findUnique({ where: { id: followUp.id } });
  record(
    "8-Follow-ups",
    "auto-complete RECEIVED",
    completed?.status === "COMPLETED" ? "PASS" : "FAIL",
    `status=${completed?.status}`,
  );

  const dismissNoAuth = await api(`/api/vorcaro/followups/${followUp.id}/dismiss`, { method: "POST" });
  record("13-Segurança", "follow-up sem sessão", dismissNoAuth.status === 401 ? "PASS" : "FAIL", `HTTP ${dismissNoAuth.status}`);

  // BLOCO 9
  const engine = new VorcaroIntentEngineService();
  const cases: Array<[string, string, boolean, string]> = [
    ["Como estou financeiramente?", "STATUS", false, "tool"],
    ["Tenho pendências?", "FOLLOWUPS", false, "tool"],
    ["Quais alertas eu tenho?", "ALERTS", false, "tool"],
    ["Quais metas estão em risco?", "GOALS", false, "tool"],
    ["Como acelerar meu patrimônio?", "STRATEGIC_ADVICE", true, "llm"],
    ["O que você faria no meu lugar?", "STRATEGIC_ADVICE", true, "llm"],
  ];
  for (const [msg, expected, llm, label] of cases) {
    const d = engine.detect(msg);
    const ok = d.primary === expected && d.requiresLlm === llm;
    record("9-Vorcaro", `${label}: ${msg.slice(0, 30)}`, ok ? "PASS" : "FAIL", `${d.primary} llm=${d.requiresLlm}`);
  }

  // BLOCO 14
  let runCount = 0;
  const mem = new FinancialMemoryQueryService(prisma);
  // @ts-expect-error inject mock
  mem.engine = { runForUser: async () => { runCount++; return { userId: user.id, snapshotsRecorded: 0, eventsCreated: 0, achievementsUnlocked: 0, durationMs: 0 }; } };
  await mem.refresh(user.id);
  await mem.refresh(user.id);
  record("14-Performance", "cache refresh 5min", runCount === 1 ? "PASS" : "FAIL", `engine calls=${runCount}`);

  // Manual blocks
  const manualBlocks = [
    ["2-Lançamentos", "CRUD receita/despesa"],
    ["3-Parcelamentos", "grupos e baixas"],
    ["4-Recebíveis", "fluxo completo UI"],
    ["5-Metas", "criar/concluir UI"],
    ["6-Alertas", "resolver/dismiss UI"],
    ["7-Timeline", "perguntas chat com dados reais"],
    ["10-Execução", "Assist→Confirm→Execute UI"],
    ["11-Telegram", "comandos e inline buttons"],
    ["12-Dashboards", "navegação visual"],
  ];
  for (const [block, flow] of manualBlocks) {
    record(block, flow, "MANUAL", "requer validação humana no browser/Telegram");
  }

  await prisma.vorcaroFollowUp.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.$disconnect();

  const fails = results.filter((r) => r.status === "FAIL").length;
  console.log(`\n=== ${results.length} checks | ${fails} FAIL | ${results.filter((r) => r.status === "MANUAL").length} MANUAL ===`);

  const fs = await import("node:fs");
  const path = await import("node:path");
  const outPath = path.join(process.cwd(), "scripts", "sprint-14.7-e2e-results.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log("Resultados em scripts/sprint-14.7-e2e-results.json");

  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
