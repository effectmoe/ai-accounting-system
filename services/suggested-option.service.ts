import { ObjectId } from 'mongodb';
import { DatabaseService, Collections } from '@/lib/mongodb-client';
import { logger } from '@/lib/logger';
import {
  SuggestedOption,
  CreateSuggestedOptionRequest,
  UpdateSuggestedOptionRequest,
  SuggestedOptionsListResponse,
  ReorderSuggestedOptionsRequest,
  SuggestedOptionFilter
} from '@/types/suggested-option';

export class SuggestedOptionService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * おすすめオプション一覧取得
   */
  async getSuggestedOptions(options?: {
    isActive?: boolean;
    limit?: number;
    skip?: number;
    sortBy?: 'displayOrder' | 'createdAt' | 'title';
    sortOrder?: 'asc' | 'desc';
  }): Promise<SuggestedOptionsListResponse> {
    try {
      logger.debug('[SuggestedOptionService] Getting suggested options', options);

      const filter: any = {};
      if (options?.isActive !== undefined) {
        filter.isActive = options.isActive;
      }

      const sortOptions: any = {};
      const sortBy = options?.sortBy || 'displayOrder';
      const sortOrder = options?.sortOrder === 'desc' ? -1 : 1;
      sortOptions[sortBy] = sortOrder;

      // display順がある場合は、それを優先して、次にcreatedAtで並び替え
      if (sortBy === 'displayOrder') {
        sortOptions.createdAt = 1; // 同じdisplayOrderの場合は作成日昇順
      }

      const findOptions: any = {
        sort: sortOptions,
      };

      if (options?.limit) {
        findOptions.limit = options.limit;
      }
      if (options?.skip) {
        findOptions.skip = options.skip;
      }

      const [suggestedOptions, total] = await Promise.all([
        this.db.find<SuggestedOption>(Collections.SUGGESTED_OPTIONS, filter, findOptions),
        this.db.count(Collections.SUGGESTED_OPTIONS, filter)
      ]);

      logger.debug(`[SuggestedOptionService] Found ${suggestedOptions.length} suggested options`);

      return {
        suggestedOptions,
        total
      };
    } catch (error) {
      logger.error('[SuggestedOptionService] Error getting suggested options:', error);
      throw error;
    }
  }

  /**
   * 見積金額に基づいてフィルタリングされたおすすめオプション取得
   */
  async getSuggestedOptionsForQuote(filter: SuggestedOptionFilter): Promise<SuggestedOption[]> {
    try {
      logger.debug('[SuggestedOptionService] Getting suggested options for quote', filter);

      const mongoFilter: any = {
        isActive: filter.isActive !== false, // デフォルトはアクティブのみ
      };

      // 金額条件でフィルタ
      const amountConditions: any = {};
      if (filter.amount > 0) {
        // minAmountが設定されていない、または見積金額がminAmount以上
        amountConditions.$and = [
          {
            $or: [
              { minAmount: { $exists: false } },
              { minAmount: null },
              { minAmount: { $lte: filter.amount } }
            ]
          },
          {
            $or: [
              { maxAmount: { $exists: false } },
              { maxAmount: null },
              { maxAmount: { $gte: filter.amount } }
            ]
          }
        ];
      }

      const finalFilter = {
        ...mongoFilter,
        ...amountConditions
      };

      const options: any = {
        sort: { displayOrder: 1, createdAt: 1 },
      };

      if (filter.limit) {
        options.limit = filter.limit;
      }

      const suggestedOptions = await this.db.find<SuggestedOption>(
        Collections.SUGGESTED_OPTIONS,
        finalFilter,
        options
      );

      logger.debug(`[SuggestedOptionService] Found ${suggestedOptions.length} options for quote amount ${filter.amount}`);

      // price フィールドを日本円表記に変換（数値と文字列の両方に対応）
      const formattedOptions = suggestedOptions.map(option => {
        if (option.price !== undefined && option.price !== null) {
          // 数値または数値文字列を処理
          const priceValue = typeof option.price === 'string' ? parseFloat(option.price) : option.price;
          if (!isNaN(priceValue)) {
            return {
              ...option,
              price: `¥${priceValue.toLocaleString('ja-JP')}`
            };
          }
        }
        return option;
      });

      return formattedOptions;
    } catch (error) {
      logger.error('[SuggestedOptionService] Error getting suggested options for quote:', error);
      throw error;
    }
  }

  /**
   * おすすめオプション詳細取得
   */
  async getSuggestedOptionById(id: string): Promise<SuggestedOption | null> {
    try {
      logger.debug(`[SuggestedOptionService] Getting suggested option by ID: ${id}`);

      if (!ObjectId.isValid(id)) {
        logger.error(`[SuggestedOptionService] Invalid ObjectId: ${id}`);
        return null;
      }

      const suggestedOption = await this.db.findById<SuggestedOption>(
        Collections.SUGGESTED_OPTIONS,
        id
      );

      if (suggestedOption) {
        logger.debug(`[SuggestedOptionService] Found suggested option: ${suggestedOption.title}`);
      } else {
        logger.debug(`[SuggestedOptionService] Suggested option not found with ID: ${id}`);
      }

      return suggestedOption;
    } catch (error) {
      logger.error(`[SuggestedOptionService] Error getting suggested option by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * 複数のIDからおすすめオプション取得
   */
  async getSuggestedOptionsByIds(ids: string[]): Promise<SuggestedOption[]> {
    try {
      logger.debug(`[SuggestedOptionService] Getting suggested options by IDs:`, ids);

      if (!ids || ids.length === 0) {
        return [];
      }

      // 有効なObjectIdのみをフィルタ
      const validIds = ids.filter(id => ObjectId.isValid(id));
      if (validIds.length === 0) {
        logger.warn('[SuggestedOptionService] No valid ObjectIds provided');
        return [];
      }

      const objectIds = validIds.map(id => new ObjectId(id));
      
      const suggestedOptions = await this.db.find<SuggestedOption>(
        Collections.SUGGESTED_OPTIONS,
        { 
          _id: { $in: objectIds },
          isActive: true // アクティブなもののみ
        },
        { sort: { displayOrder: 1, createdAt: 1 } }
      );

      logger.debug(`[SuggestedOptionService] Found ${suggestedOptions.length} suggested options for ${ids.length} IDs`);

      // price フィールドを日本円表記に変換（数値と文字列の両方に対応）
      const formattedOptions = suggestedOptions.map(option => {
        if (option.price !== undefined && option.price !== null) {
          // 数値または数値文字列を処理
          const priceValue = typeof option.price === 'string' ? parseFloat(option.price) : option.price;
          if (!isNaN(priceValue)) {
            return {
              ...option,
              price: `¥${priceValue.toLocaleString('ja-JP')}`
            };
          }
        }
        return option;
      });

      return formattedOptions;
    } catch (error) {
      logger.error(`[SuggestedOptionService] Error getting suggested options by IDs:`, error);
      throw error;
    }
  }

  /**
   * おすすめオプション作成
   */
  async createSuggestedOption(
    data: CreateSuggestedOptionRequest,
    createdBy?: string
  ): Promise<SuggestedOption> {
    try {
      logger.debug('[SuggestedOptionService] Creating suggested option', { title: data.title });

      // displayOrderが指定されていない場合、最大値+1を設定
      let displayOrder = data.displayOrder;
      if (displayOrder === undefined) {
        const options = await this.db.find<SuggestedOption>(
          Collections.SUGGESTED_OPTIONS,
          {},
          { sort: { displayOrder: -1 }, limit: 1 }
        );
        displayOrder = options.length > 0 ? (options[0].displayOrder || 0) + 1 : 1;
      }

      const suggestedOptionData = {
        title: data.title,
        description: data.description,
        price: data.price,
        features: data.features,
        ctaText: data.ctaText,
        ctaUrl: data.ctaUrl,
        isActive: data.isActive !== false, // デフォルトはtrue
        displayOrder,
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        createdBy,
        updatedBy: createdBy,
      };

      const suggestedOption = await this.db.create<SuggestedOption>(
        Collections.SUGGESTED_OPTIONS,
        suggestedOptionData
      );

      logger.debug(`[SuggestedOptionService] Created suggested option: ${suggestedOption.title}`);
      return suggestedOption;
    } catch (error) {
      logger.error('[SuggestedOptionService] Error creating suggested option:', error);
      throw error;
    }
  }

  /**
   * おすすめオプション更新
   */
  async updateSuggestedOption(
    id: string,
    data: UpdateSuggestedOptionRequest,
    updatedBy?: string
  ): Promise<SuggestedOption | null> {
    try {
      logger.debug(`[SuggestedOptionService] Updating suggested option: ${id}`, data);

      if (!ObjectId.isValid(id)) {
        logger.error(`[SuggestedOptionService] Invalid ObjectId: ${id}`);
        return null;
      }

      const updateData = {
        ...data,
        updatedBy,
      };

      const suggestedOption = await this.db.update<SuggestedOption>(
        Collections.SUGGESTED_OPTIONS,
        id,
        updateData
      );

      if (suggestedOption) {
        logger.debug(`[SuggestedOptionService] Updated suggested option: ${suggestedOption.title}`);
      } else {
        logger.debug(`[SuggestedOptionService] Suggested option not found for update: ${id}`);
      }

      return suggestedOption;
    } catch (error) {
      logger.error(`[SuggestedOptionService] Error updating suggested option ${id}:`, error);
      throw error;
    }
  }

  /**
   * おすすめオプション削除
   */
  async deleteSuggestedOption(id: string): Promise<boolean> {
    try {
      logger.debug(`[SuggestedOptionService] Deleting suggested option: ${id}`);

      if (!ObjectId.isValid(id)) {
        logger.error(`[SuggestedOptionService] Invalid ObjectId: ${id}`);
        return false;
      }

      const result = await this.db.delete(Collections.SUGGESTED_OPTIONS, id);

      if (result) {
        logger.debug(`[SuggestedOptionService] Deleted suggested option: ${id}`);
      } else {
        logger.debug(`[SuggestedOptionService] Suggested option not found for deletion: ${id}`);
      }

      return result;
    } catch (error) {
      logger.error(`[SuggestedOptionService] Error deleting suggested option ${id}:`, error);
      throw error;
    }
  }

  /**
   * おすすめオプション並び替え
   */
  async reorderSuggestedOptions(
    data: ReorderSuggestedOptionsRequest,
    updatedBy?: string
  ): Promise<void> {
    try {
      logger.debug('[SuggestedOptionService] Reordering suggested options', data);

      // 並列で全てのアイテムのdisplayOrderを更新
      const updatePromises = data.items.map(item => {
        if (!ObjectId.isValid(item.id)) {
          logger.error(`[SuggestedOptionService] Invalid ObjectId in reorder: ${item.id}`);
          return Promise.resolve(null);
        }

        return this.db.update<SuggestedOption>(
          Collections.SUGGESTED_OPTIONS,
          item.id,
          {
            displayOrder: item.displayOrder,
            updatedBy,
          }
        );
      });

      await Promise.all(updatePromises);

      logger.debug('[SuggestedOptionService] Reordering completed');
    } catch (error) {
      logger.error('[SuggestedOptionService] Error reordering suggested options:', error);
      throw error;
    }
  }

  /**
   * アクティブ状態の切り替え
   */
  async toggleActiveStatus(id: string, updatedBy?: string): Promise<SuggestedOption | null> {
    try {
      logger.debug(`[SuggestedOptionService] Toggling active status: ${id}`);

      const current = await this.getSuggestedOptionById(id);
      if (!current) {
        return null;
      }

      return await this.updateSuggestedOption(
        id,
        { isActive: !current.isActive },
        updatedBy
      );
    } catch (error) {
      logger.error(`[SuggestedOptionService] Error toggling active status ${id}:`, error);
      throw error;
    }
  }
}