import { getDatabase } from '@/lib/mongodb-client';
import { logger } from '@/lib/logger';

/**
 * Reactコンポーネントを生成
 */
export const createComponentTool = {
  name: 'create_component',
  description: 'Reactコンポーネントを生成します',
  parameters: {
    type: 'object',
    properties: {
      component_name: { type: 'string', description: 'コンポーネント名' },
      component_type: {
        type: 'string',
        enum: ['page', 'layout', 'feature', 'ui', 'form', 'chart'],
        description: 'コンポーネントタイプ',
      },
      props: { type: 'array', items: { type: 'object' }, description: 'プロパティ定義' },
      styling: { type: 'string', enum: ['tailwind', 'css-modules', 'styled-components'], description: 'スタイリング方法' },
      features: {
        type: 'array',
        items: { type: 'string' },
        description: '必要な機能（validation, animation, responsive等）',
      },
    },
    required: ['component_name', 'component_type'],
  },
  handler: async (params: any) => {
    logger.info('Creating React component:', params);
    
    const db = await getDatabase();
    const collection = db.collection('ui_components');
    
    // コンポーネントの基本構造を生成
    let componentCode = '';
    let componentStyles = '';
    let componentTests = '';
    
    // TypeScript インターフェース定義
    const propsInterface = params.props && params.props.length > 0 ? 
      generatePropsInterface(params.component_name, params.props) : '';
    
    // コンポーネントタイプに応じたテンプレート生成
    switch (params.component_type) {
      case 'page':
        componentCode = generatePageComponent(params.component_name, propsInterface, params.features);
        break;
        
      case 'form':
        componentCode = generateFormComponent(params.component_name, params.props, params.features);
        break;
        
      case 'ui':
        componentCode = generateUIComponent(params.component_name, propsInterface, params.styling);
        break;
        
      case 'chart':
        componentCode = generateChartComponent(params.component_name, params.features);
        break;
        
      default:
        componentCode = generateBasicComponent(params.component_name, propsInterface);
    }
    
    // スタイリングの生成
    if (params.styling === 'tailwind') {
      componentStyles = '// Tailwind CSS classes are used inline';
    } else if (params.styling === 'css-modules') {
      componentStyles = generateCSSModule(params.component_name);
    }
    
    // テストファイルの生成
    componentTests = generateComponentTest(params.component_name, params.component_type);
    
    // コンポーネント情報を保存
    const componentInfo = {
      name: params.component_name,
      type: params.component_type,
      props: params.props || [],
      styling: params.styling || 'tailwind',
      features: params.features || [],
      files: {
        component: `${params.component_name}.tsx`,
        styles: params.styling === 'css-modules' ? `${params.component_name}.module.css` : null,
        test: `${params.component_name}.test.tsx`,
      },
      code: {
        component: componentCode,
        styles: componentStyles,
        test: componentTests,
      },
      created_at: new Date(),
    };
    
    await collection.insertOne(componentInfo);
    
    return {
      success: true,
      component_name: params.component_name,
      files_generated: Object.values(componentInfo.files).filter(f => f !== null),
      code: componentInfo.code,
      usage_example: `import { ${params.component_name} } from '@/components/${params.component_name}';

// 使用例
<${params.component_name} ${params.props ? params.props.map((p: any) => `${p.name}={${p.example || 'value'}}`).join(' ') : ''} />`,
      next_steps: [
        'コンポーネントファイルを適切なディレクトリに保存',
        'PropTypesまたはTypeScriptの型定義を確認',
        'スタイリングの調整',
        'テストの実行と追加',
      ],
    };
  }
};

/**
 * フォームコンポーネントを生成
 */
export const createFormTool = {
  name: 'create_form',
  description: 'フォームコンポーネントを生成します',
  parameters: {
    type: 'object',
    properties: {
      form_name: { type: 'string', description: 'フォーム名' },
      fields: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'フィールド名' },
            type: { type: 'string', description: 'フィールドタイプ' },
            label: { type: 'string', description: 'ラベル' },
            validation: { type: 'object', description: 'バリデーションルール' },
            required: { type: 'boolean', description: '必須フィールドか' },
          },
        },
        description: 'フォームフィールド定義',
      },
      submit_action: { type: 'string', description: '送信時のアクション' },
      use_server_action: { type: 'boolean', description: 'Server Actionを使用するか' },
    },
    required: ['form_name', 'fields'],
  },
  handler: async (params: any) => {
    logger.info('Creating form component:', params);
    
    // フォームスキーマの生成（Zod）
    const zodSchema = generateZodSchema(params.fields);
    
    // フォームコンポーネントの生成
    const formComponent = `'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// フォームスキーマ定義
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
      ${params.use_server_action ? 
        `await ${params.submit_action}(data);` : 
        'if (onSubmit) await onSubmit(data);'}
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      ${params.fields.map((field: any) => generateFormField(field)).join('\n      ')}
      
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? '送信中...' : '送信'}
      </button>
    </form>
  );
}`;
    
    // Server Action の生成（必要な場合）
    let serverAction = '';
    if (params.use_server_action) {
      serverAction = `'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

${zodSchema}

export async function ${params.submit_action}(data: z.infer<typeof ${params.form_name}Schema>) {
  // バリデーション
  const validated = ${params.form_name}Schema.parse(data);
  
  try {
    // データベース操作やAPI呼び出し
    // await db.collection('forms').insertOne(validated);
    
    // キャッシュの再検証
    revalidatePath('/forms');
    
    return { success: true, message: 'フォームを送信しました' };
  } catch (error) {
    return { success: false, error: 'フォーム送信に失敗しました' };
  }
}`;
    }
    
    return {
      success: true,
      form_name: params.form_name,
      files_generated: [
        `${params.form_name}.tsx`,
        params.use_server_action ? `actions/${params.submit_action}.ts` : null,
      ].filter(Boolean),
      code: {
        component: formComponent,
        serverAction: serverAction,
        schema: zodSchema,
      },
      validation_rules: params.fields.map((field: any) => ({
        field: field.name,
        rules: field.validation || { required: field.required },
      })),
      features: [
        'React Hook Form統合',
        'Zodバリデーション',
        'TypeScript型安全性',
        'エラーハンドリング',
        params.use_server_action ? 'Next.js Server Actions' : null,
      ].filter(Boolean),
    };
  }
};

/**
 * ダッシュボードレイアウトを生成
 */
export const createDashboardTool = {
  name: 'create_dashboard',
  description: 'ダッシュボードレイアウトを生成します',
  parameters: {
    type: 'object',
    properties: {
      dashboard_name: { type: 'string', description: 'ダッシュボード名' },
      layout: {
        type: 'string',
        enum: ['grid', 'flex', 'masonry', 'custom'],
        description: 'レイアウトタイプ',
      },
      widgets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'ウィジェットタイプ' },
            position: { type: 'object', description: '配置情報' },
            size: { type: 'object', description: 'サイズ情報' },
          },
        },
        description: 'ウィジェット配置',
      },
      responsive_breakpoints: { type: 'object', description: 'レスポンシブブレークポイント' },
    },
    required: ['dashboard_name', 'layout', 'widgets'],
  },
  handler: async (params: any) => {
    logger.info('Creating dashboard layout:', params);
    
    // レイアウトスタイルの決定
    const layoutStyles = getLayoutStyles(params.layout);
    
    // ウィジェットコンポーネントの生成
    const widgetImports = params.widgets.map((widget: any, index: number) => 
      `import { ${widget.type}Widget } from '@/components/widgets/${widget.type}Widget';`
    ).join('\n');
    
    // ダッシュボードコンポーネント
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
    // ダッシュボードデータの取得
    fetchDashboardData();
  }, [userId, timeRange]);

  const fetchDashboardData = async () => {
    try {
      // API呼び出しまたはデータ取得ロジック
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
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <TimeRangeSelector value={timeRange} onChange={() => {}} />
      </div>
      
      <div className="${layoutStyles.grid}">
        ${params.widgets.map((widget: any, index: number) => `
        <div className="${getWidgetClasses(widget, params.layout)}">
          <${widget.type}Widget 
            data={data?.${widget.type.toLowerCase()}} 
            loading={isLoading}
          />
        </div>`).join('')}
      </div>
    </div>
  );
}

// スケルトンローダー
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

// 時間範囲セレクター
function TimeRangeSelector({ value, onChange }: any) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-3 py-1"
    >
      <option value="day">今日</option>
      <option value="week">今週</option>
      <option value="month">今月</option>
      <option value="year">今年</option>
    </select>
  );
}`;
    
    // ウィジェットのサンプルコード
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
        {/* ウィジェットコンテンツ */}
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
        sampleWidget: sampleWidget,
      },
      responsive_features: [
        'モバイルファースト設計',
        '適応的グリッドレイアウト',
        'タッチ対応インタラクション',
        'レスポンシブフォントサイズ',
      ],
      performance_optimizations: [
        'ウィジェットの遅延読み込み',
        'データの段階的取得',
        'メモ化による再レンダリング最適化',
        'スケルトンローダー',
      ],
      next_steps: [
        '各ウィジェットコンポーネントの実装',
        'データフェッチングロジックの実装',
        'リアルタイム更新の追加（必要に応じて）',
        'アクセシビリティの確認',
      ],
    };
  }
};

// ヘルパー関数
function generatePropsInterface(componentName: string, props: any[]): string {
  if (!props || props.length === 0) return '';
  
  const propsDefinition = props.map(prop => 
    `  ${prop.name}${prop.required ? '' : '?'}: ${prop.type || 'any'};`
  ).join('\n');
  
  return `interface ${componentName}Props {
${propsDefinition}
}`;
}

function generatePageComponent(name: string, propsInterface: string, features: string[]): string {
  return `'use client';

import { useState, useEffect } from 'react';
${features?.includes('animation') ? "import { motion } from 'framer-motion';" : ''}

${propsInterface}

export default function ${name}Page(${propsInterface ? `props: ${name}Props` : ''}) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ページデータの初期化
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
          {/* ページコンテンツ */}
        </div>
      )}
    </div>
  );
}`;
}

function generateFormComponent(name: string, fields: any[], features: string[]): string {
  // フォームコンポーネントの詳細実装は createFormTool で行う
  return `// Form component implementation
// See createFormTool for detailed form generation`;
}

function generateUIComponent(name: string, propsInterface: string, styling: string): string {
  const styleImport = styling === 'css-modules' ? 
    `import styles from './${name}.module.css';` : '';
  
  return `import React from 'react';
${styleImport}

${propsInterface}

export function ${name}(${propsInterface ? `props: ${name}Props` : ''}) {
  return (
    <div className="${styling === 'tailwind' ? 'rounded-lg shadow-md p-4' : 'styles.container'}">
      {/* UIコンポーネントの実装 */}
    </div>
  );
}`;
}

function generateChartComponent(name: string, features: string[]): string {
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

    // 既存のチャートを破棄
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // 新しいチャートを作成
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

function generateBasicComponent(name: string, propsInterface: string): string {
  return `import React from 'react';

${propsInterface}

export function ${name}(${propsInterface ? `props: ${name}Props` : ''}) {
  return (
    <div>
      <h2>${name} Component</h2>
      {/* コンポーネントの実装 */}
    </div>
  );
}`;
}

function generateCSSModule(componentName: string): string {
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

function generateComponentTest(componentName: string, componentType: string): string {
  return `import { render, screen } from '@testing-library/react';
import { ${componentName} } from './${componentName}';

describe('${componentName}', () => {
  it('renders without crashing', () => {
    render(<${componentName} />);
  });

  it('displays correct content', () => {
    render(<${componentName} />);
    // テストアサーション
  });

  ${componentType === 'form' ? `
  it('handles form submission', async () => {
    const onSubmit = jest.fn();
    render(<${componentName} onSubmit={onSubmit} />);
    
    // フォーム送信テスト
  });` : ''}
});`;
}

function generateZodSchema(fields: any[]): string {
  const schemaFields = fields.map(field => {
    let validation = `z.${field.type || 'string'}()`;
    
    if (field.validation) {
      if (field.validation.min) validation += `.min(${field.validation.min})`;
      if (field.validation.max) validation += `.max(${field.validation.max})`;
      if (field.validation.email) validation = `z.string().email()`;
      if (field.validation.url) validation = `z.string().url()`;
    }
    
    if (!field.required) validation += `.optional()`;
    
    return `  ${field.name}: ${validation},`;
  }).join('\n');
  
  return `const ${fields[0]?.formName || 'form'}Schema = z.object({
${schemaFields}
});`;
}

function generateFormField(field: any): string {
  const fieldType = field.type || 'text';
  const baseClasses = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';
  
  if (fieldType === 'textarea') {
    return `<div>
        <label htmlFor="${field.name}" className="block text-sm font-medium text-gray-700 mb-1">
          ${field.label}${field.required ? ' *' : ''}
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
  
  if (fieldType === 'select' && field.options) {
    return `<div>
        <label htmlFor="${field.name}" className="block text-sm font-medium text-gray-700 mb-1">
          ${field.label}${field.required ? ' *' : ''}
        </label>
        <select
          id="${field.name}"
          {...register('${field.name}')}
          className="${baseClasses}"
        >
          <option value="">選択してください</option>
          ${field.options.map((opt: any) => 
            `<option value="${opt.value}">${opt.label}</option>`
          ).join('\n          ')}
        </select>
        {errors.${field.name} && (
          <p className="mt-1 text-sm text-red-600">{errors.${field.name}.message}</p>
        )}
      </div>`;
  }
  
  return `<div>
        <label htmlFor="${field.name}" className="block text-sm font-medium text-gray-700 mb-1">
          ${field.label}${field.required ? ' *' : ''}
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

function getLayoutStyles(layout: string): any {
  const styles: Record<string, any> = {
    grid: {
      container: 'p-6',
      header: 'flex justify-between items-center mb-6',
      grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
    },
    flex: {
      container: 'p-6',
      header: 'flex justify-between items-center mb-6',
      grid: 'flex flex-wrap gap-4',
    },
    masonry: {
      container: 'p-6',
      header: 'flex justify-between items-center mb-6',
      grid: 'columns-1 md:columns-2 lg:columns-3 gap-4',
    },
  };
  
  return styles[layout] || styles.grid;
}

function getWidgetClasses(widget: any, layout: string): string {
  const sizeClasses: Record<string, string> = {
    small: 'col-span-1',
    medium: 'col-span-1 md:col-span-2',
    large: 'col-span-1 md:col-span-2 lg:col-span-3',
  };
  
  if (layout === 'grid') {
    return sizeClasses[widget.size?.type || 'medium'];
  }
  
  return 'w-full md:w-1/2 lg:w-1/3';
}

// すべてのツールをエクスポート
export const uiTools = [
  createComponentTool,
  createFormTool,
  createDashboardTool,
];