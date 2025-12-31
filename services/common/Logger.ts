type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class LoggerService {
    private static instance: LoggerService;

    private constructor() {}

    public static getInstance(): LoggerService {
        if (!LoggerService.instance) {
            LoggerService.instance = new LoggerService();
        }
        return LoggerService.instance;
    }

    private formatMessage(tag: string, message: string): string {
        const timestamp = new Date().toISOString().split('T')[1].split('Z')[0];
        return `[${timestamp}] [${tag}] ${message}`;
    }

    public info(tag: string, message: string, data?: unknown): void {
        console.log(this.formatMessage(tag, message), data ?? '');
    }

    public warn(tag: string, message: string, data?: unknown): void {
        console.warn(this.formatMessage(tag, message), data ?? '');
    }

    public error(tag: string, message: string, error?: unknown): void {
        console.error(this.formatMessage(tag, message), error ?? '');
    }

    public debug(tag: string, message: string, data?: unknown): void {
        // Only log debug in development if needed
        console.debug(this.formatMessage(tag, message), data ?? '');
    }
}

export const Logger = LoggerService.getInstance();
