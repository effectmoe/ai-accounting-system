#!/usr/bin/env tsx
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
const core_1 = require("@mastra/core");
const database_setup_agent_1 = require("../src/agents/database-setup-agent");
const child_process_1 = require("child_process");
const path_1 = require("path");
// Setup script to create documents table using MCP and Mastra
async function setupDatabase() {
    console.log('🚀 Starting AAM Database Setup...');
    try {
        // Start the database MCP server
        console.log('📡 Starting Database MCP Server...');
        const mcpServer = (0, child_process_1.spawn)('tsx', [
            (0, path_1.join)(process.cwd(), 'src/mcp-servers/database-mcp-server.ts')
        ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
                SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
            }
        });
        // Wait a moment for the server to start
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Initialize Mastra with the database setup agent
        console.log('🤖 Initializing Database Setup Agent...');
        const mastra = new core_1.Mastra({
            agents: [new database_setup_agent_1.DatabaseSetupAgent()],
            mcpServers: [
                {
                    name: 'database-mcp-server',
                    transport: {
                        type: 'stdio',
                        command: 'tsx',
                        args: [(0, path_1.join)(process.cwd(), 'src/mcp-servers/database-mcp-server.ts')],
                        env: {
                            SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
                            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
                        },
                    },
                },
            ],
        });
        const agent = mastra.getAgent('database-setup-agent');
        // Step 1: Setup documents table
        console.log('📝 Creating documents table and related tables...');
        const setupResult = await agent.setupDocumentsTable(false); // Don't recreate if exists
        console.log('Setup Result:', JSON.stringify(setupResult, null, 2));
        if (!setupResult.success) {
            console.error('❌ Failed to setup documents table:', setupResult.message);
            console.log('🔄 Trying with SQL execution...');
            // Try manual SQL execution
            const createCompaniesSQL = `
        CREATE TABLE IF NOT EXISTS companies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          name_kana VARCHAR(255),
          tax_number VARCHAR(50),
          invoice_registration_number VARCHAR(50),
          fiscal_year_start INTEGER DEFAULT 4,
          address JSONB,
          contact_info JSONB,
          settings JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
            const sqlResult = await agent.executeCustomSQL(createCompaniesSQL, 'create_table');
            console.log('SQL Result:', JSON.stringify(sqlResult, null, 2));
        }
        // Step 2: Verify table structure
        console.log('🔍 Verifying table structure...');
        const verifyResult = await agent.verifyTableStructure();
        console.log('Verification Result:', JSON.stringify(verifyResult, null, 2));
        // Step 3: Create backup of existing data
        console.log('💾 Creating backup of existing data...');
        const backupResult = await agent.createBackup(['ocr_results'], 'json');
        console.log('Backup Result:', JSON.stringify(backupResult, null, 2));
        console.log('✅ Database setup completed!');
        // Cleanup
        mcpServer.kill('SIGTERM');
    }
    catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    }
}
// Alternative direct SQL approach using Supabase client
async function setupDatabaseDirect() {
    console.log('🔄 Using direct Supabase approach...');
    try {
        const { createClient } = await Promise.resolve().then(() => __importStar(require('@supabase/supabase-js')));
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase configuration missing');
        }
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        console.log('📊 Testing Supabase connection...');
        // Test connection
        const { data: testData, error: testError } = await supabase
            .from('ocr_results')
            .select('id')
            .limit(1);
        if (testError && !testError.message.includes('Could not find')) {
            console.error('❌ Supabase connection failed:', testError);
            return;
        }
        console.log('✅ Supabase connection successful');
        // The issue is that we need to create tables using the Supabase Dashboard SQL Editor
        // For now, let's output the SQL that needs to be run manually
        console.log('📋 Please run the following SQL in your Supabase Dashboard SQL Editor:');
        console.log('');
        console.log('-- 1. Create companies table');
        console.log(`CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  name_kana VARCHAR(255),
  tax_number VARCHAR(50),
  invoice_registration_number VARCHAR(50),
  fiscal_year_start INTEGER DEFAULT 4,
  address JSONB,
  contact_info JSONB,
  settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`);
        console.log('');
        console.log('-- 2. Insert demo company');
        console.log(`INSERT INTO companies (id, name, name_kana, tax_number, fiscal_year_start)
VALUES ('11111111-1111-1111-1111-111111111111', 'デモ会社', 'デモガイシャ', '1234567890123', 4)
ON CONFLICT (id) DO NOTHING;`);
        console.log('');
        console.log('-- 3. Create partners table');
        console.log(`CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  kana_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(100),
  fax VARCHAR(100),
  address TEXT,
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Japan',
  is_customer BOOLEAN DEFAULT true,
  is_supplier BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  bank_name VARCHAR(100),
  bank_branch VARCHAR(100),
  bank_account_type VARCHAR(20),
  bank_account_number VARCHAR(50),
  bank_account_holder VARCHAR(100),
  payment_terms TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`);
        console.log('');
        console.log('-- 4. Create documents table');
        console.log(`CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('estimate', 'invoice', 'delivery_note', 'receipt')),
  document_number VARCHAR(50) NOT NULL,
  issue_date DATE NOT NULL,
  
  -- Partner information
  partner_id UUID REFERENCES partners(id),
  partner_name VARCHAR(255) NOT NULL,
  partner_address TEXT,
  partner_phone VARCHAR(100),
  partner_email VARCHAR(255),
  partner_postal_code VARCHAR(20),
  partner_registration_number VARCHAR(50),
  
  -- Document details
  project_name VARCHAR(255),
  subtotal DECIMAL(15, 2) NOT NULL,
  tax_amount DECIMAL(15, 2) NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  
  -- Optional fields
  valid_until DATE,
  due_date DATE,
  payment_method VARCHAR(50),
  payment_terms TEXT,
  notes TEXT,
  
  -- Bank information (for invoices)
  bank_name VARCHAR(100),
  bank_branch VARCHAR(100),
  bank_account_type VARCHAR(20),
  bank_account_number VARCHAR(50),
  bank_account_holder VARCHAR(100),
  
  -- Delivery information (for delivery notes)
  delivery_date DATE,
  delivery_location TEXT,
  
  -- PDF storage
  pdf_url TEXT,
  pdf_generated_at TIMESTAMP WITH TIME ZONE,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'paid', 'cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  
  UNIQUE(company_id, document_number)
);`);
        console.log('');
        console.log('-- 5. Create document_items table');
        console.log(`CREATE TABLE IF NOT EXISTS document_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL,
  tax_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.10,
  amount DECIMAL(15, 2) NOT NULL,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`);
        console.log('');
        console.log('-- 6. Create indexes');
        console.log(`CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_issue_date ON documents(issue_date);
CREATE INDEX IF NOT EXISTS idx_documents_partner_id ON documents(partner_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_document_items_document_id ON document_items(document_id);`);
        console.log('');
        console.log('🔗 Go to: https://app.supabase.com/project/clqpfmroqcnvyxdzadln/sql/new');
        console.log('📋 Copy and paste the above SQL commands to create the required tables.');
        console.log('');
        console.log('✅ After running the SQL, the documents table will be ready for use.');
    }
    catch (error) {
        console.error('❌ Direct setup failed:', error);
    }
}
// Main execution
async function main() {
    const args = process.argv.slice(2);
    const useDirect = args.includes('--direct');
    if (useDirect) {
        await setupDatabaseDirect();
    }
    else {
        // Try MCP approach first, fallback to direct
        try {
            await setupDatabase();
        }
        catch (error) {
            console.log('🔄 MCP approach failed, trying direct approach...');
            await setupDatabaseDirect();
        }
    }
}
if (require.main === module) {
    main().catch(console.error);
}
