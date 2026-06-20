import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { enqueuePredictiveAnalysis } from "@/lib/queue";

async function main() {
  console.info("🚀 [Batch] Iniciando o agendamento em lote de Alertas Preditivos (V2)...");

  // Busca usuários ativos ou que tiveram transações recentes (últimos 7 dias)
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);

  const activeUsers = await prisma.transaction.findMany({
    where: {
      date: { gte: lastWeek },
    },
    select: {
      userId: true,
    },
    distinct: ["userId"],
  });

  if (activeUsers.length === 0) {
    console.info("Nenhum usuário ativo com transações recentes para analisar.");
    process.exit(0);
  }

  console.info(`[Batch] Enfileirando análise para ${activeUsers.length} usuários (Isolamento de Tenants Ativado)...`);

  for (const user of activeUsers) {
    await enqueuePredictiveAnalysis({ userId: user.userId });
    console.info(` - Job enfileirado para userId: ${user.userId}`);
  }

  console.info("✅ [Batch] Agendamento em lote concluído com sucesso!");
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Erro fatal rodando o batch preditivo:", error);
  process.exit(1);
});
