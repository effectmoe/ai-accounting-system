"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const logger_1 = require("@/lib/logger");
const DB_NAME = process.env.MONGODB_DB_NAME || 'accounting-app';
// Force dynamic rendering for this route
exports.dynamic = 'force-dynamic';
// GET: ダッシュボード用利益統計を取得
async function GET(request) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const period = searchParams.get('period') || 'monthly';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const client = await (0, mongodb_client_1.getMongoClient)();
        const db = client.db(DB_NAME);
        // 日付範囲の設定
        let dateFilter;
        if (startDate && endDate) {
            dateFilter = {
                start: new Date(startDate),
                end: new Date(endDate)
            };
        }
        else {
            // デフォルト: 過去30日間
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - 30);
            dateFilter = { start, end };
        }
        // 売上データの集計（請求書から）
        const salesData = await db.collection('invoices').aggregate([
            {
                $match: {
                    issueDate: { $gte: dateFilter.start, $lte: dateFilter.end },
                    status: { $in: ['paid', 'sent'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$totalAmount' },
                    count: { $sum: 1 }
                }
            }
        ]).toArray();
        const sales = salesData[0] || { totalAmount: 0, count: 0 };
        sales.averageAmount = sales.count > 0 ? sales.totalAmount / sales.count : 0;
        // 仕入データの集計（発注書から）
        const purchaseData = await db.collection('purchaseOrders').aggregate([
            {
                $match: {
                    issueDate: { $gte: dateFilter.start, $lte: dateFilter.end },
                    status: { $in: ['sent', 'confirmed', 'partial', 'completed'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$totalAmount' },
                    count: { $sum: 1 }
                }
            }
        ]).toArray();
        const purchases = purchaseData[0] || { totalAmount: 0, count: 0 };
        purchases.averageAmount = purchases.count > 0 ? purchases.totalAmount / purchases.count : 0;
        // 案件データの集計
        const dealStats = await db.collection('deals').aggregate([
            {
                $match: {
                    startDate: { $gte: dateFilter.start, $lte: dateFilter.end }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
                    lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
                    inProgress: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['lead', 'negotiation', 'quote_sent']] },
                                1,
                                0
                            ]
                        }
                    },
                    totalValue: { $sum: '$actualValue' },
                    totalProfit: { $sum: '$profitAmount' }
                }
            }
        ]).toArray();
        const deals = dealStats[0] || {
            total: 0,
            won: 0,
            lost: 0,
            inProgress: 0,
            totalValue: 0,
            totalProfit: 0
        };
        // 勝率計算
        const closedDeals = deals.won + deals.lost;
        deals.winRate = closedDeals > 0 ? (deals.won / closedDeals) * 100 : 0;
        deals.averageDealSize = deals.won > 0 ? deals.totalValue / deals.won : 0;
        // 商品別利益の集計
        const topProducts = await db.collection('deals').aggregate([
            {
                $match: {
                    status: 'won',
                    actualCloseDate: { $gte: dateFilter.start, $lte: dateFilter.end }
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    productName: { $first: '$items.itemName' },
                    profitAmount: { $sum: '$items.profitAmount' },
                    salesCount: { $sum: 1 },
                    totalAmount: { $sum: '$items.amount' }
                }
            },
            {
                $project: {
                    productId: '$_id',
                    productName: 1,
                    profitAmount: 1,
                    salesCount: 1,
                    profitMargin: {
                        $multiply: [
                            { $divide: ['$profitAmount', '$totalAmount'] },
                            100
                        ]
                    }
                }
            },
            { $sort: { profitAmount: -1 } },
            { $limit: 10 }
        ]).toArray();
        // 顧客別利益の集計
        const topCustomers = await db.collection('deals').aggregate([
            {
                $match: {
                    status: 'won',
                    actualCloseDate: { $gte: dateFilter.start, $lte: dateFilter.end }
                }
            },
            {
                $lookup: {
                    from: 'customers',
                    localField: 'customerId',
                    foreignField: '_id',
                    as: 'customer'
                }
            },
            { $unwind: '$customer' },
            {
                $group: {
                    _id: '$customerId',
                    customerName: { $first: '$customer.companyName' },
                    profitAmount: { $sum: '$profitAmount' },
                    dealCount: { $sum: 1 },
                    totalAmount: { $sum: '$actualValue' }
                }
            },
            {
                $project: {
                    customerId: '$_id',
                    customerName: 1,
                    profitAmount: 1,
                    dealCount: 1,
                    profitMargin: {
                        $multiply: [
                            { $divide: ['$profitAmount', '$totalAmount'] },
                            100
                        ]
                    }
                }
            },
            { $sort: { profitAmount: -1 } },
            { $limit: 10 }
        ]).toArray();
        // 利益計算
        const totalProfit = sales.totalAmount - purchases.totalAmount;
        const profitMargin = sales.totalAmount > 0
            ? (totalProfit / sales.totalAmount) * 100
            : 0;
        const result = {
            period: period,
            startDate: dateFilter.start,
            endDate: dateFilter.end,
            sales: {
                totalAmount: sales.totalAmount,
                count: sales.count,
                averageAmount: sales.averageAmount
            },
            purchases: {
                totalAmount: purchases.totalAmount,
                count: purchases.count,
                averageAmount: purchases.averageAmount
            },
            profit: {
                totalAmount: totalProfit,
                margin: profitMargin,
                topProducts: topProducts.map(p => ({
                    productId: p.productId,
                    productName: p.productName,
                    profitAmount: p.profitAmount,
                    profitMargin: p.profitMargin,
                    salesCount: p.salesCount
                })),
                topCustomers: topCustomers.map(c => ({
                    customerId: c.customerId,
                    customerName: c.customerName,
                    profitAmount: c.profitAmount,
                    profitMargin: c.profitMargin,
                    dealCount: c.dealCount
                }))
            },
            deals: {
                total: deals.total,
                won: deals.won,
                lost: deals.lost,
                inProgress: deals.inProgress,
                winRate: deals.winRate,
                averageDealSize: deals.averageDealSize
            }
        };
        return server_1.NextResponse.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error fetching profit stats:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch profit statistics' }, { status: 500 });
    }
}
