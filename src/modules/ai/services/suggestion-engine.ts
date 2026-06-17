import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function analyzeRecurringUncategorized(userId: string) {
  try {
    // 1. Fetch uncategorized transactions
    const uncategorized = await prisma.transaction.findMany({
      where: {
        userId,
        categoryId: null,
      },
      select: {
        id: true,
        description: true,
        amount: true,
        type: true,
      }
    });

    if (uncategorized.length === 0) return { success: true, newPatterns: 0 };

    // 2. Aggregate in Node.js memory
    const groups: Record<string, typeof uncategorized> = {};
    for (const tx of uncategorized) {
      // Basic normalization: remove numbers, lowercase, trim
      const norm = tx.description.replace(/[0-9]/g, "").trim().toLowerCase();
      if (!groups[norm]) groups[norm] = [];
      groups[norm].push(tx);
    }

    // 3. Filter groups >= 5 occurrences
    const recurringGroups = Object.entries(groups).filter(([_, txs]) => txs.length >= 5);
    if (recurringGroups.length === 0) return { success: true, newPatterns: 0 };

    // 4. Fetch existing categories to feed LLM context
    const categories = await prisma.category.findMany({
      where: { userId, isActive: true },
      select: { id: true, name: true, type: true }
    });

    let newPatterns = 0;

    // 5. Process each group
    for (const [normDesc, txs] of recurringGroups) {
      // Verify if a pattern already exists (PENDING, APPROVED, or MUTED)
      const existing = await prisma.userLearningPattern.findFirst({
        where: {
          userId,
          patternType: "BULK_CATEGORY",
          inputSignal: { equals: { normalizedDescription: normDesc } }
        }
      });

      if (existing) continue;

      // 6. Call LLM to suggest Category (Structured output simulation)
      let suggestedCategoryName = "Diversos";
      let isNewCategory = false;

      // Safe LLM Call (Fallback if key is missing)
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const categoriesList = categories.map(c => c.name).join(", ");
        
        const prompt = `Analise o estabelecimento/descrição "${txs[0].description}" que apareceu ${txs.length} vezes.
        Com base nas categorias existentes (${categoriesList}), sugira a melhor categoria. 
        Se nenhuma existir, sugira um nome curto para uma nova categoria.
        Responda APENAS um JSON no formato: {"categoryName": "Nome Sugerido", "isNew": boolean}`;

        const response = await model.generateContent(prompt);
        const text = response.response.text();
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanedText);
        
        if (parsed.categoryName) {
           suggestedCategoryName = parsed.categoryName;
           isNewCategory = parsed.isNew || false;
        }
      } catch (err) {
        console.error("[SuggestionEngine] Falha ao consultar Gemini, usando fallback.", err);
        // Fallback: Use capitalized normalized description
        suggestedCategoryName = normDesc.charAt(0).toUpperCase() + normDesc.slice(1).substring(0, 15);
        isNewCategory = true;
      }

      // 7. Save the suggested pattern
      await prisma.userLearningPattern.create({
        data: {
          userId,
          patternType: "BULK_CATEGORY",
          inputSignal: { 
            normalizedDescription: normDesc,
            originalExample: txs[0].description
          },
          outputSignal: {
            suggestedCategoryName,
            isNewCategory,
            transactionIds: txs.map(t => t.id)
          },
          confidence: 0.85,
          occurrences: txs.length,
          status: "PENDING"
        }
      });
      newPatterns++;
    }

    return { success: true, newPatterns };
  } catch (error) {
    console.error("[SuggestionEngine] Error:", error);
    return { success: false, error: "Falha ao processar motor de sugestões" };
  }
}
