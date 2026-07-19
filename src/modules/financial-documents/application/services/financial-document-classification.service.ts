import type { PrismaClient } from "@prisma/client";
import { resolveCategoryAlias } from "@/lib/categories/category-aliases";
import { normalizeCategoryName } from "@/lib/categories/category-name-normalizer";
import type { ClassificationResult, ParsedFinancialDocument } from "../../domain/types/financial-document.types";
import { buildPartiesMetadata } from "../../domain/services/financial-parties-metadata.service";
import { normalizeSupplierName } from "../../domain/services/financial-document-parser.service";
import { PrismaFinancialDocumentRepository } from "../../infrastructure/repositories/prisma-financial-document.repository";
import { AiRouterService } from "@/modules/ai/application/services/ai-router.service";
import {
  buildInboxClassificationCategoryContext,
  resolveCategoryIdByNormalizedNames,
  type CategoryTreeRow,
} from "@/lib/categories/inbox-classification-category-context";

export type DocumentClassificationOption = {
  categoryId: string | null;
  subcategoryId: string | null;
  label: string;
  confidence: number;
  source: ClassificationResult["source"] | "ai";
};

export type ClassifyTop3Result = {
  best: ClassificationResult;
  options: DocumentClassificationOption[];
  aiPayeeName: string | null;
};

type AiDocumentClassificationJson = {
  payeeName?: string | null;
  candidates?: Array<{
    categoriaPrincipal: string;
    subcategoria?: string | null;
    confidence?: number;
  }>;
};

export class FinancialDocumentClassificationService {
  private readonly repo: PrismaFinancialDocumentRepository;
  private readonly aiRouter: AiRouterService;

  constructor(
    private readonly prisma: PrismaClient,
    aiRouter: AiRouterService = new AiRouterService(),
  ) {
    this.repo = new PrismaFinancialDocumentRepository(prisma);
    this.aiRouter = aiRouter;
  }

  async classify(userId: string, parsed: ParsedFinancialDocument): Promise<ClassificationResult> {
    const { fields, method } = parsed;
    const parties = buildPartiesMetadata(fields);
    const normalizedName = normalizeSupplierName(
      fields.supplier ?? fields.payeeName ?? parties.receiverName ?? parties.payerName,
    );

    if (fields.pixKey || parties.pixKey) {
      const learned = await this.repo.findLearningPattern(userId, {
        method,
        pixKey: (fields.pixKey ?? parties.pixKey)!.trim().toLowerCase(),
      });
      if (learned?.categoryId) {
        return {
          categoryId: learned.categoryId,
          subcategoryId: learned.subcategoryId,
          confidence: 96,
          isLearnedPattern: true,
          source: "learned_pix_key",
        };
      }
    }

    const documentCandidates = [
      parties.receiverDocument,
      parties.payerDocument,
      fields.documentNumber,
      fields.cpfCnpj,
    ]
      .map((value) => value?.replace(/\D/g, ""))
      .filter(Boolean) as string[];

    for (const documentNumber of documentCandidates) {
      const learned = await this.repo.findLearningPattern(userId, {
        method,
        documentNumber,
      });
      if (learned?.categoryId) {
        return {
          categoryId: learned.categoryId,
          subcategoryId: learned.subcategoryId,
          confidence: 95,
          isLearnedPattern: true,
          source: "learned_document_number",
        };
      }
    }

    const nameCandidates = [
      parties.receiverName,
      parties.payerName,
      fields.supplier,
      fields.payeeName,
    ]
      .map((value) => normalizeSupplierName(value))
      .filter(Boolean);

    for (const candidateName of nameCandidates) {
      const learned = await this.repo.findLearningPattern(userId, {
        method,
        normalizedName: candidateName,
      });
      if (learned?.categoryId) {
        return {
          categoryId: learned.categoryId,
          subcategoryId: learned.subcategoryId,
          confidence: 94,
          isLearnedPattern: true,
          source: "learned_name",
        };
      }
    }

    const userRule = await this.matchUserRule(userId, parsed);
    if (userRule) return userRule;

    const systemRule = await this.matchSystemRule(userId, parsed);
    if (systemRule) return systemRule;

    const taxonomy = await this.matchDefaultTaxonomy(userId, parsed);
    if (taxonomy) return taxonomy;

    return {
      categoryId: null,
      subcategoryId: null,
      confidence: 40,
      isLearnedPattern: false,
      source: "pending",
    };
  }

  private async matchUserRule(
    userId: string,
    parsed: ParsedFinancialDocument,
  ): Promise<ClassificationResult | null> {
    const rules = await this.prisma.userRule.findMany({
      where: { userId, isActive: true },
      orderBy: { priority: "desc" },
      take: 50,
    });

    const haystack = [
      parsed.fields.supplier,
      parsed.fields.description,
      parsed.fields.pixKey,
      parsed.fields.bank,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    for (const rule of rules) {
      const condition = rule.condition as { field?: string; contains?: string };
      const needle = condition.contains?.toLowerCase();
      if (needle && haystack.includes(needle)) {
        const action = rule.action as { categoryId?: string; subcategoryId?: string };
        if (action.categoryId) {
          return {
            categoryId: action.categoryId,
            subcategoryId: action.subcategoryId ?? null,
            confidence: 88,
            isLearnedPattern: false,
            source: "user_rule",
          };
        }
      }
    }
    return null;
  }

  private async matchSystemRule(
    userId: string,
    parsed: ParsedFinancialDocument,
  ): Promise<ClassificationResult | null> {
    const supplier = normalizeSupplierName(parsed.fields.supplier);
    const keywordMap: Record<string, string> = {
      uber: "transporte",
      ifood: "alimentacao",
      posto: "transporte",
      combustivel: "transporte",
      mercado: "alimentacao",
      supermercado: "alimentacao",
    };

    for (const [keyword, alias] of Object.entries(keywordMap)) {
      if (supplier.includes(keyword)) {
        const category = await this.findCategoryByAlias(userId, alias);
        if (category) {
          return {
            categoryId: category.id,
            subcategoryId: null,
            confidence: 72,
            isLearnedPattern: false,
            source: "system_rule",
          };
        }
      }
    }
    return null;
  }

  private async matchDefaultTaxonomy(
    userId: string,
    parsed: ParsedFinancialDocument,
  ): Promise<ClassificationResult | null> {
    if (parsed.method === "PIX" || parsed.method === "TRANSFERENCIA") {
      const category = await this.findCategoryByAlias(userId, "transferencias");
      if (category) {
        return {
          categoryId: category.id,
          subcategoryId: null,
          confidence: 55,
          isLearnedPattern: false,
          source: "default_taxonomy",
        };
      }
    }
    return null;
  }

  private async findCategoryByAlias(userId: string, alias: string) {
    const categories = await this.prisma.category.findMany({
      where: { userId, isActive: true },
      select: { id: true, name: true, parentCategoryId: true },
    });

    const target = resolveCategoryAlias(alias);
    return (
      categories.find((c) => normalizeCategoryName(c.name) === target) ??
      categories.find((c) => normalizeCategoryName(c.name).includes(target)) ??
      null
    );
  }

  /**
   * Classificação com até 3 opções de categoria e identificação de "a quem foi pago"
   * via IA. Usada nos documentos enviados por Telegram/dashboard (fatura, comprovante,
   * recibo) para dar ao usuário escolha rápida em vez de uma única sugestão fixa.
   */
  async classifyTop3(userId: string, parsed: ParsedFinancialDocument): Promise<ClassifyTop3Result> {
    const best = await this.classify(userId, parsed);
    const parties = buildPartiesMetadata(parsed.fields);
    const existingPayeeName = parties.receiverName?.trim() || null;

    const categories = await this.prisma.category.findMany({
      where: { userId, isActive: true },
      select: { id: true, name: true, parentCategoryId: true },
    });

    const label = (categoryId: string | null, subcategoryId: string | null): string => {
      const catId = subcategoryId ?? categoryId;
      const cat = categories.find((c) => c.id === catId);
      if (!cat) return "Sem categoria";
      const parent = cat.parentCategoryId ? categories.find((c) => c.id === cat.parentCategoryId) : null;
      return parent ? `${parent.name} → ${cat.name}` : cat.name;
    };

    const options: DocumentClassificationOption[] = [];
    const seenCategoryKeys = new Set<string>();

    const pushOption = (opt: DocumentClassificationOption) => {
      const key = opt.subcategoryId ?? opt.categoryId ?? opt.label;
      if (!opt.categoryId || seenCategoryKeys.has(key)) return;
      seenCategoryKeys.add(key);
      options.push(opt);
    };

    // Sugestão baseada em regra/histórico com boa confiança entra como opção 1.
    if (best.categoryId && best.confidence >= 70) {
      pushOption({
        categoryId: best.categoryId,
        subcategoryId: best.subcategoryId,
        label: label(best.categoryId, best.subcategoryId),
        confidence: best.confidence,
        source: best.source,
      });
    }

    let aiPayeeName: string | null = null;

    if (options.length < 3) {
      try {
        const text = [
          parsed.fields.description,
          parsed.fields.supplier,
          parsed.fields.payeeName,
          existingPayeeName,
          `Valor: ${parsed.fields.amount ?? "?"}`,
          `Método: ${parsed.method}`,
        ]
          .filter(Boolean)
          .join(" | ");

        const categoryContext = buildInboxClassificationCategoryContext(categories as CategoryTreeRow[]);
        // Faturas de cartão têm várias compras de vários estabelecimentos — não existe
        // "um" beneficiário para identificar, então nem pedimos isso à IA nesse caso.
        const needsPayeeName = !existingPayeeName && parsed.method !== "CARTAO_CREDITO";

        const result = await this.aiRouter.generateJson<AiDocumentClassificationJson>({
          system:
            "Você analisa documentos financeiros (faturas, comprovantes, recibos) e sugere classificação. Responda somente JSON válido, sem texto adicional.",
          prompt: `Dados extraídos do documento: ${text || "(sem descrição legível)"}\n\n${categoryContext}\n\n${
            needsPayeeName
              ? "Identifique também o nome do estabelecimento/pessoa para quem o pagamento foi feito (payeeName) — deve ser um nome curto (até 5 palavras), nunca uma frase ou trecho de texto do documento. Se não houver um nome claro de beneficiário, retorne null. "
              : ""
          }Retorne um JSON com:\n- payeeName: nome do beneficiário do pagamento (ou null se não identificável ou não aplicável)\n- candidates: lista com as 3 categorias mais prováveis, cada uma com categoriaPrincipal, subcategoria e confidence (0-100), da mais para a menos provável. Use nomes exatos da taxonomia.`,
          temperature: 0.1,
        });

        const rawPayeeName = needsPayeeName ? result.data.payeeName?.trim() || null : null;
        // Rejeita respostas que parecem frases/trechos de texto em vez de um nome curto.
        aiPayeeName =
          rawPayeeName && rawPayeeName.length <= 60 && rawPayeeName.split(/\s+/).length <= 6
            ? rawPayeeName
            : null;

        for (const candidate of result.data.candidates ?? []) {
          if (options.length >= 3) break;
          const resolvedId = resolveCategoryIdByNormalizedNames(
            categories as CategoryTreeRow[],
            candidate.categoriaPrincipal,
            candidate.subcategoria,
          );
          if (!resolvedId) continue;
          const cat = categories.find((c) => c.id === resolvedId);
          const isSubcategory = Boolean(cat?.parentCategoryId);
          pushOption({
            categoryId: isSubcategory ? (cat!.parentCategoryId as string) : resolvedId,
            subcategoryId: isSubcategory ? resolvedId : null,
            label: label(isSubcategory ? (cat!.parentCategoryId as string) : resolvedId, isSubcategory ? resolvedId : null),
            confidence: Math.max(0, Math.min(100, Math.round(candidate.confidence ?? 50))),
            source: "ai",
          });
        }
      } catch {
        // IA indisponível: segue apenas com o que já foi resolvido por regra/histórico.
      }
    }

    return { best, options: options.slice(0, 3), aiPayeeName };
  }
}
