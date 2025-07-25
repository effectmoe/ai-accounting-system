"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormField = FormField;
exports.TextField = TextField;
exports.TextAreaField = TextAreaField;
exports.SelectField = SelectField;
const react_1 = __importDefault(require("react"));
const utils_1 = require("@/lib/utils");
const label_1 = require("@/components/ui/label");
const lucide_react_1 = require("lucide-react");
function FormField({ label, name, error, required, hint, className, labelClassName, children, }) {
    // Clone children and add necessary props
    const enhancedChild = react_1.default.cloneElement(children, {
        id: name,
        name,
        'aria-invalid': !!error,
        'aria-describedby': error ? `${name}-error` : hint ? `${name}-hint` : undefined,
        className: (0, utils_1.cn)(children.props.className, error && 'border-red-500 focus:ring-red-500'),
    });
    return (<div className={(0, utils_1.cn)('space-y-2', className)}>
      <label_1.Label htmlFor={name} className={(0, utils_1.cn)('text-sm font-medium', error && 'text-red-600', labelClassName)}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label_1.Label>
      
      {enhancedChild}
      
      {hint && !error && (<p id={`${name}-hint`} className="text-sm text-gray-500">
          {hint}
        </p>)}
      
      {error && (<div id={`${name}-error`} className="flex items-center gap-2 text-sm text-red-600">
          <lucide_react_1.AlertCircle className="h-4 w-4"/>
          <span>{error}</span>
        </div>)}
    </div>);
}
function TextField({ type = 'text', placeholder, value, onChange, disabled, ...formFieldProps }) {
    return (<FormField {...formFieldProps}>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange} disabled={disabled} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"/>
    </FormField>);
}
function TextAreaField({ placeholder, value, onChange, rows = 4, disabled, ...formFieldProps }) {
    return (<FormField {...formFieldProps}>
      <textarea placeholder={placeholder} value={value} onChange={onChange} rows={rows} disabled={disabled} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"/>
    </FormField>);
}
function SelectField({ value, onChange, options, placeholder, disabled, ...formFieldProps }) {
    return (<FormField {...formFieldProps}>
      <select value={value} onChange={onChange} disabled={disabled} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
        {placeholder && (<option value="" disabled>
            {placeholder}
          </option>)}
        {options.map((option) => (<option key={option.value} value={option.value}>
            {option.label}
          </option>))}
      </select>
    </FormField>);
}
