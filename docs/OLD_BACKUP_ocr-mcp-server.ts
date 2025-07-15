import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// OCR MCP サーバー
const server = new Server(
  {
    name: 'ocr-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツールの定義
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'process_ocr_gas',
        description: 'Process OCR using Google Apps Script',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to the file to process',
            },
            fileUrl: {
              type: 'string',
              description: 'URL of the file to process',
            },
            extractType: {
              type: 'string',
              enum: ['receipt', 'invoice', 'general'],
              description: 'Type of document to extract',
            },
          },
          required: [],
        },
      },
      {
        name: 'extract_receipt_info',
        description: 'Extract structured information from receipt text',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'OCR text to analyze',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'process_batch_ocr',
        description: 'Process multiple files for OCR',
        inputSchema: {
          type: 'object',
          properties: {
            files: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  type: { type: 'string' },
                },
              },
              description: 'Array of files to process',
            },
          },
          required: ['files'],
        },
      },
      {
        name: 'get_ocr_status',
        description: 'Get status of GAS OCR system',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// ツールの実行
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'process_ocr_gas': {
      const gasUrl = process.env.GAS_OCR_URL;
      if (!gasUrl) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: GAS_OCR_URL not configured',
            },
          ],
        };
      }

      try {
        let fileData: Buffer;
        let fileName: string;

        if (args.filePath) {
          fileData = fs.readFileSync(args.filePath);
          fileName = path.basename(args.filePath);
        } else if (args.fileUrl) {
          const response = await fetch(args.fileUrl);
          fileData = Buffer.from(await response.arrayBuffer());
          fileName = path.basename(args.fileUrl);
        } else {
          throw new Error('No file input provided');
        }

        // GAS OCR APIを呼び出し
        const formData = new FormData();
        formData.append('file', fileData, fileName);
        formData.append('type', args.extractType || 'receipt');

        const response = await fetch(gasUrl, {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error processing OCR: ${error.message}`,
            },
          ],
        };
      }
    }

    case 'extract_receipt_info': {
      const text = args.text as string;
      const info = {
        vendor: '',
        date: '',
        amount: 0,
        tax: 0,
        items: [],
      };

      // ベンダー名の抽出
      const vendorMatch = text.match(/(?:株式会社|有限会社|合同会社)?[\u4e00-\u9fa5\u30a0-\u30ff]+(?:株式会社|店|商店|ストア)?/);
      if (vendorMatch) {
        info.vendor = vendorMatch[0];
      }

      // 日付の抽出
      const dateMatch = text.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/);
      if (dateMatch) {
        const year = dateMatch[1];
        const month = dateMatch[2].padStart(2, '0');
        const day = dateMatch[3].padStart(2, '0');
        info.date = `${year}-${month}-${day}`;
      }

      // 金額の抽出
      const amountMatches = text.match(/[¥￥]?\s*([0-9,]+)\s*円?/g);
      if (amountMatches && amountMatches.length > 0) {
        const amounts = amountMatches.map(m => 
          parseInt(m.replace(/[¥￥,円\s]/g, ''))
        ).filter(a => !isNaN(a));
        
        if (amounts.length > 0) {
          info.amount = Math.max(...amounts);
          info.tax = Math.floor(info.amount * 0.1 / 1.1);
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    }

    case 'process_batch_ocr': {
      const files = args.files as Array<{ path: string; type: string }>;
      const results = [];

      for (const file of files) {
        try {
          const fileData = fs.readFileSync(file.path);
          const fileName = path.basename(file.path);

          // 各ファイルをOCR処理
          const formData = new FormData();
          formData.append('file', fileData, fileName);
          formData.append('type', file.type || 'receipt');

          const response = await fetch(process.env.GAS_OCR_URL!, {
            method: 'POST',
            body: formData,
          });

          const result = await response.json();
          results.push({
            file: fileName,
            success: true,
            result,
          });
        } catch (error) {
          results.push({
            file: file.path,
            success: false,
            error: error.message,
          });
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    }

    case 'get_ocr_status': {
      const gasUrl = process.env.GAS_OCR_URL;
      if (!gasUrl) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: GAS_OCR_URL not configured',
            },
          ],
        };
      }

      try {
        const response = await fetch(gasUrl);
        const status = await response.json();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error checking OCR status: ${error.message}`,
            },
          ],
        };
      }
    }

    default:
      return {
        content: [
          {
            type: 'text',
            text: `Unknown tool: ${name}`,
          },
        ],
      };
  }
});

// サーバーの起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('OCR MCP Server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});