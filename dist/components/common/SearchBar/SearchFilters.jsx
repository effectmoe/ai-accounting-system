"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchFilter = SearchFilter;
const react_1 = __importDefault(require("react"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const select_1 = require("@/components/ui/select");
const popover_1 = require("@/components/ui/popover");
function SearchFilter({ filter, value, onChange, className }) {
    switch (filter.type) {
        case 'select':
            return (<select_1.Select value={value || filter.defaultValue || ''} onValueChange={onChange}>
          <select_1.SelectTrigger className={(0, utils_1.cn)('w-[180px]', className)}>
            <select_1.SelectValue placeholder={filter.label}/>
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            <select_1.SelectItem value="_all">すべて</select_1.SelectItem>
            {filter.options?.map((option) => (<select_1.SelectItem key={option.value} value={option.value}>
                {option.label}
              </select_1.SelectItem>))}
          </select_1.SelectContent>
        </select_1.Select>);
        case 'text':
            return (<input_1.Input type="text" placeholder={filter.label} value={value || ''} onChange={(e) => onChange(e.target.value)} className={(0, utils_1.cn)('w-[180px]', className)}/>);
        case 'date':
            return (<popover_1.Popover>
          <popover_1.PopoverTrigger asChild>
            <button_1.Button variant="outline" className={(0, utils_1.cn)('w-[180px] justify-start text-left font-normal', className)}>
              <lucide_react_1.Calendar className="mr-2 h-4 w-4"/>
              {value ? new Date(value).toLocaleDateString('ja-JP') : filter.label}
            </button_1.Button>
          </popover_1.PopoverTrigger>
          <popover_1.PopoverContent className="w-auto p-0">
            <input_1.Input type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} className="border-0"/>
          </popover_1.PopoverContent>
        </popover_1.Popover>);
        case 'range':
            return (<div className={(0, utils_1.cn)('flex items-center gap-2', className)}>
          <input_1.Input type="number" placeholder="最小" value={value?.min || ''} onChange={(e) => onChange({ ...value, min: e.target.value })} className="w-[80px]"/>
          <span className="text-gray-500">〜</span>
          <input_1.Input type="number" placeholder="最大" value={value?.max || ''} onChange={(e) => onChange({ ...value, max: e.target.value })} className="w-[80px]"/>
        </div>);
        case 'checkbox':
            return (<button_1.Button variant={value ? 'default' : 'outline'} size="sm" onClick={() => onChange(!value)} className={(0, utils_1.cn)('gap-2', className)}>
          {value && <lucide_react_1.Check className="h-4 w-4"/>}
          {filter.label}
        </button_1.Button>);
        default:
            return null;
    }
}
