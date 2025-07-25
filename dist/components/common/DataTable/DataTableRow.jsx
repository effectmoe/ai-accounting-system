"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTableRow = DataTableRow;
const react_1 = __importDefault(require("react"));
const utils_1 = require("@/lib/utils");
const checkbox_1 = require("@/components/ui/checkbox");
function DataTableRow({ item, columns, selected, onSelect, selection, actions, striped, hoverable, }) {
    const handleRowClick = () => {
        if (selection?.enabled && !selection.showCheckbox) {
            onSelect(item.id);
        }
    };
    return (<tr className={(0, utils_1.cn)('border-b border-gray-200', striped && 'even:bg-gray-50', hoverable && 'hover:bg-gray-50 cursor-pointer', selected && 'bg-blue-50')} onClick={handleRowClick}>
      {selection?.enabled && (<td className="px-4 py-3">
          {(selection.showCheckbox !== false || selection.multiple !== false) && (<checkbox_1.Checkbox checked={selected} onCheckedChange={() => onSelect(item.id)} onClick={(e) => e.stopPropagation()} aria-label={`Select ${item.id}`}/>)}
        </td>)}
      
      {columns.map((column) => {
            const value = column.render
                ? column.render(item)
                : item[column.key];
            return (<td key={String(column.key)} className={(0, utils_1.cn)('px-4 py-3 text-sm text-gray-900', column.align === 'center' && 'text-center', column.align === 'right' && 'text-right')}>
            {value}
          </td>);
        })}
      
      {actions && (<td className="px-4 py-3 text-right">
          <div onClick={(e) => e.stopPropagation()}>
            {actions(item)}
          </div>
        </td>)}
    </tr>);
}
