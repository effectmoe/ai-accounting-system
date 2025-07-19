import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

interface MigrationResult {
  file: string;
  migrated: boolean;
  errors: string[];
}

class ApiErrorHandlingMigrator {
  private results: MigrationResult[] = [];
  private totalMigrated = 0;

  async migrateFile(filePath: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      file: filePath,
      migrated: false,
      errors: []
    };

    try {
      let content = await fs.readFile(filePath, 'utf-8');
      const originalContent = content;

      // Skip if already using unified error handler
      if (content.includes('withErrorHandler') || content.includes('unified-error-handler')) {
        console.log(`Skipping ${filePath} - already uses unified error handler`);
        return result;
      }

      // Check if this is an API route
      if (!content.includes('export async function GET') && 
          !content.includes('export async function POST') &&
          !content.includes('export async function PUT') &&
          !content.includes('export async function DELETE') &&
          !content.includes('export async function PATCH')) {
        return result;
      }

      // Add import for unified error handler
      const importStatement = `import { 
  withErrorHandler, 
  validateRequired, 
  validatePagination, 
  validateEmail,
  validateDate,
  validateAmount,
  ApiErrorResponse,
  createErrorResponse
} from '@/lib/unified-error-handler';
`;

      // Add import after other imports
      const lastImportMatch = content.match(/((?:^import\s+.*?from\s+['"].*?['"];?\s*$\n?)+)/m);
      if (lastImportMatch) {
        const lastImportEnd = lastImportMatch.index! + lastImportMatch[0].length;
        content = 
          content.slice(0, lastImportEnd) + 
          importStatement + 
          content.slice(lastImportEnd);
      }

      // Convert GET handlers
      content = content.replace(
        /export\s+async\s+function\s+GET\s*\((.*?)\)\s*{/g,
        'export const GET = withErrorHandler(async ($1) => {'
      );

      // Convert POST handlers
      content = content.replace(
        /export\s+async\s+function\s+POST\s*\((.*?)\)\s*{/g,
        'export const POST = withErrorHandler(async ($1) => {'
      );

      // Convert PUT handlers
      content = content.replace(
        /export\s+async\s+function\s+PUT\s*\((.*?)\)\s*{/g,
        'export const PUT = withErrorHandler(async ($1) => {'
      );

      // Convert DELETE handlers
      content = content.replace(
        /export\s+async\s+function\s+DELETE\s*\((.*?)\)\s*{/g,
        'export const DELETE = withErrorHandler(async ($1) => {'
      );

      // Convert PATCH handlers
      content = content.replace(
        /export\s+async\s+function\s+PATCH\s*\((.*?)\)\s*{/g,
        'export const PATCH = withErrorHandler(async ($1) => {'
      );

      // Remove try-catch blocks at the handler level
      // This is a simplified version - real implementation would need more sophisticated parsing
      content = content.replace(
        /export\s+const\s+\w+\s*=\s*withErrorHandler\(async\s*\([^)]*\)\s*=>\s*{\s*try\s*{/g,
        (match) => match.replace('try {', '')
      );

      // Replace common error responses
      content = content.replace(
        /return\s+NextResponse\.json\s*\(\s*{\s*success:\s*false,\s*error:\s*['"`]([^'"`]+)['"`]\s*},\s*{\s*status:\s*(\d+)\s*}\s*\)/g,
        (match, message, status) => {
          const statusCode = parseInt(status);
          if (statusCode === 400) {
            return `throw new ApiErrorResponse('${message}', 400, 'VALIDATION_ERROR')`;
          } else if (statusCode === 401) {
            return `throw new ApiErrorResponse('${message}', 401, 'UNAUTHORIZED')`;
          } else if (statusCode === 403) {
            return `throw new ApiErrorResponse('${message}', 403, 'FORBIDDEN')`;
          } else if (statusCode === 404) {
            return `throw new ApiErrorResponse('${message}', 404, 'NOT_FOUND')`;
          } else if (statusCode === 409) {
            return `throw new ApiErrorResponse('${message}', 409, 'DUPLICATE_ERROR')`;
          } else {
            return `throw new ApiErrorResponse('${message}', ${status})`;
          }
        }
      );

      // Replace pagination parsing
      content = content.replace(
        /const\s+page\s*=\s*parseInt\(searchParams\.get\(['"]page['"]\)\s*\|\|\s*['"]1['"]\);\s*const\s+limit\s*=\s*parseInt\(searchParams\.get\(['"]limit['"]\)\s*\|\|\s*['"]10['"]\);\s*const\s+skip\s*=\s*\(page\s*-\s*1\)\s*\*\s*limit;/g,
        'const { page, limit, skip } = validatePagination(searchParams);'
      );

      // Close withErrorHandler properly
      content = content.replace(/}\s*catch\s*\(error\)\s*{[\s\S]*?}\s*}\s*$/gm, '});');

      if (content !== originalContent) {
        result.migrated = true;
        await fs.writeFile(filePath, content, 'utf-8');
      }

    } catch (error) {
      result.errors.push(`Error processing file: ${error.message}`);
    }

    return result;
  }

  async processDirectory(directory: string): Promise<void> {
    console.log(`Processing API routes in ${directory}...`);
    
    const files = await glob('app/api/**/*.{ts,tsx}', {
      cwd: directory,
      absolute: true,
      ignore: [
        '**/node_modules/**',
        '**/*.test.*',
        '**/*.spec.*',
      ]
    });

    console.log(`Found ${files.length} API route files to process`);

    for (const file of files) {
      const result = await this.migrateFile(file);
      this.results.push(result);

      if (result.migrated) {
        this.totalMigrated++;
        console.log(`✓ ${path.relative(directory, file)}: Migrated to unified error handling`);
      }
      
      if (result.errors.length > 0) {
        console.error(`✗ ${path.relative(directory, file)}: ${result.errors.join(', ')}`);
      }
    }
  }

  generateReport(): string {
    const report = [
      '# API Error Handling Migration Report',
      '',
      `Total files processed: ${this.results.length}`,
      `Total files migrated: ${this.totalMigrated}`,
      '',
      '## Migrated files:',
      ''
    ];

    const migratedFiles = this.results.filter(r => r.migrated);
    for (const result of migratedFiles) {
      report.push(`- ${result.file}`);
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
  const migrator = new ApiErrorHandlingMigrator();
  const projectRoot = path.resolve(__dirname, '..');
  
  await migrator.processDirectory(projectRoot);

  // Generate and save report
  const report = migrator.generateReport();
  const reportPath = path.join(projectRoot, 'api-error-handling-migration-report.md');
  await fs.writeFile(reportPath, report, 'utf-8');
  
  console.log('\n' + report);
  console.log(`\nReport saved to: ${reportPath}`);
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

export { ApiErrorHandlingMigrator };