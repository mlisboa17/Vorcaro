import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

export const CognitiveTransactionSchema = z.object({
  amount: z.number().describe("O valor absoluto da transação financeiro. Deve ser convertido adequadamente (ex: R$ 89,90 = 89.90, R$ 1.500,00 = 1500). Para Despesas (EXPENSE) sempre use valor negativo (-89.90). Para Receitas (INCOME) use valor positivo (89.90)."),
  date: z.string().describe("A data referenciada na transação no formato ISO8601 (YYYY-MM-DD). Se não fornecida no texto, infira baseado em 'hoje' ou 'ontem', senão retorne a data atual passada no prompt."),
  description: z.string().describe("O nome do estabelecimento, pessoa ou descrição curta/padronizada do evento (ex: 'Mercado Livre', 'Uber', 'Salário')."),
  type: z.enum(["EXPENSE", "INCOME"]).describe("O tipo: EXPENSE se foi um pagamento/gasto/compra, INCOME se foi um recebimento/salário."),
  confidence: z.enum(["HIGH", "LOW"]).describe("Se o texto possui valor explícito e intenção clara, use HIGH. Se estiver incompleto ou confuso, use LOW."),
  isInstallment: z.boolean().describe("true se o texto mencionar parcelamento (ex: 'em 3x', 'parcelado', '1 de 12')."),
  totalInstallments: z.number().optional().describe("A quantidade total de parcelas. Obrigatório se isInstallment for true."),
  currentInstallment: z.number().optional().describe("A parcela atual (se explícita). Ex: '2/5' -> 2. Default para 1 se não mencionado mas for parcelado."),
  origin: z.object({
    name: z.string().describe("Nome limpo de quem originou/enviou o pagamento (remetente). Remova stop-words bancárias."),
    cnpjCpf: z.string().optional().describe("CNPJ ou CPF de quem originou o pagamento (se existir no texto).")
  }).optional().describe("Dados da conta/pessoa de origem (quem pagou)."),
  destination: z.object({
    name: z.string().describe("Nome limpo de quem recebeu o pagamento (beneficiário). Remova stop-words bancárias."),
    cnpjCpf: z.string().optional().describe("CNPJ ou CPF de quem recebeu o pagamento (se existir).")
  }).optional().describe("Dados da conta/pessoa de destino (quem recebeu)."),
});

export type StructuredTransaction = z.infer<typeof CognitiveTransactionSchema>;

export class TransactionExtractorService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || "";
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async extract(input: string | Buffer): Promise<StructuredTransaction> {
    const model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
    
    const currentDate = new Date().toISOString().split('T')[0];
    
    let promptText = typeof input === "string" ? input : input.toString('utf8');

    const systemPrompt = `Você é um extrator financeiro cognitivo de ponta operando no Brasil (pt-BR).
Sua missão é extrair dados de texto sujo (faturas, mensagens soltas) e estruturar rigorosamente em JSON.

REGRAS RÍGIDAS:
1. Retorne APENAS UM JSON válido. Sem markdown, sem backticks.
2. Formato da moeda: '89,90' -> 89.90. '1.500,00' -> 1500. '50 pila' -> 50.
3. Para EXPENSE (despesa), o 'amount' DEVE ser negativo (ex: -89.90). Para INCOME (receita), positivo (ex: 89.90).
4. Data Atual: ${currentDate}. Interprete "ontem", "hoje" usando essa data de referência. Sempre responda no formato YYYY-MM-DD.
5. Se não achar valor ou data claros, não falhe: coloque amount = 0, confidence = "LOW", e preencha a data com ${currentDate}.
6. Para as chaves 'origin' (Origem/Pagador) e 'destination' (Destino/Beneficiário), remova stop-words bancárias do nome (ex: "PIX", "TED", "TRANSFERENCIA", "PAGAMENTO"). Retorne nomes limpos.
7. Estrutura obrigatoriamente exigida:
{
  "amount": number,
  "date": "YYYY-MM-DD",
  "description": "string",
  "type": "EXPENSE" | "INCOME",
  "confidence": "HIGH" | "LOW",
  "isInstallment": boolean,
  "totalInstallments": number (opcional, mas preencha se isInstallment for true),
  "currentInstallment": number (opcional),
  "origin": { "name": "string", "cnpjCpf": "string" } (opcional),
  "destination": { "name": "string", "cnpjCpf": "string" } (opcional)
}`;

    try {
      if (!process.env.GEMINI_API_KEY) {
         throw new Error("GEMINI_API_KEY ausente");
      }

      const promptParts: any[] = [{ text: systemPrompt }];

      if (typeof input === "string") {
        promptParts.push({ text: `Entrada do Usuário: ${input}` });
      } else {
        // Envio do buffer binário (imagem) diretamente pro modelo multimodal
        promptParts.push({
          inlineData: {
            data: input.toString("base64"),
            mimeType: "image/jpeg" // Assumindo jpeg padronizado pelo bot
          }
        });
        promptParts.push({ text: "Analise os dados deste comprovante/recibo/imagem." });
      }

      const result = await model.generateContent(promptParts);

      const rawJson = this.cleanJsonText(result.response.text());
      const parsedData = JSON.parse(rawJson);

      
      // Validação estrita (Zero Any) - O Zod explode se o Schema for descumprido ou campos sumirem
      const validated = CognitiveTransactionSchema.parse(parsedData);

      // Normaliza parcelamento caso o LLM esqueça do default 1
      if (validated.isInstallment && !validated.currentInstallment) {
        validated.currentInstallment = 1;
      }

      // Reforça a regra do sinal (Safety check)
      if (validated.type === "EXPENSE" && validated.amount > 0) {
        validated.amount = -Math.abs(validated.amount);
      } else if (validated.type === "INCOME" && validated.amount < 0) {
        validated.amount = Math.abs(validated.amount);
      }

      return validated;

    } catch (error) {
      console.error("[TransactionExtractorService] Erro na extração cognitiva:", error);
      
      // Fallback gracioso em caso de API Error ou ZodError (Confidence LOW)
      return {
        amount: 0,
        date: currentDate,
        description: typeof input === "string" ? input.substring(0, 50) : "Entrada não textual",
        type: "EXPENSE",
        confidence: "LOW",
        isInstallment: false
      };
    }
  }

  private cleanJsonText(text: string): string {
    let clean = text.trim();
    if (clean.startsWith("```json")) {
      clean = clean.replace(/^```json/, "");
    } else if (clean.startsWith("```")) {
      clean = clean.replace(/^```/, "");
    }
    if (clean.endsWith("```")) {
      clean = clean.replace(/```$/, "");
    }
    return clean.trim();
  }
}
