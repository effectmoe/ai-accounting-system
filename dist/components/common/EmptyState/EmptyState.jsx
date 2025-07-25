"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyState = EmptyState;
const react_1 = __importDefault(require("react"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const button_1 = require("@/components/ui/button");
const variantConfig = {
    default: {
        icon: lucide_react_1.FileX,
        title: 'データがありません',
        message: '表示するデータが見つかりませんでした。',
    },
    search: {
        icon: lucide_react_1.Search,
        title: '検索結果がありません',
        message: '検索条件を変更してもう一度お試しください。',
    },
    error: {
        icon: lucide_react_1.FileX,
        title: 'エラーが発生しました',
        message: 'データの読み込み中にエラーが発生しました。',
    },
    'no-data': {
        icon: lucide_react_1.Database,
        title: 'データが登録されていません',
        message: '新しいデータを追加してください。',
    },
};
function EmptyState({ title, message, icon, variant = 'default', action, className }) {
    const config = variantConfig[variant];
    const Icon = icon || config.icon;
    const displayTitle = title || config.title;
    const displayMessage = message || config.message;
    return (<div className={(0, utils_1.cn)('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="rounded-full bg-gray-100 p-4 mb-4">
        <Icon className="h-8 w-8 text-gray-400"/>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {displayTitle}
      </h3>
      <p className="text-sm text-gray-500 mb-6 max-w-md">
        {displayMessage}
      </p>
      {action && (<button_1.Button onClick={action.onClick} variant="outline">
          {action.label}
        </button_1.Button>)}
    </div>);
}
