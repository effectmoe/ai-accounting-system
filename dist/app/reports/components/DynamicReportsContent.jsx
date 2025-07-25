"use strict";
'use client';
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponsiveContainer = exports.Cell = exports.Pie = exports.Area = exports.Bar = exports.Line = exports.Legend = exports.Tooltip = exports.YAxis = exports.XAxis = exports.CartesianGrid = exports.AreaChart = exports.PieChart = exports.BarChart = exports.LineChart = void 0;
const dynamic_1 = __importDefault(require("next/dynamic"));
const DynamicLoader_1 = require("@/components/common/DynamicLoader");
// Rechartsコンポーネントを動的にインポート
const DynamicLineChart = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('recharts'))).then(mod => mod.LineChart), { loading: () => <DynamicLoader_1.DynamicLoader message="グラフを読み込んでいます..."/> });
exports.LineChart = DynamicLineChart;
const DynamicBarChart = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('recharts'))).then(mod => mod.BarChart), { loading: () => <DynamicLoader_1.DynamicLoader message="グラフを読み込んでいます..."/> });
exports.BarChart = DynamicBarChart;
const DynamicPieChart = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('recharts'))).then(mod => mod.PieChart), { loading: () => <DynamicLoader_1.DynamicLoader message="グラフを読み込んでいます..."/> });
exports.PieChart = DynamicPieChart;
const DynamicAreaChart = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('recharts'))).then(mod => mod.AreaChart), { loading: () => <DynamicLoader_1.DynamicLoader message="グラフを読み込んでいます..."/> });
exports.AreaChart = DynamicAreaChart;
// その他のRechartsコンポーネント
const DynamicCartesianGrid = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('recharts'))).then(mod => mod.CartesianGrid));
exports.CartesianGrid = DynamicCartesianGrid;
const DynamicXAxis = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('recharts'))).then(mod => mod.XAxis));
exports.XAxis = DynamicXAxis;
const DynamicYAxis = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('recharts'))).then(mod => mod.YAxis));
exports.YAxis = DynamicYAxis;
const DynamicTooltip = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('recharts'))).then(mod => mod.Tooltip));
exports.Tooltip = DynamicTooltip;
const DynamicLegend = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('recharts'))).then(mod => mod.Legend));
exports.Legend = DynamicLegend;
const DynamicLine = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('recharts'))).then(mod => mod.Line));
exports.Line = DynamicLine;
const DynamicBar = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('recharts'))).then(mod => mod.Bar));
exports.Bar = DynamicBar;
const DynamicArea = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('recharts'))).then(mod => mod.Area));
exports.Area = DynamicArea;
const DynamicPie = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('recharts'))).then(mod => mod.Pie));
exports.Pie = DynamicPie;
const DynamicCell = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('recharts'))).then(mod => mod.Cell));
exports.Cell = DynamicCell;
const DynamicResponsiveContainer = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('recharts'))).then(mod => mod.ResponsiveContainer));
exports.ResponsiveContainer = DynamicResponsiveContainer;
