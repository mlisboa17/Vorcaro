/**
 * Valida list/summary/patch/bulk do serviço de alertas (sem HTTP/sessão).
 * Uso: npx tsx scripts/validate-alerts-api.ts [userId]
 */
import { prisma } from "../src/lib/prisma";
import { FinancialAlertQueryService } from "../src/modules/financial-alerts/application/services/financial-alert-query.service";

async function main() {
  const userId =
    process.argv[2] ??
    (await prisma.user.findFirst({ select: { id: true } }))?.id;
  if (!userId) {
    console.error("Nenhum usuário no banco.");
    process.exit(1);
  }

  const q = new FinancialAlertQueryService(prisma);
  const list = await q.list(userId, 1, 5, { status: "OPEN" });
  const summary = await q.summary(userId);
  console.log(JSON.stringify({ userId, list: { total: list.total, page: list.page, items: list.items.length }, summary }, null, 2));

  if (list.items[0]) {
    const id = list.items[0].id;
    await q.patch(userId, id, "DISMISSED");
    await q.bulkPatch(userId, [id], "OPEN");
    console.log(JSON.stringify({ patchBulk: "ok", alertId: id }));
  }
}

main().finally(() => prisma.$disconnect());
