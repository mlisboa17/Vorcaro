import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { getTenantPrisma } from "@/lib/prisma-tenant";
import { redirect } from "next/navigation";
import { UnifiedReceiptProcessing } from "@/components/receipts/unified-receipt-processing";

export default async function ReceiptsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const userId = session.user.id;
  const tenantDb = getTenantPrisma(userId);

  // Fetch documents, categories, and accounts in parallel with tenant isolation
  const [documents, categories, accounts] = await Promise.all([
    tenantDb.financialDocument.findMany({
      include: {
        suggestions: {
          select: {
            id: true,
            amount: true,
            date: true,
            description: true,
            supplier: true,
            method: true,
            categoryId: true,
            confidence: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    tenantDb.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    tenantDb.financialAccount.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Map Decimal values to standard number / string to prevent serialization errors
  const formattedDocs = documents.map((doc) => ({
    id: doc.id,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    status: doc.status,
    createdAt: doc.createdAt,
    extractedJson: doc.extractedJson,
    suggestions: doc.suggestions.map((sugg) => ({
      id: sugg.id,
      amount: sugg.amount ? Number(sugg.amount) : null,
      date: sugg.date ? sugg.date.toISOString() : null,
      description: sugg.description,
      supplier: sugg.supplier,
      method: sugg.method,
      categoryId: sugg.categoryId,
      confidence: sugg.confidence,
    })),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
          Central de Processamento de Comprovantes em Lote
        </h1>
        <p className="text-xs text-slate-500">
          Faça upload de comprovantes fiscais, PIX ou TED. O OCR extrai os dados automaticamente para liquidação rápida.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        }
      >
        <UnifiedReceiptProcessing
          initialDocuments={formattedDocs}
          categories={categories}
          accounts={accounts}
        />
      </Suspense>
    </div>
  );
}
