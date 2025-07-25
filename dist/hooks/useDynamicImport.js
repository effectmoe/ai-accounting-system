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
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicImports = void 0;
exports.useDynamicImport = useDynamicImport;
const react_1 = require("react");
/**
 * 動的インポート用のカスタムフック
 * 大きなライブラリを必要な時にのみロード
 */
function useDynamicImport(importFunction, dependencies = []) {
    const [module, setModule] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        let mounted = true;
        const loadModule = async () => {
            try {
                setLoading(true);
                setError(null);
                const importedModule = await importFunction();
                if (mounted) {
                    // デフォルトエクスポートかどうかをチェック
                    const moduleValue = 'default' in importedModule
                        ? importedModule.default
                        : importedModule;
                    setModule(moduleValue);
                }
            }
            catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err : new Error('Failed to load module'));
                }
            }
            finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };
        loadModule();
        return () => {
            mounted = false;
        };
    }, dependencies);
    return { module, loading, error };
}
/**
 * 大きなライブラリの動的インポート例
 */
exports.dynamicImports = {
    // PDFレンダラー（大きなライブラリ）
    pdfRenderer: () => Promise.resolve().then(() => __importStar(require('@react-pdf/renderer'))),
    // Recharts（グラフライブラリ）
    recharts: () => Promise.resolve().then(() => __importStar(require('recharts'))),
    // Framer Motion（アニメーションライブラリ）
    framerMotion: () => Promise.resolve().then(() => __importStar(require('framer-motion'))),
    // Date-fns の特定の関数のみ
    dateFnsFormat: () => Promise.resolve().then(() => __importStar(require('date-fns/format'))),
    dateFnsParseISO: () => Promise.resolve().then(() => __importStar(require('date-fns/parseISO'))),
    // Azure AI Form Recognizer（OCR用）
    azureFormRecognizer: () => Promise.resolve().then(() => __importStar(require('@azure/ai-form-recognizer'))),
};
