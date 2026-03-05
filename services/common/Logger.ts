type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class LoggerService {
    private static instance: LoggerService;
    private static remoteLogUrl: string | null = null;
    private readonly remoteMinIntervalMs = 250;
    private readonly lastRemoteSentByTag: Map<string, number> = new Map();

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

    private shouldSendRemote(level: LogLevel): boolean {
        if (level === 'warn' || level === 'error') {
            return true;
        }
        if (level === 'info') {
            return process.env.EXPO_PUBLIC_REMOTE_LOG_INFO === '1';
        }
        if (level === 'debug') {
            return process.env.EXPO_PUBLIC_REMOTE_LOG_DEBUG === '1';
        }
        return false;
    }

    private formatMessage(tag: string, message: string): string {
        const timestamp = new Date().toISOString().split('T')[1].split('Z')[0];
        return `[${timestamp}] [${tag}] ${message}`;
    }

    private sendToRemote(level: LogLevel, tag: string, message: string, data?: unknown): void {
        const url = LoggerService.remoteLogUrl;
        if (!url) return;
        if (!this.shouldSendRemote(level)) return;

        const now = Date.now();
        const key = `${level}:${tag}`;
        const lastSent = this.lastRemoteSentByTag.get(key) ?? 0;
        if (now - lastSent < this.remoteMinIntervalMs) {
            return;
        }
        this.lastRemoteSentByTag.set(key, now);

        try {
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ level, tag, message, data: data ?? null, timestamp: now }),
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
