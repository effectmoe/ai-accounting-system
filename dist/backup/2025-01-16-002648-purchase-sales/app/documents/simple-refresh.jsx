"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleRefreshButton = SimpleRefreshButton;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
function SimpleRefreshButton({ onRefresh }) {
    const [isRefreshing, setIsRefreshing] = (0, react_1.useState)(false);
    const [lastRefresh, setLastRefresh] = (0, react_1.useState)(null);
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await onRefresh();
        setLastRefresh(new Date());
        setTimeout(() => setIsRefreshing(false), 1000);
    };
    return (<div className="flex items-center gap-3">
      <button onClick={handleRefresh} disabled={isRefreshing} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
        <lucide_react_1.RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}/>
        更新
      </button>
      {lastRefresh && (<span className="text-sm text-gray-500">
          最終更新: {lastRefresh.toLocaleTimeString('ja-JP')}
        </span>)}
    </div>);
}
