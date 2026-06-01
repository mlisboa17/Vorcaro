import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const items = await prisma.financialInbox.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, status: true, rawContent: true, errorMessage: true },
  });
  console.table(items.map((i) => ({ ...i, rawContent: i.rawContent.slice(0, 40) })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
