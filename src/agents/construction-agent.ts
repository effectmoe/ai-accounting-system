import { Agent } from '@mastra/core';
import { z } from 'zod';
import { db } from '@/lib/mongodb-client';
import { getConstructionAccountByKeyword } from '@/lib/construction-accounts';
import { logger } from '@/lib/logger';

// 建設業・1人親方専門エージェント
export const constructionAgent = new Agent({
  id: 'construction-agent',
  name: 'Construction Agent',
  description: '建設業・1人親方の会計処理に特化したAIアシスタント',
  
  prompt: `
あなたは建設業・1人親方の会計処理に特化したAIアシスタントです。
以下の専門知識を活用して、正確な仕訳と勘定科目の提案を行ってください。

## 建設業特有の勘定科目
- 材料費 (5111): セメント、鉄筋、木材等の建設材料
- 労務費 (5112): 作業員の人件費（源泉徴収対象外）
- 外注費 (5113): 下請業者への支払い（源泉徴収10.21%）
- 安全協力費 (5115): 現場の安全管理費用
- 完成工事高 (4111): 工事完成時の売上計上

## 消費税の取り扱い
- 材料費、外注費: 10%課税
- 労務費: 課税対象外
- 工具・機械: 10%課税、減価償却対象の可能性

## プロジェクト管理
- 工事ごとの原価管理が重要
- 見積→受注→進行→完成→請求のフローを把握

## 1人親方特有の注意点
- 青色申告特別控除65万円の要件確認
- 源泉徴収の適切な処理
- 事業用と個人用の明確な区分
  `,

  tools: [
    {
      name: 'create_journal_entry',
      description: '建設業向けの仕訳を作成',
      schema: z.object({
        date: z.string().describe('取引日（YYYY-MM-DD形式）'),
        description: z.string().describe('取引の説明'),
        amount: z.number().describe('金額（税込）'),
        vendorName: z.string().optional().describe('取引先名'),
        projectCode: z.string().optional().describe('プロジェクトコード'),
        category: z.enum(['materials', 'labor', 'subcontract', 'safety', 'other']).describe('費用カテゴリ')
      }),
      handler: async ({ date, description, amount, vendorName, projectCode, category }) => {
        try {
          // 建設業向け勘定科目の判定
          const account = getConstructionAccountByKeyword(description);
          
          let debitAccount = '現金';
          let creditAccount = '現金';
          let taxRate = 0.10;
          let taxAmount = 0;

          if (account) {
            debitAccount = account.name;
            if (account.taxType === 'taxable_10') {
              taxAmount = Math.floor(amount * (taxRate / (1 + taxRate)));
            } else if (account.taxType === 'non_taxable') {
              taxRate = 0;
              taxAmount = 0;
            }
          }

          // 仕訳データの作成
          const journalEntry = {
            date: new Date(date),
            description: `${vendorName ? vendorName + ' - ' : ''}${description}`,
            debitAccount,
            creditAccount,
            amount,
            taxAmount,
            taxRate,
            projectCode,
            category,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // TODO: 実際のDB保存処理
          logger.info('Created construction journal entry:', journalEntry);

          return {
            success: true,
            entry: journalEntry,
            message: `仕訳を作成しました: ${debitAccount} ${amount}円`
          };
        } catch (error) {
          logger.error('Failed to create journal entry:', error);
          return {
            success: false,
            error: '仕訳の作成に失敗しました'
          };
        }
      }
    },

    {
      name: 'calculate_project_cost',
      description: 'プロジェクトの原価計算と利益率分析',
      schema: z.object({
        projectId: z.string().describe('プロジェクトID'),
        expenses: z.array(z.object({
          category: z.enum(['materials', 'labor', 'subcontract', 'other']),
          amount: z.number(),
          description: z.string()
        })).describe('経費リスト')
      }),
      handler: async ({ projectId, expenses }) => {
        try {
          // プロジェクトの取得
          const project = await db.findOne('projects', { projectCode: projectId });
          if (!project) {
            return { success: false, error: 'プロジェクトが見つかりません' };
          }

          // 原価の更新
          let totalExpenses = 0;
          expenses.forEach(expense => {
            switch (expense.category) {
              case 'materials':
                project.costs.materials += expense.amount;
                break;
              case 'labor':
                project.costs.labor += expense.amount;
                break;
              case 'subcontract':
                project.costs.subcontract += expense.amount;
                break;
              default:
                project.costs.other += expense.amount;
            }
            totalExpenses += expense.amount;
          });

          // 利益率の計算
          const totalCosts = project.costs.materials + project.costs.labor + 
                           project.costs.subcontract + project.costs.other;
          const profitMargin = ((project.contract.amount - totalCosts) / project.contract.amount) * 100;

          // プロジェクトの更新
          await db.update('projects', project._id, {
            costs: project.costs,
            profitMargin: profitMargin,
            updatedAt: new Date()
          });

          return {
            success: true,
            projectId,
            totalCosts,
            profitMargin: profitMargin.toFixed(2),
            message: `プロジェクトの原価を更新しました。利益率: ${profitMargin.toFixed(2)}%`
          };
        } catch (error) {
          logger.error('Failed to calculate project cost:', error);
          return {
            success: false,
            error: '原価計算に失敗しました'
          };
        }
      }
    },

    {
      name: 'check_blue_tax_requirements',
      description: '青色申告特別控除65万円の要件確認',
      schema: z.object({
        hasElectronicBooks: z.boolean().describe('電子帳簿保存を行っているか'),
        hasETaxFiling: z.boolean().describe('e-Taxで申告するか'),
        hasSeparateAccounts: z.boolean().describe('事業用と個人用の口座を分けているか')
      }),
      handler: async ({ hasElectronicBooks, hasETaxFiling, hasSeparateAccounts }) => {
        const requirements = [];
        const missing = [];

        if (hasElectronicBooks || hasETaxFiling) {
          requirements.push('65万円控除の基本要件を満たしています');
        } else {
          missing.push('電子帳簿保存またはe-Tax申告のいずれかが必要です');
        }

        if (hasSeparateAccounts) {
          requirements.push('事業用口座の分離ができています');
        } else {
          missing.push('事業用と個人用の口座を分けることを推奨します');
        }

        return {
          eligible: missing.length === 0,
          requirements,
          missing,
          message: missing.length === 0 
            ? '青色申告特別控除65万円の要件を満たしています' 
            : `要件を満たすために: ${missing.join('、')}`
        };
      }
    }
  ]
});