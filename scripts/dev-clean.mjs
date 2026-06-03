#!/usr/bin/env node
/**
 * Limpa cache `.next`, para processos locais do dev:all e sobe o ambiente novamente.
 * Uso: npm run dev:clean
 */
import { spawn } from "node:child_process";
import {
  PORTS,
  PROJECT_ROOT,
  cleanNextBuildCache,
  isPortOpen,
  loadEnv,
  maskSecrets,
  onedrivePause,
  sleep,
  stopManagedPids,
  waitForPortClosed,
} from "./lib/dev-env.mjs";

async function main() {
  loadEnv();

  console.log("VORCARO — dev:clean\n");
  console.log("Parando processos locais gerenciados…");
  await stopManagedPids();
  await waitForPortClosed(PORTS.next);
  await waitForPortClosed(PORTS.ngrokApi, "127.0.0.1", 8000);

  if (await isPortOpen(PORTS.next)) {
    console.warn(
      "  Aviso: porta 3000 ainda em uso (processo externo ao dev:all). Next pode falhar ao subir.",
    );
  }

  await sleep(500);

  const removed = cleanNextBuildCache();
  console.log(removed ? "Pasta .next removida.\n" : "Pasta .next não existia.\n");

  await onedrivePause("após limpar .next");

  console.log("Subindo ambiente (dev:all)…\n");

  const child = spawn(process.execPath, ["scripts/dev-all.mjs"], {
    cwd: PROJECT_ROOT,
    shell: false,
    stdio: "inherit",
    env: process.env,
  });

  child.on("error", (error) => {
    console.error("dev:clean falhou ao iniciar dev:all:", maskSecrets(String(error)));
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.exit(0);
      return;
    }
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error("dev:clean falhou:", maskSecrets(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
