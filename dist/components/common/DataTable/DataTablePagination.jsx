"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTablePagination = DataTablePagination;
const react_1 = __importDefault(require("react"));
const lucide_react_1 = require("lucide-react");
const button_1 = require("@/components/ui/button");
const select_1 = require("@/components/ui/select");
function DataTablePagination({ pagination, onPageChange, onPageSizeChange, }) {
    const { page, pageSize, total, pageSizeOptions = [10, 20, 50, 100] } = pagination;
    const totalPages = Math.ceil(total / pageSize);
    const startItem = (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, total);
    return (<div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-700">表示件数</p>
          <select_1.Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <select_1.SelectTrigger className="h-8 w-[70px]">
              <select_1.SelectValue />
            </select_1.SelectTrigger>
            <select_1.SelectContent>
              {pageSizeOptions.map((size) => (<select_1.SelectItem key={size} value={String(size)}>
                  {size}
                </select_1.SelectItem>))}
            </select_1.SelectContent>
          </select_1.Select>
        </div>
        
        <p className="text-sm text-gray-700">
          {total > 0 ? `${startItem}-${endItem} / ${total}件` : '0件'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button_1.Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={page === 1}>
          <lucide_react_1.ChevronsLeft className="h-4 w-4"/>
        </button_1.Button>
        
        <button_1.Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
          <lucide_react_1.ChevronLeft className="h-4 w-4"/>
        </button_1.Button>
        
        <span className="text-sm text-gray-700">
          {page} / {totalPages || 1}
        </span>
        
        <button_1.Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          <lucide_react_1.ChevronRight className="h-4 w-4"/>
        </button_1.Button>
        
        <button_1.Button variant="outline" size="sm" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}>
          <lucide_react_1.ChevronsRight className="h-4 w-4"/>
        </button_1.Button>
      </div>
    </div>);
}
