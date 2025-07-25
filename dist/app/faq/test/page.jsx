"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FaqTestPage;
const react_1 = require("react");
const button_1 = require("@/components/ui/button");
const textarea_1 = require("@/components/ui/textarea");
const input_1 = require("@/components/ui/input");
const card_1 = require("@/components/ui/card");
const alert_1 = require("@/components/ui/alert");
const logger_1 = require("@/lib/logger");
function FaqTestPage() {
    const [question, setQuestion] = (0, react_1.useState)('');
    const [answer, setAnswer] = (0, react_1.useState)('');
    const [sessionId, setSessionId] = (0, react_1.useState)(`test_session_${Date.now()}`);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [result, setResult] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!question.trim() || !answer.trim()) {
            setError('質問と回答の両方を入力してください');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            logger_1.logger.debug('FAQ保存テスト開始...');
            const requestData = {
                question: question.trim(),
                answer: answer.trim(),
                sessionId,
                timestamp: new Date().toISOString()
            };
            logger_1.logger.debug('リクエストデータ:', requestData);
            const response = await fetch('/api/faq/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });
            logger_1.logger.debug('レスポンス:', response.status, response.statusText);
            const responseData = await response.json();
            logger_1.logger.debug('レスポンスデータ:', responseData);
            setResult({
                status: response.status,
                statusText: response.statusText,
                data: responseData,
                success: response.ok
            });
            if (response.ok) {
                logger_1.logger.debug('FAQ保存成功!');
            }
            else {
                setError(`FAQ保存失敗: ${responseData.error}`);
            }
        }
        catch (err) {
            logger_1.logger.error('ネットワークエラー:', err);
            setError(`ネットワークエラー: ${err instanceof Error ? err.message : '不明なエラー'}`);
        }
        finally {
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
    return (<div className="container mx-auto p-6 max-w-4xl">
      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>FAQ保存機能テスト</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="sessionId" className="block text-sm font-medium mb-2">
                セッションID
              </label>
              <input_1.Input id="sessionId" value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="セッションID"/>
            </div>

            <div>
              <label htmlFor="question" className="block text-sm font-medium mb-2">
                質問
              </label>
              <textarea_1.Textarea id="question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="テスト用の質問を入力してください" rows={3}/>
            </div>

            <div>
              <label htmlFor="answer" className="block text-sm font-medium mb-2">
                回答
              </label>
              <textarea_1.Textarea id="answer" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="テスト用の回答を入力してください" rows={5}/>
            </div>

            <div className="flex gap-2">
              <button_1.Button type="submit" disabled={isLoading}>
                {isLoading ? 'FAQ保存中...' : 'FAQ保存テスト'}
              </button_1.Button>
              <button_1.Button type="button" variant="outline" onClick={resetForm}>
                リセット
              </button_1.Button>
            </div>
          </form>

          {error && (<alert_1.Alert variant="destructive" className="mt-4">
              <alert_1.AlertDescription>{error}</alert_1.AlertDescription>
            </alert_1.Alert>)}

          {result && (<card_1.Card className="mt-6">
              <card_1.CardHeader>
                <card_1.CardTitle className={result.success ? 'text-green-600' : 'text-red-600'}>
                  テスト結果
                </card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="space-y-2">
                  <div>
                    <strong>ステータス:</strong> {result.status} {result.statusText}
                  </div>
                  <div>
                    <strong>成功:</strong> {result.success ? '✅ はい' : '❌ いいえ'}
                  </div>
                  {result.data.id && (<div>
                      <strong>保存されたID:</strong> {result.data.id}
                    </div>)}
                  {result.data.message && (<div>
                      <strong>メッセージ:</strong> {result.data.message}
                    </div>)}
                  {result.data.error && (<div>
                      <strong>エラー:</strong> {result.data.error}
                    </div>)}
                  <details className="mt-4">
                    <summary className="cursor-pointer font-medium">詳細データ</summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-sm overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                </div>
              </card_1.CardContent>
            </card_1.Card>)}
        </card_1.CardContent>
      </card_1.Card>
    </div>);
}
