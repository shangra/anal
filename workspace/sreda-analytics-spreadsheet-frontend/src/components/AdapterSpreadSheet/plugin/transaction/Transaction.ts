import { ICell, ICellPluginsConfig, ICellStyles, StyledRange } from '../../types';
import { MetadataSnapshot } from '../../utils/MetadataManager';
import { SpreadsheetAction } from '../SpreadsheetAction';

export interface TransactionMeta {
    skipHistory?: boolean;
    isBatch?: boolean;
}

export interface DataChange {
    rowIndex: number;
    columnIndex: number;
    before: ICell | null;
    after: ICell | null;
}

export interface StylesSnapshot {
    ranges: StyledRange<ICellStyles>[];
}

export interface PluginConfigSnapshot {
    ranges: StyledRange<ICellPluginsConfig>[];
}

let _globalTxCounter = 0;

export function nextTransactionId(): string {
    return `tx-${Date.now()}-${++_globalTxCounter}`;
}

export class Transaction {
    readonly action: SpreadsheetAction | null;

    readonly id: string;

    readonly timestamp: number;

    readonly parentId: string | null;

    private _meta: TransactionMeta = {};

    private _extraActions: SpreadsheetAction[] = [];

    private _dataChanges: DataChange[] = [];

    private _stylesSnapshot: StylesSnapshot | null = null;

    private _pluginConfigSnapshot: PluginConfigSnapshot | null = null;

    private _metadataSnapshot: MetadataSnapshot | null = null;

    private _pendingWrites: Array<{
        rowIndex: number;
        columnIndex: number;
        cell: ICell | null; // null = delete
    }> = [];

    constructor(action: SpreadsheetAction | null = null, parentId: string | null = null) {
        this.action = action;
        this.id = nextTransactionId();
        this.timestamp = Date.now();
        this.parentId = parentId;
    }

    getMeta(): Readonly<TransactionMeta> {
        return this._meta;
    }

    setMeta(meta: Partial<TransactionMeta>): this {
        this._meta = { ...this._meta, ...meta };
        return this;
    }

    attachExtraActions(actions: SpreadsheetAction[]): this {
        this._extraActions = actions;
        return this;
    }

    getExtraActions(): SpreadsheetAction[] {
        return this._extraActions;
    }

    attachDataChanges(changes: DataChange[]): this {
        this._dataChanges = changes;
        return this;
    }

    attachStylesSnapshot(snapshot: StylesSnapshot): this {
        this._stylesSnapshot = snapshot;
        return this;
    }

    attachPluginConfigSnapshot(snapshot: PluginConfigSnapshot): this {
        this._pluginConfigSnapshot = snapshot;
        return this;
    }

    getDataChanges(): DataChange[] {
        return this._dataChanges;
    }

    getStylesSnapshot(): StylesSnapshot | null {
        return this._stylesSnapshot;
    }

    getPluginConfigSnapshot(): PluginConfigSnapshot | null {
        return this._pluginConfigSnapshot;
    }

    attachMetadataSnapshot(snapshot: MetadataSnapshot): this {
        this._metadataSnapshot = snapshot;
        return this;
    }

    getMetadataSnapshot(): MetadataSnapshot | null {
        return this._metadataSnapshot;
    }

    attachPendingWrites(writes: Array<{ rowIndex: number; columnIndex: number; cell: ICell | null }>): this {
        this._pendingWrites = writes;
        return this;
    }

    getPendingWrites() {
        return this._pendingWrites;
    }

    hasPendingWrites(): boolean {
        return this._pendingWrites.length > 0;
    }
}

export function createTransaction(action: SpreadsheetAction | null = null, parentId: string | null = null): Transaction {
    return new Transaction(action, parentId);
}

export const txMeta = {
    isSkipHistory: (tr: Transaction): boolean => !!tr.getMeta().skipHistory,
    setSkipHistory: (tr: Transaction): void => {
        tr.setMeta({ skipHistory: true });
    },
};
