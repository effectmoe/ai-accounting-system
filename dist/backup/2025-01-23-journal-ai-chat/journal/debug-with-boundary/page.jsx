"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DebugWithBoundaryPage;
const error_boundary_1 = require("@/components/error-boundary");
const page_1 = __importDefault(require("../debug/page"));
function DebugWithBoundaryPage() {
    return (<error_boundary_1.ErrorBoundary>
      <page_1.default />
    </error_boundary_1.ErrorBoundary>);
}
