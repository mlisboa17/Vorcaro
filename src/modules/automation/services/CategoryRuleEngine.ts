import { prisma } from "@/lib/prisma";

export class CategoryRuleEngine {
  /**
   * Camada 1: Heurística Estática
   * Busca todas as regras ativas do usuário e verifica se alguma keyword
   * está contida na descrição da transação (case-insensitive).
   * Se houver match, retorna o targetCategoryId da regra de maior prioridade.
   */
  async execute(description: string, userId: string): Promise<{ categoryId: string; ruleId: string } | null> {
    try {
      if (!description || !userId) return null;

      // Busca regras ativas ordenadas por prioridade descrescente
      const rules = await prisma.transactionRule.findMany({
        where: {
          userId,
          isActive: true,
        },
        orderBy: {
          priority: "desc",
        },
      });

      if (!rules || rules.length === 0) {
        return null; // Sem regras cadastradas para este tenant
      }

      // Proteção contra ReDoS: Truncamos e limpamos repetições absurdas
      const safeDesc = description.slice(0, 200).replace(/(.)\1{10,}/g, '$1');
      const normalizedDesc = safeDesc.toLowerCase();

      // Compilação e Varredura
      for (const rule of rules) {
        let matched = false;
        const isRegex = rule.keyword.startsWith('^') || /[.*+?^${}()|[\]\\]/.test(rule.keyword);

        if (isRegex) {
          try {
            const regex = new RegExp(rule.keyword, 'i');
            matched = regex.test(safeDesc);
          } catch (e) {
            // Fallback para includes
            matched = normalizedDesc.includes(rule.keyword.toLowerCase());
          }
        } else {
          matched = normalizedDesc.includes(rule.keyword.toLowerCase());
        }

        if (matched) {
          return { categoryId: rule.targetCategoryId, ruleId: rule.id };
        }
      }

      return null; // Nenhum match encontrado nesta camada
    } catch (error) {
      console.error("[CategoryRuleEngine] Erro ao executar regras estáticas:", error);
      // Retorna null silenciosamente para atuar apenas como fallback seguro
      return null;
    }
  }

  /**
   * Execução em Lote (Batch)
   * Ideal para grandes volumes de importação (OFX/CSV), evitando N+1 queries.
   * Busca as regras uma única vez e as aplica em memória sobre a lista de transações.
   */
  async executeBatch(
    transactions: Array<{ id: string; description: string }>,
    userId: string
  ): Promise<Record<string, { categoryId: string | null; ruleId: string | null }>> {
    try {
      if (!transactions || transactions.length === 0 || !userId) return {};

      // Busca regras ativas do usuário uma única vez
      const rules = await prisma.transactionRule.findMany({
        where: {
          userId,
          isActive: true,
        },
        orderBy: {
          priority: "desc",
        },
      });

      const resultMap: Record<string, { categoryId: string | null; ruleId: string | null }> = {};

      // Se não há regras, todas retornam null
      if (!rules || rules.length === 0) {
        for (const tx of transactions) {
          resultMap[tx.id] = { categoryId: null, ruleId: null };
        }
        return resultMap;
      }

      // Compila as regras uma única vez para uso em memória (Regex Cache)
      const compiledRules = rules.map(rule => {
        let regex: RegExp | undefined;
        const isRegex = rule.keyword.startsWith('^') || /[.*+?^${}()|[\]\\]/.test(rule.keyword);

        if (isRegex) {
          try {
            regex = new RegExp(rule.keyword, 'i');
          } catch (e) {
            // Ignora falha e segue para fallback
          }
        }

        return {
          categoryId: rule.targetCategoryId,
          ruleId: rule.id,
          keyword: rule.keyword.toLowerCase(),
          regex
        };
      });

      // Processa cada transação em memória contra as regras cacheadas
      for (const tx of transactions) {
        let matchedCategoryId: string | null = null;
        let matchedRuleId: string | null = null;
        
        // Proteção contra ReDoS: Truncamos e limpamos repetições absurdas
        const rawDesc = (tx.description || "").slice(0, 200).replace(/(.)\1{10,}/g, '$1');
        const normalizedDesc = rawDesc.toLowerCase();

        for (const rule of compiledRules) {
          if (rule.regex) {
            if (rule.regex.test(rawDesc)) {
              matchedCategoryId = rule.categoryId;
              matchedRuleId = rule.ruleId;
              break;
            }
          } else {
            if (normalizedDesc.includes(rule.keyword)) {
              matchedCategoryId = rule.categoryId;
              matchedRuleId = rule.ruleId;
              break;
            }
          }
        }
        resultMap[tx.id] = { categoryId: matchedCategoryId, ruleId: matchedRuleId };
      }

      return resultMap;
    } catch (error) {
      console.error("[CategoryRuleEngine] Erro ao executar regras estáticas em lote:", error);
      // Em caso de erro, devolvemos tudo como null para não quebrar a ingestão
      const fallbackMap: Record<string, { categoryId: string | null; ruleId: string | null }> = {};
      for (const tx of transactions) {
        fallbackMap[tx.id] = { categoryId: null, ruleId: null };
      }
      return fallbackMap;
    }
  }
}
