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
exports.PDFViewer = exports.StyleSheet = exports.View = exports.Text = exports.Page = exports.Document = exports.PDFDownloadLink = void 0;
const react_1 = __importDefault(require("react"));
const dynamic_1 = __importDefault(require("next/dynamic"));
const DynamicLoader_1 = require("@/components/common/DynamicLoader");
// @react-pdf/rendererを動的にインポート
const DynamicPDFDownloadLink = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('@react-pdf/renderer'))).then(mod => mod.PDFDownloadLink), {
    loading: () => <DynamicLoader_1.DynamicLoader message="PDFジェネレーターを準備しています..."/>,
    ssr: false // PDFはクライアントサイドでのみ生成
});
exports.PDFDownloadLink = DynamicPDFDownloadLink;
const DynamicDocument = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('@react-pdf/renderer'))).then(mod => mod.Document), { ssr: false });
exports.Document = DynamicDocument;
const DynamicPage = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('@react-pdf/renderer'))).then(mod => mod.Page), { ssr: false });
exports.Page = DynamicPage;
const DynamicText = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('@react-pdf/renderer'))).then(mod => mod.Text), { ssr: false });
exports.Text = DynamicText;
const DynamicView = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('@react-pdf/renderer'))).then(mod => mod.View), { ssr: false });
exports.View = DynamicView;
const DynamicStyleSheet = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('@react-pdf/renderer'))).then(mod => mod.StyleSheet), { ssr: false });
exports.StyleSheet = DynamicStyleSheet;
// PDFプレビューコンポーネント（必要な場合のみロード）
exports.PDFViewer = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('@react-pdf/renderer'))).then(mod => mod.PDFViewer), {
    loading: () => <DynamicLoader_1.DynamicLoader message="PDFビューアを読み込んでいます..."/>,
    ssr: false
});
