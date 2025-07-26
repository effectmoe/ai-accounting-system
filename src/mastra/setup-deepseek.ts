// DeepSeekプロバイダーの設定
import { createOpenAICompatible } from '@mastra/core';

// DeepSeekプロバイダーを設定
export const deepseekProvider = createOpenAICompatible({
  name: 'deepseek',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com/v1',
  models: {
    'deepseek-chat': {
      id: 'deepseek-chat',
      contextWindow: 32768,
      maxCompletionTokens: 4096,
    }
  }
});

// DeepSeekモデルを作成
export function createDeepSeekModel() {
  return {
    provider: 'deepseek',
    name: 'deepseek-chat',
    config: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  };
}

// APIリクエストを送信する関数
export async function callDeepSeek(messages: any[], tools?: any[]) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set');
  }

  const body: any = {
    model: 'deepseek-chat',
    messages,
    temperature: 0.7,
    max_tokens: 4096,
  };

  // ツールがある場合は追加
  if (tools && tools.length > 0) {
    body.tools = tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
    body.tool_choice = 'auto';
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data;
}