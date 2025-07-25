"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadingState = LoadingState;
exports.LoadingSpinner = LoadingSpinner;
const react_1 = __importDefault(require("react"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
};
function LoadingState({ size = 'md', fullPage = false, message, className }) {
    const content = (<div className={(0, utils_1.cn)('flex flex-col items-center justify-center gap-4', className)}>
      <lucide_react_1.Loader2 className={(0, utils_1.cn)('animate-spin text-blue-600', sizeClasses[size])}/>
      {message && (<p className="text-sm text-gray-600">{message}</p>)}
    </div>);
    if (fullPage) {
        return (<div className="flex h-screen items-center justify-center">
        {content}
      </div>);
    }
    return content;
}
function LoadingSpinner({ size = 'md', className }) {
    return (<lucide_react_1.Loader2 className={(0, utils_1.cn)('animate-spin', sizeClasses[size], className)}/>);
}
