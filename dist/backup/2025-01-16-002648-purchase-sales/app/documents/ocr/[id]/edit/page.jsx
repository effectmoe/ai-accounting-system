"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EditOCRDocumentPage;
const EditDocumentMongoDB_1 = __importDefault(require("../../../[id]/edit/EditDocumentMongoDB"));
function EditOCRDocumentPage() {
    // MongoDB版の編集コンポーネントを使用（OCRドキュメントも同じ編集画面）
    return <EditDocumentMongoDB_1.default />;
}
