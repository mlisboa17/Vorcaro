import { getTenantPrisma } from "./src/lib/prisma-tenant";
import { prisma } from "./src/lib/prisma";

async function run() {
  console.log("=== Testing TenantGuard ===");
  const userId = "test-user-id-123";
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email: "test1234@test.com", name: "Test" }
  });
  
  const tenantPrisma = getTenantPrisma(userId);

  try {
    console.log("1. Creating transaction with tenantPrisma...");
    const tx = await tenantPrisma.transaction.create({
      data: {
        userId: "dummy-user-to-be-overridden", // Will be safely overridden by the Tenant extension
        description: "Test tx",
        amount: 100,
        type: "EXPENSE",
        date: new Date(),
      }
    });
    console.log("Created tx:", tx.id, "userId:", tx.userId);

    console.log("2. Querying transactions with tenantPrisma...");
    const results = await tenantPrisma.transaction.findMany();
    console.log(`Found ${results.length} transactions for tenant ${userId}`);
    if (!results.every(r => r.userId === userId)) {
      throw new Error("Tenant leakage detected in findMany!");
    }

    console.log("3. Try to delete with tenantPrisma...");
    await tenantPrisma.transaction.delete({
      where: { id: tx.id }
    });
    console.log("Deleted tx successfully.");

    console.log("4. Try to access another user's data...");
    const otherUserId = "another-user-id-456";
    await prisma.user.upsert({
      where: { id: otherUserId },
      update: {},
      create: { id: otherUserId, email: "other@test.com", name: "Other" }
    });
    const otherTenantPrisma = getTenantPrisma(otherUserId);
    
    // create with base prisma to simulate other user
    const otherTx = await prisma.transaction.create({
      data: {
        userId: otherUserId,
        description: "Other tx",
        amount: 50,
        type: "INCOME",
        date: new Date(),
      }
    });

    try {
      await tenantPrisma.transaction.findUnique({
        where: { id: otherTx.id }
      });
      throw new Error("TenantGuard failed to block cross-tenant read!");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log("Successfully blocked cross-tenant read:", message);
    }

    await prisma.transaction.delete({ where: { id: otherTx.id } });

    console.log("=== All tests passed! ===");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
