import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { prisma } from "../../../lib/prisma";
import crypto from "crypto";

const DEFAULT_MODEL = "gemini-2.5-flash";
const TIMEOUT_MS = 30_000;

interface PredictiveResult {
  anomaliaDetectada: boolean;
  insightText: string;
  severidade: "LOW" | "MEDIUM" | "HIGH";
}

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    anomaliaDetectada: { type: SchemaType.BOOLEAN },
    insightText: { type: SchemaType.STRING },
    severidade: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["LOW", "MEDIUM", "HIGH"],
    },
  },
  required: ["anomaliaDetectada", "insightText", "severidade"],
};

export class PredictiveAnomalyEngine {
  private readonly client: GoogleGenerativeAI;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  }

  /**
   * Executa a análise preditiva sobre as transações recentes de um tenant.
   * Não afeta o frontend de forma síncrona.
   */
  async analyze(userId: string): Promise<PredictiveResult | null> {
    try {
      // 1. Busca histórico (últimas 4 semanas) agredado por categoria para poupar tokens
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const groupedTransactions = await prisma.transaction.groupBy({
        by: ["categoryId"],
        _sum: { amount: true },
        where: {
          userId,
          date: { gte: fourWeeksAgo },
        },
      });

      // Busca os nomes das categorias
      const categoryIds = groupedTransactions.map((g) => g.categoryId).filter((id): id is string => id !== null);
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      });
      const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

      const contextData = groupedTransactions.map((g) => ({
        categoria: g.categoryId ? (categoryMap.get(g.categoryId) || "Desconhecida") : "Sem Categoria",
        totalGasto: g._sum.amount?.toNumber() || 0,
      }));

      // Se não tem dados suficientes, não analisa
      if (contextData.length === 0) {
        return null;
      }

      const promptText = `
Você é um motor de IA preditiva (Assessor Financeiro V2.0).
Aqui está o resumo de gastos das últimas 4 semanas do usuário, agrupado por categoria:
${JSON.stringify(contextData, null, 2)}

Sua missão é identificar se há alguma anomalia grave ou tendência de gasto perigosa.
Gere a resposta usando o JSON schema exigido informando:
1. anomaliaDetectada: true ou false
2. insightText: Uma breve explicação (máx 2 frases) da anomalia, ou elogio caso não haja anomalia.
3. severidade: LOW, MEDIUM ou HIGH.
      `.trim();

      const model = this.client.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      });

      const responsePromise = model.generateContent(promptText);
      
      const result = await Promise.race([
        responsePromise,
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Gemini timeout")), TIMEOUT_MS))
      ]);

      const text = result.response.text();
      if (!text) throw new Error("Empty response from AI");

      const parsed = JSON.parse(text) as PredictiveResult;

      // 2. Se for uma anomalia média/alta, registra um Alerta Preditivo no banco
      if (parsed.anomaliaDetectada && (parsed.severidade === "HIGH" || parsed.severidade === "MEDIUM")) {
        const severityPrisma = parsed.severidade === "HIGH" ? "CRITICAL" : "WARNING";
        
        const fingerprint = crypto.createHash("md5").update(`anomaly_${userId}_${new Date().toISOString().split("T")[0]}`).digest("hex");

        await prisma.financialAlert.upsert({
          where: {
            userId_fingerprint: {
              userId,
              fingerprint
            }
          },
          update: {
            title: "Anomalia de Gastos Detectada",
            description: parsed.insightText,
            severity: severityPrisma,
          },
          create: {
            userId,
            fingerprint,
            type: "CASHFLOW_WARNING",
            severity: severityPrisma,
            title: "Anomalia de Gastos Detectada (IA)",
            description: parsed.insightText,
            status: "OPEN",
          }
        });
        
        // Notification (Telegram/Dashboard) could be dispatched here or by DB trigger
      }

      return parsed;

    } catch (error) {
      console.error("[PredictiveAnomalyEngine] Error analyzing data:", error);
      return null;
    }
  }
}
