import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  formatSeedDefaultUserRulesReport,
  seedDefaultUserRulesForUser,
} from "../src/lib/rules/seed-default-user-rules";

const DEV_EMAIL = process.env.SEED_USER_EMAIL ?? "dev@logos.local";

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: DEV_EMAIL },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new Error(
      `Usuário ${DEV_EMAIL} não encontrado. Execute "npm run db:seed" antes deste script.`,
    );
  }

  console.log(`Pré-alimentando regras padrão para ${user.email} (${user.id})...`);

  const report = await seedDefaultUserRulesForUser(prisma, user.id, {
    ensureTaxonomy: true,
  });

  console.log("");
  console.log(formatSeedDefaultUserRulesReport(report));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
