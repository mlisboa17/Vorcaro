import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

async function main() {
  const sql = readFileSync(
    join(process.cwd(), "prisma/migrations/20260601210000_patrimony_module/migration.sql"),
    "utf8",
  );

  const statements = sql
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(`${statement};`);
      console.log("OK:", statement.slice(0, 60).replace(/\s+/g, " "));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("already exists")) {
        console.log("SKIP (exists):", statement.slice(0, 60).replace(/\s+/g, " "));
        continue;
      }
      throw error;
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
