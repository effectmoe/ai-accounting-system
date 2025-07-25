"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NewJournalPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
const textarea_1 = require("@/components/ui/textarea");
const lucide_react_1 = require("lucide-react");
const alert_1 = require("@/components/ui/alert");
function NewJournalPage() {
    const router = (0, navigation_1.useRouter)();
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [documentData, setDocumentData] = (0, react_1.useState)(null);
    const [entryDate, setEntryDate] = (0, react_1.useState)(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = (0, react_1.useState)('');
    const [notes, setNotes] = (0, react_1.useState)('');
    const [lines, setLines] = (0, react_1.useState)([
        { accountCode: '', accountName: '', debitAmount: 0, creditAmount: 0, description: '' },
        { accountCode: '', accountName: '', debitAmount: 0, creditAmount: 0, description: '' }
    ]);
    // セッションストレージからデータを読み込む
    (0, react_1.useEffect)(() => {
        const savedData = sessionStorage.getItem('journalFromDocument');
        console.log('Loading journal data from sessionStorage:', savedData);
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                console.log('Parsed document data:', data);
                setDocumentData(data);
                setEntryDate(data.date);
                setDescription(data.description);
                // 初期仕訳行を設定
                if (data.category === '駐車場代' || data.parkingDetails) {
                    setLines([
                        { accountCode: '751', accountName: '車両費（駐車場代）', debitAmount: data.amount, creditAmount: 0, description: data.description },
                        { accountCode: '101', accountName: '現金', debitAmount: 0, creditAmount: data.amount, description: '' }
                    ]);
                }
                else {
                    setLines([
                        { accountCode: '', accountName: '経費', debitAmount: data.amount, creditAmount: 0, description: data.description },
                        { accountCode: '101', accountName: '現金', debitAmount: 0, creditAmount: data.amount, description: '' }
                    ]);
                }
                // データを使用後にクリア
                sessionStorage.removeItem('journalFromDocument');
            }
            catch (error) {
                console.error('Failed to parse document data:', error);
            }
        }
    }, []);
    const addLine = () => {
        setLines([...lines, { accountCode: '', accountName: '', debitAmount: 0, creditAmount: 0, description: '' }]);
    };
    const removeLine = (index) => {
        if (lines.length > 2) {
            setLines(lines.filter((_, i) => i !== index));
        }
    };
    const updateLine = (index, field, value) => {
        const newLines = [...lines];
        newLines[index] = { ...newLines[index], [field]: value };
        setLines(newLines);
    };
    const calculateTotals = () => {
        const debitTotal = lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
        const creditTotal = lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
        return { debitTotal, creditTotal, isBalanced: debitTotal === creditTotal };
    };
    const handleSubmit = async () => {
        const { debitTotal, creditTotal, isBalanced } = calculateTotals();
        if (!isBalanced) {
            alert('貸借が一致していません。確認してください。');
            return;
        }
        if (!description) {
            alert('摘要を入力してください。');
            return;
        }
        const validLines = lines.filter(line => line.accountCode && line.accountName && (line.debitAmount > 0 || line.creditAmount > 0));
        if (validLines.length < 2) {
            alert('少なくとも2行以上の有効な仕訳明細が必要です。');
            return;
        }
        setLoading(true);
        try {
            // 簡易的な仕訳作成（既存のAPIエンドポイントに合わせる）
            const firstLine = validLines[0];
            const response = await fetch('/api/journals/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyId: '11111111-1111-1111-1111-111111111111', // デフォルトの会社ID
                    date: entryDate,
                    description,
                    debitAccount: firstLine.accountName,
                    creditAccount: validLines[1]?.accountName || '現金',
                    amount: firstLine.debitAmount || firstLine.creditAmount,
                    taxAmount: documentData?.taxAmount || 0,
                    taxRate: 0,
                    isTaxIncluded: true,
                    documentId: documentData?.documentId || null,
                    vendorName: documentData?.vendorName || description
                })
            });
            if (!response.ok) {
                throw new Error('仕訳の作成に失敗しました');
            }
            const data = await response.json();
            if (data.success) {
                router.push('/journal');
            }
            else {
                throw new Error(data.error || '仕訳の作成に失敗しました');
            }
        }
        catch (error) {
            console.error('Error creating journal:', error);
            alert(error instanceof Error ? error.message : '仕訳の作成に失敗しました');
        }
        finally {
            setLoading(false);
        }
    };
    const { debitTotal, creditTotal, isBalanced } = calculateTotals();
    return (<div className="container mx-auto p-8">
      <div className="mb-8">
        <button_1.Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <lucide_react_1.ArrowLeft className="mr-2 h-4 w-4"/>
          戻る
        </button_1.Button>
        
        <h1 className="text-3xl font-bold">仕訳を作成</h1>
        <p className="text-gray-600 mt-2">新しい仕訳を作成します</p>
      </div>

      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>仕訳情報</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent className="space-y-6">
          {/* 領収書からの情報表示 */}
          {documentData && documentData.parkingDetails && (<alert_1.Alert className="bg-blue-50 border-blue-200">
              <lucide_react_1.Car className="h-4 w-4"/>
              <alert_1.AlertDescription>
                <div className="font-medium mb-2">駐車場領収書情報</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {documentData.parkingDetails.facilityName && (<div className="flex items-center gap-1">
                      <lucide_react_1.Building className="h-3 w-3"/>
                      <span>施設: {documentData.parkingDetails.facilityName}</span>
                    </div>)}
                  {documentData.parkingDetails.entryTime && (<div className="flex items-center gap-1">
                      <lucide_react_1.Clock className="h-3 w-3"/>
                      <span>入庫: {documentData.parkingDetails.entryTime}</span>
                    </div>)}
                  {documentData.parkingDetails.exitTime && (<div className="flex items-center gap-1">
                      <lucide_react_1.Clock className="h-3 w-3"/>
                      <span>出庫: {documentData.parkingDetails.exitTime}</span>
                    </div>)}
                  {documentData.parkingDetails.parkingDuration && (<div className="flex items-center gap-1">
                      <lucide_react_1.Car className="h-3 w-3"/>
                      <span>駐車時間: {documentData.parkingDetails.parkingDuration}</span>
                    </div>)}
                  {documentData.parkingDetails.baseFee !== undefined && (<div className="flex items-center gap-1">
                      <lucide_react_1.CreditCard className="h-3 w-3"/>
                      <span>基本料金: ¥{documentData.parkingDetails.baseFee.toLocaleString()}</span>
                    </div>)}
                  {documentData.parkingDetails.additionalFee !== undefined && (<div className="flex items-center gap-1">
                      <lucide_react_1.CreditCard className="h-3 w-3"/>
                      <span>追加料金: ¥{documentData.parkingDetails.additionalFee.toLocaleString()}</span>
                    </div>)}
                </div>
              </alert_1.AlertDescription>
            </alert_1.Alert>)}

          {/* 基本情報 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label_1.Label htmlFor="entryDate">日付</label_1.Label>
              <input_1.Input id="entryDate" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)}/>
            </div>
            {documentData && (<div>
                <label_1.Label>元文書</label_1.Label>
                <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                  {documentData.vendorName} - 領収書
                </div>
              </div>)}
          </div>

          <div>
            <label_1.Label htmlFor="description">摘要</label_1.Label>
            <input_1.Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="仕訳の説明を入力"/>
          </div>

          {/* 仕訳明細 */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label_1.Label>仕訳明細</label_1.Label>
              <button_1.Button type="button" variant="outline" size="sm" onClick={addLine}>
                <lucide_react_1.Plus className="mr-2 h-4 w-4"/>
                行を追加
              </button_1.Button>
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => (<div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-2">
                    <label_1.Label className="text-xs">勘定科目コード</label_1.Label>
                    <input_1.Input value={line.accountCode} onChange={(e) => updateLine(index, 'accountCode', e.target.value)} placeholder="101"/>
                  </div>
                  <div className="col-span-3">
                    <label_1.Label className="text-xs">勘定科目名</label_1.Label>
                    <input_1.Input value={line.accountName} onChange={(e) => updateLine(index, 'accountName', e.target.value)} placeholder="現金"/>
                  </div>
                  <div className="col-span-2">
                    <label_1.Label className="text-xs">借方金額</label_1.Label>
                    <input_1.Input type="number" value={line.debitAmount || ''} onChange={(e) => updateLine(index, 'debitAmount', Number(e.target.value))} placeholder="0"/>
                  </div>
                  <div className="col-span-2">
                    <label_1.Label className="text-xs">貸方金額</label_1.Label>
                    <input_1.Input type="number" value={line.creditAmount || ''} onChange={(e) => updateLine(index, 'creditAmount', Number(e.target.value))} placeholder="0"/>
                  </div>
                  <div className="col-span-2">
                    <label_1.Label className="text-xs">備考</label_1.Label>
                    <input_1.Input value={line.description} onChange={(e) => updateLine(index, 'description', e.target.value)} placeholder="備考"/>
                  </div>
                  <div className="col-span-1">
                    <button_1.Button type="button" variant="ghost" size="sm" onClick={() => removeLine(index)} disabled={lines.length <= 2}>
                      <lucide_react_1.Trash2 className="h-4 w-4"/>
                    </button_1.Button>
                  </div>
                </div>))}
            </div>

            {/* 合計 */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <span className="font-medium">借方合計: </span>
                  <span className="text-blue-600">¥{debitTotal.toLocaleString()}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">貸方合計: </span>
                  <span className="text-red-600">¥{creditTotal.toLocaleString()}</span>
                </div>
                <div className={`text-sm font-medium ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  {isBalanced ? '✓ 貸借一致' : '✗ 貸借不一致'}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label_1.Label htmlFor="notes">備考</label_1.Label>
            <textarea_1.Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="追加情報があれば入力" rows={3}/>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-end gap-4">
            <button_1.Button variant="outline" onClick={() => router.push('/journal')}>
              キャンセル
            </button_1.Button>
            <button_1.Button onClick={handleSubmit} disabled={loading || !isBalanced}>
              {loading ? '作成中...' : '仕訳を作成'}
            </button_1.Button>
          </div>
        </card_1.CardContent>
      </card_1.Card>
    </div>);
}
