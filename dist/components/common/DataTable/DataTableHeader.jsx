"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTableHeader = DataTableHeader;
const react_1 = __importDefault(require("react"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const checkbox_1 = require("@/components/ui/checkbox");
function DataTableHeader({ columns, sortConfig, onSort, selection, allSelected, onSelectAll, hasActions, }) {
    const getSortIcon = (column) => {
        if (!sortConfig || sortConfig.key !== column) {
            return <lucide_react_1.ChevronsUpDown className="h-4 w-4 opacity-50"/>;
        }
        return sortConfig.direction === 'asc'
            ? <lucide_react_1.ChevronUp className="h-4 w-4"/>
            : <lucide_react_1.ChevronDown className="h-4 w-4"/>;
    };
    return (<thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        {selection?.enabled && (<th className="px-4 py-3 text-left">
            {selection.multiple !== false && (<checkbox_1.Checkbox checked={allSelected} onCheckedChange={onSelectAll} aria-label="Select all"/>)}
          </th>)}
        
        {columns.map((column) => (<th key={String(column.key)} className={(0, utils_1.cn)('px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider', column.sortable && 'cursor-pointer hover:bg-gray-100', column.align === 'center' && 'text-center', column.align === 'right' && 'text-right')} style={{ width: column.width }} onClick={() => column.sortable && onSort?.(column.key)}>
            <div className={(0, utils_1.cn)('flex items-center gap-2', column.align === 'center' && 'justify-center', column.align === 'right' && 'justify-end')}>
              <span>{column.label}</span>
              {column.sortable && getSortIcon(column.key)}
            </div>
          </th>))}
        
        {hasActions && (<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            アクション
          </th>)}
      </tr>
    </thead>);
}
