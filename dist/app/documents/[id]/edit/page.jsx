"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EditDocumentPage;
const EditDocumentMongoDB_1 = __importDefault(require("./EditDocumentMongoDB"));
function EditDocumentPage() {
    // MongoDB版の編集コンポーネントを使用
    return <EditDocumentMongoDB_1.default />;
}
