"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NLWebAPI = void 0;
exports.getNLWebAPI = getNLWebAPI;
const logger_1 = require("@/lib/logger");
class NLWebAPI {
    config;
    constructor(config) {
        this.config = {
            timeout: 30000, // デフォルト30秒
            ...config
        };
    }
    /**
     * 自然言語クエリを解析
     */
    async analyzeQuery(request) {
        try {
            const response = await fetch(`${this.config.endpoint}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'X-NLWeb-Version': '1.0'
                },
                body: JSON.stringify({
                    query: request.query,
                    context: request.context || {},
                    language: request.language || 'ja',
                    max_tokens: request.maxTokens || 1000
                }),
                signal: AbortSignal.timeout(this.config.timeout)
            });
            if (!response.ok) {
                throw new Error(`NLWeb API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            return {
                success: true,
                data
            };
        }
        catch (error) {
            logger_1.logger.error('NLWeb API error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * 会計関連の自然言語処理
     */
    async processAccountingQuery(query, accountingContext) {
        const response = await this.analyzeQuery({
            query,
            context: {
                domain: 'accounting',
                ...accountingContext
            },
            language: 'ja'
        });
        if (!response.success || !response.data) {
            return {
                intent: 'unknown',
                entities: {}
            };
        }
        // インテントの判定
        const intent = this.mapToAccountingIntent(response.data.intent.name);
        // エンティティの抽出
        const entities = this.extractAccountingEntities(response.data.entities);
        // 提案の生成
        const result = {
            intent,
            entities
        };
        // 仕訳の提案
        if (intent === 'journal_entry' && response.data.suggestedActions) {
            result.suggestedJournalEntry = this.generateJournalEntrySuggestion(query, entities, response.data.suggestedActions);
        }
        // 文書の提案
        if (intent === 'document_generation' && response.data.suggestedActions) {
            result.suggestedDocument = this.generateDocumentSuggestion(query, entities, response.data.suggestedActions);
        }
        return result;
    }
    mapToAccountingIntent(nlwebIntent) {
        const intentMapping = {
            'create_journal': 'journal_entry',
            'record_transaction': 'journal_entry',
            'create_document': 'document_generation',
            'generate_invoice': 'document_generation',
            'generate_estimate': 'document_generation',
            'create_report': 'report',
            'search_transactions': 'search',
            'find_document': 'search'
        };
        return intentMapping[nlwebIntent] || 'unknown';
    }
    extractAccountingEntities(entities) {
        const result = {
            amounts: [],
            dates: [],
            accounts: [],
            partners: [],
            items: []
        };
        entities.forEach(entity => {
            switch (entity.type) {
                case 'money':
                case 'amount':
                    const amount = this.parseAmount(entity.value);
                    if (amount)
                        result.amounts.push(amount);
                    break;
                case 'date':
                case 'datetime':
                    const date = this.parseDate(entity.value);
                    if (date)
                        result.dates.push(date);
                    break;
                case 'account':
                case 'account_title':
                    result.accounts.push(entity.value);
                    break;
                case 'organization':
                case 'company':
                case 'partner':
                    result.partners.push(entity.value);
                    break;
                case 'product':
                case 'service':
                case 'item':
                    result.items.push(entity.value);
                    break;
            }
        });
        return result;
    }
    parseAmount(value) {
        const cleaned = value.replace(/[^\d.,-]/g, '').replace(/,/g, '');
        const amount = parseFloat(cleaned);
        return isNaN(amount) ? null : amount;
    }
    parseDate(value) {
        // 日本語の日付形式を処理
        const patterns = [
            /(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})/,
            /(\d{1,2})[月\/](\d{1,2})/,
            /今日|本日|今月|先月|来月/
        ];
        // 相対的な日付
        if (value.includes('今日') || value.includes('本日')) {
            return new Date().toISOString().split('T')[0];
        }
        // 年月日形式
        for (const pattern of patterns) {
            const match = value.match(pattern);
            if (match) {
                if (match[3]) {
                    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
                }
                else if (match[2]) {
                    const year = new Date().getFullYear();
                    return `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
                }
            }
        }
        return null;
    }
    generateJournalEntrySuggestion(query, entities, suggestedActions) {
        // デフォルトの仕訳
        const defaultEntry = {
            debit: { account: '現金', amount: 0 },
            credit: { account: '売上高', amount: 0 },
            description: query.substring(0, 100),
            date: entities.dates?.[0] || new Date().toISOString().split('T')[0]
        };
        // 金額の設定
        if (entities.amounts && entities.amounts.length > 0) {
            defaultEntry.debit.amount = entities.amounts[0];
            defaultEntry.credit.amount = entities.amounts[0];
        }
        // 勘定科目の推定
        const lowerQuery = query.toLowerCase();
        if (lowerQuery.includes('飲食') || lowerQuery.includes('飲み')) {
            defaultEntry.debit.account = '接待交際費';
            defaultEntry.credit.account = '現金';
        }
        else if (lowerQuery.includes('タクシー') || lowerQuery.includes('電車')) {
            defaultEntry.debit.account = '旅費交通費';
            defaultEntry.credit.account = '現金';
        }
        else if (lowerQuery.includes('売上') || lowerQuery.includes('販売')) {
            defaultEntry.debit.account = '現金';
            defaultEntry.credit.account = '売上高';
        }
        return defaultEntry;
    }
    generateDocumentSuggestion(query, entities, suggestedActions) {
        // 文書タイプの判定
        let type = 'invoice';
        if (query.includes('見積'))
            type = 'estimate';
        else if (query.includes('請求'))
            type = 'invoice';
        else if (query.includes('納品'))
            type = 'delivery_note';
        else if (query.includes('領収'))
            type = 'receipt';
        return {
            type,
            partner: entities.partners?.[0] || '取引先',
            amount: entities.amounts?.[0] || 0,
            items: entities.items?.map((item, index) => ({
                name: item,
                quantity: 1,
                price: entities.amounts?.[index] || 0
            })) || []
        };
    }
}
exports.NLWebAPI = NLWebAPI;
// シングルトンインスタンス
let nlwebInstance = null;
function getNLWebAPI() {
    if (!nlwebInstance) {
        const config = {
            endpoint: process.env.NLWEB_MCP_ENDPOINT || 'https://api.nlweb.com/v1',
            apiKey: process.env.NLWEB_MCP_KEY || '',
            timeout: 30000
        };
        nlwebInstance = new NLWebAPI(config);
    }
    return nlwebInstance;
}
