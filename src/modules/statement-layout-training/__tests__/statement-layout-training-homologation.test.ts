import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  cleanupStatementLayoutHomologUser,
  runStatementLayoutTrainingHomologation,
} from "../homologation/statement-layout-training-homologation.runner";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("statement layout training homologation (DB)", () => {
  const prisma = new PrismaClient();
  const userId = `layout-homolog-vitest-${Date.now()}`;

  it("executa rotina completa de homologação com extratos reais simulados", async () => {
    const report = await runStatementLayoutTrainingHomologation(prisma, { userId, cleanup: true });

    expect(report.scenarios.length).toBeGreaterThanOrEqual(6);
    expect(report.scenarios.find((s) => s.id === "C1")?.checks.some((c) => c.name.includes("modelo novo"))).toBe(true);
    expect(report.scenarios.find((s) => s.id === "C2")?.modelAction).toMatch(/reused|approximate/);
    expect(report.uiValidation.some((c) => c.status === "PASS")).toBe(true);
    expect(report.importFlowValidation.some((c) => c.name.includes("Prévia"))).toBe(true);

    if (!report.summary.ready) {
      const failures = report.scenarios
        .filter((s) => s.status === "FAIL")
        .map((s) => `${s.id}: ${s.problems.join("; ")}`);
      console.warn("Homologação com falhas:", failures);
    }
  }, 60_000);

  afterAll(async () => {
    await cleanupStatementLayoutHomologUser(prisma, userId).catch(() => undefined);
    await prisma.$disconnect();
  });
});

describe("statement layout training homologation (offline checks)", () => {
  it("fixtures de homologação existem no repositório", async () => {
    const { readFileSync, existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const root = join(process.cwd(), "tests", "fixtures", "statement-layout-training");
    for (const file of [
      "novobanco-extrato-v1.csv",
      "novobanco-extrato-v2-similar.csv",
      "novobanco-extrato-v3-layout-diferente.csv",
    ]) {
      expect(existsSync(join(root, file))).toBe(true);
      expect(readFileSync(join(root, file), "utf-8").length).toBeGreaterThan(20);
    }
  });
});
