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
exports.ConsoleLogReplacer = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
class ConsoleLogReplacer {
    results = [];
    totalOriginalCount = 0;
    totalReplacedCount = 0;
    async replaceInFile(filePath) {
        const result = {
            file: filePath,
            originalCount: 0,
            replacedCount: 0,
            errors: []
        };
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            // Skip files that already import logger
            if (content.includes('import { logger }') || content.includes('import logger')) {
                console.log(`Skipping ${filePath} - already uses logger`);
                return result;
            }
            // Count console.log occurrences
            const consoleLogMatches = content.match(/console\.(log|error|warn|info|debug)/g);
            if (!consoleLogMatches) {
                return result;
            }
            result.originalCount = consoleLogMatches.length;
            let modifiedContent = content;
            // Replace console.log with logger.debug
            modifiedContent = modifiedContent.replace(/console\.log\s*\(/g, 'logger.debug(');
            // Replace console.error with logger.error
            modifiedContent = modifiedContent.replace(/console\.error\s*\(/g, 'logger.error(');
            // Replace console.warn with logger.warn
            modifiedContent = modifiedContent.replace(/console\.warn\s*\(/g, 'logger.warn(');
            // Replace console.info with logger.info
            modifiedContent = modifiedContent.replace(/console\.info\s*\(/g, 'logger.info(');
            // Replace console.debug with logger.debug
            modifiedContent = modifiedContent.replace(/console\.debug\s*\(/g, 'logger.debug(');
            // Add logger import at the top of the file
            if (modifiedContent !== content) {
                const importStatement = "import { logger } from '@/lib/logger';\n";
                // Find the right place to insert the import
                const firstImportMatch = modifiedContent.match(/^import\s+.*?from\s+['"].*?['"];?\s*$/m);
                if (firstImportMatch) {
                    // Insert after the last import
                    const lastImportMatch = modifiedContent.match(/((?:^import\s+.*?from\s+['"].*?['"];?\s*$\n?)+)/m);
                    if (lastImportMatch) {
                        const lastImportEnd = lastImportMatch.index + lastImportMatch[0].length;
                        modifiedContent =
                            modifiedContent.slice(0, lastImportEnd) +
                                importStatement +
                                modifiedContent.slice(lastImportEnd);
                    }
                }
                else {
                    // No imports found, add at the beginning
                    modifiedContent = importStatement + '\n' + modifiedContent;
                }
                // Count replacements
                const newConsoleMatches = modifiedContent.match(/console\.(log|error|warn|info|debug)/g);
                result.replacedCount = result.originalCount - (newConsoleMatches ? newConsoleMatches.length : 0);
                // Write the modified content back
                await fs.writeFile(filePath, modifiedContent, 'utf-8');
            }
        }
        catch (error) {
            result.errors.push(`Error processing file: ${error.message}`);
        }
        return result;
    }
    async processDirectory(directory, pattern = '**/*.{ts,tsx,js,jsx}') {
        console.log(`Processing files in ${directory} with pattern ${pattern}...`);
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
                '**/logger.ts', // Don't modify the logger itself
                '**/scripts/**', // Don't modify scripts
            ]
        });
        console.log(`Found ${files.length} files to process`);
        for (const file of files) {
            const result = await this.replaceInFile(file);
            this.results.push(result);
            this.totalOriginalCount += result.originalCount;
            this.totalReplacedCount += result.replacedCount;
            if (result.replacedCount > 0) {
                console.log(`✓ ${path.relative(directory, file)}: Replaced ${result.replacedCount} console statements`);
            }
            if (result.errors.length > 0) {
                console.error(`✗ ${path.relative(directory, file)}: ${result.errors.join(', ')}`);
            }
        }
    }
    generateReport() {
        const report = [
            '# Console.log Replacement Report',
            '',
            `Total files processed: ${this.results.length}`,
            `Total console statements found: ${this.totalOriginalCount}`,
            `Total statements replaced: ${this.totalReplacedCount}`,
            `Remaining console statements: ${this.totalOriginalCount - this.totalReplacedCount}`,
            '',
            '## Files with replacements:',
            ''
        ];
        const filesWithReplacements = this.results.filter(r => r.replacedCount > 0);
        filesWithReplacements.sort((a, b) => b.replacedCount - a.replacedCount);
        for (const result of filesWithReplacements) {
            report.push(`- ${result.file}: ${result.replacedCount} replacements`);
        }
        if (this.results.some(r => r.errors.length > 0)) {
            report.push('', '## Errors:', '');
            for (const result of this.results.filter(r => r.errors.length > 0)) {
                report.push(`- ${result.file}: ${result.errors.join(', ')}`);
            }
        }
        return report.join('\n');
    }
}
exports.ConsoleLogReplacer = ConsoleLogReplacer;
// Main execution
async function main() {
    const replacer = new ConsoleLogReplacer();
    const projectRoot = path.resolve(__dirname, '..');
    // Process the main source directories
    await replacer.processDirectory(projectRoot, 'app/**/*.{ts,tsx}');
    await replacer.processDirectory(projectRoot, 'components/**/*.{ts,tsx}');
    await replacer.processDirectory(projectRoot, 'lib/**/*.ts');
    await replacer.processDirectory(projectRoot, 'services/**/*.ts');
    await replacer.processDirectory(projectRoot, 'src/**/*.{ts,tsx}');
    await replacer.processDirectory(projectRoot, 'hooks/**/*.ts');
    await replacer.processDirectory(projectRoot, 'utils/**/*.ts');
    // Generate and save report
    const report = replacer.generateReport();
    const reportPath = path.join(projectRoot, 'console-replacement-report.md');
    await fs.writeFile(reportPath, report, 'utf-8');
    console.log('\n' + report);
    console.log(`\nReport saved to: ${reportPath}`);
}
// Run the script
if (require.main === module) {
    main().catch(console.error);
}
