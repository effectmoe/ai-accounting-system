"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.refactoringUtils = void 0;
const recast = __importStar(require("recast"));
const prettier = __importStar(require("prettier"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const logger_1 = require("@/lib/logger");
exports.refactoringUtils = {
    calculateComplexity(code) {
        try {
            let complexity = 1;
            const ifMatches = code.match(/\bif\s*\(/g);
            if (ifMatches)
                complexity += ifMatches.length;
            const forMatches = code.match(/\bfor\s*\(/g);
            if (forMatches)
                complexity += forMatches.length;
            const whileMatches = code.match(/\bwhile\s*\(/g);
            if (whileMatches)
                complexity += whileMatches.length;
            const switchMatches = code.match(/\bswitch\s*\(/g);
            if (switchMatches)
                complexity += switchMatches.length;
            const ternaryMatches = code.match(/\?.*:/g);
            if (ternaryMatches)
                complexity += ternaryMatches.length;
            const logicalMatches = code.match(/(\|\||&&)/g);
            if (logicalMatches)
                complexity += logicalMatches.length;
            const catchMatches = code.match(/\bcatch\s*\(/g);
            if (catchMatches)
                complexity += catchMatches.length;
            return complexity;
        }
        catch (error) {
            logger_1.logger.error('Error calculating complexity:', error);
            return 1;
        }
    },
    extractFunctions(ast) {
        return [];
    },
    findDuplicateCode(ast) {
        return [];
    },
    suggestVariableNames(ast) {
        return [];
    },
    async formatCode(code) {
        try {
            const formatted = await prettier.format(code, {
                parser: 'typescript',
                semi: true,
                singleQuote: true,
                tabWidth: 2,
                trailingComma: 'es5',
            });
            return formatted;
        }
        catch (error) {
            logger_1.logger.error('Error formatting code:', error);
            return code;
        }
    },
    countLinesOfCode(code) {
        const lines = code.split('\n');
        let count = 0;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
                count++;
            }
        }
        return count;
    },
    parseCode(code) {
        return {};
    },
    generateCode(ast) {
        return recast.print(ast).code;
    },
    async formatCode(code) {
        try {
            return await prettier.format(code, {
                parser: 'typescript',
                semi: true,
                singleQuote: true,
                tabWidth: 2,
            });
        }
        catch (error) {
            return code;
        }
    },
    async createBackup(filePath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const ext = path.extname(filePath);
        const base = path.basename(filePath, ext);
        const dir = path.dirname(filePath);
        const backupPath = path.join(dir, `${base}.backup-${timestamp}${ext}`);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            await fs.writeFile(backupPath, content, 'utf-8');
            return backupPath;
        }
        catch (error) {
            throw new Error(`Failed to create backup: ${error.message}`);
        }
    },
};
function suggestBetterName(node, type) {
    if (node.init) {
        if (node.init.type === 'ArrayExpression') {
            return 'items';
        }
        if (node.init.type === 'ObjectExpression') {
            return 'config';
        }
        if (node.init.type === 'CallExpression') {
            const callee = node.init.callee;
            if (callee.type === 'Identifier') {
                return callee.name.toLowerCase() + 'Result';
            }
        }
    }
    return type + 'Value';
}
function suggestNameFromInit(currentName, init) {
    if (init.type === 'NewExpression' && init.callee.type === 'Identifier') {
        const className = init.callee.name;
        const suggested = className.charAt(0).toLowerCase() + className.slice(1);
        if (currentName !== suggested && currentName.length <= 3) {
            return {
                original: currentName,
                suggested,
                reason: `変数名は型やクラス名を反映すべきです`,
            };
        }
    }
    if (init.type === 'Literal' && typeof init.value === 'string') {
        if (currentName === 'str' || currentName === 's') {
            return {
                original: currentName,
                suggested: 'message',
                reason: '文字列の用途を明確にする名前を使用してください',
            };
        }
    }
    return null;
}
//# sourceMappingURL=refactoring-utils.js.map