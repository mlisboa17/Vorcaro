import { normalizeCategoryName } from "@/lib/categories/category-name-normalizer";

const REJECTION_PATTERNS = [
  /n[aã]o quero juntar\s+(.+?)\s+com\s+(.+)/i,
  /n[aã]o quero fundir\s+(.+?)\s+com\s+(.+)/i,
  /prefiro manter\s+(.+?)\s+separad/i,
  /deixa\s+(.+?)\s+como est[aá]/i,
];

function rejectionKey(a: string, b: string): string {
  return [normalizeCategoryName(a), normalizeCategoryName(b)].sort().join("|");
}

/** Memória em sessão — sem alteração Prisma (Sprint 14.9.3). */
export class CategoryAuditPreferenceMemoryService {
  private readonly rejected = new Map<string, Set<string>>();

  recordFromMessage(userId: string, message: string): void {
    const trimmed = message.trim();
    for (const pattern of REJECTION_PATTERNS) {
      const match = trimmed.match(pattern);
      if (!match) continue;
      const left = match[1]?.trim();
      const right = match[2]?.trim();
      if (left && right) {
        this.addRejection(userId, left, right);
      } else if (left) {
        this.ensureUser(userId).add(normalizeCategoryName(left));
      }
    }
  }

  recordFromMessages(userId: string, messages: string[]): void {
    for (const message of messages) {
      this.recordFromMessage(userId, message);
    }
  }

  addRejection(userId: string, a: string, b: string): void {
    this.ensureUser(userId).add(rejectionKey(a, b));
  }

  isRejected(userId: string, a: string, b: string): boolean {
    return this.ensureUser(userId).has(rejectionKey(a, b));
  }

  shouldSuppressItem(userId: string, itemLabel: string): boolean {
    const norm = normalizeCategoryName(itemLabel);
    for (const key of this.ensureUser(userId)) {
      if (key.includes(norm)) return true;
    }
    return false;
  }

  listRejections(userId: string): string[] {
    return [...this.ensureUser(userId)];
  }

  private ensureUser(userId: string): Set<string> {
    if (!this.rejected.has(userId)) {
      this.rejected.set(userId, new Set());
    }
    return this.rejected.get(userId)!;
  }
}

export const categoryAuditPreferenceMemory = new CategoryAuditPreferenceMemoryService();
