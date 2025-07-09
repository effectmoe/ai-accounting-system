import { DatabaseService, Collections } from '@/lib/mongodb-client';
import { BankAccount, AccountType } from '@/types/collections';

export class BankAccountService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * 銀行口座を作成
   */
  async createBankAccount(bankAccount: Omit<BankAccount, '_id' | 'createdAt' | 'updatedAt'>): Promise<BankAccount> {
    // デフォルト口座が既にある場合、新しいものをデフォルトにする場合は既存のデフォルトを解除
    if (bankAccount.isDefault) {
      await this.clearDefaultBankAccount();
    }

    // デフォルト値の設定
    const accountWithDefaults = {
      ...bankAccount,
      isActive: bankAccount.isActive ?? true
    };

    return await this.db.create<BankAccount>(Collections.BANK_ACCOUNTS, accountWithDefaults);
  }

  /**
   * 銀行口座をIDで取得
   */
  async getBankAccountById(id: string): Promise<BankAccount | null> {
    return await this.db.findById<BankAccount>(Collections.BANK_ACCOUNTS, id);
  }

  /**
   * デフォルトの銀行口座を取得
   */
  async getDefaultBankAccount(): Promise<BankAccount | null> {
    return await this.db.findOne<BankAccount>(Collections.BANK_ACCOUNTS, { 
      isDefault: true,
      isActive: true 
    });
  }

  /**
   * アクティブな銀行口座をすべて取得
   */
  async getActiveBankAccounts(): Promise<BankAccount[]> {
    return await this.db.find<BankAccount>(Collections.BANK_ACCOUNTS, { isActive: true }, {
      sort: { isDefault: -1, accountName: 1 }
    });
  }

  /**
   * すべての銀行口座を取得
   */
  async getAllBankAccounts(includeInactive: boolean = false): Promise<BankAccount[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return await this.db.find<BankAccount>(Collections.BANK_ACCOUNTS, filter, {
      sort: { isActive: -1, isDefault: -1, accountName: 1 }
    });
  }

  /**
   * 銀行口座を検索
   */
  async searchBankAccounts(params: {
    query?: string;
    bankName?: string;
    accountType?: AccountType;
    isActive?: boolean;
  }): Promise<BankAccount[]> {
    const filter: any = {};

    if (params.query) {
      filter.$or = [
        { accountName: { $regex: params.query, $options: 'i' } },
        { bankName: { $regex: params.query, $options: 'i' } },
        { branchName: { $regex: params.query, $options: 'i' } },
        { accountHolder: { $regex: params.query, $options: 'i' } }
      ];
    }

    if (params.bankName) {
      filter.bankName = params.bankName;
    }

    if (params.accountType) {
      filter.accountType = params.accountType;
    }

    if (params.isActive !== undefined) {
      filter.isActive = params.isActive;
    }

    return await this.db.find<BankAccount>(Collections.BANK_ACCOUNTS, filter, {
      sort: { isDefault: -1, accountName: 1 }
    });
  }

  /**
   * 銀行口座を更新
   */
  async updateBankAccount(id: string, update: Partial<BankAccount>): Promise<BankAccount | null> {
    const { _id, createdAt, updatedAt, ...updateData } = update;

    // デフォルトフラグを更新する場合の処理
    if (updateData.isDefault === true) {
      await this.clearDefaultBankAccount();
    }

    return await this.db.update<BankAccount>(Collections.BANK_ACCOUNTS, id, updateData);
  }

  /**
   * 銀行口座を削除（論理削除）
   */
  async deleteBankAccount(id: string): Promise<boolean> {
    // デフォルト口座は削除できない
    const account = await this.getBankAccountById(id);
    if (account?.isDefault) {
      throw new Error('Cannot delete default bank account');
    }

    const result = await this.db.update<BankAccount>(Collections.BANK_ACCOUNTS, id, {
      isActive: false
    });
    return result !== null;
  }

  /**
   * 銀行口座を物理削除
   */
  async permanentlyDeleteBankAccount(id: string): Promise<boolean> {
    // デフォルト口座は削除できない
    const account = await this.getBankAccountById(id);
    if (account?.isDefault) {
      throw new Error('Cannot delete default bank account');
    }

    return await this.db.delete(Collections.BANK_ACCOUNTS, id);
  }

  /**
   * デフォルトの銀行口座を設定
   */
  async setDefaultBankAccount(id: string): Promise<BankAccount | null> {
    // 現在のデフォルトを解除
    await this.clearDefaultBankAccount();

    // 新しいデフォルトを設定
    return await this.updateBankAccount(id, { isDefault: true, isActive: true });
  }

  /**
   * 現在のデフォルト銀行口座を解除
   */
  private async clearDefaultBankAccount(): Promise<void> {
    const currentDefaults = await this.db.find<BankAccount>(Collections.BANK_ACCOUNTS, { isDefault: true });
    await Promise.all(
      currentDefaults.map(account =>
        this.db.update<BankAccount>(Collections.BANK_ACCOUNTS, account._id!.toString(), { isDefault: false })
      )
    );
  }

  /**
   * 銀行口座を有効化
   */
  async activateBankAccount(id: string): Promise<BankAccount | null> {
    return await this.updateBankAccount(id, { isActive: true });
  }

  /**
   * 銀行口座を無効化
   */
  async deactivateBankAccount(id: string): Promise<BankAccount | null> {
    // デフォルト口座は無効化できない
    const account = await this.getBankAccountById(id);
    if (account?.isDefault) {
      throw new Error('Cannot deactivate default bank account');
    }

    return await this.updateBankAccount(id, { isActive: false });
  }

  /**
   * 重複チェック
   */
  async checkDuplicates(params: {
    bankName: string;
    branchName: string;
    accountNumber: string;
    excludeId?: string;
  }): Promise<BankAccount[]> {
    const filter: any = {
      bankName: params.bankName,
      branchName: params.branchName,
      accountNumber: params.accountNumber
    };

    if (params.excludeId) {
      filter._id = { $ne: params.excludeId };
    }

    return await this.db.find<BankAccount>(Collections.BANK_ACCOUNTS, filter);
  }

  /**
   * 初期セットアップ時に使用：デフォルトの銀行口座が存在しない場合に作成
   */
  async ensureDefaultBankAccount(defaultAccount?: Partial<BankAccount>): Promise<BankAccount> {
    const existing = await this.getDefaultBankAccount();
    if (existing) {
      return existing;
    }

    // デフォルトの銀行口座を作成
    const defaultBankAccount: Omit<BankAccount, '_id' | 'createdAt' | 'updatedAt'> = {
      accountName: defaultAccount?.accountName || 'メイン口座',
      bankName: defaultAccount?.bankName || '未設定銀行',
      branchName: defaultAccount?.branchName || '未設定支店',
      accountType: defaultAccount?.accountType || AccountType.CHECKING,
      accountNumber: defaultAccount?.accountNumber || '0000000',
      accountHolder: defaultAccount?.accountHolder || '未設定',
      isDefault: true,
      isActive: true,
      ...defaultAccount
    };

    return await this.createBankAccount(defaultBankAccount);
  }
}