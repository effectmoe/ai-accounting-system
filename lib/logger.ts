import * as Sentry from "@sentry/nextjs";

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LoggerOptions {
  level?: LogLevel;
  context?: Record<string, any>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';
  
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    const currentLevel = this.isDevelopment ? 'debug' : 'info';
    const currentIndex = levels.indexOf(currentLevel);
    const levelIndex = levels.indexOf(level);
    return levelIndex >= currentIndex;
  }

  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    // 機密情報のマスキング
    const sensitiveKeys = [
      'password', 'token', 'secret', 'apiKey', 'api_key',
      'authorization', 'cookie', 'session', 'private_key',
      'client_secret', 'refresh_token', 'access_token',
      'MONGODB_URI', 'DATABASE_URL', 'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY', 'DEEPSEEK_API_KEY'
    ];

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    if (Array.isArray(sanitized)) {
      return sanitized.map(item => this.sanitizeData(item));
    }

    Object.keys(sanitized).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    });

    return sanitized;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    if (!this.shouldLog(level)) return;

    const sanitizedContext = context ? this.sanitizeData(context) : undefined;
    const timestamp = new Date().toISOString();

    // Sentryログ統合
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      const sentryLogger = (window as any).Sentry.logger;
      if (sentryLogger && sentryLogger[level]) {
        sentryLogger[level](message, sanitizedContext);
      }
    } else if (Sentry) {
      // サーバーサイド
      const breadcrumb = {
        message,
        level: level as Sentry.SeverityLevel,
        category: 'custom',
        data: sanitizedContext,
        timestamp: Date.now() / 1000,
      };
      Sentry.addBreadcrumb(breadcrumb);
    }

    // 開発環境でのコンソール出力
    if (this.isDevelopment) {
      const logMethod = level === 'trace' || level === 'debug' ? 'debug' : level;
      const consoleMethod = console[logMethod as keyof Console] || console.log;
      
      consoleMethod.call(
        console,
        `[${timestamp}] [${level.toUpperCase()}] ${message}`,
        sanitizedContext || ''
      );
    }
  }

  trace(message: string, context?: Record<string, any>) {
    this.log('trace', message, context);
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>) {
    this.log('error', message, context);
    
    // エラーレベル以上はSentryに送信
    if (context?.error) {
      Sentry.captureException(context.error, {
        extra: this.sanitizeData(context),
      });
    }
  }

  fatal(message: string, context?: Record<string, any>) {
    this.log('fatal', message, context);
    
    // 致命的エラーは必ずSentryに送信
    Sentry.captureMessage(message, 'fatal');
  }

  // 既存のconsole.logをこのロガーに置き換えるためのヘルパー
  replaceConsole() {
    if (this.isProduction) {
      console.log = (message: any, ...args: any[]) => {
        this.debug(String(message), { args });
      };
      console.error = (message: any, ...args: any[]) => {
        this.error(String(message), { args });
      };
      console.warn = (message: any, ...args: any[]) => {
        this.warn(String(message), { args });
      };
    }
  }
}

// シングルトンインスタンス
export const logger = new Logger();

// デフォルトエクスポート
export default logger;