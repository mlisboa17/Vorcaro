import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveBankStatement } from "@/lib/bank-parsers/bank-statement-parser-resolver";
import { ImportStatementUseCase } from "@/modules/transactions/application/use-cases/import-statement.use-case";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const accountId = formData.get("accountId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    const fileContent = await file.text();

    let parseResult;
    try {
      parseResult = resolveBankStatement(fileContent);
    } catch (e) {
      console.error("Error parsing bank file:", e);
      return NextResponse.json({ error: "Invalid or corrupted file format" }, { status: 400 });
    }

    if (!parseResult || parseResult.statement.transactions.length === 0) {
      return NextResponse.json({ error: "No transactions found in the file" }, { status: 400 });
    }

    // Pass to UseCase to save safely with deduplication in batch
    const useCase = new ImportStatementUseCase();
    const result = await useCase.execute({
      userId,
      accountId,
      fileName: file.name,
      parsedStatement: parseResult.statement,
    });

    return NextResponse.json({
      success: true,
      message: "Importação concluída com sucesso",
      data: {
        importedCount: result.importedCount,
        ignoredCount: result.ignoredCount,
        importId: result.importId,
      },
    });
  } catch (error: any) {
    console.error("[STATEMENT_IMPORT_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error during import" },
      { status: 500 }
    );
  }
}
