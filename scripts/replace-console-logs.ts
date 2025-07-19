import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

interface ReplacementResult {
  file: string;
  originalCount: number;
  replacedCount: number;
  errors: string[];
}

class ConsoleLogReplacer {
  private results: ReplacementResult[] = [];
  private totalOriginalCount = 0;
  private totalReplacedCount = 0;

  async replaceInFile(filePath: string): Promise<ReplacementResult> {
    const result: ReplacementResult = {
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
      modifiedContent = modifiedContent.replace(
        /console\.log\s*\(/g,
        'logger.debug('
      );

      // Replace console.error with logger.error
      modifiedContent = modifiedContent.replace(
        /console\.error\s*\(/g,
        'logger.error('
      );

      // Replace console.warn with logger.warn
      modifiedContent = modifiedContent.replace(
        /console\.warn\s*\(/g,
        'logger.warn('
      );

      // Replace console.info with logger.info
      modifiedContent = modifiedContent.replace(
        /console\.info\s*\(/g,
        'logger.info('
      );

      // Replace console.debug with logger.debug
      modifiedContent = modifiedContent.replace(
        /console\.debug\s*\(/g,
        'logger.debug('
      );

      // Add logger import at the top of the file
      if (modifiedContent !== content) {
        const importStatement = "import { logger } from '@/lib/logger';\n";
        
        // Find the right place to insert the import
        const firstImportMatch = modifiedContent.match(/^import\s+.*?from\s+['"].*?['"];?\s*$/m);
        if (firstImportMatch) {
          // Insert after the last import
          const lastImportMatch = modifiedContent.match(/((?:^import\s+.*?from\s+['"].*?['"];?\s*$\n?)+)/m);
          if (lastImportMatch) {
            const lastImportEnd = lastImportMatch.index! + lastImportMatch[0].length;
            modifiedContent = 
              modifiedContent.slice(0, lastImportEnd) + 
              importStatement + 
              modifiedContent.slice(lastImportEnd);
          }
        } else {
          // No imports found, add at the beginning
          modifiedContent = importStatement + '\n' + modifiedContent;
        }

        // Count replacements
        const newConsoleMatches = modifiedContent.match(/console\.(log|error|warn|info|debug)/g);
        result.replacedCount = result.originalCount - (newConsoleMatches ? newConsoleMatches.length : 0);

        // Write the modified content back
        await fs.writeFile(filePath, modifiedContent, 'utf-8');
      }

    } catch (error) {
      result.errors.push(`Error processing file: ${error.message}`);
    }

    return result;
  }

  async processDirectory(directory: string, pattern: string = '**/*.{ts,tsx,js,jsx}'): Promise<void> {
    console.log(`Processing files in ${directory} with pattern ${pattern}...`);
    
    const files = await glob(pattern, {
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

  generateReport(): string {
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

export { ConsoleLogReplacer };