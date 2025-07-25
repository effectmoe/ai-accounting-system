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
exports.SearchBar = SearchBar;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const input_1 = require("@/components/ui/input");
const button_1 = require("@/components/ui/button");
const SearchFilters_1 = require("./SearchFilters");
const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
};
function SearchBar({ placeholder = '検索...', value: externalValue, onChange, onSearch, filters = [], filterValues = {}, onFilterChange, showAdvanced = false, onAdvancedToggle, actions, className, size = 'md', variant = 'default', debounceMs = 300, }) {
    const [internalValue, setInternalValue] = (0, react_1.useState)(externalValue || '');
    const [isTyping, setIsTyping] = (0, react_1.useState)(false);
    const debounceTimer = (0, react_1.useRef)();
    // Controlled/uncontrolled component handling
    const value = externalValue !== undefined ? externalValue : internalValue;
    const handleChange = (0, react_1.useCallback)((newValue) => {
        // Update internal state if uncontrolled
        if (externalValue === undefined) {
            setInternalValue(newValue);
        }
        // Call onChange immediately
        onChange?.(newValue);
        // Debounce search
        setIsTyping(true);
        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setIsTyping(false);
            onSearch?.(newValue);
        }, debounceMs);
    }, [externalValue, onChange, onSearch, debounceMs]);
    const handleClear = (0, react_1.useCallback)(() => {
        handleChange('');
    }, [handleChange]);
    const handleFilterChange = (0, react_1.useCallback)((key, value) => {
        const newFilters = { ...filterValues };
        if (value === '_all' || value === '' || value === null) {
            delete newFilters[key];
        }
        else {
            newFilters[key] = value;
        }
        onFilterChange?.(newFilters);
    }, [filterValues, onFilterChange]);
    // Cleanup on unmount
    (0, react_1.useEffect)(() => {
        return () => {
            clearTimeout(debounceTimer.current);
        };
    }, []);
    const hasActiveFilters = Object.keys(filterValues).length > 0;
    return (<div className={(0, utils_1.cn)('space-y-3', className)}>
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <lucide_react_1.Search className={(0, utils_1.cn)('absolute left-3 top-1/2 -translate-y-1/2 text-gray-400', size === 'sm' ? 'h-4 w-4' : 'h-5 w-5')}/>
          
          <input_1.Input type="text" placeholder={placeholder} value={value} onChange={(e) => handleChange(e.target.value)} className={(0, utils_1.cn)('pl-10 pr-10', sizeClasses[size], variant === 'minimal' && 'border-0 shadow-none bg-gray-100 focus:bg-white')}/>
          
          {/* Clear button */}
          {value && (<button onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <lucide_react_1.X className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'}/>
            </button>)}
          
          {/* Loading indicator */}
          {isTyping && (<div className="absolute right-10 top-1/2 -translate-y-1/2">
              <div className="h-3 w-3 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin"/>
            </div>)}
        </div>
        
        {/* Filter toggle */}
        {filters.length > 0 && (<button_1.Button variant={hasActiveFilters ? 'default' : 'outline'} size={size === 'sm' ? 'sm' : 'default'} onClick={onAdvancedToggle} className="gap-2">
            <lucide_react_1.Filter className="h-4 w-4"/>
            フィルター
            {hasActiveFilters && (<span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {Object.keys(filterValues).length}
              </span>)}
          </button_1.Button>)}
        
        {/* Additional actions */}
        {actions}
      </div>
      
      {/* Filters */}
      {showAdvanced && filters.length > 0 && (<div className="flex flex-wrap items-center gap-3">
          {filters.map((filter) => (<SearchFilters_1.SearchFilter key={filter.key} filter={filter} value={filterValues[filter.key]} onChange={(value) => handleFilterChange(filter.key, value)}/>))}
          
          {hasActiveFilters && (<button_1.Button variant="ghost" size="sm" onClick={() => onFilterChange?.({})} className="text-gray-600">
              すべてクリア
            </button_1.Button>)}
        </div>)}
    </div>);
}
