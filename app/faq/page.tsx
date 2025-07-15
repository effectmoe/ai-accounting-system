'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Filter, 
  BookOpen, 
  Star, 
  Clock, 
  Eye,
  ThumbsUp,
  ThumbsDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Calendar,
  Tag,
  User,
  Archive,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  subcategory?: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  priority: number;
  status: 'draft' | 'review' | 'published' | 'archived' | 'deprecated';
  isPublished: boolean;
  isFeatured: boolean;
  qualityScore: number;
  viewCount: number;
  helpfulVotes: number;
  unhelpfulVotes: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

interface CategoryStats {
  name: string;
  count: number;
  color: string;
}

const CATEGORIES: CategoryStats[] = [
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

export default function FaqPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<FaqItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'popularity' | 'quality'>('popularity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  // FAQデータを取得
  useEffect(() => {
    fetchFaqs();
  }, [sortBy, sortOrder]);

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: 'published',
        limit: '100',
        sortBy,
        sortOrder
      });

      const response = await fetch(`/api/faq?${params}`);
      const data = await response.json();

      if (data.success) {
        setFaqs(data.faqs);
        setFilteredFaqs(data.faqs);
      } else {
        console.error('Failed to fetch FAQs:', data.error);
      }
    } catch (error) {
      console.error('Error fetching FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  // 検索とフィルタリング
  useEffect(() => {
    let filtered = faqs;

    // 検索フィルター
    if (searchQuery) {
      filtered = filtered.filter(faq => 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // カテゴリフィルター
    if (selectedCategory) {
      filtered = filtered.filter(faq => faq.category === selectedCategory);
    }

    // 難易度フィルター
    if (selectedDifficulty) {
      filtered = filtered.filter(faq => faq.difficulty === selectedDifficulty);
    }

    setFilteredFaqs(filtered);
  }, [faqs, searchQuery, selectedCategory, selectedDifficulty]);

  const handleFaqVote = async (faqId: string, voteType: 'helpful' | 'unhelpful') => {
    try {
      const response = await fetch('/api/faq/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faqId, voteType })
      });

      if (response.ok) {
        // 投票を反映
        setFaqs(prev => prev.map(faq => 
          faq.id === faqId 
            ? { 
                ...faq, 
                helpfulVotes: voteType === 'helpful' ? faq.helpfulVotes + 1 : faq.helpfulVotes,
                unhelpfulVotes: voteType === 'unhelpful' ? faq.unhelpfulVotes + 1 : faq.unhelpfulVotes
              }
            : faq
        ));
      }
    } catch (error) {
      console.error('Error voting on FAQ:', error);
    }
  };

  const exportFaqs = () => {
    const dataStr = JSON.stringify(filteredFaqs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `faq-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getCategoryColor = (category: string) => {
    const cat = CATEGORIES.find(c => c.name === category);
    return cat ? cat.color : 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'draft': return <Edit className="w-4 h-4 text-gray-600" />;
      case 'review': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'archived': return <Archive className="w-4 h-4 text-gray-600" />;
      default: return <HelpCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">税務・会計FAQ</h1>
            <p className="text-gray-600">よくある質問とその回答</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportFaqs}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            エクスポート
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            フィルター
          </Button>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">総FAQ数</p>
                <p className="text-2xl font-bold text-gray-900">{faqs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">総閲覧数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {faqs.reduce((sum, faq) => sum + faq.viewCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">評価数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {faqs.reduce((sum, faq) => sum + faq.helpfulVotes, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">平均品質スコア</p>
                <p className="text-2xl font-bold text-gray-900">
                  {faqs.length > 0 ? Math.round(faqs.reduce((sum, faq) => sum + faq.qualityScore, 0) / faqs.length) : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 検索・フィルター */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="FAQを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">カテゴリ</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">すべて</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">難易度</label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">すべて</option>
                    <option value="beginner">初級</option>
                    <option value="intermediate">中級</option>
                    <option value="advanced">上級</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">並び順</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="popularity">人気順</option>
                    <option value="date">作成日順</option>
                    <option value="quality">品質順</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* FAQ一覧 */}
      <div className="space-y-4">
        {filteredFaqs.map((faq) => (
          <Card key={faq.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* ヘッダー */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getCategoryColor(faq.category)}>
                        {faq.category}
                      </Badge>
                      <Badge className={DIFFICULTY_COLORS[faq.difficulty]}>
                        {DIFFICULTY_LABELS[faq.difficulty]}
                      </Badge>
                      {faq.isFeatured && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Star className="w-3 h-3 mr-1" />
                          注目
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {faq.question}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {faq.viewCount} 回閲覧
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" />
                        {faq.helpfulVotes}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4" />
                        品質: {faq.qualityScore}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(faq.createdAt), 'yyyy/MM/dd', { locale: ja })}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                    className="flex items-center gap-2"
                  >
                    {expandedFaq === faq.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    {expandedFaq === faq.id ? '閉じる' : '詳細'}
                  </Button>
                </div>

                {/* 展開された回答 */}
                {expandedFaq === faq.id && (
                  <div className="border-t pt-4">
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <ReactMarkdown className="prose max-w-none">
                        {faq.answer}
                      </ReactMarkdown>
                    </div>
                    
                    {/* タグ */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {faq.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* アクション */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFaqVote(faq.id, 'helpful')}
                          className="flex items-center gap-1"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          役に立った ({faq.helpfulVotes})
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFaqVote(faq.id, 'unhelpful')}
                          className="flex items-center gap-1"
                        >
                          <ThumbsDown className="w-4 h-4" />
                          役に立たなかった ({faq.unhelpfulVotes})
                        </Button>
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        最終更新: {format(new Date(faq.updatedAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFaqs.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              FAQが見つかりませんでした
            </h3>
            <p className="text-gray-600">
              検索条件を変更してもう一度お試しください。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}