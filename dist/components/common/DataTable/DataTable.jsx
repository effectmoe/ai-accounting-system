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
exports.DataTable = DataTable;
const react_1 = __importStar(require("react"));
const utils_1 = require("@/lib/utils");
const LoadingState_1 = require("../LoadingState");
const EmptyState_1 = require("../EmptyState");
const DataTableHeader_1 = require("./DataTableHeader");
const DataTableRow_1 = require("./DataTableRow");
const DataTablePagination_1 = require("./DataTablePagination");
const button_1 = require("@/components/ui/button");
function DataTable({ data, columns, loading = false, error = null, sortable = true, sortConfig, onSort, selection, selectedItems = new Set(), onSelectionChange, pagination, onPageChange, onPageSizeChange, actions, bulkActions, emptyMessage, className, striped = false, hoverable = true, compact = false, }) {
    const [localSelectedItems, setLocalSelectedItems] = (0, react_1.useState)(selectedItems);
    // Use local state if no external control
    const effectiveSelectedItems = onSelectionChange ? selectedItems : localSelectedItems;
    const handleSelectionChange = (0, react_1.useCallback)((id) => {
        const newSelection = new Set(effectiveSelectedItems);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        }
        else {
            if (selection?.multiple === false) {
                newSelection.clear();
            }
            newSelection.add(id);
        }
        if (onSelectionChange) {
            onSelectionChange(newSelection);
        }
        else {
            setLocalSelectedItems(newSelection);
        }
    }, [effectiveSelectedItems, onSelectionChange, selection?.multiple]);
    const handleSelectAll = (0, react_1.useCallback)(() => {
        const newSelection = new Set();
        if (effectiveSelectedItems.size !== data.length) {
            data.forEach(item => newSelection.add(item.id));
        }
        if (onSelectionChange) {
            onSelectionChange(newSelection);
        }
        else {
            setLocalSelectedItems(newSelection);
        }
    }, [data, effectiveSelectedItems.size, onSelectionChange]);
    const allSelected = (0, react_1.useMemo)(() => {
        return data.length > 0 && effectiveSelectedItems.size === data.length;
    }, [data.length, effectiveSelectedItems.size]);
    // Loading state
    if (loading) {
        return (<div className={(0, utils_1.cn)('bg-white rounded-lg shadow', className)}>
        <div className="p-8">
          <LoadingState_1.LoadingState message="データを読み込んでいます..."/>
        </div>
      </div>);
    }
    // Error state
    if (error) {
        return (<div className={(0, utils_1.cn)('bg-white rounded-lg shadow', className)}>
        <EmptyState_1.EmptyState variant="error" title="エラーが発生しました" message={error.message || 'データの読み込み中にエラーが発生しました。'} action={{
                label: '再試行',
                onClick: () => window.location.reload(),
            }}/>
      </div>);
    }
    // Empty state
    if (data.length === 0) {
        return (<div className={(0, utils_1.cn)('bg-white rounded-lg shadow', className)}>
        <EmptyState_1.EmptyState variant="no-data" message={emptyMessage}/>
      </div>);
    }
    return (<div className={(0, utils_1.cn)('bg-white rounded-lg shadow', className)}>
      {/* Bulk actions */}
      {bulkActions && effectiveSelectedItems.size > 0 && (<div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">
              {effectiveSelectedItems.size}件選択中
            </span>
            {bulkActions.map((action, index) => (<button_1.Button key={index} variant={action.variant || 'outline'} size="sm" onClick={() => action.onClick(Array.from(effectiveSelectedItems))}>
                {action.label}
              </button_1.Button>))}
          </div>
        </div>)}
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className={(0, utils_1.cn)('min-w-full divide-y divide-gray-200', compact && 'table-compact')}>
          <DataTableHeader_1.DataTableHeader columns={columns} sortConfig={sortConfig} onSort={sortable ? onSort : undefined} selection={selection} allSelected={allSelected} onSelectAll={handleSelectAll} hasActions={!!actions}/>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (<DataTableRow_1.DataTableRow key={item.id} item={item} columns={columns} selected={effectiveSelectedItems.has(item.id)} onSelect={handleSelectionChange} selection={selection} actions={actions} striped={striped} hoverable={hoverable}/>))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {pagination && onPageChange && onPageSizeChange && (<DataTablePagination_1.DataTablePagination pagination={pagination} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange}/>)}
    </div>);
}
