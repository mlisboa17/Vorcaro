import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const assetValues = [
  "VEHICLE",
  "REAL_ESTATE",
  "INVESTMENT",
  "CONSORTIUM",
  "RECEIVABLE",
  "OTHER",
];

const liabilityValues = ["FINANCING", "LOAN", "CREDIT_LINE", "OTHER"];

async function addEnumValue(typeName, value) {
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "${typeName}" ADD VALUE '${value}'`);
    console.log(`Added ${typeName}.${value}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("already exists")) {
      console.log(`Skip ${typeName}.${value}`);
      return;
    }
    throw error;
  }
}

for (const value of assetValues) {
  await addEnumValue("AssetType", value);
}

for (const value of liabilityValues) {
  await addEnumValue("LiabilityType", value);
}

await prisma.$disconnect();
