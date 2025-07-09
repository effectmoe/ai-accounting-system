/**
 * 勘定科目判定ルール設定
 * ベンダー名やキーワードから勘定科目を判定するためのルール定義
 */

export interface CategoryRule {
  category: string;
  keywords: string[];
  priority?: number; // 優先度（高い方が優先）
}

export const ACCOUNT_CATEGORY_RULES: CategoryRule[] = [
  {
    category: '旅費交通費',
    priority: 90,
    keywords: [
      // タクシー関連
      'タクシー', 'taxi', 'cab',
      // 駐車場関連
      '駐車場', 'パーキング', 'parking', 'park',
      'times', 'タイムズ', 'timescar', 'タイムズカー',
      'コインパーキング', 'coin', '月極', 'パーク24',
      'リパーク', 'repark', '三井のリパーク',
      // 鉄道関連
      'jr', 'ｊｒ', '鉄道', '電車', 'railway',
      'メトロ', 'metro', '地下鉄', 'subway',
      '私鉄', '東急', '小田急', '京王', '西武', '東武',
      // バス関連
      'バス', 'bus', '高速バス',
      // 高速道路関連
      '高速道路', '高速', 'highway', 'etc', 'ｅｔｃ',
      'nexco', 'ネクスコ', '通行料',
      // ガソリン関連
      'ガソリン', 'gasoline', 'gas', 'エネオス', 'eneos',
      'シェル', 'shell', '出光', 'コスモ', 'cosmo',
      // 航空関連
      '航空', 'air', 'jal', 'ana', '全日空', '日本航空',
      'jetstar', 'peach', 'ピーチ', '空港',
      // レンタカー関連
      'レンタカー', 'rental', 'トヨタレンタ', 'ニッポンレンタ',
      'オリックスレンタ', 'タイムズカー'
    ]
  },
  {
    category: '会議費',
    priority: 80,
    keywords: [
      // カフェチェーン
      'コーヒー', 'coffee', 'cafe', 'カフェ',
      'スターバックス', 'starbucks', 'スタバ',
      'ドトール', 'doutor', 'タリーズ', 'tullys',
      'エクセルシオール', 'excelsior', 'ベローチェ',
      'サンマルク', 'コメダ', 'komeda', '喫茶',
      'プロント', 'pronto', 'ルノアール', 'renoir',
      // ファミレス（少人数の打ち合わせ）
      'ガスト', 'gusto', 'サイゼリヤ', 'saizeriya',
      'ジョナサン', 'jonathan', 'デニーズ', 'dennys',
      // 会議関連
      '会議室', 'meeting', 'ミーティング', 'conference'
    ]
  },
  {
    category: '接待交際費',
    priority: 70,
    keywords: [
      // 高級レストラン・料亭
      'レストラン', 'restaurant', '料亭', '料理',
      'ホテル', 'hotel', '帝国ホテル', 'リッツ',
      // 居酒屋・バー
      '居酒屋', '酒場', 'バー', 'bar', 'ワイン',
      '串カツ', '串焼', '焼鳥', '焼き鳥',
      // 専門料理店
      '寿司', 'すし', 'sushi', '鮨',
      '焼肉', '焼き肉', 'ステーキ', 'steak',
      '中華', '中国料理', '北京', '上海', '広東',
      'イタリアン', 'italian', 'イタリア',
      'フレンチ', 'french', 'フランス',
      '和食', '日本料理', '懐石', 'かいせき',
      '天ぷら', 'てんぷら', '鉄板焼',
      // エンターテイメント
      'ゴルフ', 'golf', 'クラブ', 'club',
      'カラオケ', 'karaoke', '接待', '宴会'
    ]
  },
  {
    category: '消耗品費',
    priority: 60,
    keywords: [
      // コンビニ
      'コンビニ', 'convenience', 'cvs',
      'セブン', 'seven', 'セブンイレブン', '7-11', '７－１１',
      'ローソン', 'lawson', 'ファミリーマート', 'familymart',
      'ファミマ', 'ミニストップ', 'ministop',
      'デイリー', 'daily', 'ヤマザキ', 'yamazaki',
      // スーパー・ドラッグストア
      'スーパー', 'super', 'マーケット', 'market',
      'イオン', 'aeon', 'イトーヨーカドー', '西友',
      'ドラッグ', 'drug', '薬局', 'マツキヨ', 'ウエルシア',
      // 100円ショップ
      'ダイソー', 'daiso', 'セリア', 'seria',
      'キャンドゥ', 'cando', '100円', '百円'
    ]
  },
  {
    category: '事務用品費',
    priority: 50,
    keywords: [
      // 文具店
      '文具', '文房具', 'stationery',
      '事務', '事務用品', 'office',
      // 文具メーカー・店舗
      'コクヨ', 'kokuyo', 'キング', 'king',
      'プラス', 'plus', 'ナカバヤシ', 'nakabayashi',
      // オフィス用品通販
      'アスクル', 'askul', 'カウネット', 'kaunet',
      'たのめーる', 'tanomail',
      // 具体的な文具
      'ペン', 'pen', 'ノート', 'note', 'コピー用紙',
      'インク', 'ink', 'トナー', 'toner'
    ]
  },
  {
    category: '通信費',
    priority: 40,
    keywords: [
      // 通信キャリア
      'ドコモ', 'docomo', 'au', 'エーユー',
      'ソフトバンク', 'softbank', '楽天モバイル', 'rakuten',
      // インターネット
      'インターネット', 'internet', 'wifi', 'wi-fi',
      'プロバイダ', 'provider', 'isp',
      // 固定電話
      'ntt', 'ｎｔｔ', '電話', 'phone', 'tel'
    ]
  },
  {
    category: '水道光熱費',
    priority: 30,
    keywords: [
      // 電力会社
      '電力', '電気', 'electric', '東京電力', 'tepco',
      '関西電力', 'kepco', '中部電力', '九州電力',
      // ガス会社
      'ガス', 'gas', '東京ガス', '大阪ガス', '東邦ガス',
      // 水道
      '水道', 'water', '水道局', '下水道'
    ]
  },
  {
    category: '広告宣伝費',
    priority: 20,
    keywords: [
      // 広告媒体
      '広告', 'ad', 'advertising', '宣伝',
      'google', 'グーグル', 'facebook', 'フェイスブック',
      'twitter', 'ツイッター', 'instagram', 'インスタ',
      // 印刷関連
      '印刷', 'print', 'チラシ', 'flyer',
      'パンフレット', 'pamphlet', 'カタログ', 'catalog',
      // 看板・サイン
      '看板', 'sign', 'サイン', 'のぼり'
    ]
  }
];

/**
 * ベンダー名から勘定科目を判定
 */
export function determineAccountCategory(vendorName: string): string {
  const vendorLower = vendorName.toLowerCase();
  
  // 優先度順にソート
  const sortedRules = [...ACCOUNT_CATEGORY_RULES].sort((a, b) => 
    (b.priority || 0) - (a.priority || 0)
  );
  
  // ルールを順番にチェック
  for (const rule of sortedRules) {
    for (const keyword of rule.keywords) {
      if (vendorLower.includes(keyword.toLowerCase())) {
        return rule.category;
      }
    }
  }
  
  // デフォルトは消耗品費
  return '消耗品費';
}

/**
 * カテゴリごとのキーワードを取得
 */
export function getKeywordsByCategory(category: string): string[] {
  const rule = ACCOUNT_CATEGORY_RULES.find(r => r.category === category);
  return rule ? rule.keywords : [];
}

/**
 * 新しいキーワードを追加
 */
export function addKeywordToCategory(category: string, keyword: string): void {
  const rule = ACCOUNT_CATEGORY_RULES.find(r => r.category === category);
  if (rule && !rule.keywords.includes(keyword)) {
    rule.keywords.push(keyword);
  }
}