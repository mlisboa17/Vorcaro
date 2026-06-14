import { PrismaClient, IdentificationStatus } from "@prisma/client";
import { prisma as db } from "@/lib/prisma";

export interface ExtractedCounterpartyInfo {
  name: string;
  cnpjCpf?: string | null;
}

export interface MatchingResult {
  counterpartyId: string;
  score: number;
  status: IdentificationStatus;
}

export class CounterpartyMatcherService {
  constructor(private prisma: PrismaClient = db) {}

  /**
   * Normaliza uma string de nome removendo termos societários, pontuação e espaços duplos.
   * Exemplo: "POSTO IPIRANGA LTDA." -> "POSTO IPIRANGA"
   */
  public normalizeName(name: string): string {
    let normalized = name.toUpperCase();
    
    // Remove pontuação básica
    normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");
    
    // Remove sufixos societários comuns no Brasil
    const suffixes = [" LTDA", " S A", " SA", " ME", " EPP", " S/A", " S.A.", " EI", " EIRELI", " INC", " INC."];
    for (const suffix of suffixes) {
      if (normalized.endsWith(suffix)) {
        normalized = normalized.substring(0, normalized.length - suffix.length);
      }
    }
    
    // Remove stop-words iniciais (caso o Gemini não tenha removido perfeitamente)
    const prefixes = ["PIX ", "TED ", "DOC ", "PAGAMENTO ", "TRANSF "];
    for (const prefix of prefixes) {
      if (normalized.startsWith(prefix)) {
        normalized = normalized.substring(prefix.length);
      }
    }

    // Remove múltiplos espaços e trima
    return normalized.replace(/\s+/g, " ").trim();
  }

  /**
   * Remove pontuação de CNPJ/CPF
   */
  public normalizeDocument(doc?: string | null): string | undefined {
    if (!doc) return undefined;
    const clean = doc.replace(/\D/g, "");
    return clean.length > 0 ? clean : undefined;
  }

  /**
   * Identifica a Direção do Fluxo (INCOME ou EXPENSE).
   * Se o CNPJ/CPF do Destino der match com a conta PJ do próprio Tenant, a transação é marcada como INCOME.
   * Caso contrário, é EXPENSE.
   */
  public async evaluateDirection(userId: string, destinationDoc?: string | null): Promise<"INCOME" | "EXPENSE"> {
    const doc = this.normalizeDocument(destinationDoc);
    if (!doc) return "EXPENSE"; // Padrão: Se for para terceiro desconhecido, é saída

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { cnpjCpf: true }
    });

    const userDoc = this.normalizeDocument(user?.cnpjCpf);
    
    // Se o destino tem o mesmo CNPJ do Tenant logado, então o Tenant está RECEBENDO (Entrada)
    if (userDoc && doc === userDoc) {
      return "INCOME";
    }

    // Caso contrário, é Saída
    return "EXPENSE";
  }

  /**
   * Realiza o matching da contraparte seguindo as regras de prioridade.
   */
  public async match(userId: string, info: ExtractedCounterpartyInfo): Promise<MatchingResult> {
    const doc = this.normalizeDocument(info.cnpjCpf);
    const normalizedName = this.normalizeName(info.name);

    // 1. Prioridade Máxima: Match Exato por CNPJ/CPF (Score 100)
    if (doc) {
      const byDoc = await this.prisma.counterparty.findFirst({
        where: { userId, cnpjCpf: doc },
      });

      if (byDoc) {
        return {
          counterpartyId: byDoc.id,
          score: 100,
          status: "CONFIRMED",
        };
      }
    }

    // 2. Segunda Opção: Match Exato por Nome Normalizado (Score 95)
    const byName = await this.prisma.counterparty.findFirst({
      where: { userId, name: normalizedName },
    });

    if (byName) {
      return {
        counterpartyId: byName.id,
        score: 95,
        status: "CONFIRMED",
      };
    }

    // 3. Terceira Opção: Match nos Aliases (Score 85)
    const byAlias = await this.prisma.counterpartyAlias.findFirst({
      where: { 
        alias: normalizedName,
        counterparty: { userId } // Isolamento de tenant na junção
      },
      include: { counterparty: true }
    });

    if (byAlias) {
      return {
        counterpartyId: byAlias.counterparty.id,
        score: 85,
        status: "INFERRED",
      };
    }

    // 4. Fallback (Aprendizado / Criação): Nenhuma match encontrada.
    // Cria uma nova Counterparty
    const newCounterparty = await this.prisma.counterparty.create({
      data: {
        userId,
        name: normalizedName,
        cnpjCpf: doc,
      },
    });

    // Se o nome original for diferente do normalizado, aprende automaticamente o alias
    const rawNameUpper = info.name.toUpperCase().trim();
    if (rawNameUpper !== normalizedName) {
      // Ignorar se houver erro de constraint de alias duplicado em concorrência
      await this.prisma.counterpartyAlias.create({
        data: {
          counterpartyId: newCounterparty.id,
          alias: rawNameUpper,
        }
      }).catch(() => {});
    }

    return {
      counterpartyId: newCounterparty.id,
      score: 100, // Criou agora baseada nestes dados
      status: "CONFIRMED",
    };
  }
}
