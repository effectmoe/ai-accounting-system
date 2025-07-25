"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_1 = require("mongodb");
const mongodb_2 = require("@/lib/mongodb");
async function GET(request, { params }) {
    try {
        const db = await (0, mongodb_2.getDatabase)();
        const deliveryNotesCollection = db.collection('deliveryNotes');
        // 納品書を取得（顧客情報と一緒に）
        const deliveryNote = await deliveryNotesCollection
            .aggregate([
            { $match: { _id: new mongodb_1.ObjectId(params.id) } },
            {
                $lookup: {
                    from: 'customers',
                    localField: 'customerId',
                    foreignField: '_id',
                    as: 'customer'
                }
            },
            { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
        ])
            .toArray();
        if (!deliveryNote || deliveryNote.length === 0) {
            return server_1.NextResponse.json({ error: 'Delivery note not found' }, { status: 404 });
        }
        // 会社情報を取得してcompanySnapshotを追加（なければ）
        const companyInfoCollection = db.collection('companyInfo');
        const companyInfo = await companyInfoCollection.findOne({ isDefault: true });
        const result = deliveryNote[0];
        // companySnapshotがない場合は追加
        if (!result.companySnapshot && companyInfo) {
            result.companySnapshot = {
                companyName: companyInfo.companyName || '会社名未設定',
                address: [
                    companyInfo.postalCode ? `〒${companyInfo.postalCode}` : '',
                    companyInfo.prefecture || '',
                    companyInfo.city || '',
                    companyInfo.address1 || '',
                    companyInfo.address2 || ''
                ].filter(Boolean).join(' '),
                phone: companyInfo.phone,
                email: companyInfo.email,
                invoiceRegistrationNumber: companyInfo.registrationNumber || '',
                stampImage: companyInfo.sealUrl
            };
        }
        // クライアントサイドでPDF生成するためにデータをJSONで返す
        const { searchParams } = new URL(request.url);
        const isData = searchParams.get('data') === 'true';
        if (isData) {
            // PDF生成用のデータを返す
            return server_1.NextResponse.json({
                deliveryNote: result,
                customer: result.customer || null
            });
        }
        // HTMLページを返してクライアントサイドでPDF生成
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>納品書PDF生成</title>
    <script>
        window.onload = function() {
            // 納品書データを取得してPDF生成
            fetch('${request.url}?data=true')
                .then(response => response.json())
                .then(data => {
                    // クライアントサイドPDF生成ライブラリを使用
                    console.log('Delivery note data:', data);
                    document.body.innerHTML = '<p>PDF生成中...</p>';
                    // TODO: implement client-side PDF generation
                })
                .catch(error => {
                    console.error('Error:', error);
                    document.body.innerHTML = '<p>エラーが発生しました</p>';
                });
        };
    </script>
</head>
<body>
    <p>PDF読み込み中...</p>
</body>
</html>`;
        return new server_1.NextResponse(html, {
            headers: {
                'Content-Type': 'text/html',
            },
        });
    }
    catch (error) {
        console.error('Error generating delivery note PDF:', error);
        return server_1.NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
    }
}
