"use strict";
/**
 * Web Speech API types for TypeScript
 *
 * 使用方法:
 * 1. このファイルはWeb Speech APIのTypeScript型定義を提供します
 * 2. 対応ブラウザ: Chrome, Edge, Safari (最新版)
 * 3. HTTPS接続が必要です
 * 4. マイクアクセス許可が必要です
 *
 * 実装例:
 * ```typescript
 * import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
 *
 * const {
 *   isListening,
 *   transcript,
 *   startListening,
 *   stopListening
 * } = useSpeechRecognition({ language: 'ja-JP' });
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
