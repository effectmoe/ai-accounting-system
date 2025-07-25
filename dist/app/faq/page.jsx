"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FaqPage;
const react_1 = require("react");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const card_1 = require("@/components/ui/card");
const badge_1 = require("@/components/ui/badge");
const textarea_1 = require("@/components/ui/textarea");
const logger_1 = require("@/lib/logger");
const lucide_react_1 = require("lucide-react");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const react_markdown_1 = __importDefault(require("react-markdown"));
const dialog_1 = require("@/components/ui/dialog");
const label_1 = require("@/components/ui/label");
const select_1 = require("@/components/ui/select");
const slider_1 = require("@/components/ui/slider");
const tabs_1 = require("@/components/ui/tabs");
const alert_1 = require("@/components/ui/alert");
const CATEGORIES = [
    { name: 'tax', count: 0, color: 'bg-blue-100 text-blue-800' },
    { name: 'accounting', count: 0, color: 'bg-green-100 text-green-800' },
    { name: 'invoice', count: 0, color: 'bg-purple-100 text-purple-800' },
    { name: 'compliance', count: 0, color: 'bg-orange-100 text-orange-800' },
    { name: 'procedure', count: 0, color: 'bg-pink-100 text-pink-800' },
    { name: 'general', count: 0, color: 'bg-gray-100 text-gray-800' }
];
const DIFFICULTY_COLORS = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800'
};
const DIFFICULTY_LABELS = {
    beginner: '初級',
    intermediate: '中級',
    advanced: '上級'
};
function FaqPage() {
    const [faqs, setFaqs] = (0, react_1.useState)([]);
    const [filteredFaqs, setFilteredFaqs] = (0, react_1.useState)([]);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [selectedCategory, setSelectedCategory] = (0, react_1.useState)('');
    const [selectedDifficulty, setSelectedDifficulty] = (0, react_1.useState)('');
    const [selectedTags, setSelectedTags] = (0, react_1.useState)([]);
    const [sortBy, setSortBy] = (0, react_1.useState)('popularity');
    const [sortOrder, setSortOrder] = (0, react_1.useState)('desc');
    const [expandedFaq, setExpandedFaq] = (0, react_1.useState)(null);
    const [showFilters, setShowFilters] = (0, react_1.useState)(false);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = (0, react_1.useState)(false);
    const [faqToDelete, setFaqToDelete] = (0, react_1.useState)(null);
    const [isDeleting, setIsDeleting] = (0, react_1.useState)(false);
    const [editDialogOpen, setEditDialogOpen] = (0, react_1.useState)(false);
    const [editingFaq, setEditingFaq] = (0, react_1.useState)(null);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [relatedFaqs, setRelatedFaqs] = (0, react_1.useState)([]);
    const [showMigrationDialog, setShowMigrationDialog] = (0, react_1.useState)(false);
    const [isMigrating, setIsMigrating] = (0, react_1.useState)(false);
    // FAQデータを取得
    (0, react_1.useEffect)(() => {
        fetchFaqs();
    }, [sortBy, sortOrder]);
    const fetchFaqs = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                status: 'published',
                limit: '100',
                sortBy,
                sortOrder,
                includeStructuredData: 'true'
            });
            logger_1.logger.debug('[FAQ Page] Fetching FAQs with params:', params.toString());
            const response = await fetch(`/api/faq?${params}`);
            logger_1.logger.debug('[FAQ Page] Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            logger_1.logger.debug('[FAQ Page] Response data:', data);
            if (data.success) {
                setFaqs(data.faqs || []);
                setFilteredFaqs(data.faqs || []);
                // すべてのタグを収集
                const allTags = new Set();
                data.faqs.forEach((faq) => {
                    faq.tags.forEach(tag => allTags.add(tag));
                });
                // カテゴリごとの件数を更新
                CATEGORIES.forEach(cat => {
                    cat.count = data.faqs.filter((faq) => faq.category === cat.name).length;
                });
            }
            else {
                logger_1.logger.error('Failed to fetch FAQs:', data.error);
                // 空の配列をセット
                setFaqs([]);
                setFilteredFaqs([]);
            }
        }
        catch (error) {
            logger_1.logger.error('Error fetching FAQs:', error);
            // エラー時も空の配列をセット
            setFaqs([]);
            setFilteredFaqs([]);
        }
        finally {
            setLoading(false);
        }
    };
    // 検索とフィルタリング
    (0, react_1.useEffect)(() => {
        let filtered = faqs;
        // 検索フィルター
        if (searchQuery) {
            filtered = filtered.filter(faq => faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (faq.searchKeywords && faq.searchKeywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))));
        }
        // カテゴリフィルター
        if (selectedCategory) {
            filtered = filtered.filter(faq => faq.category === selectedCategory);
        }
        // 難易度フィルター
        if (selectedDifficulty) {
            filtered = filtered.filter(faq => faq.difficulty === selectedDifficulty);
        }
        // タグフィルター
        if (selectedTags.length > 0) {
            filtered = filtered.filter(faq => selectedTags.some(tag => faq.tags.includes(tag)));
        }
        setFilteredFaqs(filtered);
    }, [faqs, searchQuery, selectedCategory, selectedDifficulty, selectedTags]);
    const handleFaqVote = async (faqId, voteType) => {
        try {
            const response = await fetch('/api/faq/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ faqId, voteType })
            });
            if (response.ok) {
                // 投票を反映
                setFaqs(prev => prev.map(faq => faq.id === faqId
                    ? {
                        ...faq,
                        helpfulVotes: voteType === 'helpful' ? faq.helpfulVotes + 1 : faq.helpfulVotes,
                        unhelpfulVotes: voteType === 'unhelpful' ? faq.unhelpfulVotes + 1 : faq.unhelpfulVotes
                    }
                    : faq));
            }
        }
        catch (error) {
            logger_1.logger.error('Error voting on FAQ:', error);
        }
    };
    const handleDeleteClick = (faq) => {
        setFaqToDelete(faq);
        setDeleteDialogOpen(true);
    };
    const handleDeleteConfirm = async () => {
        if (!faqToDelete)
            return;
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/faq/${faqToDelete.id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (response.ok && data.success) {
                // FAQリストから削除
                setFaqs(prev => prev.filter(faq => faq.id !== faqToDelete.id));
                setFilteredFaqs(prev => prev.filter(faq => faq.id !== faqToDelete.id));
                // ダイアログを閉じる
                setDeleteDialogOpen(false);
                setFaqToDelete(null);
                logger_1.logger.debug('FAQ deleted successfully');
            }
            else {
                logger_1.logger.error('Failed to delete FAQ:', data.error);
                alert('FAQの削除に失敗しました: ' + (data.error || '不明なエラー'));
            }
        }
        catch (error) {
            logger_1.logger.error('Error deleting FAQ:', error);
            alert('FAQの削除中にエラーが発生しました');
        }
        finally {
            setIsDeleting(false);
        }
    };
    const handleEditClick = async (faq) => {
        setEditingFaq(faq);
        // 関連FAQを取得
        if (faq.relatedFaqIds && faq.relatedFaqIds.length > 0) {
            try {
                const relatedData = await Promise.all(faq.relatedFaqIds.map(id => fetch(`/api/faq?id=${id}`).then(res => res.json())));
                setRelatedFaqs(relatedData.filter(d => d.success).map(d => d.faq));
            }
            catch (error) {
                logger_1.logger.error('Error fetching related FAQs:', error);
                setRelatedFaqs([]);
            }
        }
        else {
            setRelatedFaqs([]);
        }
        setEditDialogOpen(true);
    };
    const handleSaveEdit = async () => {
        if (!editingFaq)
            return;
        setIsSaving(true);
        try {
            const response = await fetch(`/api/faq/${editingFaq.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingFaq)
            });
            const data = await response.json();
            if (response.ok && data.success) {
                // FAQリストを更新
                setFaqs(prev => prev.map(faq => faq.id === editingFaq.id ? editingFaq : faq));
                setFilteredFaqs(prev => prev.map(faq => faq.id === editingFaq.id ? editingFaq : faq));
                // ダイアログを閉じる
                setEditDialogOpen(false);
                setEditingFaq(null);
                logger_1.logger.debug('FAQ updated successfully');
            }
            else {
                logger_1.logger.error('Failed to update FAQ:', data.error);
                alert('FAQの更新に失敗しました: ' + (data.error || '不明なエラー'));
            }
        }
        catch (error) {
            logger_1.logger.error('Error updating FAQ:', error);
            alert('FAQの更新中にエラーが発生しました');
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleMigration = async () => {
        setIsMigrating(true);
        try {
            const response = await fetch('/api/faq/migrate', {
                method: 'POST'
            });
            const data = await response.json();
            if (response.ok && data.success) {
                alert(`${data.migratedCount}件のFAQを移行しました`);
                // FAQリストを再取得
                fetchFaqs();
            }
            else {
                logger_1.logger.error('Migration failed:', data.error);
                alert('移行に失敗しました: ' + (data.error || '不明なエラー'));
            }
        }
        catch (error) {
            logger_1.logger.error('Error during migration:', error);
            alert('移行中にエラーが発生しました');
        }
        finally {
            setIsMigrating(false);
            setShowMigrationDialog(false);
        }
    };
    const exportFaqs = () => {
        const dataStr = JSON.stringify(filteredFaqs, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `faq-export-${(0, date_fns_1.format)(new Date(), 'yyyy-MM-dd')}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };
    const getCategoryColor = (category) => {
        const cat = CATEGORIES.find(c => c.name === category);
        return cat ? cat.color : 'bg-gray-100 text-gray-800';
    };
    const getStatusIcon = (status) => {
        switch (status) {
            case 'published': return <lucide_react_1.CheckCircle className="w-4 h-4 text-green-600"/>;
            case 'draft': return <lucide_react_1.Edit className="w-4 h-4 text-gray-600"/>;
            case 'review': return <lucide_react_1.AlertCircle className="w-4 h-4 text-yellow-600"/>;
            case 'archived': return <lucide_react_1.Archive className="w-4 h-4 text-gray-600"/>;
            default: return <lucide_react_1.HelpCircle className="w-4 h-4 text-gray-600"/>;
        }
    };
    if (loading) {
        return (<div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>);
    }
    return (<div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <lucide_react_1.BookOpen className="w-6 h-6 text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">税務・会計FAQ</h1>
            <p className="text-gray-600">よくある質問とその回答</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button_1.Button variant="outline" size="sm" onClick={() => setShowMigrationDialog(true)} className="flex items-center gap-2">
            <lucide_react_1.TrendingUp className="w-4 h-4"/>
            データ移行
          </button_1.Button>
          <button_1.Button variant="outline" size="sm" onClick={exportFaqs} className="flex items-center gap-2">
            <lucide_react_1.Download className="w-4 h-4"/>
            エクスポート
          </button_1.Button>
          <button_1.Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
            <lucide_react_1.Filter className="w-4 h-4"/>
            フィルター
          </button_1.Button>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <card_1.Card>
          <card_1.CardContent className="p-4">
            <div className="flex items-center gap-2">
              <lucide_react_1.BookOpen className="w-5 h-5 text-blue-600"/>
              <div>
                <p className="text-sm text-gray-600">総FAQ数</p>
                <p className="text-2xl font-bold text-gray-900">{faqs.length}</p>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>
        
        <card_1.Card>
          <card_1.CardContent className="p-4">
            <div className="flex items-center gap-2">
              <lucide_react_1.Eye className="w-5 h-5 text-green-600"/>
              <div>
                <p className="text-sm text-gray-600">総閲覧数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {faqs.reduce((sum, faq) => sum + faq.viewCount, 0)}
                </p>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>
        
        <card_1.Card>
          <card_1.CardContent className="p-4">
            <div className="flex items-center gap-2">
              <lucide_react_1.ThumbsUp className="w-5 h-5 text-purple-600"/>
              <div>
                <p className="text-sm text-gray-600">評価数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {faqs.reduce((sum, faq) => sum + faq.helpfulVotes, 0)}
                </p>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>
        
        <card_1.Card>
          <card_1.CardContent className="p-4">
            <div className="flex items-center gap-2">
              <lucide_react_1.Star className="w-5 h-5 text-orange-600"/>
              <div>
                <p className="text-sm text-gray-600">平均品質スコア</p>
                <p className="text-2xl font-bold text-gray-900">
                  {faqs.length > 0 ? Math.round(faqs.reduce((sum, faq) => sum + faq.qualityScore, 0) / faqs.length) : 0}
                </p>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      {/* 検索・フィルター */}
      <card_1.Card>
        <card_1.CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <lucide_react_1.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"/>
              <input_1.Input placeholder="FAQを検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10"/>
            </div>
            
            {showFilters && (<div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">カテゴリ</label>
                  <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full p-2 border rounded-md">
                    <option value="">すべて</option>
                    {CATEGORIES.map(cat => (<option key={cat.name} value={cat.name}>
                        {cat.name}
                      </option>))}
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">難易度</label>
                  <select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)} className="w-full p-2 border rounded-md">
                    <option value="">すべて</option>
                    <option value="beginner">初級</option>
                    <option value="intermediate">中級</option>
                    <option value="advanced">上級</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">並び順</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full p-2 border rounded-md">
                    <option value="popularity">人気順</option>
                    <option value="date">作成日順</option>
                    <option value="quality">品質順</option>
                  </select>
                </div>
              </div>)}
          </div>
        </card_1.CardContent>
      </card_1.Card>

      {/* FAQ一覧 */}
      <div className="space-y-4">
        {filteredFaqs.map((faq) => (<card_1.Card key={faq.id} className="hover:shadow-lg transition-shadow">
            <card_1.CardContent className="p-6">
              <div className="space-y-4">
                {/* ヘッダー */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <badge_1.Badge className={getCategoryColor(faq.category)}>
                        {faq.category}
                      </badge_1.Badge>
                      <badge_1.Badge className={DIFFICULTY_COLORS[faq.difficulty]}>
                        {DIFFICULTY_LABELS[faq.difficulty]}
                      </badge_1.Badge>
                      {faq.isFeatured && (<badge_1.Badge className="bg-yellow-100 text-yellow-800">
                          <lucide_react_1.Star className="w-3 h-3 mr-1"/>
                          注目
                        </badge_1.Badge>)}
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {faq.question}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <lucide_react_1.Eye className="w-4 h-4"/>
                        {faq.viewCount} 回閲覧
                      </div>
                      <div className="flex items-center gap-1">
                        <lucide_react_1.ThumbsUp className="w-4 h-4"/>
                        {faq.helpfulVotes}
                      </div>
                      <div className="flex items-center gap-1">
                        <lucide_react_1.Star className="w-4 h-4"/>
                        品質: {faq.qualityScore}
                      </div>
                      <div className="flex items-center gap-1">
                        <lucide_react_1.Calendar className="w-4 h-4"/>
                        {(0, date_fns_1.format)(new Date(faq.createdAt), 'yyyy/MM/dd', { locale: locale_1.ja })}
                      </div>
                    </div>
                  </div>
                  
                  <button_1.Button variant="ghost" size="sm" onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)} className="flex items-center gap-2">
                    {expandedFaq === faq.id ? (<lucide_react_1.ChevronUp className="w-4 h-4"/>) : (<lucide_react_1.ChevronDown className="w-4 h-4"/>)}
                    {expandedFaq === faq.id ? '閉じる' : '詳細'}
                  </button_1.Button>
                </div>

                {/* 展開された回答 */}
                {expandedFaq === faq.id && (<div className="border-t pt-4">
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <react_markdown_1.default className="prose max-w-none">
                        {faq.answer}
                      </react_markdown_1.default>
                    </div>
                    
                    {/* タグ */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {faq.tags.map(tag => (<badge_1.Badge key={tag} variant="outline" className="text-xs">
                          <lucide_react_1.Tag className="w-3 h-3 mr-1"/>
                          {tag}
                        </badge_1.Badge>))}
                    </div>
                    
                    {/* アクション */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button_1.Button variant="outline" size="sm" onClick={() => handleFaqVote(faq.id, 'helpful')} className="flex items-center gap-1">
                          <lucide_react_1.ThumbsUp className="w-4 h-4"/>
                          役に立った ({faq.helpfulVotes})
                        </button_1.Button>
                        <button_1.Button variant="outline" size="sm" onClick={() => handleFaqVote(faq.id, 'unhelpful')} className="flex items-center gap-1">
                          <lucide_react_1.ThumbsDown className="w-4 h-4"/>
                          役に立たなかった ({faq.unhelpfulVotes})
                        </button_1.Button>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <button_1.Button variant="outline" size="sm" onClick={() => handleEditClick(faq)} className="flex items-center gap-2">
                            <lucide_react_1.Edit className="w-4 h-4"/>
                            編集
                          </button_1.Button>
                          <button_1.Button variant="outline" size="sm" onClick={() => handleDeleteClick(faq)} className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:border-red-300">
                            <lucide_react_1.Trash2 className="w-4 h-4"/>
                            削除
                          </button_1.Button>
                        </div>
                        <div className="text-sm text-gray-500">
                          最終更新: {(0, date_fns_1.format)(new Date(faq.updatedAt), 'yyyy/MM/dd HH:mm', { locale: locale_1.ja })}
                        </div>
                      </div>
                    </div>
                  </div>)}
              </div>
            </card_1.CardContent>
          </card_1.Card>))}
      </div>

      {filteredFaqs.length === 0 && (<card_1.Card>
          <card_1.CardContent className="p-8 text-center">
            <lucide_react_1.BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4"/>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              FAQが見つかりませんでした
            </h3>
            <p className="text-gray-600">
              検索条件を変更してもう一度お試しください。
            </p>
          </card_1.CardContent>
        </card_1.Card>)}

      {/* 削除確認ダイアログ */}
      <dialog_1.Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <dialog_1.DialogContent>
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>FAQの削除確認</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              このFAQを削除してよろしいですか？この操作は取り消せません。
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          {faqToDelete && (<div className="py-4">
              <p className="text-sm text-gray-600 mb-2">削除するFAQ:</p>
              <p className="font-medium">{faqToDelete.question}</p>
            </div>)}
          <dialog_1.DialogFooter>
            <button_1.Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              キャンセル
            </button_1.Button>
            <button_1.Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? '削除中...' : '削除する'}
            </button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>

      {/* 編集ダイアログ */}
      <dialog_1.Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <dialog_1.DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>FAQ編集</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              FAQの詳細情報と構造化データを編集できます
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          
          {editingFaq && (<tabs_1.Tabs defaultValue="basic" className="w-full">
              <tabs_1.TabsList className="grid w-full grid-cols-4">
                <tabs_1.TabsTrigger value="basic">基本情報</tabs_1.TabsTrigger>
                <tabs_1.TabsTrigger value="structured">構造化データ</tabs_1.TabsTrigger>
                <tabs_1.TabsTrigger value="quality">品質管理</tabs_1.TabsTrigger>
                <tabs_1.TabsTrigger value="related">関連情報</tabs_1.TabsTrigger>
              </tabs_1.TabsList>
              
              <tabs_1.TabsContent value="basic" className="space-y-4">
                <div>
                  <label_1.Label htmlFor="question">質問</label_1.Label>
                  <textarea_1.Textarea id="question" value={editingFaq.question} onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })} className="mt-1" rows={3}/>
                </div>
                
                <div>
                  <label_1.Label htmlFor="answer">回答</label_1.Label>
                  <textarea_1.Textarea id="answer" value={editingFaq.answer} onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })} className="mt-1" rows={6}/>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label_1.Label htmlFor="category">カテゴリ</label_1.Label>
                    <select_1.Select value={editingFaq.category} onValueChange={(value) => setEditingFaq({ ...editingFaq, category: value })}>
                      <select_1.SelectTrigger id="category" className="mt-1">
                        <select_1.SelectValue />
                      </select_1.SelectTrigger>
                      <select_1.SelectContent>
                        {CATEGORIES.map(cat => (<select_1.SelectItem key={cat.name} value={cat.name}>
                            {cat.name}
                          </select_1.SelectItem>))}
                      </select_1.SelectContent>
                    </select_1.Select>
                  </div>
                  
                  <div>
                    <label_1.Label htmlFor="difficulty">難易度</label_1.Label>
                    <select_1.Select value={editingFaq.difficulty} onValueChange={(value) => setEditingFaq({ ...editingFaq, difficulty: value })}>
                      <select_1.SelectTrigger id="difficulty" className="mt-1">
                        <select_1.SelectValue />
                      </select_1.SelectTrigger>
                      <select_1.SelectContent>
                        <select_1.SelectItem value="beginner">初級</select_1.SelectItem>
                        <select_1.SelectItem value="intermediate">中級</select_1.SelectItem>
                        <select_1.SelectItem value="advanced">上級</select_1.SelectItem>
                      </select_1.SelectContent>
                    </select_1.Select>
                  </div>
                </div>
                
                <div>
                  <label_1.Label htmlFor="tags">タグ（カンマ区切り）</label_1.Label>
                  <input_1.Input id="tags" value={editingFaq.tags.join(', ')} onChange={(e) => setEditingFaq({
                ...editingFaq,
                tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
            })} className="mt-1"/>
                </div>
                
                <div>
                  <label_1.Label htmlFor="priority">優先度 (1-10)</label_1.Label>
                  <div className="flex items-center gap-4 mt-1">
                    <slider_1.Slider id="priority" value={[editingFaq.priority]} onValueChange={(value) => setEditingFaq({ ...editingFaq, priority: value[0] })} min={1} max={10} step={1} className="flex-1"/>
                    <span className="w-12 text-center font-medium">{editingFaq.priority}</span>
                  </div>
                </div>
              </tabs_1.TabsContent>
              
              <tabs_1.TabsContent value="structured" className="space-y-4">
                <div>
                  <label_1.Label htmlFor="contentType">コンテンツタイプ</label_1.Label>
                  <select_1.Select value={editingFaq.structuredData?.contentType || 'general'} onValueChange={(value) => setEditingFaq({
                ...editingFaq,
                structuredData: {
                    ...editingFaq.structuredData,
                    contentType: value
                }
            })}>
                    <select_1.SelectTrigger id="contentType" className="mt-1">
                      <select_1.SelectValue />
                    </select_1.SelectTrigger>
                    <select_1.SelectContent>
                      <select_1.SelectItem value="tax">税務</select_1.SelectItem>
                      <select_1.SelectItem value="accounting">会計</select_1.SelectItem>
                      <select_1.SelectItem value="invoice">請求</select_1.SelectItem>
                      <select_1.SelectItem value="compliance">コンプライアンス</select_1.SelectItem>
                      <select_1.SelectItem value="procedure">手続き</select_1.SelectItem>
                      <select_1.SelectItem value="general">一般</select_1.SelectItem>
                    </select_1.SelectContent>
                  </select_1.Select>
                </div>
                
                <div>
                  <label_1.Label htmlFor="taxLaw">関連する税法（カンマ区切り）</label_1.Label>
                  <input_1.Input id="taxLaw" value={editingFaq.structuredData?.taxLaw?.join(', ') || ''} onChange={(e) => setEditingFaq({
                ...editingFaq,
                structuredData: {
                    ...editingFaq.structuredData,
                    taxLaw: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                }
            })} className="mt-1" placeholder="例: 法人税法, 消費税法"/>
                </div>
                
                <div>
                  <label_1.Label htmlFor="businessTypes">適用業種（カンマ区切り）</label_1.Label>
                  <input_1.Input id="businessTypes" value={editingFaq.structuredData?.applicableBusinessTypes?.join(', ') || ''} onChange={(e) => setEditingFaq({
                ...editingFaq,
                structuredData: {
                    ...editingFaq.structuredData,
                    applicableBusinessTypes: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                }
            })} className="mt-1" placeholder="例: 製造業, サービス業, 小売業"/>
                </div>
                
                <div>
                  <label_1.Label htmlFor="searchKeywords">検索キーワード（カンマ区切り）</label_1.Label>
                  <input_1.Input id="searchKeywords" value={editingFaq.searchKeywords?.join(', ') || ''} onChange={(e) => setEditingFaq({
                ...editingFaq,
                searchKeywords: e.target.value.split(',').map(t => t.trim()).filter(t => t)
            })} className="mt-1" placeholder="例: 確定申告, 年末調整, 源泉徴収"/>
                </div>
              </tabs_1.TabsContent>
              
              <tabs_1.TabsContent value="quality" className="space-y-4">
                <alert_1.Alert>
                  <lucide_react_1.AlertCircle className="h-4 w-4"/>
                  <alert_1.AlertDescription>
                    品質スコアは0-100の範囲で設定してください。総合スコアは自動的に計算されます。
                  </alert_1.AlertDescription>
                </alert_1.Alert>
                
                <div>
                  <label_1.Label htmlFor="accuracy">正確性</label_1.Label>
                  <div className="flex items-center gap-4 mt-1">
                    <slider_1.Slider id="accuracy" value={[editingFaq.qualityMetrics?.accuracy || 85]} onValueChange={(value) => setEditingFaq({
                ...editingFaq,
                qualityMetrics: {
                    ...editingFaq.qualityMetrics,
                    accuracy: value[0],
                    overallScore: Math.round((value[0] +
                        (editingFaq.qualityMetrics?.completeness || 85) +
                        (editingFaq.qualityMetrics?.clarity || 85) +
                        (editingFaq.qualityMetrics?.usefulness || 85)) / 4)
                }
            })} min={0} max={100} step={5} className="flex-1"/>
                    <span className="w-12 text-center font-medium">{editingFaq.qualityMetrics?.accuracy || 85}</span>
                  </div>
                </div>
                
                <div>
                  <label_1.Label htmlFor="completeness">完全性</label_1.Label>
                  <div className="flex items-center gap-4 mt-1">
                    <slider_1.Slider id="completeness" value={[editingFaq.qualityMetrics?.completeness || 85]} onValueChange={(value) => setEditingFaq({
                ...editingFaq,
                qualityMetrics: {
                    ...editingFaq.qualityMetrics,
                    completeness: value[0],
                    overallScore: Math.round(((editingFaq.qualityMetrics?.accuracy || 85) +
                        value[0] +
                        (editingFaq.qualityMetrics?.clarity || 85) +
                        (editingFaq.qualityMetrics?.usefulness || 85)) / 4)
                }
            })} min={0} max={100} step={5} className="flex-1"/>
                    <span className="w-12 text-center font-medium">{editingFaq.qualityMetrics?.completeness || 85}</span>
                  </div>
                </div>
                
                <div>
                  <label_1.Label htmlFor="clarity">明確性</label_1.Label>
                  <div className="flex items-center gap-4 mt-1">
                    <slider_1.Slider id="clarity" value={[editingFaq.qualityMetrics?.clarity || 85]} onValueChange={(value) => setEditingFaq({
                ...editingFaq,
                qualityMetrics: {
                    ...editingFaq.qualityMetrics,
                    clarity: value[0],
                    overallScore: Math.round(((editingFaq.qualityMetrics?.accuracy || 85) +
                        (editingFaq.qualityMetrics?.completeness || 85) +
                        value[0] +
                        (editingFaq.qualityMetrics?.usefulness || 85)) / 4)
                }
            })} min={0} max={100} step={5} className="flex-1"/>
                    <span className="w-12 text-center font-medium">{editingFaq.qualityMetrics?.clarity || 85}</span>
                  </div>
                </div>
                
                <div>
                  <label_1.Label htmlFor="usefulness">有用性</label_1.Label>
                  <div className="flex items-center gap-4 mt-1">
                    <slider_1.Slider id="usefulness" value={[editingFaq.qualityMetrics?.usefulness || 85]} onValueChange={(value) => setEditingFaq({
                ...editingFaq,
                qualityMetrics: {
                    ...editingFaq.qualityMetrics,
                    usefulness: value[0],
                    overallScore: Math.round(((editingFaq.qualityMetrics?.accuracy || 85) +
                        (editingFaq.qualityMetrics?.completeness || 85) +
                        (editingFaq.qualityMetrics?.clarity || 85) +
                        value[0]) / 4)
                }
            })} min={0} max={100} step={5} className="flex-1"/>
                    <span className="w-12 text-center font-medium">{editingFaq.qualityMetrics?.usefulness || 85}</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <label_1.Label>総合スコア</label_1.Label>
                    <span className="text-2xl font-bold text-blue-600">
                      {editingFaq.qualityMetrics?.overallScore || Math.round(((editingFaq.qualityMetrics?.accuracy || 85) +
                (editingFaq.qualityMetrics?.completeness || 85) +
                (editingFaq.qualityMetrics?.clarity || 85) +
                (editingFaq.qualityMetrics?.usefulness || 85)) / 4)}
                    </span>
                  </div>
                </div>
              </tabs_1.TabsContent>
              
              <tabs_1.TabsContent value="related" className="space-y-4">
                <div>
                  <label_1.Label>関連FAQ</label_1.Label>
                  <div className="mt-2 space-y-2">
                    {relatedFaqs.length > 0 ? (relatedFaqs.map(relatedFaq => (<card_1.Card key={relatedFaq.id} className="p-3">
                          <p className="font-medium text-sm">{relatedFaq.question}</p>
                          <p className="text-xs text-gray-600 mt-1">{relatedFaq.category} • {DIFFICULTY_LABELS[relatedFaq.difficulty]}</p>
                        </card_1.Card>))) : (<p className="text-sm text-gray-500">関連FAQはありません</p>)}
                  </div>
                </div>
                
                <div>
                  <label_1.Label>統計情報</label_1.Label>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <card_1.Card className="p-3">
                      <p className="text-sm text-gray-600">閲覧数</p>
                      <p className="text-xl font-bold">{editingFaq.viewCount}</p>
                    </card_1.Card>
                    <card_1.Card className="p-3">
                      <p className="text-sm text-gray-600">評価</p>
                      <p className="text-xl font-bold">
                        👍 {editingFaq.helpfulVotes} / 👎 {editingFaq.unhelpfulVotes}
                      </p>
                    </card_1.Card>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label_1.Label>作成日</label_1.Label>
                    <p className="mt-1 text-sm">{(0, date_fns_1.format)(new Date(editingFaq.createdAt), 'yyyy/MM/dd HH:mm', { locale: locale_1.ja })}</p>
                  </div>
                  <div>
                    <label_1.Label>更新日</label_1.Label>
                    <p className="mt-1 text-sm">{(0, date_fns_1.format)(new Date(editingFaq.updatedAt), 'yyyy/MM/dd HH:mm', { locale: locale_1.ja })}</p>
                  </div>
                </div>
              </tabs_1.TabsContent>
            </tabs_1.Tabs>)}
          
          <dialog_1.DialogFooter>
            <button_1.Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSaving}>
              キャンセル
            </button_1.Button>
            <button_1.Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? '保存中...' : '保存する'}
            </button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>

      {/* 移行確認ダイアログ */}
      <dialog_1.Dialog open={showMigrationDialog} onOpenChange={setShowMigrationDialog}>
        <dialog_1.DialogContent>
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>データ移行の確認</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              既存のfaqコレクションからfaq_articlesコレクションへデータを移行します。
              この操作により、すべてのFAQが新しい構造化データ形式に変換されます。
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <alert_1.Alert>
            <lucide_react_1.AlertCircle className="h-4 w-4"/>
            <alert_1.AlertDescription>
              移行前に必ずデータのバックアップを取ってください。
              この操作は取り消すことができません。
            </alert_1.AlertDescription>
          </alert_1.Alert>
          <dialog_1.DialogFooter>
            <button_1.Button variant="outline" onClick={() => setShowMigrationDialog(false)} disabled={isMigrating}>
              キャンセル
            </button_1.Button>
            <button_1.Button onClick={handleMigration} disabled={isMigrating}>
              {isMigrating ? '移行中...' : '移行を実行'}
            </button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>
    </div>);
}
