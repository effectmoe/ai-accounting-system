"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicInvoiceForm = void 0;
exports.Example1 = Example1;
exports.Example2 = Example2;
exports.Example3 = Example3;
exports.ConditionalDynamicImport = ConditionalDynamicImport;
exports.DynamicModalExample = DynamicModalExample;
const react_1 = __importStar(require("react"));
const dynamic_1 = __importDefault(require("next/dynamic"));
const DynamicLoader_1 = require("@/components/common/DynamicLoader");
const useDynamicImport_1 = require("@/hooks/useDynamicImport");
// 例1: React.lazy を使用した動的インポート
const LazyReportsPage = (0, react_1.lazy)(() => Promise.resolve().then(() => __importStar(require('@/app/reports/page'))));
function Example1() {
    return (<DynamicLoader_1.DynamicErrorBoundary>
      <DynamicLoader_1.DynamicLoader message="レポートページを読み込んでいます...">
        <LazyReportsPage />
      </DynamicLoader_1.DynamicLoader>
    </DynamicLoader_1.DynamicErrorBoundary>);
}
// 例2: Next.js dynamic を使用（SSRを無効化）
const DynamicPDFViewer = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('@/components/documents/PDFViewer'))).then(mod => mod.PDFViewer), {
    loading: () => <DynamicLoader_1.DynamicLoader message="PDFビューアを読み込んでいます..."/>,
    ssr: false, // クライアントサイドのみでレンダリング
});
function Example2() {
    return <DynamicPDFViewer document="example.pdf"/>;
}
// 例3: カスタムフックを使用した条件付き動的インポート
function Example3() {
    const { module: recharts, loading, error } = (0, useDynamicImport_1.useDynamicImport)(() => Promise.resolve().then(() => __importStar(require('recharts'))), [] // 依存配列
    );
    if (loading)
        return <DynamicLoader_1.DynamicLoader message="グラフライブラリを読み込んでいます..."/>;
    if (error)
        return <div>エラー: {error.message}</div>;
    if (!recharts)
        return null;
    const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } = recharts;
    return (<LineChart width={600} height={300} data={[]}>
      <CartesianGrid strokeDasharray="3 3"/>
      <XAxis dataKey="name"/>
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="value" stroke="#8884d8"/>
    </LineChart>);
}
// 例4: ルートベースの自動コード分割（Next.js App Router）
// app/heavy-feature/page.tsx
const HeavyFeaturePage = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('@/app/heavy-feature/components/HeavyComponent'))), {
    loading: () => <DynamicLoader_1.DynamicLoader />,
});
// 例5: 条件付きコンポーネントローディング
function ConditionalDynamicImport({ showAdvanced }) {
    const AdvancedFeatures = showAdvanced
        ? (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('@/components/AdvancedFeatures'))), {
            loading: () => <DynamicLoader_1.DynamicLoader message="高度な機能を読み込んでいます..."/>,
        })
        : () => null;
    return (<div>
      <h2>基本機能</h2>
      {/* 基本的なコンテンツ */}
      
      {showAdvanced && <AdvancedFeatures />}
    </div>);
}
// 例6: 大きなフォームコンポーネントの遅延読み込み
exports.DynamicInvoiceForm = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('@/components/invoices/InvoiceForm'))).then(mod => ({
    default: mod.InvoiceForm,
})), {
    loading: () => <DynamicLoader_1.DynamicLoader message="請求書フォームを準備しています..."/>,
    ssr: true, // SSRを有効にしてSEOを維持
});
// 例7: モーダルコンポーネントの動的インポート
function DynamicModalExample() {
    const [showModal, setShowModal] = react_1.default.useState(false);
    const DynamicModal = react_1.default.useMemo(() => showModal
        ? (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('@/components/modals/ComplexModal'))), {
            loading: () => <DynamicLoader_1.DynamicLoader message="モーダルを読み込んでいます..."/>,
        })
        : () => null, [showModal]);
    return (<>
      <button onClick={() => setShowModal(true)}>モーダルを開く</button>
      {showModal && <DynamicModal onClose={() => setShowModal(false)}/>}
    </>);
}
