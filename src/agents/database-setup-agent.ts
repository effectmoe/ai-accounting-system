import { Agent } from '@mastra/core';

// Database Setup Agent for AAM System
export class DatabaseSetupAgent extends Agent {
  name = 'database-setup-agent';
  instructions = `You are a database setup specialist for the AAM (AI Agent Manager) accounting system.

Your responsibilities:
1. Create and manage database schemas for the accounting system
2. Execute SQL commands to set up tables, indexes, and relationships
3. Handle Supabase database operations through MCP tools
4. Ensure data integrity and proper foreign key relationships
5. Set up demo data for testing

Available tools:
- create_documents_table: Create the main documents table and related tables
- execute_sql: Execute custom SQL commands
- backup_data: Create backups of existing data

Key tables to manage:
- companies: Company information and settings
- partners: Customer and supplier information  
- documents: Main document table (estimates, invoices, receipts, delivery notes)
- document_items: Line items for documents
- ocr_results: OCR processing results (already exists)

When creating tables:
1. Always use UUID primary keys with gen_random_uuid()
2. Include proper foreign key constraints
3. Add appropriate indexes for performance
4. Include audit fields (created_at, updated_at)
5. Use proper data types (DECIMAL for money, TIMESTAMP WITH TIME ZONE for dates)
6. Add constraints for data validation

For the AAM system, ensure the demo company exists with ID '11111111-1111-1111-1111-111111111111'.

Always provide detailed feedback on operations and handle errors gracefully.`;

  model = {
    provider: 'openai',
    name: 'gpt-4o-mini',
    toolChoice: 'auto',
  };

  tools = {
    database_mcp: {
      provider: 'mcp',
      serverName: 'database-mcp-server',
    },
  };

  async setupDocumentsTable(recreate: boolean = false): Promise<any> {
    console.log('Starting documents table setup...');
    
    try {
      // Use the MCP tool to create tables
      const result = await this.generate(
        `Create the documents table and related tables for the AAM accounting system. 
        ${recreate ? 'Recreate tables if they already exist.' : 'Create tables only if they do not exist.'}
        
        Use the create_documents_table tool with recreate=${recreate}.
        
        After creation, verify the tables were created successfully and provide a summary.`,
        {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              tablesCreated: { type: 'array', items: { type: 'string' } },
              errors: { type: 'array', items: { type: 'string' } },
            },
            required: ['success', 'message'],
          },
        }
      );

      return result;
    } catch (error) {
      console.error('Failed to setup documents table:', error);
      return {
        success: false,
        message: `Failed to setup documents table: ${error.message}`,
        errors: [error.message],
      };
    }
  }

  async executeCustomSQL(sql: string, operation: string = 'custom'): Promise<any> {
    console.log(`Executing SQL operation: ${operation}`);
    
    try {
      const result = await this.generate(
        `Execute the following SQL command:
        
        SQL: ${sql}
        Operation Type: ${operation}
        
        Use the execute_sql tool to run this command and provide feedback on the result.`,
        {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              result: { type: 'object' },
              error: { type: 'string' },
            },
            required: ['success', 'message'],
          },
        }
      );

      return result;
    } catch (error) {
      console.error('Failed to execute SQL:', error);
      return {
        success: false,
        message: `Failed to execute SQL: ${error.message}`,
        error: error.message,
      };
    }
  }

  async createBackup(tables: string[] = ['receipts', 'journal_entries', 'documents'], format: string = 'json'): Promise<any> {
    console.log('Creating database backup...');
    
    try {
      const result = await this.generate(
        `Create a backup of the database tables: ${tables.join(', ')}
        
        Format: ${format}
        
        Use the backup_data tool to create the backup and provide a summary.`,
        {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              tables: { type: 'array', items: { type: 'string' } },
              totalRecords: { type: 'number' },
              backupData: { type: 'string' },
            },
            required: ['success', 'message'],
          },
        }
      );

      return result;
    } catch (error) {
      console.error('Failed to create backup:', error);
      return {
        success: false,
        message: `Failed to create backup: ${error.message}`,
      };
    }
  }

  async verifyTableStructure(): Promise<any> {
    console.log('Verifying table structure...');
    
    try {
      const result = await this.generate(
        `Verify that the AAM accounting system tables are properly created and configured:
        
        1. Check if companies table exists and has the demo company
        2. Check if partners table exists with proper foreign keys
        3. Check if documents table exists with all required columns
        4. Check if document_items table exists with proper relationships
        5. Verify indexes are created
        
        Use SQL queries to verify the table structure and provide a comprehensive report.`,
        {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              tables: {
                type: 'object',
                properties: {
                  companies: { type: 'boolean' },
                  partners: { type: 'boolean' },
                  documents: { type: 'boolean' },
                  document_items: { type: 'boolean' },
                },
              },
              demoCompanyExists: { type: 'boolean' },
              errors: { type: 'array', items: { type: 'string' } },
            },
            required: ['success', 'message'],
          },
        }
      );

      return result;
    } catch (error) {
      console.error('Failed to verify table structure:', error);
      return {
        success: false,
        message: `Failed to verify table structure: ${error.message}`,
      };
    }
  }
}

export default DatabaseSetupAgent;