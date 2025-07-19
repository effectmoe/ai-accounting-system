import React from 'react';
import dynamic from 'next/dynamic';
import { DynamicLoader } from '@/components/common/DynamicLoader';

// @react-pdf/rendererを動的にインポート
const DynamicPDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { 
    loading: () => <DynamicLoader message="PDFジェネレーターを準備しています..." />,
    ssr: false // PDFはクライアントサイドでのみ生成
  }
);

const DynamicDocument = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.Document),
  { ssr: false }
);

const DynamicPage = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.Page),
  { ssr: false }
);

const DynamicText = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.Text),
  { ssr: false }
);

const DynamicView = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.View),
  { ssr: false }
);

const DynamicStyleSheet = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.StyleSheet),
  { ssr: false }
);

// PDFコンポーネントをエクスポート
export {
  DynamicPDFDownloadLink as PDFDownloadLink,
  DynamicDocument as Document,
  DynamicPage as Page,
  DynamicText as Text,
  DynamicView as View,
  DynamicStyleSheet as StyleSheet,
};

// PDFプレビューコンポーネント（必要な場合のみロード）
export const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFViewer),
  { 
    loading: () => <DynamicLoader message="PDFビューアを読み込んでいます..." />,
    ssr: false 
  }
);