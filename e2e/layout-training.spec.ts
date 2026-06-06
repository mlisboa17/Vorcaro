import { expect, test } from "@playwright/test";
import { loginPage } from "./helpers/auth";
import { cleanupE2ETestUser, createE2ETestUser, disconnectPrisma, getPrisma, type E2ETestUser } from "./helpers/test-user";
import { runStatementLayoutTrainingHomologation } from "../src/modules/statement-layout-training/homologation/statement-layout-training-homologation.runner";

test.describe("Treinamento de Extratos — UI", () => {
  let user: E2ETestUser;
  let modelId: string;

  test.beforeAll(async () => {
    user = await createE2ETestUser("layout-ui");
    const prisma = getPrisma();
    const report = await runStatementLayoutTrainingHomologation(prisma, {
      userId: user.userId,
      cleanup: true,
    });
    const created = report.scenarios.find((s) => s.id === "C1");
    modelId = created?.modelId ?? "";
    if (!modelId) throw new Error("Modelo não criado na homologação de seed");
  });

  test.afterAll(async () => {
    await cleanupE2ETestUser(user.userId);
    await disconnectPrisma();
  });

  test("página carrega, lista modelos e exibe homologação", async ({ page }) => {
    await loginPage(page, user.email, user.password);
    await page.goto("/dashboard/import/layout-training");

    await expect(page.getByRole("heading", { name: "Treinamento de Extratos" })).toBeVisible();
    const table = page.getByRole("table");
    await expect(table).toContainText("Novo Banco");
    await expect(table).toContainText("CSV");
    await expect(table).toContainText("v1");
    await expect(table.getByText("Ativo")).toBeVisible();

    await expect(page.getByRole("link", { name: "Ver relatório de homologação" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Homologação real" })).toBeVisible();

    const homologSection = page
      .locator("section")
      .filter({ has: page.getByRole("link", { name: "Ver relatório de homologação" }) });
    await expect(homologSection).toContainText(/Merge:|Nenhum relatório de bancos reais ainda/);
  });

  test("ativar/desativar e excluir modelo", async ({ page }) => {
    await loginPage(page, user.email, user.password);
    await page.goto("/dashboard/import/layout-training");

    const row = page.getByRole("row", { name: /Novo Banco/ }).first();
    await expect(row.getByText("Ativo")).toBeVisible();

    await row.getByRole("button", { name: "Desativar" }).click();
    await expect(row.getByText("Inativo")).toBeVisible({ timeout: 10_000 });

    await row.getByRole("button", { name: "Ativar" }).click();
    await expect(row.getByText("Ativo")).toBeVisible({ timeout: 10_000 });

    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByText("Nenhum modelo treinado ainda")).toBeVisible({ timeout: 10_000 });
  });
});
