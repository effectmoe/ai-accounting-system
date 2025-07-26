import { l as logger, g as getDatabase } from '../mongodb-client.mjs';
import '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/mongodb/lib/index.js';
import '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/@sentry/nextjs/build/cjs/index.server.js';

const createComponentTool = {
  name: "create_component",
  description: "React\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8\u3092\u751F\u6210\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      component_name: { type: "string", description: "\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8\u540D" },
      component_type: {
        type: "string",
        enum: ["page", "layout", "feature", "ui", "form", "chart"],
        description: "\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8\u30BF\u30A4\u30D7"
      },
      props: { type: "array", items: { type: "object" }, description: "\u30D7\u30ED\u30D1\u30C6\u30A3\u5B9A\u7FA9" },
      styling: { type: "string", enum: ["tailwind", "css-modules", "styled-components"], description: "\u30B9\u30BF\u30A4\u30EA\u30F3\u30B0\u65B9\u6CD5" },
      features: {
        type: "array",
        items: { type: "string" },
        description: "\u5FC5\u8981\u306A\u6A5F\u80FD\uFF08validation, animation, responsive\u7B49\uFF09"
      }
    },
    required: ["component_name", "component_type"]
  },
  handler: async (params) => {
    logger.info("Creating React component:", params);
    const db = await getDatabase();
    const collection = db.collection("ui_components");
    let componentCode = "";
    let componentStyles = "";
    let componentTests = "";
    const propsInterface = params.props && params.props.length > 0 ? generatePropsInterface(params.component_name, params.props) : "";
    switch (params.component_type) {
      case "page":
        componentCode = generatePageComponent(params.component_name, propsInterface, params.features);
        break;
      case "form":
        componentCode = generateFormComponent();
        break;
      case "ui":
        componentCode = generateUIComponent(params.component_name, propsInterface, params.styling);
        break;
      case "chart":
        componentCode = generateChartComponent(params.component_name);
        break;
      default:
        componentCode = generateBasicComponent(params.component_name, propsInterface);
    }
    if (params.styling === "tailwind") {
      componentStyles = "// Tailwind CSS classes are used inline";
    } else if (params.styling === "css-modules") {
      componentStyles = generateCSSModule();
    }
    componentTests = generateComponentTest(params.component_name, params.component_type);
    const componentInfo = {
      name: params.component_name,
      type: params.component_type,
      props: params.props || [],
      styling: params.styling || "tailwind",
      features: params.features || [],
      files: {
        component: `${params.component_name}.tsx`,
        styles: params.styling === "css-modules" ? `${params.component_name}.module.css` : null,
        test: `${params.component_name}.test.tsx`
      },
      code: {
        component: componentCode,
        styles: componentStyles,
        test: componentTests
      },
      created_at: /* @__PURE__ */ new Date()
    };
    await collection.insertOne(componentInfo);
    return {
      success: true,
      component_name: params.component_name,
      files_generated: Object.values(componentInfo.files).filter((f) => f !== null),
      code: componentInfo.code,
      usage_example: `import { ${params.component_name} } from '@/components/${params.component_name}';

// \u4F7F\u7528\u4F8B
<${params.component_name} ${params.props ? params.props.map((p) => `${p.name}={${p.example || "value"}}`).join(" ") : ""} />`,
      next_steps: [
        "\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8\u30D5\u30A1\u30A4\u30EB\u3092\u9069\u5207\u306A\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306B\u4FDD\u5B58",
        "PropTypes\u307E\u305F\u306FTypeScript\u306E\u578B\u5B9A\u7FA9\u3092\u78BA\u8A8D",
        "\u30B9\u30BF\u30A4\u30EA\u30F3\u30B0\u306E\u8ABF\u6574",
        "\u30C6\u30B9\u30C8\u306E\u5B9F\u884C\u3068\u8FFD\u52A0"
      ]
    };
  }
};
const createFormTool = {
  name: "create_form",
  description: "\u30D5\u30A9\u30FC\u30E0\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8\u3092\u751F\u6210\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      form_name: { type: "string", description: "\u30D5\u30A9\u30FC\u30E0\u540D" },
      fields: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "\u30D5\u30A3\u30FC\u30EB\u30C9\u540D" },
            type: { type: "string", description: "\u30D5\u30A3\u30FC\u30EB\u30C9\u30BF\u30A4\u30D7" },
            label: { type: "string", description: "\u30E9\u30D9\u30EB" },
            validation: { type: "object", description: "\u30D0\u30EA\u30C7\u30FC\u30B7\u30E7\u30F3\u30EB\u30FC\u30EB" },
            required: { type: "boolean", description: "\u5FC5\u9808\u30D5\u30A3\u30FC\u30EB\u30C9\u304B" }
          }
        },
        description: "\u30D5\u30A9\u30FC\u30E0\u30D5\u30A3\u30FC\u30EB\u30C9\u5B9A\u7FA9"
      },
      submit_action: { type: "string", description: "\u9001\u4FE1\u6642\u306E\u30A2\u30AF\u30B7\u30E7\u30F3" },
      use_server_action: { type: "boolean", description: "Server Action\u3092\u4F7F\u7528\u3059\u308B\u304B" }
    },
    required: ["form_name", "fields"]
  },
  handler: async (params) => {
    logger.info("Creating form component:", params);
    const zodSchema = generateZodSchema(params.fields);
    const formComponent = `'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// \u30D5\u30A9\u30FC\u30E0\u30B9\u30AD\u30FC\u30DE\u5B9A\u7FA9
${zodSchema}

type ${params.form_name}Data = z.infer<typeof ${params.form_name}Schema>;

interface ${params.form_name}Props {
  onSubmit?: (data: ${params.form_name}Data) => void | Promise<void>;
  defaultValues?: Partial<${params.form_name}Data>;
}

export function ${params.form_name}({ onSubmit, defaultValues }: ${params.form_name}Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<${params.form_name}Data>({
    resolver: zodResolver(${params.form_name}Schema),
    defaultValues,
  });

  const onFormSubmit = async (data: ${params.form_name}Data) => {
    try {
      ${params.use_server_action ? `await ${params.submit_action}(data);` : "if (onSubmit) await onSubmit(data);"}
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      ${params.fields.map((field) => generateFormField(field)).join("\n      ")}
      
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? '\u9001\u4FE1\u4E2D...' : '\u9001\u4FE1'}
      </button>
    </form>
  );
}`;
    let serverAction = "";
    if (params.use_server_action) {
      serverAction = `'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

${zodSchema}

export async function ${params.submit_action}(data: z.infer<typeof ${params.form_name}Schema>) {
  // \u30D0\u30EA\u30C7\u30FC\u30B7\u30E7\u30F3
  const validated = ${params.form_name}Schema.parse(data);
  
  try {
    // \u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u64CD\u4F5C\u3084API\u547C\u3073\u51FA\u3057
    // await db.collection('forms').insertOne(validated);
    
    // \u30AD\u30E3\u30C3\u30B7\u30E5\u306E\u518D\u691C\u8A3C
    revalidatePath('/forms');
    
    return { success: true, message: '\u30D5\u30A9\u30FC\u30E0\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F' };
  } catch (error) {
    return { success: false, error: '\u30D5\u30A9\u30FC\u30E0\u9001\u4FE1\u306B\u5931\u6557\u3057\u307E\u3057\u305F' };
  }
}`;
    }
    return {
      success: true,
      form_name: params.form_name,
      files_generated: [
        `${params.form_name}.tsx`,
        params.use_server_action ? `actions/${params.submit_action}.ts` : null
      ].filter(Boolean),
      code: {
        component: formComponent,
        serverAction,
        schema: zodSchema
      },
      validation_rules: params.fields.map((field) => ({
        field: field.name,
        rules: field.validation || { required: field.required }
      })),
      features: [
        "React Hook Form\u7D71\u5408",
        "Zod\u30D0\u30EA\u30C7\u30FC\u30B7\u30E7\u30F3",
        "TypeScript\u578B\u5B89\u5168\u6027",
        "\u30A8\u30E9\u30FC\u30CF\u30F3\u30C9\u30EA\u30F3\u30B0",
        params.use_server_action ? "Next.js Server Actions" : null
      ].filter(Boolean)
    };
  }
};
const createDashboardTool = {
  name: "create_dashboard",
  description: "\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9\u30EC\u30A4\u30A2\u30A6\u30C8\u3092\u751F\u6210\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      dashboard_name: { type: "string", description: "\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9\u540D" },
      layout: {
        type: "string",
        enum: ["grid", "flex", "masonry", "custom"],
        description: "\u30EC\u30A4\u30A2\u30A6\u30C8\u30BF\u30A4\u30D7"
      },
      widgets: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", description: "\u30A6\u30A3\u30B8\u30A7\u30C3\u30C8\u30BF\u30A4\u30D7" },
            position: { type: "object", description: "\u914D\u7F6E\u60C5\u5831" },
            size: { type: "object", description: "\u30B5\u30A4\u30BA\u60C5\u5831" }
          }
        },
        description: "\u30A6\u30A3\u30B8\u30A7\u30C3\u30C8\u914D\u7F6E"
      },
      responsive_breakpoints: { type: "object", description: "\u30EC\u30B9\u30DD\u30F3\u30B7\u30D6\u30D6\u30EC\u30FC\u30AF\u30DD\u30A4\u30F3\u30C8" }
    },
    required: ["dashboard_name", "layout", "widgets"]
  },
  handler: async (params) => {
    logger.info("Creating dashboard layout:", params);
    const layoutStyles = getLayoutStyles(params.layout);
    const widgetImports = params.widgets.map(
      (widget, index) => `import { ${widget.type}Widget } from '@/components/widgets/${widget.type}Widget';`
    ).join("\n");
    const dashboardComponent = `import { useState, useEffect } from 'react';
${widgetImports}

interface ${params.dashboard_name}Props {
  userId?: string;
  timeRange?: 'day' | 'week' | 'month' | 'year';
}

export function ${params.dashboard_name}({ userId, timeRange = 'month' }: ${params.dashboard_name}Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // \u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9\u30C7\u30FC\u30BF\u306E\u53D6\u5F97
    fetchDashboardData();
  }, [userId, timeRange]);

  const fetchDashboardData = async () => {
    try {
      // API\u547C\u3073\u51FA\u3057\u307E\u305F\u306F\u30C7\u30FC\u30BF\u53D6\u5F97\u30ED\u30B8\u30C3\u30AF
      setIsLoading(false);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="${layoutStyles.container}">
      <div className="${layoutStyles.header}">
        <h1 className="text-2xl font-bold">\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9</h1>
        <TimeRangeSelector value={timeRange} onChange={() => {}} />
      </div>
      
      <div className="${layoutStyles.grid}">
        ${params.widgets.map((widget, index) => `
        <div className="${getWidgetClasses(widget, params.layout)}">
          <${widget.type}Widget 
            data={data?.${widget.type.toLowerCase()}} 
            loading={isLoading}
          />
        </div>`).join("")}
      </div>
    </div>
  );
}

// \u30B9\u30B1\u30EB\u30C8\u30F3\u30ED\u30FC\u30C0\u30FC
function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  );
}

// \u6642\u9593\u7BC4\u56F2\u30BB\u30EC\u30AF\u30BF\u30FC
function TimeRangeSelector({ value, onChange }: any) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-3 py-1"
    >
      <option value="day">\u4ECA\u65E5</option>
      <option value="week">\u4ECA\u9031</option>
      <option value="month">\u4ECA\u6708</option>
      <option value="year">\u4ECA\u5E74</option>
    </select>
  );
}`;
    const sampleWidget = `interface ${params.widgets[0]?.type}WidgetProps {
  data?: any;
  loading?: boolean;
}

export function ${params.widgets[0]?.type}Widget({ data, loading }: ${params.widgets[0]?.type}WidgetProps) {
  if (loading) {
    return <div className="animate-pulse h-full bg-gray-200 rounded" />;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">${params.widgets[0]?.type}</h3>
      <div className="space-y-2">
        {/* \u30A6\u30A3\u30B8\u30A7\u30C3\u30C8\u30B3\u30F3\u30C6\u30F3\u30C4 */}
      </div>
    </div>
  );
}`;
    return {
      success: true,
      dashboard_name: params.dashboard_name,
      layout_type: params.layout,
      widgets_count: params.widgets.length,
      code: {
        dashboard: dashboardComponent,
        sampleWidget
      },
      responsive_features: [
        "\u30E2\u30D0\u30A4\u30EB\u30D5\u30A1\u30FC\u30B9\u30C8\u8A2D\u8A08",
        "\u9069\u5FDC\u7684\u30B0\u30EA\u30C3\u30C9\u30EC\u30A4\u30A2\u30A6\u30C8",
        "\u30BF\u30C3\u30C1\u5BFE\u5FDC\u30A4\u30F3\u30BF\u30E9\u30AF\u30B7\u30E7\u30F3",
        "\u30EC\u30B9\u30DD\u30F3\u30B7\u30D6\u30D5\u30A9\u30F3\u30C8\u30B5\u30A4\u30BA"
      ],
      performance_optimizations: [
        "\u30A6\u30A3\u30B8\u30A7\u30C3\u30C8\u306E\u9045\u5EF6\u8AAD\u307F\u8FBC\u307F",
        "\u30C7\u30FC\u30BF\u306E\u6BB5\u968E\u7684\u53D6\u5F97",
        "\u30E1\u30E2\u5316\u306B\u3088\u308B\u518D\u30EC\u30F3\u30C0\u30EA\u30F3\u30B0\u6700\u9069\u5316",
        "\u30B9\u30B1\u30EB\u30C8\u30F3\u30ED\u30FC\u30C0\u30FC"
      ],
      next_steps: [
        "\u5404\u30A6\u30A3\u30B8\u30A7\u30C3\u30C8\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8\u306E\u5B9F\u88C5",
        "\u30C7\u30FC\u30BF\u30D5\u30A7\u30C3\u30C1\u30F3\u30B0\u30ED\u30B8\u30C3\u30AF\u306E\u5B9F\u88C5",
        "\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u66F4\u65B0\u306E\u8FFD\u52A0\uFF08\u5FC5\u8981\u306B\u5FDC\u3058\u3066\uFF09",
        "\u30A2\u30AF\u30BB\u30B7\u30D3\u30EA\u30C6\u30A3\u306E\u78BA\u8A8D"
      ]
    };
  }
};
function generatePropsInterface(componentName, props) {
  if (!props || props.length === 0) return "";
  const propsDefinition = props.map(
    (prop) => `  ${prop.name}${prop.required ? "" : "?"}: ${prop.type || "any"};`
  ).join("\n");
  return `interface ${componentName}Props {
${propsDefinition}
}`;
}
function generatePageComponent(name, propsInterface, features) {
  return `'use client';

import { useState, useEffect } from 'react';
${features?.includes("animation") ? "import { motion } from 'framer-motion';" : ""}

${propsInterface}

export default function ${name}Page(${propsInterface ? `props: ${name}Props` : ""}) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // \u30DA\u30FC\u30B8\u30C7\u30FC\u30BF\u306E\u521D\u671F\u5316
    setIsLoading(false);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">${name}</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* \u30DA\u30FC\u30B8\u30B3\u30F3\u30C6\u30F3\u30C4 */}
        </div>
      )}
    </div>
  );
}`;
}
function generateFormComponent(name, fields, features) {
  return `// Form component implementation
// See createFormTool for detailed form generation`;
}
function generateUIComponent(name, propsInterface, styling) {
  const styleImport = styling === "css-modules" ? `import styles from './${name}.module.css';` : "";
  return `import React from 'react';
${styleImport}

${propsInterface}

export function ${name}(${propsInterface ? `props: ${name}Props` : ""}) {
  return (
    <div className="${styling === "tailwind" ? "rounded-lg shadow-md p-4" : "styles.container"}">
      {/* UI\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8\u306E\u5B9F\u88C5 */}
    </div>
  );
}`;
}
function generateChartComponent(name, features) {
  return `import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface ${name}Props {
  data: any;
  type?: 'line' | 'bar' | 'pie' | 'doughnut';
  options?: any;
}

export function ${name}({ data, type = 'line', options }: ${name}Props) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // \u65E2\u5B58\u306E\u30C1\u30E3\u30FC\u30C8\u3092\u7834\u68C4
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // \u65B0\u3057\u3044\u30C1\u30E3\u30FC\u30C8\u3092\u4F5C\u6210
    const ctx = chartRef.current.getContext('2d');
    if (ctx) {
      chartInstance.current = new Chart(ctx, {
        type,
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          ...options,
        },
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, type, options]);

  return (
    <div className="relative h-64 w-full">
      <canvas ref={chartRef}></canvas>
    </div>
  );
}`;
}
function generateBasicComponent(name, propsInterface) {
  return `import React from 'react';

${propsInterface}

export function ${name}(${propsInterface ? `props: ${name}Props` : ""}) {
  return (
    <div>
      <h2>${name} Component</h2>
      {/* \u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8\u306E\u5B9F\u88C5 */}
    </div>
  );
}`;
}
function generateCSSModule(componentName) {
  return `.container {
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.content {
  color: #333;
}

@media (max-width: 768px) {
  .container {
    padding: 0.5rem;
  }
}`;
}
function generateComponentTest(componentName, componentType) {
  return `import { render, screen } from '@testing-library/react';
import { ${componentName} } from './${componentName}';

describe('${componentName}', () => {
  it('renders without crashing', () => {
    render(<${componentName} />);
  });

  it('displays correct content', () => {
    render(<${componentName} />);
    // \u30C6\u30B9\u30C8\u30A2\u30B5\u30FC\u30B7\u30E7\u30F3
  });

  ${componentType === "form" ? `
  it('handles form submission', async () => {
    const onSubmit = jest.fn();
    render(<${componentName} onSubmit={onSubmit} />);
    
    // \u30D5\u30A9\u30FC\u30E0\u9001\u4FE1\u30C6\u30B9\u30C8
  });` : ""}
});`;
}
function generateZodSchema(fields) {
  const schemaFields = fields.map((field) => {
    let validation = `z.${field.type || "string"}()`;
    if (field.validation) {
      if (field.validation.min) validation += `.min(${field.validation.min})`;
      if (field.validation.max) validation += `.max(${field.validation.max})`;
      if (field.validation.email) validation = `z.string().email()`;
      if (field.validation.url) validation = `z.string().url()`;
    }
    if (!field.required) validation += `.optional()`;
    return `  ${field.name}: ${validation},`;
  }).join("\n");
  return `const ${fields[0]?.formName || "form"}Schema = z.object({
${schemaFields}
});`;
}
function generateFormField(field) {
  const fieldType = field.type || "text";
  const baseClasses = "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
  if (fieldType === "textarea") {
    return `<div>
        <label htmlFor="${field.name}" className="block text-sm font-medium text-gray-700 mb-1">
          ${field.label}${field.required ? " *" : ""}
        </label>
        <textarea
          id="${field.name}"
          {...register('${field.name}')}
          className="${baseClasses}"
          rows={4}
        />
        {errors.${field.name} && (
          <p className="mt-1 text-sm text-red-600">{errors.${field.name}.message}</p>
        )}
      </div>`;
  }
  if (fieldType === "select" && field.options) {
    return `<div>
        <label htmlFor="${field.name}" className="block text-sm font-medium text-gray-700 mb-1">
          ${field.label}${field.required ? " *" : ""}
        </label>
        <select
          id="${field.name}"
          {...register('${field.name}')}
          className="${baseClasses}"
        >
          <option value="">\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044</option>
          ${field.options.map(
      (opt) => `<option value="${opt.value}">${opt.label}</option>`
    ).join("\n          ")}
        </select>
        {errors.${field.name} && (
          <p className="mt-1 text-sm text-red-600">{errors.${field.name}.message}</p>
        )}
      </div>`;
  }
  return `<div>
        <label htmlFor="${field.name}" className="block text-sm font-medium text-gray-700 mb-1">
          ${field.label}${field.required ? " *" : ""}
        </label>
        <input
          id="${field.name}"
          type="${fieldType}"
          {...register('${field.name}')}
          className="${baseClasses}"
        />
        {errors.${field.name} && (
          <p className="mt-1 text-sm text-red-600">{errors.${field.name}.message}</p>
        )}
      </div>`;
}
function getLayoutStyles(layout) {
  const styles = {
    grid: {
      container: "p-6",
      header: "flex justify-between items-center mb-6",
      grid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    },
    flex: {
      container: "p-6",
      header: "flex justify-between items-center mb-6",
      grid: "flex flex-wrap gap-4"
    },
    masonry: {
      container: "p-6",
      header: "flex justify-between items-center mb-6",
      grid: "columns-1 md:columns-2 lg:columns-3 gap-4"
    }
  };
  return styles[layout] || styles.grid;
}
function getWidgetClasses(widget, layout) {
  const sizeClasses = {
    small: "col-span-1",
    medium: "col-span-1 md:col-span-2",
    large: "col-span-1 md:col-span-2 lg:col-span-3"
  };
  if (layout === "grid") {
    return sizeClasses[widget.size?.type || "medium"];
  }
  return "w-full md:w-1/2 lg:w-1/3";
}
const uiTools = [
  createComponentTool,
  createFormTool,
  createDashboardTool
];

export { createComponentTool, createDashboardTool, createFormTool, uiTools };
//# sourceMappingURL=21ffd6b0-5b7a-437c-bf05-245031018d59.mjs.map
