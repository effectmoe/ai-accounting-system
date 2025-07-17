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
    category: '車両費',
    priority: 95,
    keywords: [
      // 車両維持費
      '車検', '整備', '点検', '修理', 'オイル交換',
      'タイヤ交換', 'バッテリー', 'ブレーキ',
      '保険', '自動車保険', '自賀責', '任意保険',
      'カー用品', '洗車', 'ワックス',
      'イエローハット', 'オートバックス'
    ]
  },
  {
    category: '修繕費',
    priority: 92,
    keywords: [
      // 修理・修繕関連
      '修理', '修繕', '補修', '改修', 'リフォーム',
      '工事', '塗装', 'ペンキ', '壁紙', '床張り替え',
      '配管', '電気工事', 'エアコン', '空調',
      '建築', '大工', '左官', '電気工',
      'メンテナンス', 'maintenance'
    ]
  },
  {
    category: '工具器具備品',
    priority: 88,
    keywords: [
      // 工具・機器
      '工具', '器具', '備品', '機器', '機械',
      'パソコン', 'pc', 'computer', 'ノートpc',
      'プリンター', 'printer', '複合機', 'コピー機',
      'スキャナー', 'scanner', 'シュレッダー',
      'デスク', 'チェア', '椅子', 'キャビネット',
      '棚', 'ラック', '什器', '家具',
      '冷蔵庫', '電子レンジ', 'エアコン',
      'テレビ', 'モニター', 'ディスプレイ'
    ]
  },
  {
    category: '福利厚生費',
    priority: 85,
    keywords: [
      // 健康・医療
      '健康診断', '人間ドック', '健診', '検診',
      '予防接種', 'ワクチン', 'インフルエンザ',
      '医療', '病院', 'クリニック', '診療所',
      '薬', '調剤薬局', '処方箋',
      // レクリエーション
      'スポーツクラブ', 'ジム', 'gym', 'フィットネス',
      '社員旅行', '懇親会', '歓送迎会',
      '忨年会', '新年会', '社内イベント',
      // 食事補助
      '食事補助', 'ランチ補助', '弁当補助',
      'カフェテリア', '社員食堂'
    ]
  },
  {
    category: '旅費交通費',
    priority: 90,
    keywords: [
      // タクシー関連
      'タクシー', 'taxi', 'cab', '日本交通', 'kmタクシー',
      '国際自動車', '大和', 'checker', 'チェッカー',
      'グリーン', 'green', 'uber', 'ウーバー',
      '配車', 'didi', 'ディディ', 'grab', 'グラブ',
      // 駐車場関連
      '駐車場', 'パーキング', 'parking', 'park',
      'times', 'タイムズ', 'timescar', 'タイムズカー',
      'コインパーキング', 'coin', '月極', 'パーク24',
      'リパーク', 'repark', '三井のリパーク',
      'ナビパーク', 'navipark', 'エコロパーク',
      'パラカ', 'paraca', 'アップルパーク',
      // 鉄道関連
      'jr', 'ｊｒ', '鉄道', '電車', 'railway',
      'メトロ', 'metro', '地下鉄', 'subway',
      '私鉄', '東急', '小田急', '京王', '西武', '東武',
      '京成', '京急', '相鉄', '東京メトロ', '都営',
      'つくばエクスプレス', 'tx', '新幹線', 'のぞみ',
      'ひかり', 'こだま', 'suica', 'スイカ', 'pasmo', 'パスモ',
      // バス関連
      'バス', 'bus', '高速バス', '路線バス',
      '都営バス', '京王バス', '小田急バス', '東急バス',
      '西武バス', '国際興業', '京成バス', '関東バス',
      'はとバス', 'リムジンバス', 'シャトルバス',
      // 高速道路関連
      '高速道路', '高速', 'highway', 'etc', 'ｅｔｃ',
      'nexco', 'ネクスコ', '通行料', '有料道路',
      '首都高', '阪神高速', '名古屋高速',
      // ガソリン関連
      'ガソリン', 'gasoline', 'gas', 'エネオス', 'eneos',
      'シェル', 'shell', '出光', 'idemitsu', 'コスモ', 'cosmo',
      'キグナス', 'kygnus', 'エッソ', 'esso', 'モービル', 'mobil',
      '昭和シェル', 'ゼネラル', 'apollostation', 'アポロ',
      // 航空関連
      '航空', 'air', 'jal', '日本航空', 'ana', '全日空',
      'jetstar', 'ジェットスター', 'peach', 'ピーチ',
      'vanilla', 'バニラ', 'skymark', 'スカイマーク',
      'airdo', 'エアドゥ', 'solaseed', 'ソラシド',
      'starflyer', 'スターフライヤー', '空港', '成田',
      '羽田', '関空', 'セントレア', '伊丹', '神戸',
      // 船舶
      'フェリー', 'ferry', '船', '渡船', '水上バス',
      // レンタカー関連
      'レンタカー', 'rental', 'トヨタレンタ', 'ニッポンレンタ',
      'オリックスレンタ', 'タイムズカー', 'ニコニコ',
      'バジェット', 'budget', 'エイビス', 'avis'
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
      'エクセルシオール', 'excelsior', 'ベローチェ', 'veloce',
      'サンマルク', 'コメダ', 'komeda', '喫茶',
      'プロント', 'pronto', 'ルノアール', 'renoir',
      'ブルーボトル', 'blue bottle', '上島珈琲店',
      'ネスカフェ', 'nescafe', 'フレッシュネスカフェ',
      'スペシャルティコーヒー', '純喫茶',
      // ファミレス（少人数の打ち合わせ）
      'ガスト', 'gusto', 'サイゼリヤ', 'saizeriya',
      'ジョナサン', 'jonathan', 'デニーズ', 'dennys',
      'バーミヤン', 'ジョイフル', 'joyful', 'ロイヤルホスト',
      'ファミレス', 'ファミリーレストラン',
      // 会議関連
      '会議室', 'meeting', 'ミーティング', 'conference',
      'カンファレンス', 'セミナー', 'seminar',
      'レンタルスペース', '貸会議室', 'シェアオフィス',
      'コワーキング', 'coworking', 'wework', 'ウィーワーク'
    ]
  },
  {
    category: '接待交際費',
    priority: 70,
    keywords: [
      // 高級レストラン・料亭
      'レストラン', 'restaurant', '料亭', '料理',
      'ホテル', 'hotel', '帝国ホテル', 'リッツカールトン',
      'ヒルトン', 'hilton', 'ウェスティン', 'westin',
      'ハイアット', 'hyatt', 'マリオット', 'marriott',
      'シャングリラ', 'shangri-la', 'フォーシーズンズ',
      // 居酒屋・バー
      '居酒屋', '酒場', 'バー', 'bar', 'ワイン',
      '串カツ', '串焼', '焼鳥', '焼き鳥',
      '鳥貴族', '和民', 'ワタミ', '魚民', '白木屋',
      '笑笑', '千年の宴', '月の雫', '居酒屋チェーン',
      'ビアホール', 'ビアガーデン', 'バル',
      // 専門料理店
      '寿司', 'すし', 'sushi', '鮨', '回転寿司',
      'スシロー', 'くら寿司', 'はま寿司', 'かっぱ寿司',
      '銀のさら', '築地', '魚べい', 'すきやばし次郎',
      '焼肉', '焼き肉', 'ステーキ', 'steak',
      'ホルモン', '牛角', '安楽亭', '叙々苑',
      'ワンカルビ', '焼肉きんぐ', 'カルビ', 'ハラミ',
      '中華', '中国料理', '北京', '上海', '広東',
      '四川', '麺飯店', '中華街', '陶陶居',
      'イタリアン', 'italian', 'イタリア',
      'ピッツァ', 'pizza', 'パスタ', 'pasta',
      'フレンチ', 'french', 'フランス',
      'ビストロ', 'bistro', 'ブラッセリー',
      '和食', '日本料理', '懐石', 'かいせき',
      '天ぷら', 'てんぷら', '鉄板焼', 'ふぐ',
      'うなぎ', 'とんかつ', 'カツ', 'そば', 'うどん',
      // エンターテイメント
      'ゴルフ', 'golf', 'クラブ', 'club',
      'カントリー', 'country', '打ちっぱなし',
      'カラオケ', 'karaoke', '接待', '宴会',
      'ビッグエコー', 'ジャンカラ', 'まねきねこ',
      'ナイトクラブ', 'キャバクラ', 'ラウンジ'
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
      'ポプラ', 'poplar', 'セイコーマート', 'seicomart',
      'ニューデイズ', 'newdays', 'キオスク', 'kiosk',
      // スーパー
      'スーパー', 'super', 'マーケット', 'market',
      'イオン', 'aeon', 'イトーヨーカドー', '西友', 'seiyu',
      'ライフ', 'life', 'サミット', 'summit', 'マルエツ', 'maruetsu',
      'オーケー', 'ok', 'ヤオコー', 'いなげや', 'inageya',
      '東急ストア', 'ベイシア', 'basia', '成城石井',
      '紀ノ国屋', 'マックスバリュ', 'maxvalu',
      // ホームセンター
      'ホームセンター', 'カインズ', 'cainz', 'コーナン', 'kohnan',
      'ビバホーム', 'viva', 'ケーヨー', 'd2', 'ジョイフル', 'joyful',
      'コメリ', 'komeri', 'ナフコ', 'nafco', 'ムサシ', 'ロイヤル',
      'ホーマック', 'homac', 'ドイト', 'doit',
      // 家電量販店
      'ヤマダ電機', 'yamada', 'ビックカメラ', 'bic',
      'ヨドバシ', 'yodobashi', 'エディオン', 'edion',
      'ケーズデンキ', "k's", 'ジョーシン', 'joshin',
      'ノジマ', 'nojima', 'ベスト電器', 'best',
      'ラオックス', 'laox', 'ソフマップ', 'sofmap',
      // ドラッグストア
      'ドラッグ', 'drug', '薬局', 'マツキヨ', 'マツモトキヨシ',
      'ウエルシア', 'welcia', 'ツルハ', 'tsuruha',
      'サンドラッグ', 'sun', 'スギ薬局', 'sugi',
      'ココカラファイン', 'cocokara', 'クリエイト', 'create',
      'ダイコク', 'daikoku', 'キリン堂', 'kirindo',
      // 100円ショップ
      'ダイソー', 'daiso', 'セリア', 'seria',
      'キャンドゥ', 'cando', '100円', '百円',
      'ワッツ', 'watts', 'ミーツ', 'meets',
      'シルク', 'silk', 'レモン', 'lemon',
      // ディスカウントストア
      'ドンキホーテ', 'donki', 'ドンキ',
      '業務スーパー', 'コストコ', 'costco',
      'オーケーストア', 'ロジャース', 'ディスカウント'
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
      'ドコモ', 'docomo', 'au', 'エーユー', 'kddi',
      'ソフトバンク', 'softbank', '楽天モバイル', 'rakuten',
      'ahamo', 'アハモ', 'povo', 'ポヴォ', 'linemo', 'ラインモ',
      // MVNO
      'uq', 'ユーキュー', 'ymobile', 'ワイモバイル',
      'mineo', 'マイネオ', 'iijmio', 'ocn', 'ビッグローブ',
      'biglobe', 'nuro', 'ニューロ', 'イオンモバイル',
      // インターネット
      'インターネット', 'internet', 'wifi', 'wi-fi',
      'プロバイダ', 'provider', 'isp', '光回線', 'フレッツ',
      'flets', 'フィバー', 'fiber', 'adsl', 'ケーブル',
      'jcom', 'ジェイコム', 'コミュファ', 'ポケットwifi',
      // 固定電話
      'ntt', 'ｎｔｔ', '電話', 'phone', 'tel',
      '固定電話', '光電話', 'フリーダイヤル',
      // クラウドサービス
      'zoom', 'ズーム', 'teams', 'チームズ',
      'slack', 'スラック', 'chatwork', 'チャットワーク'
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
      // オンライン広告
      '広告', 'ad', 'advertising', '宣伝',
      'google', 'グーグル', 'facebook', 'フェイスブック', 'meta',
      'twitter', 'ツイッター', 'x', 'instagram', 'インスタ',
      'youtube', 'ユーチューブ', 'tiktok', 'ティックトック',
      'line', 'ライン', 'yahoo', 'ヤフー',
      'amazon', 'アマゾン', '楽天', 'rakuten',
      // SEO・SEM
      'seo', 'sem', 'リスティング', 'ppc',
      'クリック', 'アドワーズ', 'adwords',
      // 印刷関連
      '印刷', 'print', 'チラシ', 'flyer',
      'パンフレット', 'pamphlet', 'カタログ', 'catalog',
      'ポスター', 'poster', '名刺', '封筒',
      'プリントパック', 'ラクスル', 'raksul',
      'グラフィック', 'ネット印刷',
      // 看板・サイン
      '看板', 'sign', 'サイン', 'のぼり',
      '横断幕', '懸垂幕', 'バナー', 'banner',
      'デジタルサイネージ', 'ネオン', 'led',
      // イベント・展示会
      '展示会', 'イベント', 'ブース', 'booth',
      'ノベルティ', '販促', 'サンプル',
      'プロモーション', 'promotion'
    ]
  },
  {
    category: '雑費',
    priority: 10,
    keywords: [
      // その他費用
      '手数料', '振込手数料', '銀行手数料',
      'atm', 'エーティーエム', '両替',
      '証明書', '印鑑証明', '謄本',
      'クリーニング', 'cleaning', '洗濯',
      'ランドリー', 'laundry', 'コインランドリー',
      '新聞', '雑誌', '書籍', '本',
      '会費', '年会費', '月会費',
      'サブスクリプション', 'subscription'
    ]
  }
];

/**
 * ベンダー名から勘定科目を判定
 */
export function determineAccountCategory(vendorName: string): string {
  if (!vendorName || typeof vendorName !== 'string') {
    return '消耗品費'; // デフォルト
  }
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