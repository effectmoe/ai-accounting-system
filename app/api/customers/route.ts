import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb-client';
import { Customer, SortableField, SortOrder, FilterState } from '@/types/collections';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { ActivityLogService } from '@/services/activity-log.service';
import { MastraCustomerAgent } from '@/src/lib/mastra-integration';
import { 
  withErrorHandler, 
  validateRequired, 
  validatePagination, 
  validateEmail,
  ApiErrorResponse 
} from '@/lib/unified-error-handler';
// GET: 顧客一覧取得
export const GET = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = validatePagination(searchParams);
    const search = searchParams.get('search') || '';
    const sortBy = (searchParams.get('sortBy') as SortableField) || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as SortOrder) || 'desc';

    // フィルターパラメータの取得
    const filters: FilterState = {};
    
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
    const validSortFields: SortableField[] = ['customerId', 'companyName', 'companyNameKana', 'department', 'prefecture', 'city', 'email', 'paymentTerms', 'createdAt', 'primaryContactName', 'primaryContactNameKana'];
    const validSortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const validSortOrder = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';

    const db = await getDatabase();
    const collection = db.collection('customers');

    // 検索条件の構築
    const query: any = {};
    
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
      const pipeline: any[] = [
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

      return NextResponse.json({
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
    const sortCondition: { [key: string]: 1 | -1 } = {};
    
    // nullフィールドの扱いを考慮したソート
    if (validSortField === 'customerId' || validSortField === 'department' || validSortField === 'prefecture' || validSortField === 'city' || validSortField === 'email') {
      // nullや空文字の場合は最後にソート
      sortCondition[validSortField] = validSortOrder === 'asc' ? 1 : -1;
      sortCondition['_id'] = 1; // 同じ値の場合のための補助ソート
    } else if (validSortField === 'paymentTerms') {
      // 数値フィールドのソート
      sortCondition[validSortField] = validSortOrder === 'asc' ? 1 : -1;
      sortCondition['_id'] = 1;
    } else {
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

    return NextResponse.json({
      success: true,
      customers: formattedCustomers,
      total,
      page,
      limit,
      sortBy: validSortField,
      sortOrder: validSortOrder,
      filters,
    });
});

// POST: 新規顧客作成
export const POST = withErrorHandler(async (request: NextRequest) => {
    const body = await request.json();
    
    // 必須フィールドのチェック
    validateRequired(body, ['companyName']);

    // メールアドレスの形式チェック（メールアドレスが提供された場合のみ）
    if (body.email && !validateEmail(body.email)) {
      throw new ApiErrorResponse('有効なメールアドレスを入力してください', 400, 'INVALID_EMAIL');
    }

    const db = await getDatabase();
    const collection = db.collection('customers');

    // メールアドレスの重複チェック（メールアドレスが提供された場合のみ）
    if (body.email) {
      const existingCustomer = await collection.findOne({ email: body.email });
      if (existingCustomer) {
        throw new ApiErrorResponse('このメールアドレスは既に登録されています', 409, 'EMAIL_ALREADY_EXISTS');
      }
    }

    // 顧客IDの重複チェック（顧客IDが提供された場合のみ）
    if (body.customerId) {
      const existingCustomer = await collection.findOne({ customerId: body.customerId });
      if (existingCustomer) {
        throw new ApiErrorResponse('この顧客コードは既に登録されています', 409, 'CUSTOMER_ID_ALREADY_EXISTS');
      }
    }

    // 新規顧客データの作成
    const now = new Date();
    
    // デバッグ: 受信データを確認
    console.log('📥 POSTエンドポイントで受信したデータ:', {
      prefecture: body.prefecture,
      city: body.city,
      address1: body.address1,
      fax: body.fax,
      website: body.website
    });
    
    // 重要: 空文字列も保存するため、undefined への変換をしない
    const newCustomer: Partial<Customer> = {
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

    // デバッグ: 保存前のデータをログ出力
    logger.debug('🔍 Customer data before save:', {
      phone: newCustomer.phone,
      fax: newCustomer.fax,
      email: newCustomer.email,
      website: newCustomer.website
    });
    
    console.log('💾 保存前データ確認:', {
      phone: newCustomer.phone,
      fax: newCustomer.fax,
      email: newCustomer.email,
      website: newCustomer.website
    });

    // 重要: Mastraエージェントがフォールバック処理で住所を間違って分割する問題を回避するため、
    // フォールバック関数を直接実行する
    // Mastraエージェント経由で顧客を作成（フォールバック付き）
    const result = await MastraCustomerAgent.createCustomer(
      {
        name: newCustomer.companyName,
        name_kana: newCustomer.companyNameKana || '',
        email: newCustomer.email || '',
        phone: newCustomer.phone || '',
        fax: newCustomer.fax || '',
        website: newCustomer.website || '',
        postalCode: newCustomer.postalCode || '',
        prefecture: newCustomer.prefecture || '',
        city: newCustomer.city || '',
        address1: newCustomer.address1 || '',
        address2: newCustomer.address2 || '',
        // アドレスを連結しない
        address: `${newCustomer.postalCode || ''} ${newCustomer.prefecture || ''}${newCustomer.city || ''}${newCustomer.address1 || ''}${newCustomer.address2 || ''}`.trim(),
        tax_id: body.taxId || '',
        payment_terms: newCustomer.paymentTerms || 30,
        credit_limit: body.creditLimit || 0,
        notes: newCustomer.notes || ''
      },
      // フォールバック：既存のデータベース操作を使用
      async () => {
        console.log('💾 フォールバック処理で保存するデータ:', {
          phone: newCustomer.phone,
          fax: newCustomer.fax,
          email: newCustomer.email,
          website: newCustomer.website
        });
        
        const insertResult = await collection.insertOne(newCustomer);
        
        // 保存後の確認
        const savedCustomer = await collection.findOne({ _id: insertResult.insertedId });
        console.log('💾 保存後のデータベース確認:', {
          phone: savedCustomer?.phone,
          fax: savedCustomer?.fax,
          email: savedCustomer?.email,
          website: savedCustomer?.website
        });
        
        // アクティビティログを記録
        try {
          await ActivityLogService.logCustomerCreated(
            insertResult.insertedId.toString(),
            newCustomer.companyName
          );
          logger.info('Activity log recorded for customer creation');
        } catch (logError) {
          logger.error('Failed to log activity for customer creation:', logError);
        }
        
        return {
          insertedId: insertResult.insertedId,
          ...newCustomer
        };
      }
    );

    // 最終レスポンス前の確認
    console.log('📤 最終レスポンスデータ:', {
      phone: newCustomer.phone,
      fax: newCustomer.fax,
      email: newCustomer.email,
      website: newCustomer.website
    });

    return NextResponse.json({
      success: true,
      _id: result.insertedId.toString(),
      id: result.insertedId.toString(),
      ...newCustomer,
    });
});