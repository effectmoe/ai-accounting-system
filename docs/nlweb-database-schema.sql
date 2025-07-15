-- NLWeb税制情報データベーススキーマ

-- 税制情報テーブル
CREATE TABLE tax_information (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source VARCHAR(255) NOT NULL,              -- 情報源（国税庁、e-Tax等）
    section VARCHAR(255) NOT NULL,             -- セクション名
    url TEXT NOT NULL UNIQUE,                  -- URL（重複防止）
    title TEXT NOT NULL,                       -- タイトル
    content TEXT NOT NULL,                     -- 本文
    tables JSONB,                              -- テーブルデータ（税率表等）
    lists JSONB,                               -- リスト項目
    metadata JSONB,                            -- メタデータ（更新日等）
    crawled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 税制検索インデックス（pgvector使用）
CREATE TABLE tax_search_index (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id TEXT NOT NULL,                  -- 元コンテンツのID/URL
    content_type VARCHAR(50) NOT NULL,         -- コンテンツタイプ
    title TEXT NOT NULL,
    summary TEXT NOT NULL,                     -- 要約（最初の500文字）
    embedding vector(1536),                    -- OpenAI embeddings
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- クロールキュー
CREATE TABLE crawl_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    priority INTEGER DEFAULT 5,                -- 優先度（1-10）
    status VARCHAR(20) DEFAULT 'pending',      -- pending, processing, completed, failed
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- 税制エンティティ（抽出された税制概念）
CREATE TABLE tax_entities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,          -- tax_rate, procedure, regulation等
    name TEXT NOT NULL,
    description TEXT,
    properties JSONB,                          -- 属性（税率値、適用条件等）
    source_url TEXT,
    valid_from DATE,
    valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 税制リレーション（エンティティ間の関係）
CREATE TABLE tax_relations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_entity_id UUID REFERENCES tax_entities(id),
    to_entity_id UUID REFERENCES tax_entities(id),
    relation_type VARCHAR(50) NOT NULL,        -- applies_to, supersedes, references等
    properties JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 税制Q&A（よくある質問と回答）
CREATE TABLE tax_qa (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100),
    source_url TEXT,
    confidence DECIMAL(3,2),                   -- 回答の信頼度
    verified BOOLEAN DEFAULT FALSE,            -- 人間による検証済みか
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 税制判断履歴（AIの判断結果を記録）
CREATE TABLE tax_decisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_context JSONB NOT NULL,              -- 判断に使用したコンテキスト
    decision_type VARCHAR(50) NOT NULL,        -- tax_rate, account_category等
    decision_result JSONB NOT NULL,            -- 判断結果
    confidence DECIMAL(3,2),
    reasoning TEXT,                            -- 判断理由
    references JSONB,                          -- 参照した税制情報
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_tax_information_source ON tax_information(source);
CREATE INDEX idx_tax_information_crawled_at ON tax_information(crawled_at DESC);
CREATE INDEX idx_tax_search_content_type ON tax_search_index(content_type);
CREATE INDEX idx_tax_entities_type ON tax_entities(entity_type);
CREATE INDEX idx_tax_entities_valid ON tax_entities(valid_from, valid_until);
CREATE INDEX idx_crawl_queue_status ON crawl_queue(status, priority DESC);
CREATE INDEX idx_tax_decisions_type ON tax_decisions(decision_type);
CREATE INDEX idx_tax_decisions_created ON tax_decisions(created_at DESC);

-- pgvectorインデックス（類似検索用）
CREATE INDEX idx_tax_search_embedding ON tax_search_index 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tax_information_updated_at BEFORE UPDATE
    ON tax_information FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_entities_updated_at BEFORE UPDATE
    ON tax_entities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_qa_updated_at BEFORE UPDATE
    ON tax_qa FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 検索関数（自然言語クエリ）
CREATE OR REPLACE FUNCTION search_tax_info(query_embedding vector(1536), limit_count int = 10)
RETURNS TABLE(
    id UUID,
    title TEXT,
    summary TEXT,
    similarity float,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tsi.id,
        tsi.title,
        tsi.summary,
        1 - (tsi.embedding <=> query_embedding) as similarity,
        tsi.metadata
    FROM tax_search_index tsi
    ORDER BY tsi.embedding <=> query_embedding
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;