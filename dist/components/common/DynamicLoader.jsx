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
exports.DynamicErrorBoundary = void 0;
exports.DynamicLoader = DynamicLoader;
const react_1 = __importStar(require("react"));
const LoadingState_1 = require("./LoadingState");
/**
 * 動的インポートされたコンポーネントのラッパー
 * Suspenseとエラーバウンダリを提供
 */
function DynamicLoader({ children, fallback, message = 'コンポーネントを読み込んでいます...' }) {
    return (<react_1.Suspense fallback={fallback || <LoadingState_1.LoadingState message={message}/>}>
      {children}
    </react_1.Suspense>);
}
class DynamicErrorBoundary extends react_1.default.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('Dynamic import error:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (this.props.fallback || (<div className="p-4 text-center">
            <p className="text-red-600">コンポーネントの読み込みに失敗しました</p>
            <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              ページを再読み込み
            </button>
          </div>));
        }
        return this.props.children;
    }
}
exports.DynamicErrorBoundary = DynamicErrorBoundary;
