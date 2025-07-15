import { NLWebDriver } from '@microsoft/nlweb';
import { chromium, Browser, Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// Supabase設定
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// NLWeb税制情報クローラー
export class TaxInfoCrawler {
  private browser: Browser | null = null;
  private nlweb: NLWebDriver | null = null;

  // 主要な税制情報ソース
  private readonly TAX_SOURCES = [
    {
      name: '国税庁',
      url: 'https://www.nta.go.jp/',
      sections: [
        { path: '/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/', name: '軽減税率' },
        { path: '/taxes/shiraberu/zeimokubetsu/hojin/', name: '法人税' },
        { path: '/taxes/tetsuzuki/shinsei/annai/hojin/annai/', name: '申請手続き' },
        { path: '/invoice/', name: 'インボイス制度' }
      ]
    },
    {
      name: 'e-Tax',
      url: 'https://www.e-tax.nta.go.jp/',
      sections: [
        { path: '/topics/', name: '新着情報' },
        { path: '/toiawase/qa/', name: 'よくある質問' }
      ]
    },
    {
      name: '財務省',
      url: 'https://www.mof.go.jp/',
      sections: [
        { path: '/tax_policy/tax_reform/', name: '税制改正' }
      ]
    }
  ];

  async initialize() {
    // Playwrightブラウザの起動
    this.browser = await chromium.launch({
      headless: true,
      args: ['--lang=ja']
    });

    // NLWebDriverの初期化
    const page = await this.browser.newPage();
    this.nlweb = new NLWebDriver(page);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  // メインのクロール処理
  async crawlTaxInfo() {
    console.log('税制情報のクロールを開始します...');

    for (const source of this.TAX_SOURCES) {
      console.log(`\n${source.name}のクロールを開始...`);
      
      try {
        // トップページにアクセス
        await this.nlweb!.goto(source.url);
        
        // 各セクションをクロール
        for (const section of source.sections) {
          await this.crawlSection(source, section);
        }
      } catch (error) {
        console.error(`${source.name}のクロールでエラー:`, error);
      }
    }
  }

  // セクションごとのクロール
  private async crawlSection(source: any, section: any) {
    try {
      const url = source.url + section.path;
      console.log(`  ${section.name}をクロール中: ${url}`);

      // NLWebを使って自然言語でページを操作
      await this.nlweb!.perform(`Go to ${url}`);
      
      // ページコンテンツを取得
      const content = await this.extractContent();
      
      // データベースに保存
      await this.saveTaxInfo({
        source: source.name,
        section: section.name,
        url: url,
        content: content,
        crawled_at: new Date().toISOString()
      });

      // 関連リンクも収集
      await this.collectRelatedLinks();
      
    } catch (error) {
      console.error(`セクション ${section.name} のクロールエラー:`, error);
    }
  }

  // コンテンツ抽出
  private async extractContent() {
    const page = this.nlweb!.page;
    
    // 主要なコンテンツを抽出
    const content = await page.evaluate(() => {
      const result: any = {
        title: '',
        mainContent: '',
        tables: [],
        lists: [],
        metadata: {}
      };

      // タイトル
      const titleElement = document.querySelector('h1, h2, .page-title');
      if (titleElement) {
        result.title = titleElement.textContent?.trim() || '';
      }

      // メインコンテンツ
      const mainElement = document.querySelector('main, #main, .content, article');
      if (mainElement) {
        result.mainContent = mainElement.textContent?.trim() || '';
      }

      // テーブルデータ（税率表など）
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        const rows = Array.from(table.querySelectorAll('tr')).map(tr => 
          Array.from(tr.querySelectorAll('td, th')).map(cell => cell.textContent?.trim() || '')
        );
        result.tables.push(rows);
      });

      // リスト項目（条件や要件など）
      const lists = document.querySelectorAll('ul, ol');
      lists.forEach(list => {
        const items = Array.from(list.querySelectorAll('li')).map(li => li.textContent?.trim() || '');
        result.lists.push(items);
      });

      // メタデータ（更新日、カテゴリなど）
      const dateElement = document.querySelector('.date, .updated, .publish-date');
      if (dateElement) {
        result.metadata.lastUpdated = dateElement.textContent?.trim();
      }

      return result;
    });

    return content;
  }

  // 関連リンクの収集
  private async collectRelatedLinks() {
    try {
      // NLWebで関連リンクを探す
      const links = await this.nlweb!.perform('Find all links related to tax regulations or procedures');
      
      // リンクをフィルタリングして重要なものだけ保存
      for (const link of links) {
        if (this.isImportantLink(link)) {
          await this.addToCrawlQueue(link);
        }
      }
    } catch (error) {
      console.error('関連リンク収集エラー:', error);
    }
  }

  // 重要なリンクかどうかの判定
  private isImportantLink(link: string): boolean {
    const importantKeywords = [
      '税率', '申告', '手続き', '改正', '通達', '質疑応答',
      'インボイス', '電子帳簿', '源泉徴収', '消費税', '法人税'
    ];
    
    return importantKeywords.some(keyword => link.includes(keyword));
  }

  // クロールキューに追加
  private async addToCrawlQueue(url: string) {
    await supabase
      .from('crawl_queue')
      .insert({
        url: url,
        priority: this.calculatePriority(url),
        status: 'pending',
        created_at: new Date().toISOString()
      });
  }

  // URLの優先度計算
  private calculatePriority(url: string): number {
    if (url.includes('改正') || url.includes('新着')) return 10;
    if (url.includes('インボイス')) return 9;
    if (url.includes('手続き')) return 8;
    return 5;
  }

  // 税制情報の保存
  private async saveTaxInfo(data: any) {
    try {
      // 税制情報テーブルに保存
      const { error: taxError } = await supabase
        .from('tax_information')
        .insert({
          source: data.source,
          section: data.section,
          url: data.url,
          title: data.content.title,
          content: data.content.mainContent,
          tables: JSON.stringify(data.content.tables),
          lists: JSON.stringify(data.content.lists),
          metadata: data.content.metadata,
          crawled_at: data.crawled_at
        });

      if (taxError) throw taxError;

      // ベクトル化して検索用インデックスに保存
      await this.createSearchIndex(data);
      
      console.log(`    ✓ 保存完了: ${data.content.title}`);
      
    } catch (error) {
      console.error('データ保存エラー:', error);
    }
  }

  // 検索用インデックスの作成
  private async createSearchIndex(data: any) {
    // OpenAI Embeddingsを使ってベクトル化（別途実装）
    // const embedding = await getEmbedding(data.content.mainContent);
    
    // pgvectorに保存
    await supabase
      .from('tax_search_index')
      .insert({
        content_id: data.url,
        content_type: 'tax_info',
        title: data.content.title,
        summary: data.content.mainContent.substring(0, 500),
        // embedding: embedding,
        metadata: {
          source: data.source,
          section: data.section,
          crawled_at: data.crawled_at
        }
      });
  }

  // 特定のトピックに関する情報を検索
  async searchTaxInfo(query: string) {
    try {
      // NLWebを使って国税庁サイトで検索
      await this.nlweb!.goto('https://www.nta.go.jp/');
      await this.nlweb!.perform(`Search for "${query}"`);
      
      // 検索結果を収集
      const results = await this.extractSearchResults();
      
      return results;
    } catch (error) {
      console.error('検索エラー:', error);
      return [];
    }
  }

  // 検索結果の抽出
  private async extractSearchResults() {
    const page = this.nlweb!.page;
    
    return await page.evaluate(() => {
      const results: any[] = [];
      const items = document.querySelectorAll('.search-result, .result-item, li');
      
      items.forEach(item => {
        const link = item.querySelector('a');
        if (link) {
          results.push({
            title: link.textContent?.trim() || '',
            url: link.href,
            summary: item.textContent?.trim() || ''
          });
        }
      });
      
      return results;
    });
  }
}

// クローラーの実行
export async function runTaxCrawler() {
  const crawler = new TaxInfoCrawler();
  
  try {
    await crawler.initialize();
    await crawler.crawlTaxInfo();
  } finally {
    await crawler.close();
  }
}

// 特定のクエリで税制情報を検索
export async function searchTaxInfoByQuery(query: string) {
  const crawler = new TaxInfoCrawler();
  
  try {
    await crawler.initialize();
    const results = await crawler.searchTaxInfo(query);
    return results;
  } finally {
    await crawler.close();
  }
}