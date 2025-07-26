import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

// 顧客管理用API
export async function POST(request: NextRequest) {
  try {
    const { action, message, data } = await request.json();
    
    console.log('🤖 顧客管理エージェント実行:');
    console.log('- アクション:', action);
    console.log('- メッセージ:', message);
    console.log('- データ:', data);
    
    // 自然言語メッセージの場合はDeepSeekで解析
    if (message && !action) {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `あなたは顧客管理エージェントです。
              ユーザーのメッセージから以下を判断してください：
              1. アクション（add, search, update, delete）
              2. 顧客情報（会社名、連絡先など）
              
              必ず適切なツールを使用してください。`
            },
            {
              role: 'user',
              content: message
            }
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'add_customer',
              description: '新規顧客を追加します',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: '顧客名（会社名または個人名）' },
                  type: { type: 'string', enum: ['法人', '個人'], description: '顧客タイプ' },
                  address: { type: 'string', description: '住所' },
                  phone: { type: 'string', description: '電話番号' },
                  email: { type: 'string', description: 'メールアドレス' },
                  industry: { type: 'string', description: '業種' }
                },
                required: ['name']
              }
            }
          }, {
            type: 'function',
            function: {
              name: 'search_customer',
              description: '顧客を検索します',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: '検索キーワード' }
                },
                required: ['query']
              }
            }
          }],
          tool_choice: 'auto',
          temperature: 0.1
        })
      });
      
      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }
      
      const aiResponse = await response.json();
      
      // ツール呼び出しがある場合は実行
      if (aiResponse.choices[0].message.tool_calls) {
        const toolCall = aiResponse.choices[0].message.tool_calls[0];
        const args = JSON.parse(toolCall.function.arguments);
        
        // ツールに応じて処理
        if (toolCall.function.name === 'add_customer') {
          return await addCustomer(args);
        } else if (toolCall.function.name === 'search_customer') {
          return await searchCustomer(args);
        }
      }
      
      return NextResponse.json({
        success: true,
        response: aiResponse.choices[0].message.content
      });
    }
    
    // 直接アクション指定の場合
    switch (action) {
      case 'add':
        return await addCustomer(data);
      case 'search':
        return await searchCustomer(data);
      case 'update':
        return await updateCustomer(data);
      case 'delete':
        return await deleteCustomer(data);
      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ 顧客管理エラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// 顧客追加
async function addCustomer(data: any) {
  const db = await getDatabase();
  const customers = db.collection('customers');
  
  const newCustomer = {
    name: data.name,
    type: data.type || '法人',
    address: data.address || '',
    phone: data.phone || '',
    email: data.email || '',
    industry: data.industry || '',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const result = await customers.insertOne(newCustomer);
  
  return NextResponse.json({
    success: true,
    action: 'add_customer',
    customerId: result.insertedId,
    customer: newCustomer,
    message: `顧客「${data.name}」を登録しました。`
  });
}

// 顧客検索
async function searchCustomer(data: any) {
  const db = await getDatabase();
  const customers = db.collection('customers');
  
  const results = await customers.find({
    name: { $regex: data.query, $options: 'i' }
  }).limit(10).toArray();
  
  return NextResponse.json({
    success: true,
    action: 'search_customer',
    results,
    count: results.length,
    message: `「${data.query}」で${results.length}件の顧客が見つかりました。`
  });
}

// 顧客更新
async function updateCustomer(data: any) {
  const db = await getDatabase();
  const customers = db.collection('customers');
  
  const { id, ...updateData } = data;
  updateData.updatedAt = new Date();
  
  const result = await customers.updateOne(
    { _id: id },
    { $set: updateData }
  );
  
  return NextResponse.json({
    success: true,
    action: 'update_customer',
    updated: result.modifiedCount,
    message: `顧客情報を更新しました。`
  });
}

// 顧客削除
async function deleteCustomer(data: any) {
  const db = await getDatabase();
  const customers = db.collection('customers');
  
  const result = await customers.updateOne(
    { _id: data.id },
    { $set: { status: 'deleted', deletedAt: new Date() } }
  );
  
  return NextResponse.json({
    success: true,
    action: 'delete_customer',
    deleted: result.modifiedCount,
    message: `顧客を削除しました。`
  });
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    endpoint: '/api/mastra/customer',
    capabilities: ['add', 'search', 'update', 'delete'],
    description: '顧客管理エージェントAPI'
  });
}