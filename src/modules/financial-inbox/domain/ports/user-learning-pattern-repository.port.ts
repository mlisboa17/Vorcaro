import type { LearningInputSignal, LearningOutputSignal } from "../schemas/user-rule.schema";

export interface UserLearningPatternRecord {
  id: string;
  patternType: string;
  inputSignal: LearningInputSignal;
  outputSignal: LearningOutputSignal;
  confidence: number;
  occurrences: number;
}

export interface UserLearningPatternManagementRecord extends UserLearningPatternRecord {
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecordLearningPatternInput {
  userId: string;
  patternType: string;
  inputSignal: LearningInputSignal;
  outputSignal: LearningOutputSignal;
}

export interface UserLearningPatternRepositoryPort {
  findByUserId(userId: string): Promise<UserLearningPatternRecord[]>;
  findAllByUserId(userId: string): Promise<UserLearningPatternManagementRecord[]>;
  recordOrIncrement(input: RecordLearningPatternInput): Promise<void>;
  findByIdForUser(id: string, userId: string): Promise<UserLearningPatternManagementRecord | null>;
  deleteById(id: string, userId: string): Promise<boolean>;
  deleteByKeyword(userId: string, keyword: string): Promise<number>;
}
