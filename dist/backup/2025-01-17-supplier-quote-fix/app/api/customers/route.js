"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
// GET: 顧客一覧取得
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const sortBy = searchParams.get('sortBy') || 'createdAt';
        const sortOrder = searchParams.get('sortOrder') || 'desc';
        const skip = (page - 1) * limit;
        // フィルターパラメータの取得
        const filters = {};
        // isActiveフィルター
        const isActiveParam = searchParams.get('isActive');
        if (isActiveParam !== null) {
            filters.isActive = isActiveParam === 'true';
        }
        // 都道府県フィルター
        const prefecture = searchParams.get('prefecture');
        if (prefecture && prefecture.trim()) {
            filters.prefecture = prefecture.trim();
        }
        // 市区町村フィルター
        const city = searchParams.get('city');
        if (city && city.trim()) {
            filters.city = city.trim();
        }
        // 支払いサイトフィルター
        const paymentTermsMin = searchParams.get('paymentTermsMin');
        const paymentTermsMax = searchParams.get('paymentTermsMax');
        if (paymentTermsMin) {
            const min = parseInt(paymentTermsMin);
            if (!isNaN(min) && min >= 0) {
                filters.paymentTermsMin = min;
            }
        }
        if (paymentTermsMax) {
            const max = parseInt(paymentTermsMax);
            if (!isNaN(max) && max >= 0) {
                filters.paymentTermsMax = max;
            }
        }
        // 登録日フィルター
        const createdAtStart = searchParams.get('createdAtStart');
        const createdAtEnd = searchParams.get('createdAtEnd');
        if (createdAtStart && /^\d{4}-\d{2}-\d{2}$/.test(createdAtStart)) {
            filters.createdAtStart = createdAtStart;
        }
        if (createdAtEnd && /^\d{4}-\d{2}-\d{2}$/.test(createdAtEnd)) {
            filters.createdAtEnd = createdAtEnd;
        }
        // ソートフィールドの検証
        const validSortFields = ['customerId', 'companyName', 'companyNameKana', 'department', 'prefecture', 'city', 'email', 'paymentTerms', 'createdAt', 'primaryContactName', 'primaryContactNameKana'];
        const validSortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const validSortOrder = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';
        const db = await (0, mongodb_client_1.getDatabase)();
        const collection = db.collection('customers');
        // 検索条件の構築
        const query = {};
        // 検索条件
        if (search) {
            query.$or = [
                { customerId: { $regex: search, $options: 'i' } },
                { companyName: { $regex: search, $options: 'i' } },
                { companyNameKana: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { department: { $regex: search, $options: 'i' } },
                { 'contacts.name': { $regex: search, $options: 'i' } },
            ];
        }
        // フィルター条件の適用
        if (filters.isActive !== undefined) {
            query.isActive = filters.isActive;
        }
        if (filters.prefecture) {
            query.prefecture = { $regex: filters.prefecture, $options: 'i' };
        }
        if (filters.city) {
            query.city = { $regex: filters.city, $options: 'i' };
        }
        // 支払いサイトフィルター
        if (filters.paymentTermsMin !== undefined || filters.paymentTermsMax !== undefined) {
            query.paymentTerms = {};
            if (filters.paymentTermsMin !== undefined) {
                query.paymentTerms.$gte = filters.paymentTermsMin;
            }
            if (filters.paymentTermsMax !== undefined) {
                query.paymentTerms.$lte = filters.paymentTermsMax;
            }
        }
        // 登録日フィルター
        if (filters.createdAtStart || filters.createdAtEnd) {
            query.createdAt = {};
            if (filters.createdAtStart) {
                const startDate = new Date(filters.createdAtStart);
                startDate.setHours(0, 0, 0, 0);
                query.createdAt.$gte = startDate;
            }
            if (filters.createdAtEnd) {
                const endDate = new Date(filters.createdAtEnd);
                endDate.setHours(23, 59, 59, 999);
                query.createdAt.$lte = endDate;
            }
        }
        // 総件数を取得
        const total = await collection.countDocuments(query);
        // 担当者名ソートまたは担当者名カナソートの場合は集約パイプラインを使用
        if (validSortField === 'primaryContactName' || validSortField === 'primaryContactNameKana') {
            const pipeline = [
                { $match: query },
                {
                    $addFields: {
                        primaryContactName: {
                            $let: {
                                vars: {
                                    primaryContact: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: { $ifNull: ['$contacts', []] },
                                                    cond: { $eq: ['$$this.isPrimary', true] }
                                                }
                                            },
                                            0
                                        ]
                                    }
                                },
                                in: {
                                    $ifNull: [
                                        '$$primaryContact.name',
                                        {
                                            $arrayElemAt: [
                                                { $map: { input: { $ifNull: ['$contacts', []] }, as: 'contact', in: '$$contact.name' } },
                                                0
                                            ]
                                        }
                                    ]
                                }
                            }
                        },
                        primaryContactNameKana: {
                            $let: {
                                vars: {
                                    primaryContact: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: { $ifNull: ['$contacts', []] },
                                                    cond: { $eq: ['$$this.isPrimary', true] }
                                                }
                                            },
                                            0
                                        ]
                                    }
                                },
                                in: {
                                    $ifNull: [
                                        '$$primaryContact.nameKana',
                                        {
                                            $arrayElemAt: [
                                                { $map: { input: { $ifNull: ['$contacts', []] }, as: 'contact', in: '$$contact.nameKana' } },
                                                0
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
                { $sort: { [validSortField]: validSortOrder === 'asc' ? 1 : -1, _id: 1 } },
                { $skip: skip },
                { $limit: limit }
            ];
            // 日本語collationオプション（かなソートの場合）
            const aggregateOptions = (validSortField === 'companyNameKana' || validSortField === 'primaryContactNameKana') ? {
                collation: {
                    locale: 'ja',
                    caseLevel: false,
                    strength: 1
                }
            } : {};
            const customers = await collection.aggregate(pipeline, aggregateOptions).toArray();
            // MongoDBの_idをidに変換
            const formattedCustomers = customers.map(customer => ({
                ...customer,
                _id: customer._id.toString(),
                id: customer._id.toString(),
            }));
            return server_1.NextResponse.json({
                success: true,
                customers: formattedCustomers,
                total,
                page,
                limit,
                sortBy: validSortField,
                sortOrder: validSortOrder,
                filters,
            });
        }
        // 通常のソート処理
        const sortCondition = {};
        // nullフィールドの扱いを考慮したソート
        if (validSortField === 'customerId' || validSortField === 'department' || validSortField === 'prefecture' || validSortField === 'city' || validSortField === 'email') {
            // nullや空文字の場合は最後にソート
            sortCondition[validSortField] = validSortOrder === 'asc' ? 1 : -1;
            sortCondition['_id'] = 1; // 同じ値の場合のための補助ソート
        }
        else if (validSortField === 'paymentTerms') {
            // 数値フィールドのソート
            sortCondition[validSortField] = validSortOrder === 'asc' ? 1 : -1;
            sortCondition['_id'] = 1;
        }
        else {
            // その他のフィールド（companyName, companyNameKana, createdAtなど）
            sortCondition[validSortField] = validSortOrder === 'asc' ? 1 : -1;
        }
        // 顧客データを取得
        let findCursor = collection
            .find(query)
            .sort(sortCondition)
            .skip(skip)
            .limit(limit);
        // 日本語collationオプション（かなソートの場合）
        if (validSortField === 'companyNameKana') {
            findCursor = findCursor.collation({
                locale: 'ja',
                caseLevel: false,
                strength: 1
            });
        }
        const customers = await findCursor.toArray();
        // MongoDBの_idをidに変換
        const formattedCustomers = customers.map(customer => ({
            ...customer,
            _id: customer._id.toString(),
            id: customer._id.toString(),
        }));
        return server_1.NextResponse.json({
            success: true,
            customers: formattedCustomers,
            total,
            page,
            limit,
            sortBy: validSortField,
            sortOrder: validSortOrder,
            filters,
        });
    }
    catch (error) {
        console.error('Error fetching customers:', error);
        return server_1.NextResponse.json({ success: false, error: '顧客データの取得に失敗しました' }, { status: 500 });
    }
}
// POST: 新規顧客作成
async function POST(request) {
    try {
        const body = await request.json();
        // 必須フィールドのチェック
        if (!body.companyName) {
            return server_1.NextResponse.json({ success: false, error: '会社名は必須です' }, { status: 400 });
        }
        // メールアドレスの形式チェック（メールアドレスが提供された場合のみ）
        if (body.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(body.email)) {
                return server_1.NextResponse.json({ success: false, error: '有効なメールアドレスを入力してください' }, { status: 400 });
            }
        }
        const db = await (0, mongodb_client_1.getDatabase)();
        const collection = db.collection('customers');
        // メールアドレスの重複チェック（メールアドレスが提供された場合のみ）
        if (body.email) {
            const existingCustomer = await collection.findOne({ email: body.email });
            if (existingCustomer) {
                return server_1.NextResponse.json({ success: false, error: 'このメールアドレスは既に登録されています' }, { status: 400 });
            }
        }
        // 顧客IDの重複チェック（顧客IDが提供された場合のみ）
        if (body.customerId) {
            const existingCustomer = await collection.findOne({ customerId: body.customerId });
            if (existingCustomer) {
                return server_1.NextResponse.json({ success: false, error: 'この顧客コードは既に登録されています' }, { status: 400 });
            }
        }
        // 新規顧客データの作成
        const now = new Date();
        const newCustomer = {
            customerId: body.customerId,
            companyName: body.companyName,
            companyNameKana: body.companyNameKana,
            department: body.department,
            postalCode: body.postalCode,
            prefecture: body.prefecture,
            city: body.city,
            address1: body.address1,
            address2: body.address2,
            phone: body.phone,
            fax: body.fax,
            email: body.email,
            website: body.website,
            paymentTerms: body.paymentTerms ? parseInt(body.paymentTerms) : undefined,
            contacts: body.contacts || [],
            tags: body.tags || [],
            notes: body.notes,
            isActive: body.isActive !== undefined ? body.isActive : true,
            createdAt: now,
            updatedAt: now,
        };
        // データベースに保存
        const result = await collection.insertOne(newCustomer);
        return server_1.NextResponse.json({
            success: true,
            _id: result.insertedId.toString(),
            id: result.insertedId.toString(),
            ...newCustomer,
        });
    }
    catch (error) {
        console.error('Error creating customer:', error);
        return server_1.NextResponse.json({ success: false, error: '顧客の作成に失敗しました' }, { status: 500 });
    }
}
