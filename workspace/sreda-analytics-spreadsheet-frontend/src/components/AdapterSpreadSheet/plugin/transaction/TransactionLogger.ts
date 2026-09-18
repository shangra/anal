type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface TransactionLogEntry {
    txId: string;
    event: string;
    timestamp: number;
    durationMs?: number;
    payload?: Record<string, unknown>;
}

export interface TransactionLoggerOptions {
    minLevel?: LogLevel;
}

export class TransactionLogger {
    private static readonly NS = '[Adapter::Transaction]';

    private _minLevel: LogLevel;

    private static readonly LEVELS: Record<LogLevel, number> = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
    };

    constructor(options?: TransactionLoggerOptions) {
        if (options?.minLevel) {
            this._minLevel = options.minLevel;
        } else {
            const stored =
                typeof localStorage !== 'undefined' ? (localStorage.getItem('adapter:log') as LogLevel | null) : null;
            this._minLevel = stored ?? 'error';
        }
    }

    setLevel(level: LogLevel): void {
        this._minLevel = level;
    }

    getLevel(): LogLevel {
        return this._minLevel;
    }

    private shouldLog(level: LogLevel): boolean {
        return TransactionLogger.LEVELS[level] >= TransactionLogger.LEVELS[this._minLevel];
    }

    private format(entry: TransactionLogEntry): string {
        const dur = entry.durationMs !== undefined ? ` (+${entry.durationMs}ms)` : '';
        return `${TransactionLogger.NS} [${entry.txId}] ${entry.event}${dur}`;
    }

    log(level: LogLevel, entry: TransactionLogEntry): void {
        if (!this.shouldLog(level)) return;
        const msg = this.format(entry);
        const extra = entry.payload ? [entry.payload] : [];

        switch (level) {
            case 'debug':
                console.debug(msg, ...extra);
                break;
            case 'info':
                console.info(msg, ...extra);
                break;
            case 'warn':
                console.warn(msg, ...extra);
                break;
            case 'error':
                console.error(msg, ...extra);
                break;
        }
    }

    group(txId: string, label: string, fn: () => void): void {
        if (!this.shouldLog('debug')) {
            fn();
            return;
        }
        console.groupCollapsed(`${TransactionLogger.NS} [${txId}] ${label}`);
        try {
            fn();
        } finally {
            console.groupEnd();
        }
    }

    private _groupDepth = 0;

    groupOpen(txId: string, label: string): void {
        if (!this.shouldLog('debug')) return;
        this._groupDepth++;
        console.groupCollapsed(`${TransactionLogger.NS} [${txId}] ${label}`);
    }

    groupClose(): void {
        if (!this.shouldLog('debug')) return;
        this._groupDepth--;
        if (this._groupDepth <= 0) {
            console.groupEnd();
            this._groupDepth = 0;
        }
    }
}
