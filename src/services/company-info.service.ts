import { DatabaseService, Collections } from '@/lib/mongodb-client';
import { CompanyInfo } from '@/types/collections';

export class CompanyInfoService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * 自社情報を作成
   */
  async createCompanyInfo(companyInfo: Omit<CompanyInfo, '_id' | 'createdAt' | 'updatedAt'>): Promise<CompanyInfo> {
    // デフォルトの自社情報が既にある場合、新しいものをデフォルトにする場合は既存のデフォルトを解除
    if (companyInfo.isDefault) {
      await this.db.find<CompanyInfo>(Collections.COMPANY_INFO, { isDefault: true })
        .then(companies => {
          return Promise.all(
            companies.map(company => 
              this.db.update<CompanyInfo>(Collections.COMPANY_INFO, company._id!.toString(), { isDefault: false })
            )
          );
        });
    }

    return await this.db.create<CompanyInfo>(Collections.COMPANY_INFO, companyInfo);
  }

  /**
   * 自社情報をIDで取得
   */
  async getCompanyInfoById(id: string): Promise<CompanyInfo | null> {
    return await this.db.findById<CompanyInfo>(Collections.COMPANY_INFO, id);
  }

  /**
   * デフォルトの自社情報を取得
   */
  async getDefaultCompanyInfo(): Promise<CompanyInfo | null> {
    return await this.db.findOne<CompanyInfo>(Collections.COMPANY_INFO, { isDefault: true });
  }

  /**
   * すべての自社情報を取得
   */
  async getAllCompanyInfo(): Promise<CompanyInfo[]> {
    return await this.db.find<CompanyInfo>(Collections.COMPANY_INFO, {}, {
      sort: { isDefault: -1, companyName: 1 }
    });
  }

  /**
   * 自社情報を更新
   */
  async updateCompanyInfo(id: string, update: Partial<CompanyInfo>): Promise<CompanyInfo | null> {
    const { _id, createdAt, updatedAt, ...updateData } = update;

    // デフォルトフラグを更新する場合の処理
    if (updateData.isDefault === true) {
      // 他のデフォルトを解除
      const currentDefault = await this.getDefaultCompanyInfo();
      if (currentDefault && currentDefault._id!.toString() !== id) {
        await this.db.update<CompanyInfo>(Collections.COMPANY_INFO, currentDefault._id!.toString(), { isDefault: false });
      }
    }

    return await this.db.update<CompanyInfo>(Collections.COMPANY_INFO, id, updateData);
  }

  /**
   * 自社情報を削除
   */
  async deleteCompanyInfo(id: string): Promise<boolean> {
    // デフォルトの自社情報は削除できない
    const companyInfo = await this.getCompanyInfoById(id);
    if (companyInfo?.isDefault) {
      throw new Error('Cannot delete default company info');
    }

    return await this.db.delete(Collections.COMPANY_INFO, id);
  }

  /**
   * デフォルトの自社情報を設定
   */
  async setDefaultCompanyInfo(id: string): Promise<CompanyInfo | null> {
    // 現在のデフォルトを解除
    const currentDefault = await this.getDefaultCompanyInfo();
    if (currentDefault) {
      await this.db.update<CompanyInfo>(Collections.COMPANY_INFO, currentDefault._id!.toString(), { isDefault: false });
    }

    // 新しいデフォルトを設定
    return await this.updateCompanyInfo(id, { isDefault: true });
  }

  /**
   * デフォルトの会社情報を取得（APIエンドポイント用）
   */
  async getCompanyInfo(): Promise<CompanyInfo | null> {
    return await this.getDefaultCompanyInfo();
  }

  /**
   * 会社情報を作成または更新
   */
  async upsertCompanyInfo(data: {
    companyName: string;
    postalCode: string;
    address: string;
    phone?: string | null;
    email?: string | null;
    registrationNumber?: string | null;
    invoiceNumberFormat?: string | null;
  }): Promise<CompanyInfo> {
    const existing = await this.getDefaultCompanyInfo();
    
    const companyData: Omit<CompanyInfo, '_id' | 'createdAt' | 'updatedAt'> = {
      companyName: data.companyName,
      postalCode: data.postalCode,
      // 住所を単一フィールドから分割
      prefecture: data.address.split(' ')[0] || '',
      city: data.address.split(' ')[1] || '',
      address1: data.address.split(' ').slice(2).join(' ') || '',
      address2: '',
      phone: data.phone || '',
      fax: '',
      email: data.email || '',
      registrationNumber: data.registrationNumber,
      representative: {
        name: '代表者',
        position: '代表取締役'
      },
      isDefault: true,
    };
    
    if (existing) {
      // 更新
      return await this.updateCompanyInfo(existing._id!.toString(), companyData) as CompanyInfo;
    } else {
      // 新規作成
      return await this.createCompanyInfo(companyData);
    }
  }

  /**
   * ロゴ画像URLを更新
   */
  async updateLogoUrl(id: string, logoUrl: string | null): Promise<CompanyInfo | null> {
    return await this.updateCompanyInfo(id, { logoUrl: logoUrl || undefined });
  }

  /**
   * 印鑑画像URLを更新
   */
  async updateSealImageUrl(id: string, sealImageUrl: string | null): Promise<CompanyInfo | null> {
    return await this.updateCompanyInfo(id, { sealImageUrl: sealImageUrl || undefined });
  }

  /**
   * 代表者情報を更新
   */
  async updateRepresentative(id: string, representative: CompanyInfo['representative']): Promise<CompanyInfo | null> {
    return await this.updateCompanyInfo(id, { representative });
  }

  /**
   * 初期セットアップ時に使用：デフォルトの自社情報が存在しない場合に作成
   */
  async ensureDefaultCompanyInfo(defaultInfo?: Partial<CompanyInfo>): Promise<CompanyInfo> {
    const existing = await this.getDefaultCompanyInfo();
    if (existing) {
      return existing;
    }

    // デフォルトの自社情報を作成
    const defaultCompanyInfo: Omit<CompanyInfo, '_id' | 'createdAt' | 'updatedAt'> = {
      companyName: defaultInfo?.companyName || '未設定',
      postalCode: defaultInfo?.postalCode || '000-0000',
      prefecture: defaultInfo?.prefecture || '未設定',
      city: defaultInfo?.city || '未設定',
      address1: defaultInfo?.address1 || '未設定',
      phone: defaultInfo?.phone || '00-0000-0000',
      email: defaultInfo?.email || 'info@example.com',
      representative: defaultInfo?.representative || {
        name: '未設定',
        position: '代表取締役'
      },
      isDefault: true,
      ...defaultInfo
    };

    return await this.createCompanyInfo(defaultCompanyInfo);
  }
}