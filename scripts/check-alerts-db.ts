import { prisma } from "../src/lib/prisma";

async function main() {
  const open = await prisma.financialAlert.count({ where: { status: "OPEN" } });
  const rows = await prisma.financialAlert.findMany({
    where: { status: "OPEN" },
    select: { fingerprint: true, userId: true, type: true },
  });
  const seen = new Map<string, number>();
  for (const r of rows) {
    const k = `${r.userId}:${r.fingerprint}`;
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  const duplicates = [...seen.entries()].filter(([, c]) => c > 1);
  console.log(JSON.stringify({ openTotal: open, duplicateOpenKeys: duplicates.length, samples: rows.slice(0, 5) }, null, 2));
}

main().finally(() => prisma.$disconnect());
