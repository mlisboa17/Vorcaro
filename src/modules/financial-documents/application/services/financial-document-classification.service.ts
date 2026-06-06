import type { PrismaClient } from "@prisma/client";
import { resolveCategoryAlias } from "@/lib/categories/category-aliases";
import { normalizeCategoryName } from "@/lib/categories/category-name-normalizer";
import type { ClassificationResult, ParsedFinancialDocument } from "../../domain/types/financial-document.types";
import { buildPartiesMetadata } from "../../domain/services/financial-parties-metadata.service";
import { normalizeSupplierName } from "../../domain/services/financial-document-parser.service";
import { PrismaFinancialDocumentRepository } from "../../infrastructure/repositories/prisma-financial-document.repository";

export class FinancialDocumentClassificationService {
  private readonly repo: PrismaFinancialDocumentRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new PrismaFinancialDocumentRepository(prisma);
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
}
