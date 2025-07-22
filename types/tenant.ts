// テナント管理の型定義

export enum TenantType {
  ENTERPRISE = 'enterprise',
  INDIVIDUAL_CONTRACTOR = 'individual_contractor'
}

export enum Industry {
  CONSTRUCTION = 'construction',
  GENERAL = 'general'
}

export enum CompanyScale {
  INDIVIDUAL = 'individual',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large'
}

export enum UIMode {
  ENTERPRISE = 'enterprise',
  SIMPLIFIED = 'simplified'
}

export interface FeatureFlags {
  // 1人親方専用機能
  timeline_view: boolean;
  project_costing: boolean;
  mobile_quick_entry: boolean;
  blue_tax_support: boolean;
  construction_accounts: boolean;
  
  // エンタープライズ機能
  approval_workflow: boolean;
  advanced_analytics: boolean;
  multi_user: boolean;
  api_access: boolean;
}

export interface CompanyInfo {
  name: string;
  taxId?: string;
  industry?: Industry;
  scale: CompanyScale;
}

export interface TenantConfig {
  tenantId: string;
  tenantType: TenantType;
  companyInfo: CompanyInfo;
  features: FeatureFlags;
  uiMode: UIMode;
  createdAt: Date;
  updatedAt: Date;
}

// デフォルト設定
export const DEFAULT_ENTERPRISE_FEATURES: FeatureFlags = {
  timeline_view: false,
  project_costing: false,
  mobile_quick_entry: false,
  blue_tax_support: false,
  construction_accounts: false,
  approval_workflow: true,
  advanced_analytics: true,
  multi_user: true,
  api_access: true
};

export const DEFAULT_INDIVIDUAL_CONTRACTOR_FEATURES: FeatureFlags = {
  timeline_view: true,
  project_costing: true,
  mobile_quick_entry: true,
  blue_tax_support: true,
  construction_accounts: true,
  approval_workflow: false,
  advanced_analytics: false,
  multi_user: false,
  api_access: false
};