// MCP クライアントの統合管理
export class McpClient {
  private perplexityApiKey: string;
  private webSearchEnabled: boolean;

  constructor() {
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY || '';
    this.webSearchEnabled = true;
  }

  // Perplexityを使用した高度な検索
  async searchAccountingInfo(query: string): Promise<any> {
    try {
      const searchQuery = `日本の会計基準 税務処理 ${query} 勘定科目 仕訳 国税庁`;
      
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'pplx-70b-online',
          messages: [
            {
              role: 'system',
              content: 'あなたは日本の会計・税務の専門家です。最新の税法と会計基準に基づいて回答してください。'
            },
            {
              role: 'user',
              content: searchQuery
            }
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Perplexity search error:', error);
      return null;
    }
  }

  // 国税庁のガイドラインを検索
  async searchTaxGuidelines(keyword: string): Promise<string> {
    try {
      // 実際にはMCPサーバー経由でWebスクレイピングや
      // 国税庁APIを使用する想定
      const guidelines = [
        '接待交際費: 取引先との飲食費は5,000円以下なら会議費、超える場合は接待交際費',
        '旅費交通費: 通勤費は非課税限度額まで、出張旅費は実費精算',
        '消耗品費: 10万円未満の物品購入、使用可能期間が1年未満',
        '広告宣伝費: 不特定多数への宣伝費用、特定顧客への贈答は接待交際費',
      ];

      return guidelines.join('\n');
    } catch (error) {
      console.error('Tax guidelines search error:', error);
      return '';
    }
  }

  // 業界別の勘定科目慣習を取得
  async getIndustryPractices(industry: string, transactionType: string): Promise<string> {
    try {
      // 業界別の慣習データベースや外部APIから取得
      const practices = {
        'IT業界': {
          'ソフトウェア購入': '無形固定資産またはソフトウェア費',
          'クラウドサービス': '通信費または支払手数料',
          '開発外注費': '外注費または業務委託費',
        },
        '飲食業': {
          '食材仕入': '仕入高',
          '厨房機器': '10万円以上なら器具備品、未満なら消耗品費',
          '店舗改装': '修繕費または資本的支出',
        },
        '小売業': {
          '商品仕入': '仕入高',
          '包装資材': '荷造運賃または消耗品費',
          '店舗賃料': '地代家賃',
        },
      };

      return JSON.stringify(practices[industry] || {});
    } catch (error) {
      console.error('Industry practices search error:', error);
      return '{}';
    }
  }

  // 類似取引の勘定科目を検索
  async searchSimilarTransactions(description: string, amount: number): Promise<any[]> {
    try {
      // MongoDBでテキスト検索を実装
      const { vercelDb } = await import('@/lib/mongodb-client');
      
      // テキスト検索またはパターンマッチング
      const documents = await vercelDb.find('documents', {
        $or: [
          { notes: { $regex: description, $options: 'i' } },
          { extractedText: { $regex: description, $options: 'i' } },
          { vendorName: { $regex: description, $options: 'i' } }
        ]
      }, { limit: 5 });

      // account_categoriesの情報を追加
      const documentsWithCategories = await Promise.all(
        documents.map(async (doc) => {
          if (doc.category) {
            const category = await vercelDb.findOne('account_categories', {
              code: doc.category
            });
            return {
              ...doc,
              account_categories: category || null
            };
          }
          return doc;
        })
      );

      return documentsWithCategories || [];
    } catch (error) {
      console.error('Similar transactions search error:', error);
      return [];
    }
  }
}

let mcpClientInstance: McpClient | null = null;

export function getMcpClient(): McpClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new McpClient();
  }
  return mcpClientInstance;
}