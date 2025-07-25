"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONSTRUCTION_KEYWORDS = exports.CONSTRUCTION_ACCOUNTS = void 0;
exports.getConstructionAccountByKeyword = getConstructionAccountByKeyword;
exports.getConstructionAccountByCode = getConstructionAccountByCode;
exports.getConstructionAccountByName = getConstructionAccountByName;
exports.CONSTRUCTION_ACCOUNTS = [
    {
        code: '4111',
        name: '完成工事高',
        category: 'revenue',
        industry: 'construction',
        description: '完成した工事の売上高'
    },
    {
        code: '4112',
        name: '未成工事収入',
        category: 'revenue',
        industry: 'construction',
        description: '進行中工事の出来高'
    },
    {
        code: '4113',
        name: '兼業事業売上高',
        category: 'revenue',
        industry: 'construction',
        description: '建設業以外の売上'
    },
    {
        code: '5111',
        name: '材料費',
        category: 'expense',
        industry: 'construction',
        taxType: 'taxable_10',
        description: '建築資材、材料の購入費'
    },
    {
        code: '5112',
        name: '労務費',
        category: 'expense',
        industry: 'construction',
        taxType: 'non_taxable',
        description: '作業員の人件費'
    },
    {
        code: '5113',
        name: '外注費',
        category: 'expense',
        industry: 'construction',
        taxType: 'taxable_10',
        description: '協力業者、下請けへの支払い'
    },
    {
        code: '5114',
        name: '現場経費',
        category: 'expense',
        industry: 'construction',
        taxType: 'taxable_10',
        description: '現場で発生する諸経費'
    },
    {
        code: '5115',
        name: '安全協力費',
        category: 'expense',
        industry: 'construction',
        taxType: 'taxable_10',
        description: '安全管理のための費用'
    },
    {
        code: '5116',
        name: '重機リース料',
        category: 'expense',
        industry: 'construction',
        taxType: 'taxable_10',
        description: '建設機械のレンタル費用'
    },
    {
        code: '1151',
        name: '完成工事未収入金',
        category: 'asset',
        industry: 'construction',
        description: '完成工事の未回収代金'
    },
    {
        code: '1152',
        name: '未成工事支出金',
        category: 'asset',
        industry: 'construction',
        description: '進行中工事の累計原価'
    },
    {
        code: '1153',
        name: '建設仮勘定',
        category: 'asset',
        industry: 'construction',
        description: '建設中の資産'
    },
    {
        code: '2151',
        name: '未成工事受入金',
        category: 'liability',
        industry: 'construction',
        description: '工事の前受金'
    },
    {
        code: '2152',
        name: '工事未払金',
        category: 'liability',
        industry: 'construction',
        description: '工事関連の未払い代金'
    },
    {
        code: '5211',
        name: '車両費',
        category: 'expense',
        industry: 'construction',
        taxType: 'taxable_10',
        description: '作業車両の燃料費、維持費'
    },
    {
        code: '5212',
        name: '工具器具費',
        category: 'expense',
        industry: 'construction',
        taxType: 'taxable_10',
        description: '工具・道具の購入費'
    },
    {
        code: '5213',
        name: '作業服費',
        category: 'expense',
        industry: 'construction',
        taxType: 'taxable_10',
        description: '作業着、安全靴等の購入費'
    },
    {
        code: '5214',
        name: '現場宿泊費',
        category: 'expense',
        industry: 'construction',
        taxType: 'taxable_10',
        description: '遠方現場での宿泊費'
    }
];
exports.CONSTRUCTION_KEYWORDS = {
    'セメント': '材料費',
    '鉄筋': '材料費',
    '木材': '材料費',
    '砂利': '材料費',
    'コンクリート': '材料費',
    '建材': '材料費',
    '資材': '材料費',
    'ボルト': '材料費',
    'ネジ': '材料費',
    '塗料': '材料費',
    '下請': '外注費',
    '協力業者': '外注費',
    '職人': '外注費',
    '大工': '外注費',
    '左官': '外注費',
    '電気工事': '外注費',
    '配管工事': '外注費',
    '解体': '外注費',
    '足場': '現場経費',
    '仮設': '現場経費',
    'ユニック': '現場経費',
    'クレーン': '現場経費',
    '重機': '重機リース料',
    'ユンボ': '重機リース料',
    'ダンプ': '重機リース料',
    'ヘルメット': '安全協力費',
    '安全帯': '安全協力費',
    '安全靴': '作業服費',
    '作業着': '作業服費',
    '作業服': '作業服費',
    'ガソリン': '車両費',
    '軽油': '車両費',
    '高速': '車両費',
    '宿泊': '現場宿泊費',
    'ホテル': '現場宿泊費'
};
function getConstructionAccountByKeyword(description) {
    const lowerDesc = description.toLowerCase();
    for (const [keyword, accountName] of Object.entries(exports.CONSTRUCTION_KEYWORDS)) {
        if (lowerDesc.includes(keyword.toLowerCase())) {
            return exports.CONSTRUCTION_ACCOUNTS.find(acc => acc.name === accountName) || null;
        }
    }
    return null;
}
function getConstructionAccountByCode(code) {
    return exports.CONSTRUCTION_ACCOUNTS.find(acc => acc.code === code) || null;
}
function getConstructionAccountByName(name) {
    return exports.CONSTRUCTION_ACCOUNTS.find(acc => acc.name === name) || null;
}
//# sourceMappingURL=construction-accounts.js.map