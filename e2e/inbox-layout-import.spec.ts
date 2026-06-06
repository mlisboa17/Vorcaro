import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { loginPage } from "./helpers/auth";
import {
  cleanupE2ETestUser,
  createE2ETestUser,
  disconnectPrisma,
  getPrisma,
  type E2ETestUser,
} from "./helpers/test-user";

const FIXTURE_V1 = join(
  process.cwd(),
  "tests",
  "fixtures",
  "statement-layout-training",
  "novobanco-extrato-v1.csv",
);
const FIXTURE_V2 = join(
  process.cwd(),
  "tests",
  "fixtures",
  "statement-layout-training",
  "novobanco-extrato-v2-similar.csv",
);

async function importCsvInInbox(
  page: import("@playwright/test").Page,
  user: E2ETestUser,
  fixturePath: string,
) {
  await page.goto("/dashboard/inbox");
  await page.getByRole("button", { name: "Importar Extrato / Fatura" }).click();

  const dialog = page.getByRole("dialog", { name: /Importar extrato/i });
  await dialog.locator("select").nth(1).selectOption({ label: user.accountName });
  await dialog.locator('input[type="file"]').setInputFiles(fixturePath);

  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/inbox/import/preview") && res.status() === 200,
      { timeout: 90_000 },
    ),
    dialog.getByRole("button", { name: "Gerar prévia" }).click(),
  ]);

  await expect(dialog.getByText("Similaridade:")).toBeVisible({ timeout: 15_000 });
  return dialog;
}

test.describe("Caixa Financeira — importação com treinamento", () => {
  let user: E2ETestUser;

  test.beforeEach(async () => {
    user = await createE2ETestUser("inbox-layout");
  });

  test.afterEach(async () => {
    await cleanupE2ETestUser(user.userId);
  });

  test.afterAll(async () => {
    await disconnectPrisma();
  });

  test("fluxo completo: prévia, modelo, NEEDS_REVIEW, confirmação e correções", async ({ page }) => {
    await loginPage(page, user.email, user.password);

    // 1º import — cria modelo
    const dialog1 = await importCsvInInbox(page, user, FIXTURE_V1);
    await expect(dialog1.getByText("Modelo:")).toBeVisible();
    await expect(dialog1.getByText("Precisa revisar").first()).toBeVisible();

    const previewModelId = await page.evaluate(async () => {
      const res = await fetch("/api/import/statement-layouts");
      const data = (await res.json()) as { items: { id: string }[] };
      return data.items[0]?.id ?? null;
    });

    // Corrigir primeira linha NEEDS_REVIEW antes de confirmar
    const firstReviewInput = dialog1.locator("tbody tr.bg-amber-50 input").first();
    if (await firstReviewInput.isVisible()) {
      await firstReviewInput.fill("2026-06-05");
    }
    const descInput = dialog1.locator("tbody tr.bg-amber-50 input").nth(1);
    if (await descInput.isVisible()) {
      await descInput.fill("LANCAMENTO CORRIGIDO E2E");
    }
    const amountInput = dialog1.locator("tbody tr.bg-amber-50 input").nth(2);
    if (await amountInput.isVisible()) {
      await amountInput.fill("12.34");
    }

    const confirmRequest = page.waitForRequest(
      (req) => req.url().includes("/api/inbox/import/confirm") && req.method() === "POST",
    );
    await dialog1.getByRole("button", { name: "Confirmar importação" }).click();
    const req = await confirmRequest;
    const body = JSON.parse(req.postData() ?? "{}") as { layoutModelId?: string; lines?: unknown[] };

    expect(body.layoutModelId).toBeTruthy();
    await expect(dialog1.getByText("Arquivo importado.")).toBeVisible({ timeout: 15_000 });

    const prisma = getPrisma();
    const corrections = await prisma.bankStatementLayoutCorrection.count({
      where: { userId: user.userId },
    });
    expect(corrections).toBeGreaterThan(0);

    // Fechar modal após sucesso
    await dialog1.getByRole("button", { name: "Fechar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // 2º import — reutiliza modelo e mostra similaridade maior
    const dialog2 = await importCsvInInbox(page, user, FIXTURE_V2);
    const similarityText = await dialog2.locator("text=/Similaridade: [\\d.]+%/").textContent();
    const match = similarityText?.match(/([\d.]+)%/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThan(50);

    const models = await prisma.bankStatementLayoutModel.findMany({ where: { userId: user.userId } });
    expect(models.length).toBeGreaterThanOrEqual(1);
    expect(models.some((m) => m.id === previewModelId || m.id === body.layoutModelId)).toBe(true);
  });
});
