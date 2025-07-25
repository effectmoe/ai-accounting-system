"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewToggle = ViewToggle;
const react_1 = __importDefault(require("react"));
const lucide_react_1 = require("lucide-react");
/**
 * 表示モードの切り替えコンポーネント
 * タイムラインとテーブル表示を切り替える
 */
function ViewToggle({ defaultView = 'timeline', onViewChange, className }) {
    const [activeView, setActiveView] = react_1.default.useState(defaultView);
    const handleViewChange = (view) => {
        setActiveView(view);
        // Save to localStorage
        try {
            localStorage.setItem('journal-view-mode', view);
        }
        catch (e) {
            // Ignore localStorage errors
        }
        // Call parent handler
        if (onViewChange) {
            onViewChange(view);
        }
    };
    return (<div className={`inline-flex rounded-lg bg-gray-100 p-1 ${className || ''}`}>
      <button type="button" onClick={() => handleViewChange('timeline')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeView === 'timeline'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'}`}>
        <lucide_react_1.ActivityIcon className="h-4 w-4"/>
        タイムライン
      </button>
      <button type="button" onClick={() => handleViewChange('table')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeView === 'table'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'}`}>
        <lucide_react_1.TableIcon className="h-4 w-4"/>
        テーブル
      </button>
    </div>);
}
