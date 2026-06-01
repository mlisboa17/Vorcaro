import type { RuleAction, RuleCondition } from "../../domain/schemas/user-rule.schema";
import type { UserLearningPatternRepositoryPort } from "../../domain/ports/user-learning-pattern-repository.port";
import type { UserRuleRepositoryPort } from "../../domain/ports/user-rule-repository.port";

export interface ListRulesAndPatternsInput {
  userId: string;
}

export interface ListRulesAndPatternsOutput {
  rules: Awaited<ReturnType<UserRuleRepositoryPort["findAllByUserId"]>>;
  patterns: Awaited<ReturnType<UserLearningPatternRepositoryPort["findAllByUserId"]>>;
}

export class ListRulesAndPatternsUseCase {
  constructor(
    private readonly userRuleRepository: UserRuleRepositoryPort,
    private readonly learningPatternRepository: UserLearningPatternRepositoryPort,
  ) {}

  async execute(input: ListRulesAndPatternsInput): Promise<ListRulesAndPatternsOutput> {
    const [rules, patterns] = await Promise.all([
      this.userRuleRepository.findAllByUserId(input.userId),
      this.learningPatternRepository.findAllByUserId(input.userId),
    ]);

    return { rules, patterns };
  }
}

export interface CreateUserRuleUseCaseInput {
  userId: string;
  name: string;
  description?: string;
  condition: RuleCondition;
  action: RuleAction;
  priority?: number;
}

export class CreateUserRuleUseCase {
  constructor(private readonly userRuleRepository: UserRuleRepositoryPort) {}

  execute(input: CreateUserRuleUseCaseInput) {
    return this.userRuleRepository.create(input);
  }
}

export class DeleteUserRuleUseCase {
  constructor(private readonly userRuleRepository: UserRuleRepositoryPort) {}

  async execute(ruleId: string, userId: string): Promise<boolean> {
    return this.userRuleRepository.deleteById(ruleId, userId);
  }
}

export class ForgetLearningPatternUseCase {
  constructor(private readonly learningPatternRepository: UserLearningPatternRepositoryPort) {}

  async execute(patternId: string, userId: string): Promise<{ deletedCount: number; keyword: string | null }> {
    const pattern = await this.learningPatternRepository.findByIdForUser(patternId, userId);

    if (!pattern) {
      return { deletedCount: 0, keyword: null };
    }

    const keyword = pattern.inputSignal.keyword;
    const deletedCount = await this.learningPatternRepository.deleteByKeyword(userId, keyword);

    return { deletedCount, keyword };
  }
}
