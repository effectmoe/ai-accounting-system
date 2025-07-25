"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Breadcrumb = Breadcrumb;
const react_1 = __importDefault(require("react"));
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
function Breadcrumb({ items, className }) {
    const allItems = [
        { label: 'ホーム', href: '/' },
        ...items,
    ];
    return (<nav className={(0, utils_1.cn)('flex items-center space-x-2 text-sm', className)}>
      {allItems.map((item, index) => {
            const isLast = index === allItems.length - 1;
            return (<react_1.default.Fragment key={index}>
            {index === 0 ? (<link_1.default href={item.href || '/'} className="text-gray-500 hover:text-gray-700 flex items-center">
                <lucide_react_1.Home className="h-4 w-4"/>
              </link_1.default>) : (<>
                <lucide_react_1.ChevronRight className="h-4 w-4 text-gray-400"/>
                {isLast || !item.href ? (<span className="text-gray-900 font-medium">{item.label}</span>) : (<link_1.default href={item.href} className="text-gray-500 hover:text-gray-700">
                    {item.label}
                  </link_1.default>)}
              </>)}
          </react_1.default.Fragment>);
        })}
    </nav>);
}
