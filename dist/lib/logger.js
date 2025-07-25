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
exports.logger = void 0;
const Sentry = __importStar(require("@sentry/nextjs"));
class Logger {
    isDevelopment = process.env.NODE_ENV === 'development';
    isProduction = process.env.NODE_ENV === 'production';
    shouldLog(level) {
        const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
        const currentLevel = this.isDevelopment ? 'debug' : 'info';
        const currentIndex = levels.indexOf(currentLevel);
        const levelIndex = levels.indexOf(level);
        return levelIndex >= currentIndex;
    }
    sanitizeData(data) {
        if (typeof data !== 'object' || data === null) {
            return data;
        }
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
            }
            else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                sanitized[key] = this.sanitizeData(sanitized[key]);
            }
        });
        return sanitized;
    }
    log(level, message, context) {
        if (!this.shouldLog(level))
            return;
        const sanitizedContext = context ? this.sanitizeData(context) : undefined;
        const timestamp = new Date().toISOString();
        if (typeof window !== 'undefined' && window.Sentry) {
            const sentryLogger = window.Sentry.logger;
            if (sentryLogger && sentryLogger[level]) {
                sentryLogger[level](message, sanitizedContext);
            }
        }
        else if (Sentry) {
            const breadcrumb = {
                message,
                level: level,
                category: 'custom',
                data: sanitizedContext,
                timestamp: Date.now() / 1000,
            };
            Sentry.addBreadcrumb(breadcrumb);
        }
        if (this.isDevelopment) {
            const logMethod = level === 'trace' || level === 'debug' ? 'debug' : level;
            const consoleMethod = console[logMethod] || console.log;
            consoleMethod.call(console, `[${timestamp}] [${level.toUpperCase()}] ${message}`, sanitizedContext || '');
        }
    }
    trace(message, context) {
        this.log('trace', message, context);
    }
    debug(message, context) {
        this.log('debug', message, context);
    }
    info(message, context) {
        this.log('info', message, context);
    }
    warn(message, context) {
        this.log('warn', message, context);
    }
    error(message, context) {
        this.log('error', message, context);
        if (context?.error) {
            Sentry.captureException(context.error, {
                extra: this.sanitizeData(context),
            });
        }
    }
    fatal(message, context) {
        this.log('fatal', message, context);
        Sentry.captureMessage(message, 'fatal');
    }
    replaceConsole() {
        if (this.isProduction) {
            console.log = (message, ...args) => {
                this.debug(String(message), { args });
            };
            console.error = (message, ...args) => {
                this.error(String(message), { args });
            };
            console.warn = (message, ...args) => {
                this.warn(String(message), { args });
            };
        }
    }
}
exports.logger = new Logger();
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map