'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function FaqTestPage() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sessionId, setSessionId] = useState(`test_session_${Date.now()}`);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim() || !answer.trim()) {
      setError('質問と回答の両方を入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('FAQ保存テスト開始...');
      
      const requestData = {
        question: question.trim(),
        answer: answer.trim(),
        sessionId,
        timestamp: new Date().toISOString()
      };

      console.log('リクエストデータ:', requestData);

      const response = await fetch('/api/faq/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('レスポンス:', response.status, response.statusText);

      const responseData = await response.json();
      console.log('レスポンスデータ:', responseData);

      setResult({
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        success: response.ok
      });

      if (response.ok) {
        console.log('FAQ保存成功!');
      } else {
        setError(`FAQ保存失敗: ${responseData.error}`);
      }

    } catch (err) {
      console.error('ネットワークエラー:', err);
      setError(`ネットワークエラー: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setQuestion('');
    setAnswer('');
    setSessionId(`test_session_${Date.now()}`);
    setResult(null);
    setError(null);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>FAQ保存機能テスト</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="sessionId" className="block text-sm font-medium mb-2">
                セッションID
              </label>
              <Input
                id="sessionId"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="セッションID"
              />
            </div>

            <div>
              <label htmlFor="question" className="block text-sm font-medium mb-2">
                質問
              </label>
              <Textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="テスト用の質問を入力してください"
                rows={3}
              />
            </div>

            <div>
              <label htmlFor="answer" className="block text-sm font-medium mb-2">
                回答
              </label>
              <Textarea
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="テスト用の回答を入力してください"
                rows={5}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'FAQ保存中...' : 'FAQ保存テスト'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                リセット
              </Button>
            </div>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className={result.success ? 'text-green-600' : 'text-red-600'}>
                  テスト結果
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <strong>ステータス:</strong> {result.status} {result.statusText}
                  </div>
                  <div>
                    <strong>成功:</strong> {result.success ? '✅ はい' : '❌ いいえ'}
                  </div>
                  {result.data.id && (
                    <div>
                      <strong>保存されたID:</strong> {result.data.id}
                    </div>
                  )}
                  {result.data.message && (
                    <div>
                      <strong>メッセージ:</strong> {result.data.message}
                    </div>
                  )}
                  {result.data.error && (
                    <div>
                      <strong>エラー:</strong> {result.data.error}
                    </div>
                  )}
                  <details className="mt-4">
                    <summary className="cursor-pointer font-medium">詳細データ</summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-sm overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}