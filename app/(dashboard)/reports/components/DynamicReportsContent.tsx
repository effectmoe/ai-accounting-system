'use client';

import dynamic from 'next/dynamic';
import { DynamicLoader } from '@/components/common/DynamicLoader';

// Rechartsコンポーネントを動的にインポート
const DynamicLineChart = dynamic(
  () => import('recharts').then(mod => mod.LineChart),
  { loading: () => <DynamicLoader message="グラフを読み込んでいます..." /> }
);

const DynamicBarChart = dynamic(
  () => import('recharts').then(mod => mod.BarChart),
  { loading: () => <DynamicLoader message="グラフを読み込んでいます..." /> }
);

const DynamicPieChart = dynamic(
  () => import('recharts').then(mod => mod.PieChart),
  { loading: () => <DynamicLoader message="グラフを読み込んでいます..." /> }
);

const DynamicAreaChart = dynamic(
  () => import('recharts').then(mod => mod.AreaChart),
  { loading: () => <DynamicLoader message="グラフを読み込んでいます..." /> }
);

// その他のRechartsコンポーネント
const DynamicCartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid));
const DynamicXAxis = dynamic(() => import('recharts').then(mod => mod.XAxis));
const DynamicYAxis = dynamic(() => import('recharts').then(mod => mod.YAxis));
const DynamicTooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip));
const DynamicLegend = dynamic(() => import('recharts').then(mod => mod.Legend));
const DynamicLine = dynamic(() => import('recharts').then(mod => mod.Line));
const DynamicBar = dynamic(() => import('recharts').then(mod => mod.Bar));
const DynamicArea = dynamic(() => import('recharts').then(mod => mod.Area));
const DynamicPie = dynamic(() => import('recharts').then(mod => mod.Pie));
const DynamicCell = dynamic(() => import('recharts').then(mod => mod.Cell));
const DynamicResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer));

// Rechartsコンポーネントをエクスポート
export {
  DynamicLineChart as LineChart,
  DynamicBarChart as BarChart,
  DynamicPieChart as PieChart,
  DynamicAreaChart as AreaChart,
  DynamicCartesianGrid as CartesianGrid,
  DynamicXAxis as XAxis,
  DynamicYAxis as YAxis,
  DynamicTooltip as Tooltip,
  DynamicLegend as Legend,
  DynamicLine as Line,
  DynamicBar as Bar,
  DynamicArea as Area,
  DynamicPie as Pie,
  DynamicCell as Cell,
  DynamicResponsiveContainer as ResponsiveContainer,
};