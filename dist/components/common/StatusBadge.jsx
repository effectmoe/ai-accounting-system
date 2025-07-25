"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBadge = void 0;
const react_1 = __importDefault(require("react"));
const constants_1 = require("./constants");
const StatusBadge = ({ status, className = '' }) => {
    const label = (0, constants_1.getStatusLabel)(status);
    const colorClass = (0, constants_1.getStatusColor)(status);
    return (<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}>
      {label}
    </span>);
};
exports.StatusBadge = StatusBadge;
exports.default = exports.StatusBadge;
