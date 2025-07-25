"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uiAgent = void 0;
const zod_1 = require("zod");
const core_1 = require("@mastra/core");
// UIコンポーネントスキーマ
const uiComponentSchema = zod_1.z.object({
    type: zod_1.z.enum(['page', 'component', 'layout', 'widget']),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    framework: zod_1.z.enum(['nextjs', 'react', 'vue', 'svelte']).default('nextjs'),
    styling: zod_1.z.enum(['tailwind', 'css-modules', 'styled-components', 'emotion']).default('tailwind'),
    features: zod_1.z.array(zod_1.z.string()).optional(),
    props: zod_1.z.record(zod_1.z.any()).optional(),
    state: zod_1.z.record(zod_1.z.any()).optional(),
    interactions: zod_1.z.array(zod_1.z.string()).optional(),
});
// UIデザインスキーマ
const uiDesignSchema = zod_1.z.object({
    theme: zod_1.z.object({
        primaryColor: zod_1.z.string().default('#3B82F6'),
        secondaryColor: zod_1.z.string().default('#10B981'),
        backgroundColor: zod_1.z.string().default('#FFFFFF'),
        textColor: zod_1.z.string().default('#1F2937'),
        borderRadius: zod_1.z.enum(['none', 'sm', 'md', 'lg', 'xl']).default('md'),
    }).optional(),
    layout: zod_1.z.enum(['sidebar', 'topbar', 'hybrid', 'minimal']).default('sidebar'),
    responsive: zod_1.z.boolean().default(true),
    darkMode: zod_1.z.boolean().default(true),
    accessibility: zod_1.z.boolean().default(true),
});
// UIエージェントの入力スキーマ
const uiInputSchema = zod_1.z.object({
    operation: zod_1.z.enum([
        'generate_component',
        'generate_page',
        'update_ui',
        'create_dashboard',
        'optimize_performance',
        'generate_design_system'
    ]),
    // コンポーネント生成
    componentRequest: zod_1.z.object({
        description: zod_1.z.string(),
        components: zod_1.z.array(uiComponentSchema).optional(),
        design: uiDesignSchema.optional(),
        examples: zod_1.z.array(zod_1.z.string()).optional(),
        dataSchema: zod_1.z.any().optional(),
    }).optional(),
    // ページ生成
    pageRequest: zod_1.z.object({
        pageName: zod_1.z.string(),
        route: zod_1.z.string(),
        description: zod_1.z.string(),
        sections: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            type: zod_1.z.string(),
            content: zod_1.z.string(),
        })),
        dataRequirements: zod_1.z.array(zod_1.z.string()).optional(),
    }).optional(),
    // ダッシュボード生成
    dashboardRequest: zod_1.z.object({
        title: zod_1.z.string(),
        metrics: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            type: zod_1.z.enum(['number', 'chart', 'table', 'list']),
            dataSource: zod_1.z.string(),
            refreshInterval: zod_1.z.number().optional(),
        })),
        layout: zod_1.z.enum(['grid', 'flex', 'masonry']).default('grid'),
    }).optional(),
    // UI更新
    updateRequest: zod_1.z.object({
        componentPath: zod_1.z.string(),
        updates: zod_1.z.object({
            style: zod_1.z.any().optional(),
            functionality: zod_1.z.any().optional(),
            accessibility: zod_1.z.any().optional(),
        }),
    }).optional(),
});
// UIエージェント定義
exports.uiAgent = (0, core_1.createAgent)({
    id: 'ui-agent',
    name: 'UI Generation and Management Agent',
    description: 'Generate and manage UI components using AI-powered design tools',
    inputSchema: uiInputSchema,
    // エージェントのツール
    tools: {
        // V0/Lovable/v0.dev MCPを使用したコンポーネント生成
        generateWithAITool: {
            description: 'Generate UI components using AI design tools',
            execute: async ({ description, framework, styling, mcpClient }) => {
                // 複数のUI生成サービスを試す
                const services = ['v0', 'lovable', 'cline'];
                let result = null;
                let selectedService = null;
                for (const service of services) {
                    try {
                        console.log(`Trying ${service} for UI generation...`);
                        // プロンプトの構築
                        const prompt = `
              Create a ${framework} component with ${styling} styling:
              ${description}
              
              Requirements:
              - Modern, clean design
              - Fully responsive
              - Accessible (WCAG 2.1 AA compliant)
              - Japanese language support
              - Dark mode support
              ${framework === 'nextjs' ? '- Server component compatible' : ''}
            `;
                        result = await mcpClient.callTool(service, 'generate_component', {
                            prompt,
                            framework,
                            styling,
                            options: {
                                typescript: true,
                                includeTests: true,
                                includeStorybook: true,
                            }
                        });
                        selectedService = service;
                        break;
                    }
                    catch (error) {
                        console.warn(`${service} failed:`, error);
                        continue;
                    }
                }
                if (!result) {
                    throw new Error('All UI generation services failed');
                }
                return {
                    service: selectedService,
                    code: result.code,
                    preview: result.preview,
                    dependencies: result.dependencies,
                    usage: result.usage,
                };
            },
        },
        // 会計ダッシュボード専用コンポーネント生成
        generateAccountingComponents: {
            description: 'Generate accounting-specific UI components',
            execute: async ({ componentType, data, mcpClient }) => {
                const accountingComponents = {
                    'receipt-upload': {
                        description: 'Drag-and-drop receipt upload component with preview',
                        features: ['Multiple file upload', 'Image preview', 'PDF support', 'Progress indicator'],
                    },
                    'journal-entry-form': {
                        description: 'Double-entry bookkeeping form with auto-calculation',
                        features: ['Debit/Credit fields', 'Account selector', 'Tax calculation', 'Balance check'],
                    },
                    'financial-chart': {
                        description: 'Interactive financial charts and graphs',
                        features: ['Line/Bar/Pie charts', 'Real-time updates', 'Export to image', 'Drill-down'],
                    },
                    'tax-calculator': {
                        description: 'Japanese tax calculation widget',
                        features: ['Consumption tax', 'Withholding tax', 'Corporate tax', 'Real-time calculation'],
                    },
                    'customer-list': {
                        description: 'Customer management table with filters',
                        features: ['Search', 'Sort', 'Filter', 'Pagination', 'Bulk actions'],
                    },
                    'invoice-viewer': {
                        description: 'Invoice display and management component',
                        features: ['PDF generation', 'Email sending', 'Status tracking', 'Payment recording'],
                    },
                };
                const component = accountingComponents[componentType];
                if (!component) {
                    throw new Error(`Unknown accounting component type: ${componentType}`);
                }
                const prompt = `
          Create a ${componentType} component for a Japanese accounting system:
          ${component.description}
          
          Features to include:
          ${component.features.map(f => `- ${f}`).join('\n')}
          
          Design requirements:
          - Professional business UI
          - Japanese business conventions
          - Mobile responsive
          - Print-friendly where applicable
          
          ${data ? `Use this data structure: ${JSON.stringify(data)}` : ''}
        `;
                return await tools.generateWithAITool({
                    description: prompt,
                    framework: 'nextjs',
                    styling: 'tailwind',
                    mcpClient,
                });
            },
        },
        // ダッシュボード生成
        createDashboard: {
            description: 'Create a complete dashboard layout',
            execute: async ({ title, metrics, layout, mcpClient }) => {
                // ダッシュボードのレイアウト定義
                const dashboardPrompt = `
          Create a comprehensive accounting dashboard with the following specifications:
          
          Title: ${title}
          Layout: ${layout}
          
          Metrics to display:
          ${metrics.map(m => `
            - ${m.name} (${m.type})
              Data source: ${m.dataSource}
              ${m.refreshInterval ? `Refresh every ${m.refreshInterval}ms` : 'Static'}
          `).join('\n')}
          
          Requirements:
          - Responsive grid/flex layout
          - Real-time data updates where specified
          - Loading states for async data
          - Error handling
          - Export functionality
          - Mobile-optimized view
          
          Japanese UI elements:
          - 円 (¥) currency formatting
          - Japanese date format (YYYY年MM月DD日)
          - Kanji number formatting for large numbers
        `;
                const result = await mcpClient.callTool('v0', 'generate_page', {
                    prompt: dashboardPrompt,
                    pageType: 'dashboard',
                    framework: 'nextjs',
                    features: ['real-time', 'responsive', 'dark-mode'],
                });
                // メトリクスごとのコンポーネント生成
                const metricComponents = await Promise.all(metrics.map(metric => tools.generateMetricComponent({
                    metric,
                    theme: 'professional',
                    mcpClient,
                })));
                return {
                    layout: result.code,
                    components: metricComponents,
                    routing: result.routing,
                    stateManagement: result.stateManagement,
                    apiEndpoints: metrics.map(m => ({
                        endpoint: `/api/metrics/${m.name.toLowerCase().replace(/\s+/g, '-')}`,
                        method: 'GET',
                        dataSource: m.dataSource,
                    })),
                };
            },
        },
        // メトリクスコンポーネント生成
        generateMetricComponent: {
            description: 'Generate individual metric display component',
            execute: async ({ metric, theme, mcpClient }) => {
                const metricPrompts = {
                    number: `
            Create a metric card component showing:
            - Large number display with animation
            - Trend indicator (up/down arrow)
            - Sparkline chart
            - Period comparison
          `,
                    chart: `
            Create an interactive chart component:
            - Recharts or Chart.js integration
            - Multiple data series support
            - Zoom and pan functionality
            - Export to PNG/SVG
          `,
                    table: `
            Create a data table component:
            - Sortable columns
            - Search functionality
            - Row selection
            - CSV export
            - Pagination
          `,
                    list: `
            Create a list component:
            - Virtualized scrolling for performance
            - Item actions
            - Filtering
            - Bulk operations
          `,
                };
                const prompt = `
          ${metricPrompts[metric.type]}
          
          For metric: ${metric.name}
          Theme: ${theme}
          
          Include:
          - Loading skeleton
          - Error state
          - Empty state
          - Refresh button
        `;
                return await tools.generateWithAITool({
                    description: prompt,
                    framework: 'nextjs',
                    styling: 'tailwind',
                    mcpClient,
                });
            },
        },
        // デザインシステム生成
        generateDesignSystem: {
            description: 'Generate a complete design system',
            execute: async ({ theme, components, mcpClient }) => {
                const designSystemPrompt = `
          Create a comprehensive design system for a Japanese accounting application:
          
          Theme:
          ${JSON.stringify(theme, null, 2)}
          
          Components needed:
          ${components.map(c => `- ${c}`).join('\n')}
          
          Include:
          1. Color palette with semantic colors
          2. Typography scale (with Japanese font support)
          3. Spacing system
          4. Component library
          5. Icon set
          6. Animation/transition standards
          
          Accessibility:
          - WCAG 2.1 AA compliant
          - Keyboard navigation
          - Screen reader support
          - High contrast mode
          
          Export as:
          - CSS variables
          - Tailwind config
          - Figma/Sketch files
          - Storybook documentation
        `;
                const result = await mcpClient.callTool('lovable', 'generate_design_system', {
                    prompt: designSystemPrompt,
                    format: 'comprehensive',
                    includeDocumentation: true,
                });
                return {
                    tokens: result.tokens,
                    components: result.components,
                    documentation: result.documentation,
                    tailwindConfig: result.tailwindConfig,
                    storybookStories: result.stories,
                };
            },
        },
        // パフォーマンス最適化
        optimizeUIPerformance: {
            description: 'Optimize UI components for performance',
            execute: async ({ componentPath, mcpClient }) => {
                // コンポーネントの分析
                const analysis = await mcpClient.callTool('cline', 'analyze_component', {
                    path: componentPath,
                    metrics: ['bundle-size', 'render-time', 'memory-usage'],
                });
                // 最適化の提案
                const optimizations = await mcpClient.callTool('cline', 'suggest_optimizations', {
                    analysis: analysis,
                    targets: {
                        bundleSize: '< 50KB',
                        firstContentfulPaint: '< 1.5s',
                        timeToInteractive: '< 3s',
                    },
                });
                // 最適化の適用
                const optimizedCode = await mcpClient.callTool('cline', 'apply_optimizations', {
                    path: componentPath,
                    optimizations: optimizations.suggestions,
                    techniques: [
                        'code-splitting',
                        'lazy-loading',
                        'memoization',
                        'virtual-scrolling',
                        'image-optimization',
                    ],
                });
                return {
                    originalMetrics: analysis.metrics,
                    optimizedMetrics: optimizedCode.metrics,
                    improvements: {
                        bundleSize: `${analysis.metrics.bundleSize - optimizedCode.metrics.bundleSize}KB reduced`,
                        renderTime: `${analysis.metrics.renderTime - optimizedCode.metrics.renderTime}ms faster`,
                    },
                    appliedOptimizations: optimizations.applied,
                    code: optimizedCode.code,
                };
            },
        },
        // Next.js App Router用のページ生成
        generateNextJsPage: {
            description: 'Generate Next.js 14+ App Router pages',
            execute: async ({ pageName, route, sections, mcpClient }) => {
                const pagePrompt = `
          Create a Next.js App Router page:
          
          Route: app${route}/page.tsx
          Page Name: ${pageName}
          
          Sections:
          ${sections.map(s => `
            - ${s.name} (${s.type})
              ${s.content}
          `).join('\n')}
          
          Requirements:
          - Server Components by default
          - Client Components only where needed
          - Metadata API for SEO
          - Loading and error boundaries
          - Parallel routes where applicable
          
          Include:
          - TypeScript
          - Data fetching with cache
          - Suspense boundaries
          - Error handling
        `;
                const result = await mcpClient.callTool('v0', 'generate_nextjs_page', {
                    prompt: pagePrompt,
                    appRouter: true,
                    typescript: true,
                });
                return {
                    page: result.page,
                    layout: result.layout,
                    loading: result.loading,
                    error: result.error,
                    metadata: result.metadata,
                    clientComponents: result.clientComponents,
                    serverActions: result.serverActions,
                };
            },
        },
    },
    // メイン実行ロジック
    execute: async ({ input, tools, mcpClient }) => {
        try {
            console.log('[UI Agent] Starting operation:', input.operation);
            switch (input.operation) {
                case 'generate_component':
                    if (!input.componentRequest) {
                        throw new Error('Component request is required');
                    }
                    const componentResult = await tools.generateWithAITool({
                        description: input.componentRequest.description,
                        framework: input.componentRequest.components?.[0]?.framework || 'nextjs',
                        styling: input.componentRequest.components?.[0]?.styling || 'tailwind',
                        mcpClient,
                    });
                    return {
                        success: true,
                        operation: 'generate_component',
                        result: componentResult,
                    };
                case 'generate_page':
                    if (!input.pageRequest) {
                        throw new Error('Page request is required');
                    }
                    const pageResult = await tools.generateNextJsPage({
                        ...input.pageRequest,
                        mcpClient,
                    });
                    return {
                        success: true,
                        operation: 'generate_page',
                        result: pageResult,
                    };
                case 'create_dashboard':
                    if (!input.dashboardRequest) {
                        throw new Error('Dashboard request is required');
                    }
                    const dashboardResult = await tools.createDashboard({
                        ...input.dashboardRequest,
                        mcpClient,
                    });
                    return {
                        success: true,
                        operation: 'create_dashboard',
                        result: dashboardResult,
                    };
                case 'update_ui':
                    if (!input.updateRequest) {
                        throw new Error('Update request is required');
                    }
                    // UI更新ロジック（簡略版）
                    const updateResult = await mcpClient.callTool('cline', 'update_component', {
                        path: input.updateRequest.componentPath,
                        updates: input.updateRequest.updates,
                    });
                    return {
                        success: true,
                        operation: 'update_ui',
                        result: updateResult,
                    };
                case 'optimize_performance':
                    if (!input.updateRequest?.componentPath) {
                        throw new Error('Component path is required for optimization');
                    }
                    const optimizeResult = await tools.optimizeUIPerformance({
                        componentPath: input.updateRequest.componentPath,
                        mcpClient,
                    });
                    return {
                        success: true,
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
                        mcpClient,
                    });
                    return {
                        success: true,
                        operation: 'generate_design_system',
                        result: designSystemResult,
                    };
                default:
                    throw new Error(`Unknown operation: ${input.operation}`);
            }
        }
        catch (error) {
            console.error('[UI Agent] Error:', error);
            throw error;
        }
    },
});
// エージェントのエクスポート
exports.default = exports.uiAgent;
