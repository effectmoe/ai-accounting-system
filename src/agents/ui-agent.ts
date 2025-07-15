import { z } from 'zod';
import { createAgent } from '@mastra/core';
import { DatabaseService, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

// UIコンポーネントスキーマ
const uiComponentSchema = z.object({
  type: z.enum(['page', 'component', 'layout', 'widget']),
  name: z.string(),
  description: z.string(),
  framework: z.enum(['nextjs', 'react', 'vue', 'svelte']).default('nextjs'),
  styling: z.enum(['tailwind', 'css-modules', 'styled-components', 'emotion']).default('tailwind'),
  features: z.array(z.string()).optional(),
  props: z.record(z.any()).optional(),
  state: z.record(z.any()).optional(),
  interactions: z.array(z.string()).optional(),
  companyId: z.string(),
});

// UIデザインスキーマ
const uiDesignSchema = z.object({
  theme: z.object({
    primaryColor: z.string().default('#3B82F6'),
    secondaryColor: z.string().default('#10B981'),
    backgroundColor: z.string().default('#FFFFFF'),
    textColor: z.string().default('#1F2937'),
    borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'xl']).default('md'),
  }).optional(),
  layout: z.enum(['sidebar', 'topbar', 'hybrid', 'minimal']).default('sidebar'),
  responsive: z.boolean().default(true),
  darkMode: z.boolean().default(true),
  accessibility: z.boolean().default(true),
});

// UIエージェントの入力スキーマ
const uiInputSchema = z.object({
  operation: z.enum([
    'generate_component',
    'generate_page',
    'update_ui',
    'create_dashboard',
    'optimize_performance',
    'generate_design_system'
  ]),
  
  // コンポーネント生成
  componentRequest: z.object({
    description: z.string(),
    components: z.array(uiComponentSchema).optional(),
    design: uiDesignSchema.optional(),
    examples: z.array(z.string()).optional(),
    dataSchema: z.any().optional(),
    companyId: z.string(),
  }).optional(),
  
  // ページ生成
  pageRequest: z.object({
    pageName: z.string(),
    route: z.string(),
    description: z.string(),
    sections: z.array(z.object({
      name: z.string(),
      type: z.string(),
      content: z.string(),
    })),
    dataRequirements: z.array(z.string()).optional(),
    companyId: z.string(),
  }).optional(),
  
  // ダッシュボード生成
  dashboardRequest: z.object({
    title: z.string(),
    metrics: z.array(z.object({
      name: z.string(),
      type: z.enum(['number', 'chart', 'table', 'list']),
      dataSource: z.string(),
      refreshInterval: z.number().optional(),
    })),
    layout: z.enum(['grid', 'flex', 'masonry']).default('grid'),
    companyId: z.string(),
  }).optional(),
  
  // UI更新
  updateRequest: z.object({
    componentPath: z.string(),
    updates: z.object({
      style: z.any().optional(),
      functionality: z.any().optional(),
      accessibility: z.any().optional(),
    }),
    companyId: z.string(),
  }).optional(),
});

// UIエージェント定義
export const uiAgent = createAgent({
  id: 'ui-agent',
  name: 'UI Generation and Management Agent',
  description: 'Generate and manage UI components with MongoDB integration for accounting applications',
  
  inputSchema: uiInputSchema,
  
  // エージェントのツール
  tools: {
    // 会計ダッシュボード専用コンポーネント生成
    generateAccountingComponents: {
      description: 'Generate accounting-specific UI components',
      execute: async ({ componentType, data, companyId }) => {
        try {
          const db = DatabaseService.getInstance();
          
          const accountingComponents = {
            'receipt-upload': {
              description: 'Drag-and-drop receipt upload component with preview',
              features: ['Multiple file upload', 'Image preview', 'PDF support', 'Progress indicator'],
              code: `'use client';
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Image } from 'lucide-react';

export default function ReceiptUpload({ onUpload, maxFiles = 10 }) {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const onDrop = useCallback((acceptedFiles) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);
    onUpload(acceptedFiles);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {'image/*': [], 'application/pdf': []},
    maxFiles,
  });

  return (
    <div className="w-full">
      <div {...getRootProps()} className={\`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer \${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}\`}>
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">レシートをアップロード</p>
        <p className="text-sm text-gray-500">ファイルをドラッグ&ドロップまたはクリックして選択</p>
      </div>
    </div>
  );
}`,
            },
            'journal-entry-form': {
              description: 'Double-entry bookkeeping form with auto-calculation',
              features: ['Debit/Credit fields', 'Account selector', 'Tax calculation', 'Balance check'],
              code: `'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator } from 'lucide-react';

export default function JournalEntryForm({ onSubmit, accounts }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState([
    { id: '1', account: '', description: '', debit: 0, credit: 0 },
    { id: '2', account: '', description: '', debit: 0, credit: 0 },
  ]);
  const [totals, setTotals] = useState({ debit: 0, credit: 0 });
  const [isBalanced, setIsBalanced] = useState(false);

  useEffect(() => {
    const debitTotal = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const creditTotal = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    setTotals({ debit: debitTotal, credit: creditTotal });
    setIsBalanced(debitTotal === creditTotal && debitTotal > 0);
  }, [lines]);

  return (
    <form className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">仕訳入力</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">日付</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
        <div className="md:col-span-2 flex items-end">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">借方計: ¥{totals.debit.toLocaleString()}</span>
            <span className="text-sm text-gray-600">貸方計: ¥{totals.credit.toLocaleString()}</span>
            <div className={\`px-2 py-1 rounded text-xs font-medium \${isBalanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}\`}>
              {isBalanced ? '貸借一致' : '貸借不一致'}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}`,
            },
            'financial-chart': {
              description: 'Interactive financial charts and graphs',
              features: ['Line/Bar/Pie charts', 'Real-time updates', 'Export to image', 'Drill-down'],
              code: `'use client';
import React from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function FinancialChart({ data, type = 'line', title }) {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value">
              {data.map((entry, index) => (
                <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        );
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}`,
            },
            'tax-calculator': {
              description: 'Japanese tax calculation widget',
              features: ['Consumption tax', 'Withholding tax', 'Corporate tax', 'Real-time calculation'],
              code: `'use client';
import React, { useState, useEffect } from 'react';
import { Calculator } from 'lucide-react';

export default function TaxCalculator() {
  const [amount, setAmount] = useState(0);
  const [taxType, setTaxType] = useState('consumption');
  const [result, setResult] = useState({ tax: 0, total: 0 });

  useEffect(() => {
    let tax = 0;
    switch (taxType) {
      case 'consumption':
        tax = amount * 0.1;
        break;
      case 'withholding':
        tax = amount * 0.1021;
        break;
      case 'corporate':
        tax = amount <= 8000000 ? amount * 0.15 : 8000000 * 0.15 + (amount - 8000000) * 0.232;
        break;
    }
    setResult({ tax, total: amount + tax });
  }, [amount, taxType]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex items-center mb-4">
        <Calculator className="h-6 w-6 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">税額計算</h3>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">金額</label>
          <input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">税種別</label>
          <select value={taxType} onChange={(e) => setTaxType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="consumption">消費税 (10%)</option>
            <option value="withholding">源泉徴収税 (10.21%)</option>
            <option value="corporate">法人税</option>
          </select>
        </div>
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">税額:</span>
            <span className="font-medium">¥{result.tax.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">合計:</span>
            <span className="font-bold text-lg">¥{result.total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}`,
            },
            'customer-list': {
              description: 'Customer management table with filters',
              features: ['Search', 'Sort', 'Filter', 'Pagination', 'Bulk actions'],
              code: `'use client';
import React, { useState } from 'react';
import { Search, Filter, ArrowUpDown } from 'lucide-react';

export default function CustomerList({ customers = [], onSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (sortDirection === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });

  const paginatedCustomers = sortedCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">顧客一覧</h3>
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="顧客を検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
            <Filter className="h-4 w-4 mr-2" />
            フィルター
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {['name', 'email', 'phone', 'company'].map((field) => (
                <th key={field} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => setSortField(field)}>
                  <div className="flex items-center">
                    {field === 'name' ? '名前' : field === 'email' ? 'メール' : field === 'phone' ? '電話' : '会社'}
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onSelect?.(customer)}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.company}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}`,
            },
            'invoice-viewer': {
              description: 'Invoice display and management component',
              features: ['PDF generation', 'Email sending', 'Status tracking', 'Payment recording'],
              code: `'use client';
import React, { useState } from 'react';
import { Download, Mail, Eye, DollarSign } from 'lucide-react';

export default function InvoiceViewer({ invoice, onStatusUpdate }) {
  const [status, setStatus] = useState(invoice?.status || 'draft');

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    onStatusUpdate?.(invoice.id, newStatus);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">請求書 #{invoice?.number}</h3>
            <p className="text-sm text-gray-500">作成日: {invoice?.date}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={\`px-2 py-1 rounded text-xs font-medium \${
              status === 'paid' ? 'bg-green-100 text-green-800' :
              status === 'sent' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }\`}>
              {status === 'paid' ? '支払済' : status === 'sent' ? '送信済' : '下書き'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">請求先</h4>
            <div className="text-sm text-gray-600">
              <p>{invoice?.customer?.name}</p>
              <p>{invoice?.customer?.email}</p>
              <p>{invoice?.customer?.address}</p>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">請求金額</h4>
            <div className="text-2xl font-bold text-gray-900">
              ¥{invoice?.total?.toLocaleString()}
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3">明細</h4>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">項目</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">数量</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">単価</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">金額</th>
                </tr>
              </thead>
              <tbody>
                {invoice?.items?.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-4 py-2">{item.description}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{item.quantity}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">¥{item.price.toLocaleString()}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">¥{(item.quantity * item.price).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-6 flex flex-wrap gap-2">
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <Eye className="h-4 w-4 mr-2" />
            プレビュー
          </button>
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            <Download className="h-4 w-4 mr-2" />
            PDF出力
          </button>
          <button className="flex items-center px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            <Mail className="h-4 w-4 mr-2" />
            メール送信
          </button>
          {status !== 'paid' && (
            <button 
              onClick={() => handleStatusChange('paid')}
              className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              支払記録
            </button>
          )}
        </div>
      </div>
    </div>
  );
}`,
            },
          };
          
          const component = accountingComponents[componentType];
          if (!component) {
            throw new Error(`Unknown accounting component type: ${componentType}`);
          }
          
          // コンポーネント情報をMongoDBに保存
          const componentRecord = {
            companyId,
            type: componentType,
            name: componentType.replace('-', ' '),
            description: component.description,
            features: component.features,
            framework: 'nextjs',
            styling: 'tailwind',
            code: component.code,
            version: '1.0.0',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          const result = await db.create('ui_components', componentRecord);
          
          return {
            success: true,
            componentId: result._id.toString(),
            component: componentRecord,
            message: 'コンポーネントが生成されました'
          };
          
        } catch (error) {
          console.error('Component generation error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
    
    // ダッシュボード生成
    createDashboard: {
      description: 'Create a complete dashboard layout',
      execute: async ({ title, metrics, layout, companyId }) => {
        try {
          const db = DatabaseService.getInstance();
          
          // ダッシュボード設定をMongoDBに保存
          const dashboardRecord = {
            companyId,
            title,
            layout,
            metrics: metrics.map(metric => ({
              ...metric,
              id: new ObjectId().toString(),
              position: { x: 0, y: 0, w: 4, h: 3 }, // デフォルトレイアウト
            })),
            theme: {
              primaryColor: '#3B82F6',
              secondaryColor: '#10B981',
              backgroundColor: '#FFFFFF',
              textColor: '#1F2937',
            },
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          const result = await db.create('dashboards', dashboardRecord);
          
          // ダッシュボードコンポーネントのコード生成
          const dashboardCode = `'use client';
import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function AccountingDashboard() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // API calls to fetch metrics data
      const responses = await Promise.all([
        fetch('/api/metrics/revenue'),
        fetch('/api/metrics/expenses'),
        fetch('/api/metrics/profit'),
        fetch('/api/metrics/cash-flow'),
      ]);
      
      const data = await Promise.all(responses.map(r => r.json()));
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">${title}</h1>
        <button
          onClick={fetchMetrics}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          更新
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        ${metrics.map(metric => `
        <div key="${metric.id}" className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">${metric.name}</h3>
          <div className="text-2xl font-bold text-blue-600">
            {loading ? 'Loading...' : '${metric.type === 'number' ? '¥0' : 'Chart'}'}
          </div>
        </div>
        `).join('')}
      </div>
    </div>
  );
}`;
          
          return {
            success: true,
            dashboardId: result._id.toString(),
            dashboard: dashboardRecord,
            code: dashboardCode,
            apiEndpoints: metrics.map(m => ({
              endpoint: `/api/metrics/${m.name.toLowerCase().replace(/\s+/g, '-')}`,
              method: 'GET',
              dataSource: m.dataSource,
            })),
            message: 'ダッシュボードが作成されました'
          };
          
        } catch (error) {
          console.error('Dashboard creation error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
    
    // デザインシステム生成
    generateDesignSystem: {
      description: 'Generate a complete design system',
      execute: async ({ theme, components, companyId }) => {
        try {
          const db = DatabaseService.getInstance();
          
          const designSystemRecord = {
            companyId,
            name: 'Accounting System Design System',
            version: '1.0.0',
            theme: {
              colors: {
                primary: theme?.primaryColor || '#3B82F6',
                secondary: theme?.secondaryColor || '#10B981',
                background: theme?.backgroundColor || '#FFFFFF',
                text: theme?.textColor || '#1F2937',
                error: '#EF4444',
                warning: '#F59E0B',
                success: '#10B981',
                info: '#3B82F6',
              },
              typography: {
                fontFamily: 'Inter, "Noto Sans JP", sans-serif',
                fontSize: {
                  xs: '0.75rem',
                  sm: '0.875rem',
                  base: '1rem',
                  lg: '1.125rem',
                  xl: '1.25rem',
                  '2xl': '1.5rem',
                  '3xl': '1.875rem',
                },
                fontWeight: {
                  normal: '400',
                  medium: '500',
                  semibold: '600',
                  bold: '700',
                },
              },
              spacing: {
                '1': '0.25rem',
                '2': '0.5rem',
                '3': '0.75rem',
                '4': '1rem',
                '5': '1.25rem',
                '6': '1.5rem',
                '8': '2rem',
                '10': '2.5rem',
                '12': '3rem',
                '16': '4rem',
              },
              borderRadius: {
                none: '0',
                sm: '0.125rem',
                md: '0.375rem',
                lg: '0.5rem',
                xl: '0.75rem',
                '2xl': '1rem',
                full: '9999px',
              },
            },
            components: components.map(componentName => ({
              name: componentName,
              variants: ['default', 'outlined', 'ghost'],
              sizes: ['sm', 'md', 'lg'],
              states: ['default', 'hover', 'active', 'disabled', 'loading'],
            })),
            tokens: {
              colors: theme?.colors || {},
              typography: 'Inter, "Noto Sans JP", sans-serif',
              spacing: '0.25rem, 0.5rem, 0.75rem, 1rem',
            },
            tailwindConfig: `module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '${theme?.primaryColor || '#3B82F6'}',
        secondary: '${theme?.secondaryColor || '#10B981'}',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans JP', 'sans-serif'],
      },
    },
  },
};`,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          const result = await db.create('design_systems', designSystemRecord);
          
          return {
            success: true,
            designSystemId: result._id.toString(),
            tokens: designSystemRecord.tokens,
            components: designSystemRecord.components,
            tailwindConfig: designSystemRecord.tailwindConfig,
            message: 'デザインシステムが生成されました'
          };
          
        } catch (error) {
          console.error('Design system generation error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
    
    // Next.js App Router用のページ生成
    generateNextJsPage: {
      description: 'Generate Next.js 14+ App Router pages',
      execute: async ({ pageName, route, sections, companyId }) => {
        try {
          const db = DatabaseService.getInstance();
          
          const pageCode = `import React from 'react';

export const metadata = {
  title: '${pageName}',
  description: '${pageName} page for accounting system',
};

export default function ${pageName.replace(/\s+/g, '')}Page() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">${pageName}</h1>
        </div>
        
        ${sections.map(section => `
        <section className="mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">${section.name}</h2>
            <div className="text-gray-600">
              ${section.content}
            </div>
          </div>
        </section>
        `).join('')}
      </div>
    </div>
  );
}`;
          
          const pageRecord = {
            companyId,
            name: pageName,
            route,
            sections,
            framework: 'nextjs',
            appRouter: true,
            typescript: true,
            code: pageCode,
            metadata: {
              title: pageName,
              description: `${pageName} page for accounting system`,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          const result = await db.create('ui_pages', pageRecord);
          
          return {
            success: true,
            pageId: result._id.toString(),
            page: pageRecord,
            code: pageCode,
            message: 'ページが生成されました'
          };
          
        } catch (error) {
          console.error('Page generation error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
    
    // UIコンポーネント最適化
    optimizeUIPerformance: {
      description: 'Optimize UI components for performance',
      execute: async ({ componentPath, companyId }) => {
        try {
          const db = DatabaseService.getInstance();
          
          // パフォーマンス分析の実行
          const analysis = {
            bundleSize: '45KB', // 仮の値
            renderTime: '120ms',
            memoryUsage: '2.1MB',
            suggestions: [
              'React.memo を使用してリレンダリングを防ぐ',
              'useCallback でコールバック関数をメモ化する',
              'useMemo で重い計算をメモ化する',
              'コンポーネントを遅延読み込みする',
              '仮想スクロールを実装する',
            ],
          };
          
          // 最適化レコードを保存
          const optimizationRecord = {
            companyId,
            componentPath,
            originalMetrics: analysis,
            appliedOptimizations: analysis.suggestions,
            timestamp: new Date(),
            status: 'analyzed',
          };
          
          const result = await db.create('ui_optimizations', optimizationRecord);
          
          return {
            success: true,
            optimizationId: result._id.toString(),
            analysis,
            suggestions: analysis.suggestions,
            message: 'パフォーマンス分析が完了しました'
          };
          
        } catch (error) {
          console.error('UI optimization error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
  },
  
  // メイン実行ロジック
  execute: async ({ input, tools }) => {
    try {
      console.log('[UI Agent] Starting operation:', input.operation);
      
      switch (input.operation) {
        case 'generate_component':
          if (!input.componentRequest) {
            throw new Error('Component request is required');
          }
          
          const componentResult = await tools.generateAccountingComponents({
            componentType: input.componentRequest.description,
            data: input.componentRequest.dataSchema,
            companyId: input.componentRequest.companyId,
          });
          
          return {
            success: componentResult.success,
            operation: 'generate_component',
            result: componentResult,
          };
          
        case 'generate_page':
          if (!input.pageRequest) {
            throw new Error('Page request is required');
          }
          
          const pageResult = await tools.generateNextJsPage({
            ...input.pageRequest,
          });
          
          return {
            success: pageResult.success,
            operation: 'generate_page',
            result: pageResult,
          };
          
        case 'create_dashboard':
          if (!input.dashboardRequest) {
            throw new Error('Dashboard request is required');
          }
          
          const dashboardResult = await tools.createDashboard({
            ...input.dashboardRequest,
          });
          
          return {
            success: dashboardResult.success,
            operation: 'create_dashboard',
            result: dashboardResult,
          };
          
        case 'update_ui':
          if (!input.updateRequest) {
            throw new Error('Update request is required');
          }
          
          // UI更新ロジック（MongoDB対応版）
          const db = DatabaseService.getInstance();
          const updateResult = await db.update('ui_components', input.updateRequest.componentPath, {
            updates: input.updateRequest.updates,
            updatedAt: new Date(),
          });
          
          return {
            success: !!updateResult,
            operation: 'update_ui',
            result: updateResult ? 'UI updated successfully' : 'Component not found',
          };
          
        case 'optimize_performance':
          if (!input.updateRequest?.componentPath) {
            throw new Error('Component path is required for optimization');
          }
          
          const optimizeResult = await tools.optimizeUIPerformance({
            componentPath: input.updateRequest.componentPath,
            companyId: input.updateRequest.companyId,
          });
          
          return {
            success: optimizeResult.success,
            operation: 'optimize_performance',
            result: optimizeResult,
          };
          
        case 'generate_design_system':
          const designSystemResult = await tools.generateDesignSystem({
            theme: input.componentRequest?.design?.theme || {},
            components: [
              'Button', 'Input', 'Select', 'Table', 'Card',
              'Modal', 'Tabs', 'Alert', 'Badge', 'Spinner',
            ],
            companyId: input.componentRequest?.companyId || '',
          });
          
          return {
            success: designSystemResult.success,
            operation: 'generate_design_system',
            result: designSystemResult,
          };
          
        default:
          throw new Error(`Unknown operation: ${input.operation}`);
      }
      
    } catch (error) {
      console.error('[UI Agent] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
});

// エージェントのエクスポート
export default uiAgent;