#!/usr/bin/env npx ts-node
/**
 * scan-receiptフォルダを監視し、画像（JPG/PNG）が追加されたら自動でOCR処理
 * fs.watchによる即座検出
 */

import * as fs from 'fs';
import * as path from 'path';

const SCAN_FOLDER = '/Users/tonychustudio/ai-accounting-system/scan-receipt';
const API_URL = process.env.API_URL || 'http://localhost:3003';

let processedFiles = new Set<string>();
let isProcessing = false;
let pendingFiles: string[] = [];

async function processFile(fileName: string) {
  const filePath = path.join(SCAN_FOLDER, fileName);

  // ファイルが存在しない場合はスキップ
  if (!fs.existsSync(filePath)) {
    return;
  }

  try {
    console.log(`[${new Date().toLocaleTimeString()}] OCR処理中: ${fileName}`);

    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const imageBase64 = `data:${mimeType};base64,${base64Image}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(`${API_URL}/api/scan-receipt/direct-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, fileName }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const result = await response.json();

    if (result.success) {
      console.log(`  ✓ ${fileName}: ${result.receiptNumber}`);
      // ファイルがまだ存在する場合のみ移動
      if (fs.existsSync(filePath)) {
        const processedFolder = path.join(SCAN_FOLDER, 'processed');
        if (!fs.existsSync(processedFolder)) {
          fs.mkdirSync(processedFolder, { recursive: true });
        }
        fs.renameSync(filePath, path.join(processedFolder, fileName));
        console.log(`  → 移動完了: processed/${fileName}`);
      } else {
        console.log(`  ⚠ ファイル既に移動済み: ${fileName}`);
      }
    } else {
      console.log(`  ✗ ${fileName}: ${result.error || '処理失敗'}`);
    }
  } catch (error) {
    console.error(`  ✗ ${fileName}: ${error}`);
  }
}

async function processQueue() {
  if (isProcessing || pendingFiles.length === 0) return;

  isProcessing = true;

  while (pendingFiles.length > 0) {
    const fileName = pendingFiles.shift()!;
    await processFile(fileName);
  }

  isProcessing = false;
}

function isImageFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png');
}

function loadProcessedFiles() {
  const processedFolder = path.join(SCAN_FOLDER, 'processed');
  if (fs.existsSync(processedFolder)) {
    const files = fs.readdirSync(processedFolder);
    files.forEach(f => processedFiles.add(f));
  }
}

console.log('='.repeat(50));
console.log('scan-receiptフォルダ監視開始（即時検出モード）');
console.log(`監視フォルダ: ${SCAN_FOLDER}`);
console.log(`API URL: ${API_URL}`);
console.log('='.repeat(50));

loadProcessedFiles();

// 既存ファイルをチェック
const existingFiles = fs.readdirSync(SCAN_FOLDER).filter(f =>
  isImageFile(f) && !processedFiles.has(f)
);
if (existingFiles.length > 0) {
  console.log(`既存ファイル検出: ${existingFiles.length}件`);
  existingFiles.forEach(f => {
    processedFiles.add(f);
    pendingFiles.push(f);
  });
  processQueue();
}

// ファイル変更を即座に検出（重複防止）
const processingFiles = new Set<string>();

fs.watch(SCAN_FOLDER, (eventType, fileName) => {
  if (!fileName || !isImageFile(fileName)) return;
  if (processedFiles.has(fileName)) return;
  if (processingFiles.has(fileName)) return; // 処理中なら無視
  if (pendingFiles.includes(fileName)) return; // キューにあれば無視

  // 処理中としてマーク
  processingFiles.add(fileName);

  // ファイルが完全に書き込まれるまで少し待つ
  setTimeout(() => {
    const filePath = path.join(SCAN_FOLDER, fileName);
    if (!fs.existsSync(filePath)) {
      processingFiles.delete(fileName);
      return;
    }

    console.log(`[${new Date().toLocaleTimeString()}] 新規ファイル検出: ${fileName}`);
    processedFiles.add(fileName);
    pendingFiles.push(fileName);
    processQueue();
  }, 500);
});

console.log('ファイル追加を待機中... (Ctrl+C で停止)');
