import { afterAll, describe, expect, it } from "vitest";
import { join } from "node:path";
import { copyFileSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { PrismaClient } from "@prisma/client";
import {
  cleanupRealBankHomologUser,
  runRealBankHomologation,
} from "../homologation/real-bank/real-bank-homologation.runner";

const prisma = new PrismaClient();

describe("real bank homologation", () => {
  const userId = `real-bank-test-${Date.now()}`;
  const tempRoot = mkdtempSync(join(tmpdir(), "real-bank-homolog-"));

  afterAll(async () => {
    await cleanupRealBankHomologUser(prisma, userId).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("bancos sem formato disponível não quebram o script", async () => {
    mkdirSync(join(tempRoot, "Bradesco_PJ"), { recursive: true });
    writeFileSync(join(tempRoot, "Bradesco_PJ", "README.md"), "# test");

    const report = await runRealBankHomologation(prisma, {
      userId,
      banksRoot: tempRoot,
      cleanup: true,
    });

    expect(report.results.length).toBeGreaterThan(0);
    expect(report.results.every((r) => r.status === "SKIPPED")).toBe(true);
    expect(report.summary.notAvailable).toBeGreaterThan(0);
  });

  it("processa CSV anonimizado quando disponível", async () => {
    const fixture = join(
      process.cwd(),
      "tests",
      "fixtures",
      "statement-layout-training",
      "novobanco-extrato-v1.csv",
    );
    const bankDir = join(tempRoot, "Bradesco_PJ");
    mkdirSync(bankDir, { recursive: true });
    copyFileSync(fixture, join(bankDir, "extrato.csv"));

    const report = await runRealBankHomologation(prisma, {
      userId,
      banksRoot: tempRoot,
      cleanup: false,
    });

    const csvResult = report.results.find(
      (r) => r.bankFolder === "Bradesco_PJ" && r.formatSlot === "CSV",
    );
    expect(csvResult?.availability).toBe("available");
    expect(csvResult?.metrics?.total).toBeGreaterThan(0);
  });
});
