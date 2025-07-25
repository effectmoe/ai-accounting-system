declare class Logger {
    private isDevelopment;
    private isProduction;
    private shouldLog;
    private sanitizeData;
    private log;
    trace(message: string, context?: Record<string, any>): void;
    debug(message: string, context?: Record<string, any>): void;
    info(message: string, context?: Record<string, any>): void;
    warn(message: string, context?: Record<string, any>): void;
    error(message: string, context?: Record<string, any>): void;
    fatal(message: string, context?: Record<string, any>): void;
    replaceConsole(): void;
}
export declare const logger: Logger;
export default logger;
