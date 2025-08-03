// Simple accounting tools for basic agent functionality
export const createJournalTool = {
  name: 'create_journal',
  description: '仕訳を作成します',
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: '取引日' },
      description: { type: 'string', description: '摘要' },
      amount: { type: 'number', description: '金額' },
      debit_account: { type: 'string', description: '借方勘定科目' },
      credit_account: { type: 'string', description: '貸方勘定科目' }
    },
    required: ['date', 'description', 'amount', 'debit_account', 'credit_account']
  },
  handler: async (params: any) => {
    return {
      success: true,
      journal_entry_id: 'je_' + Date.now(),
      message: '仕訳が作成されました',
      data: params
    };
  }
};

export const accountingToolsSimple = [
  createJournalTool
];