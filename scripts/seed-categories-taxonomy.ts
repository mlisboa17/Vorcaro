import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  formatSeedCategoryTaxonomyReport,
  seedCategoryTaxonomyForUser,
} from "../src/lib/categories/seed-category-taxonomy";

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

  console.log(`Aplicando taxonomia Vorcaro para ${user.email} (${user.id})...`);

  const report = await seedCategoryTaxonomyForUser(prisma, user.id);

  console.log("");
  console.log(formatSeedCategoryTaxonomyReport(report));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
