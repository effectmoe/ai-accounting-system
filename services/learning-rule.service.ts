import { ObjectId } from 'mongodb';
import { DatabaseService, getCollection } from '@/lib/mongodb-client';
import type {
  LearningRule,
  CreateLearningRuleParams,
  UpdateLearningRuleParams,
  LearningRuleSearchParams,
  MatchCondition,
  RuleMatchResult,
  RuleOutput,
} from '@/types/learning-rule';
import type { Receipt } from '@/types/receipt';

// コレクション名を追加
const LEARNING_RULES_COLLECTION = 'learningRules';

/**
 * 学習ルールサービス
 */
export class LearningRuleService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * 学習ルールを作成
   */
  async create(params: CreateLearningRuleParams): Promise<LearningRule> {
    const rule: Omit<LearningRule, '_id' | 'createdAt' | 'updatedAt'> = {
      name: params.name,
      description: params.description,
      conditions: params.conditions,
      matchMode: params.matchMode,
      outputs: params.outputs,
      priority: params.priority ?? 0,
      enabled: params.enabled ?? true,
      matchCount: 0,
    };

    // DatabaseService.create()はcreatedAt/updatedAtを自動追加する
    const result = await this.db.create<LearningRule>(LEARNING_RULES_COLLECTION, rule);
    return result;
  }

  /**
   * 学習ルールを取得
   */
  async getById(id: string): Promise<LearningRule | null> {
    return this.db.findOne<LearningRule>(LEARNING_RULES_COLLECTION, {
      _id: new ObjectId(id),
    });
  }

  /**
   * 学習ルール一覧を取得
   */
  async search(params: LearningRuleSearchParams = {}): Promise<{
    rules: LearningRule[];
    total: number;
    hasMore: boolean;
  }> {
    const filter: Record<string, unknown> = {};

    if (params.enabled !== undefined) {
      filter.enabled = params.enabled;
    }

    if (params.search) {
      const searchRegex = { $regex: params.search, $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
      ];
    }

    const limit = params.limit ?? 50;
    const skip = params.skip ?? 0;
    const sortBy = params.sortBy ?? 'priority';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;

    const rules = await this.db.find<LearningRule>(LEARNING_RULES_COLLECTION, filter, {
      sort: { [sortBy]: sortOrder },
      limit: limit + 1,
      skip,
    });

    const hasMore = rules.length > limit;
    if (hasMore) rules.pop();

    const total = await this.db.count(LEARNING_RULES_COLLECTION, filter);

    return { rules, total, hasMore };
  }

  /**
   * 学習ルールを更新
   */
  async update(id: string, params: UpdateLearningRuleParams): Promise<LearningRule | null> {
    const updateData: Partial<LearningRule> = {};

    if (params.name !== undefined) updateData.name = params.name;
    if (params.description !== undefined) updateData.description = params.description;
    if (params.conditions !== undefined) updateData.conditions = params.conditions;
    if (params.matchMode !== undefined) updateData.matchMode = params.matchMode;
    if (params.outputs !== undefined) updateData.outputs = params.outputs;
    if (params.priority !== undefined) updateData.priority = params.priority;
    if (params.enabled !== undefined) updateData.enabled = params.enabled;

    // DatabaseService.update()はupdatedAtを自動追加する
    return this.db.update<LearningRule>(LEARNING_RULES_COLLECTION, id, updateData);
  }

  /**
   * 学習ルールを削除
   */
  async delete(id: string): Promise<boolean> {
    return this.db.delete(LEARNING_RULES_COLLECTION, id);
  }

  /**
   * 有効なルールをすべて取得（優先度順）
   */
  async getEnabledRules(): Promise<LearningRule[]> {
    return this.db.find<LearningRule>(
      LEARNING_RULES_COLLECTION,
      { enabled: true },
      { sort: { priority: -1 } }
    );
  }

  /**
   * 条件がマッチするかチェック
   */
  private checkCondition(
    condition: MatchCondition,
    fieldValue: string | undefined
  ): boolean {
    if (!fieldValue) return false;

    const value = condition.caseSensitive
      ? fieldValue
      : fieldValue.toLowerCase();
    const pattern = condition.caseSensitive
      ? condition.value
      : condition.value.toLowerCase();

    switch (condition.operator) {
      case 'contains':
        return value.includes(pattern);
      case 'equals':
        return value === pattern;
      case 'startsWith':
        return value.startsWith(pattern);
      case 'endsWith':
        return value.endsWith(pattern);
      case 'regex':
        try {
          const flags = condition.caseSensitive ? '' : 'i';
          const regex = new RegExp(condition.value, flags);
          return regex.test(fieldValue);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  /**
   * 領収書データからフィールド値を取得
   */
  private getFieldValue(
    receipt: Partial<Receipt>,
    field: MatchCondition['field'],
    ocrText?: string
  ): string | undefined {
    switch (field) {
      case 'issuerName':
        return receipt.issuerName;
      case 'itemName':
        // items[0]のitemNameまたはdescriptionを取得
        if (receipt.items && receipt.items.length > 0) {
          return receipt.items[0].itemName || receipt.items[0].description;
        }
        return undefined;
      case 'subject':
        return receipt.subject;
      case 'title':
        return receipt.title;
      case 'ocrText':
        return ocrText;
      default:
        return undefined;
    }
  }

  /**
   * ルールが領収書にマッチするかチェック
   */
  matchRule(
    rule: LearningRule,
    receipt: Partial<Receipt>,
    ocrText?: string
  ): boolean {
    if (!rule.enabled) return false;

    const results = rule.conditions.map((condition) => {
      const fieldValue = this.getFieldValue(receipt, condition.field, ocrText);
      return this.checkCondition(condition, fieldValue);
    });

    if (rule.matchMode === 'all') {
      return results.every((r) => r);
    } else {
      return results.some((r) => r);
    }
  }

  /**
   * 領収書に対してマッチするルールを検索
   */
  async findMatchingRule(
    receipt: Partial<Receipt>,
    ocrText?: string
  ): Promise<RuleMatchResult> {
    const rules = await this.getEnabledRules();

    for (const rule of rules) {
      if (this.matchRule(rule, receipt, ocrText)) {
        // マッチカウントを更新（$incを使用するため直接コレクションを操作）
        try {
          const collection = await getCollection<LearningRule>(LEARNING_RULES_COLLECTION);
          await collection.updateOne(
            { _id: rule._id },
            {
              $inc: { matchCount: 1 },
              $set: { lastMatchedAt: new Date() },
            }
          );
        } catch (error) {
          // マッチカウント更新失敗はログだけ出力して続行
          console.error('Failed to update match count:', error);
        }

        return {
          matched: true,
          rule,
          outputs: rule.outputs,
          confidence: 1.0,
        };
      }
    }

    return {
      matched: false,
      confidence: 0,
    };
  }

  /**
   * 領収書にルールの出力を適用
   */
  applyRuleOutputs(
    receipt: Partial<Receipt>,
    outputs: RuleOutput
  ): Partial<Receipt> {
    const updated = { ...receipt };

    if (outputs.subject) {
      updated.subject = outputs.subject;
    }
    if (outputs.accountCategory) {
      updated.accountCategory = outputs.accountCategory;
    }
    if (outputs.title) {
      updated.title = outputs.title;
    }

    return updated;
  }
}

// シングルトンインスタンス
let instance: LearningRuleService | null = null;

export function getLearningRuleService(): LearningRuleService {
  if (!instance) {
    instance = new LearningRuleService();
  }
  return instance;
}
