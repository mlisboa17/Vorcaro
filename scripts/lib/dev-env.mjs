import { spawn, execSync } from "node:child_process";
import { createConnection } from "node:net";
import {
  existsSync,
  readFileSync,
  statSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
  rmSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = join(__dirname, "..", "..");
export const DEV_ALL_DIR = join(PROJECT_ROOT, ".dev-all");
export const PID_FILE = join(DEV_ALL_DIR, "pids.json");

export const PORTS = {
  next: 3000,
  postgres: 5433,
  redis: 6380,
  ngrokApi: 4040,
};

const TOKEN_PATTERN = /\d{8,}:[A-Za-z0-9_-]{20,}/g;
const BOT_TOKEN_IN_URL = /bot\d+:[A-Za-z0-9_-]+/gi;

export function maskSecrets(value) {
  if (value == null) return value;
  const text = String(value);
  return text
    .replace(TOKEN_PATTERN, "[REDACTED_TOKEN]")
    .replace(BOT_TOKEN_IN_URL, "bot[REDACTED_TOKEN]");
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pausa entre etapas para pastas no OneDrive (sync de arquivos). Use DEV_ONEDRIVE_PAUSE_MS=0 para desativar. */
export function getOnedrivePauseMs() {
  const raw = process.env.DEV_ONEDRIVE_PAUSE_MS?.trim();
  if (raw === "0" || raw === "false" || raw === "off") return 0;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return 2500;
}

export function isProjectOnOneDrive() {
  return /onedrive/i.test(PROJECT_ROOT);
}

export const MANAGED_PROCESS_LABELS = {
  next: "Next.js",
  worker: "worker da inbox",
  ngrok: "ngrok",
};

/** Remove `.next` — evita erro EINVAL/readlink com sync do OneDrive. */
export function cleanNextBuildCache() {
  const nextDir = join(PROJECT_ROOT, ".next");
  if (!existsSync(nextDir)) return false;
  console.log("  Limpando pasta .next…");
  try {
    rmSync(nextDir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 400,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      [
        `Não foi possível remover .next: ${message}`,
        "Feche o Next.js (npm run dev) e tente novamente.",
        "Se o projeto está no OneDrive, pause a sincronização ou use npm run dev:clean.",
      ].join("\n"),
    );
  }
  return true;
}

export async function waitForNextHttpReady(timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!(await isPortOpen(PORTS.next))) {
      await sleep(500);
      continue;
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(`http://127.0.0.1:${PORTS.next}/`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (response.ok || response.status < 500) return true;
    } catch {
      /* Next ainda compilando ou caiu (ex.: .next corrompido) */
    }
    await sleep(1000);
  }
  return false;
}

export async function onedrivePause(stepLabel) {
  const ms = getOnedrivePauseMs();
  if (ms <= 0) return;
  const seconds = (ms / 1000).toFixed(1);
  if (stepLabel) {
    console.log(`  ⏳ Pausa ${seconds}s (OneDrive): ${stepLabel}`);
  } else {
    console.log(`  ⏳ Pausa ${seconds}s (OneDrive)`);
  }
  await sleep(ms);
}

export function loadEnv() {
  const envLocalPath = join(PROJECT_ROOT, ".env.local");
  const envPath = join(PROJECT_ROOT, ".env");

  const loadFile = (filePath) => {
    if (!existsSync(filePath)) return;
    const content = readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  };

  // Load .env.local first to let local variables override default ones
  loadFile(envLocalPath);
  loadFile(envPath);
}

export function isPortOpen(port, host = "127.0.0.1", timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host });
    const done = (open) => {
      socket.removeAllListeners();
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve(open);
    };
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => done(true));
    socket.on("timeout", () => done(false));
    socket.on("error", () => done(false));
  });
}

export async function waitForPort(port, host = "127.0.0.1", timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port, host)) return true;
    await sleep(500);
  }
  return false;
}

export function isProcessAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function readPidFile() {
  if (!existsSync(PID_FILE)) return {};
  try {
    return JSON.parse(readFileSync(PID_FILE, "utf8"));
  } catch {
    return {};
  }
}

export function writePid(name, pid) {
  mkdirSync(DEV_ALL_DIR, { recursive: true });
  const data = readPidFile();
  data[name] = pid;
  writeFileSync(PID_FILE, JSON.stringify(data, null, 2), "utf8");
}

export function clearPid(name) {
  if (!existsSync(PID_FILE)) return;
  const data = readPidFile();
  delete data[name];
  if (Object.keys(data).length === 0) {
    unlinkSync(PID_FILE);
  } else {
    writeFileSync(PID_FILE, JSON.stringify(data, null, 2), "utf8");
  }
}

/** Encerra árvore de processos no Windows sem shell (evita prompt interativo). */
export function killProcessTree(pid) {
  if (!pid || !isProcessAlive(pid)) return Promise.resolve(true);

  return new Promise((resolve) => {
    if (process.platform === "win32") {
      const killer = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
        shell: false,
        stdio: "ignore",
        windowsHide: true,
      });
      killer.on("close", () => resolve(true));
      killer.on("error", () => resolve(false));
      return;
    }

    try {
      process.kill(pid, "SIGTERM");
    } catch {
      resolve(false);
      return;
    }

    setTimeout(() => {
      try {
        if (isProcessAlive(pid)) process.kill(pid, "SIGKILL");
      } catch {
        /* ignore */
      }
      resolve(true);
    }, 1500);
  });
}

export async function stopChildGracefully(child, label) {
  if (!child || child.exitCode != null) return;

  console.log(`Encerrando ${label}…`);

  try {
    child.kill("SIGTERM");
  } catch {
    /* ignore */
  }

  await sleep(2000);

  if (child.exitCode == null && child.pid && isProcessAlive(child.pid)) {
    await killProcessTree(child.pid);
  }
}

/** Para processos registrados em `.dev-all/pids.json` (criados pelo dev:all). */
export async function stopManagedPids(names = ["next", "worker", "ngrok"]) {
  const pids = readPidFile();

  for (const name of names) {
    const pid = pids[name];
    if (!pid) continue;

    const label = MANAGED_PROCESS_LABELS[name] ?? name;

    if (!isProcessAlive(pid)) {
      clearPid(name);
      continue;
    }

    console.log(`Encerrando ${label}…`);
    await killProcessTree(pid);
    clearPid(name);
    await sleep(300);
  }
}

export async function waitForPortClosed(port, host = "127.0.0.1", timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!(await isPortOpen(port, host))) return true;
    await sleep(400);
  }
  return false;
}

export function runCommand(command, args, options = {}) {
  const { cwd = PROJECT_ROOT, silent = false } = options;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: true,
      stdio: silent ? "ignore" : "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} saiu com código ${code}`));
    });
  });
}

export async function isDockerActive() {
  return new Promise((resolve) => {
    const child = spawn("docker", ["info"], {
      shell: true,
      stdio: "ignore",
    });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

export function needsPrismaGenerate() {
  const clientPath = join(PROJECT_ROOT, "node_modules", ".prisma", "client", "index.js");
  const schemaPath = join(PROJECT_ROOT, "prisma", "schema.prisma");
  if (!existsSync(clientPath)) return true;
  if (!existsSync(schemaPath)) return false;
  return statSync(schemaPath).mtimeMs > statSync(clientPath).mtimeMs;
}

export function findNgrokBinary() {
  try {
    if (process.platform === "win32") {
      execSync("where ngrok", { stdio: "ignore" });
    } else {
      execSync("which ngrok", { stdio: "ignore" });
    }
    return "ngrok";
  } catch {
    return null;
  }
}

export async function fetchNgrokPublicUrl() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch("http://127.0.0.1:4040/api/tunnels", {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return null;
    const data = await response.json();
    const tunnels = data.tunnels ?? [];
    const https =
      tunnels.find((t) => t.public_url?.startsWith("https://")) ??
      tunnels.find((t) => t.public_url);
    const url = https?.public_url;
    return url ? url.replace(/\/$/, "") : null;
  } catch {
    return null;
  }
}

export async function resolveNgrokPublicUrl({ spawnIfMissing = false } = {}) {
  let url = await fetchNgrokPublicUrl();
  if (url) return { url, spawned: false };

  const apiOpen = await isPortOpen(PORTS.ngrokApi);
  if (apiOpen) {
    for (let i = 0; i < 20; i++) {
      url = await fetchNgrokPublicUrl();
      if (url) return { url, spawned: false };
      await sleep(500);
    }
    return { url: null, spawned: false };
  }

  if (!spawnIfMissing) return { url: null, spawned: false };

  const ngrokBin = findNgrokBinary();
  if (!ngrokBin) return { url: null, spawned: false, missingBinary: true };

  const ngrokArgs = ["http", String(PORTS.next)];
  const staticDomain = process.env.NGROK_STATIC_DOMAIN?.trim();
  if (staticDomain) {
    ngrokArgs.push(`--url=${staticDomain}`);
  }

  const child = spawn(ngrokBin, ngrokArgs, {
    cwd: PROJECT_ROOT,
    shell: false,
    stdio: "ignore",
    windowsHide: true,
  });
  if (child.pid) writePid("ngrok", child.pid);
  child.on("exit", () => clearPid("ngrok"));

  const ready = await waitForPort(PORTS.ngrokApi, "127.0.0.1", 30_000);
  if (!ready) return { url: null, spawned: true, child };

  for (let i = 0; i < 40; i++) {
    url = await fetchNgrokPublicUrl();
    if (url) return { url, spawned: true, child };
    await sleep(500);
  }

  return { url: null, spawned: true, child };
}

export async function registerTelegramWebhook(publicBaseUrl) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN não configurado no .env");
  }
  if (!secret) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET não configurado no .env");
  }

  const base = publicBaseUrl.replace(/\/$/, "");
  const webhookUrl = `${base}/api/telegram/webhook`;

  const setResponse = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message"],
      drop_pending_updates: false,
    }),
  });

  const setData = await setResponse.json();
  if (!setData.ok) {
    throw new Error(maskSecrets(setData.description ?? "Falha ao registrar webhook"));
  }

  const [infoResponse, meResponse] = await Promise.all([
    fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`),
    fetch(`https://api.telegram.org/bot${token}/getMe`),
  ]);

  const infoData = await infoResponse.json();
  const meData = await meResponse.json();

  const username = meData.result?.username;
  const info = infoData.result ?? {};

  return {
    botUsername: username ? `@${username}` : "(desconhecido)",
    webhookUrl: info.url || webhookUrl,
    pendingUpdateCount: info.pending_update_count ?? 0,
    lastErrorMessage: info.last_error_message
      ? maskSecrets(info.last_error_message)
      : null,
    ok: Boolean(infoData.ok && meData.ok),
  };
}

export function printWebhookStatus(result) {
  console.log(`  Bot: ${result.botUsername}`);
  console.log(`  Webhook URL: ${result.webhookUrl}`);
  console.log(`  pending_update_count: ${result.pendingUpdateCount}`);
  if (result.lastErrorMessage) {
    console.log(`  last_error_message: ${result.lastErrorMessage}`);
  }
}

export function spawnBackgroundNpm(script, pidName) {
  const pids = readPidFile();
  const existingPid = pids[pidName];
  if (existingPid && isProcessAlive(existingPid)) {
    return { child: null, alreadyRunning: true, pid: existingPid };
  }

  const child = spawn("npm", ["run", script], {
    cwd: PROJECT_ROOT,
    shell: true,
    stdio: "inherit",
    env: process.env,
  });

  if (child.pid) writePid(pidName, child.pid);
  child.on("exit", () => clearPid(pidName));

  return { child, alreadyRunning: false, pid: child.pid };
}
