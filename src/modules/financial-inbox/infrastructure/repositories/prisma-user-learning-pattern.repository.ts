import type { Prisma, PrismaClient } from "@prisma/client";
import {
  parseLearningInputSignal,
  parseLearningOutputSignal,
} from "../../domain/schemas/user-rule.schema";
import type {
  RecordLearningPatternInput,
  UserLearningPatternManagementRecord,
  UserLearningPatternRecord,
  UserLearningPatternRepositoryPort,
} from "../../domain/ports/user-learning-pattern-repository.port";

function toPatternRecord(pattern: {
  id: string;
  patternType: string;
  inputSignal: unknown;
  outputSignal: unknown;
  confidence: number;
  occurrences: number;
}): UserLearningPatternRecord | null {
  const inputSignal = parseLearningInputSignal(pattern.inputSignal);
  const outputSignal = parseLearningOutputSignal(pattern.outputSignal);

  if (!inputSignal || !outputSignal) {
    return null;
  }

  return {
    id: pattern.id,
    patternType: pattern.patternType,
    inputSignal,
    outputSignal,
    confidence: pattern.confidence,
    occurrences: pattern.occurrences,
  };
}

function toPatternManagementRecord(pattern: {
  id: string;
  patternType: string;
  inputSignal: unknown;
  outputSignal: unknown;
  confidence: number;
  occurrences: number;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): UserLearningPatternManagementRecord | null {
  const base = toPatternRecord(pattern);

  if (!base) {
    return null;
  }

  return {
    ...base,
    lastSeenAt: pattern.lastSeenAt,
    createdAt: pattern.createdAt,
    updatedAt: pattern.updatedAt,
  };
}

export class PrismaUserLearningPatternRepository implements UserLearningPatternRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  async findByUserId(userId: string): Promise<UserLearningPatternRecord[]> {
    const patterns = await this.db.userLearningPattern.findMany({
      where: { userId },
      orderBy: [{ confidence: "desc" }, { occurrences: "desc" }],
    });

    return patterns
      .map((pattern) => toPatternRecord(pattern))
      .filter((pattern): pattern is UserLearningPatternRecord => pattern !== null);
  }

  async findAllByUserId(userId: string): Promise<UserLearningPatternManagementRecord[]> {
    const patterns = await this.db.userLearningPattern.findMany({
      where: { userId },
      orderBy: [{ occurrences: "desc" }, { lastSeenAt: "desc" }],
    });

    return patterns
      .map((pattern) => toPatternManagementRecord(pattern))
      .filter((pattern): pattern is UserLearningPatternManagementRecord => pattern !== null);
  }

  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<UserLearningPatternManagementRecord | null> {
    const pattern = await this.db.userLearningPattern.findFirst({
      where: { id, userId },
    });

    return pattern ? toPatternManagementRecord(pattern) : null;
  }

  async recordOrIncrement(input: RecordLearningPatternInput): Promise<void> {
    const keyword = input.inputSignal.keyword.toLowerCase();

    const existingPatterns = await this.db.userLearningPattern.findMany({
      where: { userId: input.userId, patternType: input.patternType },
    });

    const existing = existingPatterns.find((pattern) => {
      const signal = parseLearningInputSignal(pattern.inputSignal);
      return signal?.keyword.toLowerCase() === keyword;
    });

    if (existing) {
      const newOccurrences = existing.occurrences + 1;
      const newConfidence =
        (existing.confidence * existing.occurrences + 1.0) / newOccurrences;

      await this.db.userLearningPattern.update({
        where: { id: existing.id },
        data: {
          outputSignal: input.outputSignal as unknown as Prisma.InputJsonValue,
          occurrences: newOccurrences,
          confidence: newConfidence,
          lastSeenAt: new Date(),
        },
      });

      return;
    }

    await this.db.userLearningPattern.create({
      data: {
        userId: input.userId,
        patternType: input.patternType,
        inputSignal: input.inputSignal as unknown as Prisma.InputJsonValue,
        outputSignal: input.outputSignal as unknown as Prisma.InputJsonValue,
        confidence: 1.0,
        occurrences: 1,
        lastSeenAt: new Date(),
      },
    });
  }

  async deleteById(id: string, userId: string): Promise<boolean> {
    const existing = await this.db.userLearningPattern.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      return false;
    }

    await this.db.userLearningPattern.delete({ where: { id } });
    return true;
  }

  async deleteByKeyword(userId: string, keyword: string): Promise<number> {
    const normalizedKeyword = keyword.toLowerCase();
    const patterns = await this.db.userLearningPattern.findMany({
      where: { userId },
      select: { id: true, inputSignal: true },
    });

    const idsToDelete = patterns
      .filter((pattern) => {
        const signal = parseLearningInputSignal(pattern.inputSignal);
        return signal?.keyword.toLowerCase() === normalizedKeyword;
      })
      .map((pattern) => pattern.id);

    if (idsToDelete.length === 0) {
      return 0;
    }

    const result = await this.db.userLearningPattern.deleteMany({
      where: { id: { in: idsToDelete }, userId },
    });

    return result.count;
  }
}
