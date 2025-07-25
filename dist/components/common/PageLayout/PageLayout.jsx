"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageLayout = PageLayout;
exports.PageSection = PageSection;
const react_1 = __importDefault(require("react"));
const utils_1 = require("@/lib/utils");
const PageHeader_1 = require("./PageHeader");
const Breadcrumb_1 = require("./Breadcrumb");
const variantClasses = {
    default: 'max-w-7xl mx-auto',
    full: 'w-full',
    narrow: 'max-w-4xl mx-auto',
};
function PageLayout({ children, title, description, actions, breadcrumbs, variant = 'default', className, contentClassName, }) {
    return (<div className={(0, utils_1.cn)('min-h-screen bg-gray-50', className)}>
      <div className={(0, utils_1.cn)('px-4 sm:px-6 lg:px-8 py-8', variantClasses[variant])}>
        {/* Breadcrumb */}
        {breadcrumbs && breadcrumbs.length > 0 && (<div className="mb-4">
            <Breadcrumb_1.Breadcrumb items={breadcrumbs}/>
          </div>)}
        
        {/* Header */}
        {(title || actions) && (<PageHeader_1.PageHeader title={title} description={description} actions={actions} className="mb-6"/>)}
        
        {/* Content */}
        <div className={(0, utils_1.cn)('space-y-6', contentClassName)}>
          {children}
        </div>
      </div>
    </div>);
}
function PageSection({ children, title, description, actions, className, }) {
    return (<section className={(0, utils_1.cn)('bg-white rounded-lg shadow', className)}>
      {(title || actions) && (<div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              {title && (<h2 className="text-lg font-medium text-gray-900">{title}</h2>)}
              {description && (<p className="mt-1 text-sm text-gray-500">{description}</p>)}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        </div>)}
      <div className="p-6">{children}</div>
    </section>);
}
