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

export interface SpeechRecognitionError {
  error: string;
  message: string;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: SpeechRecognitionResult;
      isFinal: boolean;
      length: number;
    };
    length: number;
  };
}

export interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

export interface SpeechRecognition extends EventTarget {
  // Properties
  continuous: boolean;
  grammars: any;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;

  // Event handlers
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;

  // Methods
  abort(): void;
  start(): void;
  stop(): void;
}

export interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

// Global window interface extension
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionStatic;
    webkitSpeechRecognition?: SpeechRecognitionStatic;
  }
}

// Speech Recognition Hook Types
export interface SpeechRecognitionState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
}

export interface SpeechRecognitionHookResult extends SpeechRecognitionState {
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export interface SpeechRecognitionConfig {
  /** 継続的な音声認識を行うかどうか (default: false) */
  continuous?: boolean;
  /** 中間結果も返すかどうか (default: true) */
  interimResults?: boolean;
  /** 認識言語 (default: 'ja-JP') */
  language?: string;
  /** 認識結果の最大代替候補数 (default: 1) */
  maxAlternatives?: number;
  /** 音声認識のタイムアウト時間（ミリ秒） (default: 10000) */
  speechTimeout?: number;
}