#!/usr/bin/env node
/**
 * Orquestrador do ambiente local VORCARO Finance Control.
 * Uso: npm run dev:all
 */
import { spawn } from "node:child_process";
import {
  DEV_ALL_DIR,
  MANAGED_PROCESS_LABELS,
  PORTS,
  PROJECT_ROOT,
  fetchNgrokPublicUrl,
  findNgrokBinary,
  cleanNextBuildCache,
  clearPid,
  isDockerActive,
  isPortOpen,
  isProcessAlive,
  isProjectOnOneDrive,
  loadEnv,
  maskSecrets,
  needsPrismaGenerate,
  printWebhookStatus,
  readPidFile,
  registerTelegramWebhook,
  resolveNgrokPublicUrl,
  onedrivePause,
  runCommand,
  spawnBackgroundNpm,
  stopChildGracefully,
  waitForPort,
  waitForNextHttpReady,
  writePid,
} from "./lib/dev-env.mjs";
import { mkdirSync } from "node:fs";

const children = [];
let shuttingDown = false;
const status = {
  docker: "—",
  postgres: "—",
  redis: "—",
  prisma: "—",
  next: "—",
  worker: "—",
  ngrok: "—",
  telegram: "—",
};

function trackChild(child, name) {
  if (!child) return;
  children.push({ child, name });
  child.on("exit", () => {
    clearPid(name);
    const idx = children.findIndex((c) => c.child === child);
    if (idx >= 0) children.splice(idx, 1);
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\nEncerrando ambiente local (${signal})…`);

  for (const { child, name } of [...children].reverse()) {
    const label = MANAGED_PROCESS_LABELS[name] ?? name;
    await stopChildGracefully(child, label);
    clearPid(name);
  }

  children.length = 0;
  console.log("Ambiente encerrado com sucesso.");
  process.exit(0);
}

let shutdownHandlersRegistered = false;

function registerShutdownHandlers() {
  if (shutdownHandlersRegistered) return;
  shutdownHandlersRegistered = true;

  const onSignal = (signal) => {
    shutdown(signal).catch((error) => {
      console.error(
        "Erro ao encerrar:",
        maskSecrets(error instanceof Error ? error.message : String(error)),
      );
      process.exit(1);
    });
  };

  process.once("SIGINT", () => onSignal("SIGINT"));
  process.once("SIGTERM", () => onSignal("SIGTERM"));
}

function printFinalSummary(ngrokUrl, telegramResult) {
  console.log("\n══════════════════════════════════════════");
  console.log("  VORCARO DEV ENVIRONMENT");
  console.log("══════════════════════════════════════════\n");
  console.log(`Docker:              ${status.docker}`);
  console.log(`Postgres ${PORTS.postgres}:        ${status.postgres}`);
  console.log(`Redis ${PORTS.redis}:           ${status.redis}`);
  console.log(`Prisma generate:     ${status.prisma}`);
  console.log(`Next.js ${PORTS.next}:          ${status.next}`);
  console.log(`Inbox Worker:        ${status.worker}`);
  console.log(`Ngrok:               ${status.ngrok}`);
  console.log(`Telegram webhook:    ${status.telegram}`);
  if (telegramResult) {
    console.log(`  Bot:                 ${telegramResult.botUsername}`);
    console.log(`  pending updates:     ${telegramResult.pendingUpdateCount}`);
    if (telegramResult.lastErrorMessage) {
      console.log(`  last error:          ${telegramResult.lastErrorMessage}`);
    }
  }
  console.log("\nAcesse:");
  console.log("  http://localhost:3000");
  if (ngrokUrl) {
    console.log(`  ${ngrokUrl}`);
  }
  console.log("\nPressione Ctrl+C para encerrar processos iniciados nesta sessão.\n");
}

async function ensureDocker() {
  const dockerOk = await isDockerActive();
  if (!dockerOk) {
    status.docker = "ERRO — Docker não está em execução";
    console.error(
      [
        "Docker não está disponível.",
        "Inicie o Docker Desktop e execute novamente: npm run dev:all",
      ].join("\n"),
    );
    process.exit(1);
  }

  const postgresUp = await isPortOpen(PORTS.postgres);
  const redisUp = await isPortOpen(PORTS.redis);

  if (!postgresUp || !redisUp) {
    console.log("Subindo docker compose…");
    await runCommand("docker", ["compose", "up", "-d"], { silent: false });
    await onedrivePause("containers iniciando");
    status.docker = "OK (iniciado)";
  } else {
    status.docker = "OK — já em execução";
  }

  const pgReady = await waitForPort(PORTS.postgres);
  const redisReady = await waitForPort(PORTS.redis);

  status.postgres = pgReady ? "OK" : "ERRO — timeout";
  status.redis = redisReady ? "OK" : "ERRO — timeout";

  if (!pgReady || !redisReady) {
    console.error("Postgres ou Redis não ficaram prontos a tempo.");
    process.exit(1);
  }
}

async function ensurePrismaClient() {
  if (!needsPrismaGenerate()) {
    status.prisma = "OK — já gerado";
    return;
  }
  console.log("Executando prisma generate…");
  await runCommand("npx", ["prisma", "generate"], { silent: false });
  await onedrivePause("Prisma Client gerado");
  status.prisma = "OK";
}

async function ensureNextDev() {
  const portOpen = await isPortOpen(PORTS.next);
  if (portOpen) {
    status.next = "OK — já em execução";
    return null;
  }

  if (isProjectOnOneDrive() && process.env.DEV_SKIP_CLEAN_NEXT !== "1") {
    cleanNextBuildCache();
    await onedrivePause("após limpar .next");
  }

  await onedrivePause("antes do Next.js");
  console.log("Iniciando Next.js (npm run dev)…");
  const child = spawn("npm", ["run", "dev"], {
    cwd: PROJECT_ROOT,
    shell: true,
    stdio: "inherit",
    env: process.env,
  });
  trackChild(child, "next");
  if (child.pid) writePid("next", child.pid);

  const ready = await waitForNextHttpReady(120_000);
  status.next = ready ? "OK" : "ERRO — Next não respondeu em http://localhost:3000";
  if (!ready) {
    console.error(
      [
        "Next.js não respondeu a tempo.",
        "Se o projeto está no OneDrive, apague a pasta .next e tente de novo:",
        "  Remove-Item -Recurse -Force .next",
        "  npm run dev",
        "Ou rode: npm run dev:clean",
      ].join("\n"),
    );
    process.exit(1);
  }
  await onedrivePause("Next.js pronto");
  return child;
}

async function ensureInboxWorker() {
  const pids = readPidFile();
  if (pids.worker && isProcessAlive(pids.worker)) {
    status.worker = "OK — já em execução";
    return null;
  }

  await onedrivePause("antes do worker da inbox");
  console.log("Iniciando worker da inbox…");
  const { child, alreadyRunning } = spawnBackgroundNpm("worker:inbox", "worker");
  if (alreadyRunning) {
    status.worker = "OK — já em execução";
    return null;
  }

  trackChild(child, "worker");
  await onedrivePause("worker iniciando");
  status.worker = child ? "OK" : "ERRO";
  return child;
}

async function ensureNgrok() {
  const existing = await fetchNgrokPublicUrl();
  if (existing) {
    status.ngrok = existing;
    return existing;
  }

  const ngrokBin = findNgrokBinary();
  if (!ngrokBin) {
    status.ngrok = "PENDENTE — instale ngrok: https://ngrok.com/download";
    console.warn(
      [
        "ngrok não encontrado no PATH.",
        "Instale: https://ngrok.com/download",
        "Depois execute: npm run telegram:webhook",
      ].join("\n"),
    );
    return null;
  }

  await onedrivePause("antes do ngrok");
  console.log("Iniciando ngrok http 3000…");
  const { url, spawned, missingBinary, child } = await resolveNgrokPublicUrl({
    spawnIfMissing: true,
  });

  if (missingBinary) {
    status.ngrok = "PENDENTE — ngrok não instalado";
    return null;
  }

  if (child) {
    trackChild(child, "ngrok");
  }

  if (url) {
    status.ngrok = url;
    return url;
  }

  status.ngrok = spawned ? "ERRO — sem URL pública" : "ERRO";
  return null;
}

async function ensureTelegramWebhook(ngrokUrl) {
  if (!ngrokUrl) {
    status.telegram = "PULADO — sem URL ngrok";
    return null;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  if (!token || !secret) {
    status.telegram = "PULADO — configure TELEGRAM_BOT_TOKEN e TELEGRAM_WEBHOOK_SECRET no .env";
    console.warn(status.telegram);
    return null;
  }

  try {
    console.log("Registrando webhook Telegram…");
    const result = await registerTelegramWebhook(ngrokUrl);
    status.telegram = "OK";
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    status.telegram = `ERRO — ${maskSecrets(message)}`;
    console.error("Telegram:", maskSecrets(message));
    return null;
  }
}

async function main() {
  registerShutdownHandlers();

  mkdirSync(DEV_ALL_DIR, { recursive: true });
  loadEnv();

  console.log("VORCARO — subindo ambiente local…\n");

  await onedrivePause("início");
  await ensureDocker();
  await onedrivePause("após Docker");
  await ensurePrismaClient();
  await onedrivePause("após Prisma");
  await ensureNextDev();
  await ensureInboxWorker();
  const ngrokUrl = await ensureNgrok();
  await onedrivePause("antes do webhook Telegram");
  const telegramResult = await ensureTelegramWebhook(ngrokUrl);

  printFinalSummary(ngrokUrl, telegramResult);

  if (telegramResult) {
    console.log("Detalhes do webhook:");
    printWebhookStatus(telegramResult);
    console.log("");
  }

  await new Promise(() => {
    /* mantém processos vivos até Ctrl+C */
  });
}

main().catch((error) => {
  console.error("dev:all falhou:", maskSecrets(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
