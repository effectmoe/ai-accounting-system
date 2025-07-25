"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EditSupplierPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
const textarea_1 = require("@/components/ui/textarea");
const select_1 = require("@/components/ui/select");
const lucide_react_1 = require("lucide-react");
const card_1 = require("@/components/ui/card");
function EditSupplierPage() {
    const router = (0, navigation_1.useRouter)();
    const params = (0, navigation_1.useParams)();
    const supplierId = params.id;
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [formData, setFormData] = (0, react_1.useState)({
        supplierCode: '',
        companyName: '',
        companyNameKana: '',
        department: '',
        postalCode: '',
        prefecture: '',
        city: '',
        address1: '',
        address2: '',
        phone: '',
        fax: '',
        email: '',
        website: '',
        paymentTerms: 30,
        paymentMethod: 'bank_transfer',
        status: 'active',
        creditLimit: 0,
        notes: '',
        contacts: [{
                name: '',
                nameKana: '',
                title: '',
                email: '',
                phone: '',
                isPrimary: true,
            }],
    });
    // 仕入先データを取得
    (0, react_1.useEffect)(() => {
        const fetchSupplier = async () => {
            try {
                const response = await fetch(`/api/suppliers/${supplierId}`);
                if (!response.ok) {
                    throw new Error('仕入先データの取得に失敗しました');
                }
                const supplier = await response.json();
                console.log('Fetched supplier:', supplier);
                setFormData({
                    supplierCode: supplier.supplierCode || '',
                    companyName: supplier.companyName || '',
                    companyNameKana: supplier.companyNameKana || '',
                    department: supplier.department || '',
                    postalCode: supplier.postalCode || '',
                    prefecture: supplier.prefecture || '',
                    city: supplier.city || '',
                    address1: supplier.address1 || '',
                    address2: supplier.address2 || '',
                    phone: supplier.phone || '',
                    fax: supplier.fax || '',
                    email: supplier.email || '',
                    website: supplier.website || '',
                    paymentTerms: supplier.paymentTerms || 30,
                    paymentMethod: supplier.paymentMethod || 'bank_transfer',
                    status: supplier.status || 'active',
                    creditLimit: supplier.creditLimit || 0,
                    notes: supplier.notes || '',
                    contacts: supplier.contacts && supplier.contacts.length > 0 ? supplier.contacts : [{
                            name: '',
                            nameKana: '',
                            title: '',
                            email: '',
                            phone: '',
                            isPrimary: true,
                        }],
                });
            }
            catch (error) {
                console.error('Error loading supplier:', error);
                alert('仕入先データの読み込みに失敗しました');
                router.push('/suppliers');
            }
            finally {
                setLoading(false);
            }
        };
        if (supplierId) {
            fetchSupplier();
        }
    }, [supplierId, router]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const response = await fetch(`/api/suppliers/${supplierId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                alert('仕入先情報を更新しました');
                router.push('/suppliers');
            }
            else {
                const error = await response.json();
                alert(error.error || '仕入先の更新に失敗しました');
            }
        }
        catch (error) {
            console.error('Error updating supplier:', error);
            alert('仕入先の更新に失敗しました');
        }
        finally {
            setSaving(false);
        }
    };
    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };
    const handleContactChange = (index, field, value) => {
        const newContacts = [...formData.contacts];
        newContacts[index] = {
            ...newContacts[index],
            [field]: value,
        };
        setFormData(prev => ({
            ...prev,
            contacts: newContacts,
        }));
    };
    if (loading) {
        return (<div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>);
    }
    return (<div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <button_1.Button variant="ghost" size="icon" onClick={() => router.push('/suppliers')}>
          <lucide_react_1.ArrowLeft className="h-4 w-4"/>
        </button_1.Button>
        <div>
          <h1 className="text-3xl font-bold">仕入先情報編集</h1>
          <p className="text-muted-foreground">仕入先の情報を更新してください</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>基本情報</card_1.CardTitle>
            <card_1.CardDescription>仕入先の基本的な情報を入力してください</card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label_1.Label htmlFor="supplierCode">仕入先コード</label_1.Label>
                <input_1.Input id="supplierCode" value={formData.supplierCode} onChange={(e) => handleChange('supplierCode', e.target.value)} disabled={loading || saving}/>
              </div>
              <div>
                <label_1.Label htmlFor="status">ステータス</label_1.Label>
                <select_1.Select value={formData.status} onValueChange={(value) => handleChange('status', value)} disabled={loading || saving}>
                  <select_1.SelectTrigger>
                    <select_1.SelectValue />
                  </select_1.SelectTrigger>
                  <select_1.SelectContent>
                    <select_1.SelectItem value="active">アクティブ</select_1.SelectItem>
                    <select_1.SelectItem value="inactive">非アクティブ</select_1.SelectItem>
                    <select_1.SelectItem value="suspended">停止中</select_1.SelectItem>
                  </select_1.SelectContent>
                </select_1.Select>
              </div>
            </div>

            <div>
              <label_1.Label htmlFor="companyName">会社名 *</label_1.Label>
              <input_1.Input id="companyName" value={formData.companyName} onChange={(e) => handleChange('companyName', e.target.value)} required disabled={loading || saving}/>
            </div>

            <div>
              <label_1.Label htmlFor="companyNameKana">会社名（カナ）</label_1.Label>
              <input_1.Input id="companyNameKana" value={formData.companyNameKana} onChange={(e) => handleChange('companyNameKana', e.target.value)} disabled={loading || saving}/>
            </div>

            <div>
              <label_1.Label htmlFor="department">部署</label_1.Label>
              <input_1.Input id="department" value={formData.department} onChange={(e) => handleChange('department', e.target.value)} disabled={loading || saving}/>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>住所・連絡先</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label_1.Label htmlFor="postalCode">郵便番号</label_1.Label>
                <input_1.Input id="postalCode" value={formData.postalCode} onChange={(e) => handleChange('postalCode', e.target.value)} placeholder="123-4567" disabled={loading || saving}/>
              </div>
              <div>
                <label_1.Label htmlFor="prefecture">都道府県</label_1.Label>
                <input_1.Input id="prefecture" value={formData.prefecture} onChange={(e) => handleChange('prefecture', e.target.value)} disabled={loading || saving}/>
              </div>
            </div>

            <div>
              <label_1.Label htmlFor="city">市区町村</label_1.Label>
              <input_1.Input id="city" value={formData.city} onChange={(e) => handleChange('city', e.target.value)} disabled={loading || saving}/>
            </div>

            <div>
              <label_1.Label htmlFor="address1">住所1</label_1.Label>
              <input_1.Input id="address1" value={formData.address1} onChange={(e) => handleChange('address1', e.target.value)} disabled={loading || saving}/>
            </div>

            <div>
              <label_1.Label htmlFor="address2">住所2（建物名等）</label_1.Label>
              <input_1.Input id="address2" value={formData.address2} onChange={(e) => handleChange('address2', e.target.value)} disabled={loading || saving}/>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label_1.Label htmlFor="phone">電話番号</label_1.Label>
                <input_1.Input id="phone" type="tel" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} disabled={loading || saving}/>
              </div>
              <div>
                <label_1.Label htmlFor="fax">FAX番号</label_1.Label>
                <input_1.Input id="fax" type="tel" value={formData.fax} onChange={(e) => handleChange('fax', e.target.value)} disabled={loading || saving}/>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label_1.Label htmlFor="email">メールアドレス</label_1.Label>
                <input_1.Input id="email" type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} disabled={loading || saving}/>
              </div>
              <div>
                <label_1.Label htmlFor="website">ウェブサイト</label_1.Label>
                <input_1.Input id="website" type="url" value={formData.website} onChange={(e) => handleChange('website', e.target.value)} placeholder="https://example.com" disabled={loading || saving}/>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>取引条件</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label_1.Label htmlFor="paymentTerms">支払条件（日）</label_1.Label>
                <input_1.Input id="paymentTerms" type="number" value={formData.paymentTerms} onChange={(e) => handleChange('paymentTerms', parseInt(e.target.value) || 0)} disabled={loading || saving}/>
              </div>
              <div>
                <label_1.Label htmlFor="paymentMethod">支払方法</label_1.Label>
                <select_1.Select value={formData.paymentMethod} onValueChange={(value) => handleChange('paymentMethod', value)} disabled={loading || saving}>
                  <select_1.SelectTrigger>
                    <select_1.SelectValue />
                  </select_1.SelectTrigger>
                  <select_1.SelectContent>
                    <select_1.SelectItem value="cash">現金</select_1.SelectItem>
                    <select_1.SelectItem value="credit_card">クレジットカード</select_1.SelectItem>
                    <select_1.SelectItem value="bank_transfer">銀行振込</select_1.SelectItem>
                    <select_1.SelectItem value="invoice">請求書払い</select_1.SelectItem>
                    <select_1.SelectItem value="other">その他</select_1.SelectItem>
                  </select_1.SelectContent>
                </select_1.Select>
              </div>
            </div>

            <div>
              <label_1.Label htmlFor="creditLimit">与信限度額</label_1.Label>
              <input_1.Input id="creditLimit" type="number" value={formData.creditLimit} onChange={(e) => handleChange('creditLimit', parseInt(e.target.value) || 0)} disabled={loading || saving}/>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>担当者情報</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4">
            <div>
              <label_1.Label htmlFor="contactName">担当者名</label_1.Label>
              <input_1.Input id="contactName" value={formData.contacts[0].name} onChange={(e) => handleContactChange(0, 'name', e.target.value)} disabled={loading || saving}/>
            </div>

            <div>
              <label_1.Label htmlFor="contactNameKana">担当者名（カナ）</label_1.Label>
              <input_1.Input id="contactNameKana" value={formData.contacts[0].nameKana} onChange={(e) => handleContactChange(0, 'nameKana', e.target.value)} disabled={loading || saving}/>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label_1.Label htmlFor="contactTitle">役職</label_1.Label>
                <input_1.Input id="contactTitle" value={formData.contacts[0].title} onChange={(e) => handleContactChange(0, 'title', e.target.value)} disabled={loading || saving}/>
              </div>
              <div>
                <label_1.Label htmlFor="contactPhone">電話番号</label_1.Label>
                <input_1.Input id="contactPhone" type="tel" value={formData.contacts[0].phone} onChange={(e) => handleContactChange(0, 'phone', e.target.value)} disabled={loading || saving}/>
              </div>
            </div>

            <div>
              <label_1.Label htmlFor="contactEmail">メールアドレス</label_1.Label>
              <input_1.Input id="contactEmail" type="email" value={formData.contacts[0].email} onChange={(e) => handleContactChange(0, 'email', e.target.value)} disabled={loading || saving}/>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>備考</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <textarea_1.Textarea value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={4} placeholder="取引に関する注意事項など" disabled={loading || saving}/>
          </card_1.CardContent>
        </card_1.Card>

        <div className="flex justify-end gap-2">
          <button_1.Button type="button" variant="outline" onClick={() => router.push('/suppliers')} disabled={loading || saving}>
            キャンセル
          </button_1.Button>
          <button_1.Button type="submit" disabled={loading || saving}>
            <lucide_react_1.Save className="h-4 w-4 mr-2"/>
            {saving ? '更新中...' : '更新'}
          </button_1.Button>
        </div>
      </form>
    </div>);
}
