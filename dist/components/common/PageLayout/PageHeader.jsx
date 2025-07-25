"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageHeader = PageHeader;
const react_1 = __importDefault(require("react"));
const utils_1 = require("@/lib/utils");
function PageHeader({ title, description, actions, className, }) {
    return (<div className={(0, utils_1.cn)('flex flex-col sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex-1">
        {title && (<h1 className="text-2xl font-bold text-gray-900">{title}</h1>)}
        {description && (<p className="mt-2 text-sm text-gray-600">{description}</p>)}
      </div>
      
      {actions && (<div className="mt-4 sm:mt-0 sm:ml-6 flex items-center gap-3">
          {actions}
        </div>)}
    </div>);
}
