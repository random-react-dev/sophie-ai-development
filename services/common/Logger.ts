type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class LoggerService {
    private static instance: LoggerService;
    private static remoteLogUrl: string | null = null;

    private constructor() {}

    public static getInstance(): LoggerService {
        if (!LoggerService.instance) {
            LoggerService.instance = new LoggerService();
        }
        return LoggerService.instance;
    }

    public enableRemoteLogging(url: string): void {
        LoggerService.remoteLogUrl = url;
    }

    private formatMessage(tag: string, message: string): string {
        const timestamp = new Date().toISOString().split('T')[1].split('Z')[0];
        return `[${timestamp}] [${tag}] ${message}`;
    }

    private sendToRemote(level: LogLevel, tag: string, message: string, data?: unknown): void {
        const url = LoggerService.remoteLogUrl;
        if (!url) return;
        try {
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ level, tag, message, data: data ?? null, timestamp: Date.now() }),
            }).catch(() => {});
        } catch {}
    }

    public info(tag: string, message: string, data?: unknown): void {
        console.log(this.formatMessage(tag, message), data ?? '');
        this.sendToRemote('info', tag, message, data);
    }

    public warn(tag: string, message: string, data?: unknown): void {
        console.warn(this.formatMessage(tag, message), data ?? '');
        this.sendToRemote('warn', tag, message, data);
    }

    public error(tag: string, message: string, error?: unknown): void {
        console.error(this.formatMessage(tag, message), error ?? '');
        this.sendToRemote('error', tag, message, error);
    }

    public debug(tag: string, message: string, data?: unknown): void {
        console.debug(this.formatMessage(tag, message), data ?? '');
        this.sendToRemote('debug', tag, message, data);
    }
}

export const Logger = LoggerService.getInstance();
