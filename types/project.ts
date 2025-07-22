/**
 * プロジェクト管理用の型定義
 */

export interface Project {
  _id?: string;
  projectCode: string;
  name: string;
  client: {
    name: string;
    contact: string;
    address: string;
  };
  contract: {
    amount: number;
    startDate: Date;
    endDate?: Date;
    retentionRate: number;
  };
  costs: {
    materials: number;
    labor: number;
    subcontract: number;
    other: number;
  };
  status: 'estimate' | 'contracted' | 'in_progress' | 'completed' | 'cancelled';
  progressPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectStatus = Project['status'];

export interface CreateProjectInput {
  name: string;
  clientName: string;
  contractAmount: number;
  startDate: string;
  endDate?: string;
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  status?: ProjectStatus;
  progressPercentage?: number;
  costs?: Partial<Project['costs']>;
}