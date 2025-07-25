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
exports.UnusedImportRemover = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
const parser = __importStar(require("@typescript-eslint/parser"));
const types_1 = require("@typescript-eslint/types");
class UnusedImportRemover {
    results = [];
    totalUnusedImports = 0;
    async processFile(filePath) {
        const result = {
            file: filePath,
            unusedImports: [],
            totalImports: 0,
            modified: false
        };
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            // TypeScriptパーサーでAST解析
            const ast = parser.parse(content, {
                sourceType: 'module',
                ecmaVersion: 2020,
                ecmaFeatures: {
                    jsx: true
                }
            });
            const imports = new Map();
            const usedIdentifiers = new Set();
            // インポートを収集
            for (const node of ast.body) {
                if (node.type === types_1.AST_NODE_TYPES.ImportDeclaration) {
                    const source = node.source.value;
                    const importedNames = new Set();
                    for (const specifier of node.specifiers) {
                        if (specifier.type === types_1.AST_NODE_TYPES.ImportDefaultSpecifier) {
                            importedNames.add(specifier.local.name);
                        }
                        else if (specifier.type === types_1.AST_NODE_TYPES.ImportSpecifier) {
                            importedNames.add(specifier.local.name);
                        }
                        else if (specifier.type === types_1.AST_NODE_TYPES.ImportNamespaceSpecifier) {
                            importedNames.add(specifier.local.name);
                        }
                    }
                    imports.set(source, importedNames);
                    result.totalImports += importedNames.size;
                }
            }
            // 使用されている識別子を収集（簡易版）
            const identifierPattern = /\b([A-Z][a-zA-Z0-9]*)\b/g;
            const matches = content.matchAll(identifierPattern);
            for (const match of matches) {
                usedIdentifiers.add(match[1]);
            }
            // 未使用のインポートを検出
            for (const [source, names] of imports) {
                for (const name of names) {
                    if (!usedIdentifiers.has(name)) {
                        result.unusedImports.push({
                            name,
                            line: 0, // 簡易版のため行番号は省略
                            source
                        });
                    }
                }
            }
            // 未使用インポートがある場合は、ファイルを修正
            if (result.unusedImports.length > 0) {
                let modifiedContent = content;
                // 各未使用インポートを削除
                for (const unusedImport of result.unusedImports) {
                    // 単純なインポート削除パターン
                    const patterns = [
                        // import { Unused } from 'source'
                        new RegExp(`import\\s*{[^}]*\\b${unusedImport.name}\\b[^}]*}\\s*from\\s*['"]${unusedImport.source}['"];?`, 'g'),
                        // import Unused from 'source'
                        new RegExp(`import\\s+${unusedImport.name}\\s+from\\s*['"]${unusedImport.source}['"];?`, 'g'),
                        // import * as Unused from 'source'
                        new RegExp(`import\\s*\\*\\s*as\\s+${unusedImport.name}\\s+from\\s*['"]${unusedImport.source}['"];?`, 'g')
                    ];
                    for (const pattern of patterns) {
                        modifiedContent = modifiedContent.replace(pattern, '');
                    }
                }
                // 空行を整理
                modifiedContent = modifiedContent.replace(/\n\n\n+/g, '\n\n');
                if (modifiedContent !== content) {
                    // await fs.writeFile(filePath, modifiedContent, 'utf-8');
                    result.modified = true;
                }
            }
        }
        catch (error) {
            result.error = error instanceof Error ? error.message : 'Unknown error';
        }
        return result;
    }
    async processDirectory(directory, pattern = '**/*.{ts,tsx}') {
        console.log(`Processing files in ${directory}...`);
        const files = await (0, glob_1.glob)(pattern, {
            cwd: directory,
            absolute: true,
            ignore: [
                '**/node_modules/**',
                '**/dist/**',
                '**/build/**',
                '**/.next/**',
                '**/coverage/**',
                '**/*.test.*',
                '**/*.spec.*',
            ]
        });
        console.log(`Found ${files.length} files to analyze`);
        for (const file of files) {
            const result = await this.processFile(file);
            this.results.push(result);
            this.totalUnusedImports += result.unusedImports.length;
            if (result.unusedImports.length > 0) {
                console.log(`✓ ${path.relative(directory, file)}: Found ${result.unusedImports.length} unused imports`);
            }
            if (result.error) {
                console.error(`✗ ${path.relative(directory, file)}: ${result.error}`);
            }
        }
    }
    generateReport() {
        const report = [
            '# 未使用インポート分析レポート',
            '',
            `総ファイル数: ${this.results.length}`,
            `未使用インポート総数: ${this.totalUnusedImports}`,
            '',
            '## ファイル別の未使用インポート',
            ''
        ];
        const filesWithUnused = this.results.filter(r => r.unusedImports.length > 0);
        filesWithUnused.sort((a, b) => b.unusedImports.length - a.unusedImports.length);
        for (const result of filesWithUnused) {
            report.push(`### ${result.file}`);
            report.push('');
            for (const imp of result.unusedImports) {
                report.push(`- ${imp.name} from '${imp.source}'`);
            }
            report.push('');
        }
        if (this.results.some(r => r.error)) {
            report.push('## エラー', '');
            for (const result of this.results.filter(r => r.error)) {
                report.push(`- ${result.file}: ${result.error}`);
            }
        }
        return report.join('\n');
    }
}
exports.UnusedImportRemover = UnusedImportRemover;
// メイン実行
async function main() {
    const remover = new UnusedImportRemover();
    const projectRoot = path.resolve(__dirname, '..');
    await remover.processDirectory(projectRoot);
    const report = remover.generateReport();
    const reportPath = path.join(projectRoot, 'unused-imports-report.md');
    await fs.writeFile(reportPath, report, 'utf-8');
    console.log('\n' + report);
    console.log(`\nレポートを保存しました: ${reportPath}`);
}
// スクリプト実行
if (require.main === module) {
    main().catch(console.error);
}
