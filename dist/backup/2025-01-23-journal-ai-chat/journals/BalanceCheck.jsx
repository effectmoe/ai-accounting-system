"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceCheck = BalanceCheck;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const journal_utils_1 = require("@/lib/journal-utils");
/**
 * 貸借バランスチェックコンポーネント
 * 借方と貸方の合計を表示し、一致しているかどうかを視覚的に示す
 */
function BalanceCheck({ debitTotal, creditTotal, className }) {
    const isBalanced = (0, react_1.useMemo)(() => debitTotal === creditTotal, [debitTotal, creditTotal]);
    const difference = (0, react_1.useMemo)(() => Math.abs(debitTotal - creditTotal), [debitTotal, creditTotal]);
    return (<div className={(0, utils_1.cn)('rounded-lg border p-4', isBalanced
            ? 'border-green-200 bg-green-50'
            : 'border-red-200 bg-red-50', className)}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {isBalanced ? (<lucide_react_1.CheckCircleIcon className="h-5 w-5 text-green-600"/>) : (<lucide_react_1.AlertTriangleIcon className="h-5 w-5 text-red-600"/>)}
        </div>
        
        <div className="flex-1">
          <h3 className={(0, utils_1.cn)('text-sm font-medium', isBalanced ? 'text-green-800' : 'text-red-800')}>
            {isBalanced ? '貸借一致' : '貸借不一致'}
          </h3>
          
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">借方合計:</span>
              <span className="font-medium text-gray-900">
                {(0, journal_utils_1.formatCurrency)(debitTotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">貸方合計:</span>
              <span className="font-medium text-gray-900">
                {(0, journal_utils_1.formatCurrency)(creditTotal)}
              </span>
            </div>
            
            {!isBalanced && (<div className="flex justify-between text-sm pt-1 border-t border-gray-200">
                <span className="text-gray-600">差額:</span>
                <span className="font-medium text-red-600">
                  {(0, journal_utils_1.formatCurrency)(difference)}
                </span>
              </div>)}
          </div>
        </div>
      </div>
    </div>);
}
