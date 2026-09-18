import { IIndexedDBStorage, IPivotData, IPivotTable } from '../types';

const DB_NAME = 'PivotTableCache';
const DB_VERSION = 1;
const ROOT_STORE = 'rootData';
const DRILL_STORE = 'drillDownData';

export default class IndexedDBStorage implements IIndexedDBStorage {
    private db: IDBDatabase | null = null;

    async init(): Promise<void> {
        if (this.db) return;

        // eslint-disable-next-line consistent-return
        return new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains(ROOT_STORE)) {
                    db.createObjectStore(ROOT_STORE, { keyPath: 'paramsHash' });
                }

                if (!db.objectStoreNames.contains(DRILL_STORE)) {
                    const drillStore = db.createObjectStore(DRILL_STORE, { keyPath: 'compositeKey' });
                    drillStore.createIndex('byParamsHash', 'paramsHash', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve();
            };

            request.onerror = (event) => {
                console.error('[IndexedDBStorage] Failed to open IndexedDB:', (event.target as IDBOpenDBRequest).error);
                reject((event.target as IDBOpenDBRequest).error);
            };
        });
    }

    async setRootData(paramsHash: string, data: IPivotData): Promise<void> {
        await this.ensureDB();

        return new Promise<void>((resolve, reject) => {
            const tx = this.db!.transaction(ROOT_STORE, 'readwrite');
            const store = tx.objectStore(ROOT_STORE);

            const record = {
                paramsHash,
                data,
                timestamp: Date.now(),
            };

            const request = store.put(record);
            request.onsuccess = () => resolve();
            request.onerror = () => {
                console.error('[IndexedDBStorage] setRootData failed:', request.error);
                reject(request.error);
            };
        });
    }

    async getRootData(paramsHash: string): Promise<IPivotData | null> {
        await this.ensureDB();

        return new Promise<IPivotData | null>((resolve, reject) => {
            const tx = this.db!.transaction(ROOT_STORE, 'readonly');
            const store = tx.objectStore(ROOT_STORE);
            const request = store.get(paramsHash);

            request.onsuccess = () => {
                const { result } = request;
                resolve(result?.data ?? null);
            };

            request.onerror = () => {
                console.error('[IndexedDBStorage] getRootData failed:', request.error);
                reject(request.error);
            };
        });
    }

    async setDrillDownData(paramsHash: string, dimensionName: string, nodeId: string, data: IPivotTable): Promise<void> {
        await this.ensureDB();

        return new Promise<void>((resolve, reject) => {
            const tx = this.db!.transaction(DRILL_STORE, 'readwrite');
            const store = tx.objectStore(DRILL_STORE);

            const compositeKey = IndexedDBStorage.buildDrillKey(paramsHash, dimensionName, nodeId);

            const record = {
                compositeKey,
                paramsHash,
                dimensionName,
                nodeId,
                data,
                timestamp: Date.now(),
            };

            const request = store.put(record);
            request.onsuccess = () => resolve();
            request.onerror = () => {
                console.error('[IndexedDBStorage] setDrillDownData failed:', request.error);
                reject(request.error);
            };
        });
    }

    async getDrillDownData(paramsHash: string, dimensionName: string, nodeId: string): Promise<IPivotTable | null> {
        await this.ensureDB();

        return new Promise<IPivotTable | null>((resolve, reject) => {
            const tx = this.db!.transaction(DRILL_STORE, 'readonly');
            const store = tx.objectStore(DRILL_STORE);
            const compositeKey = IndexedDBStorage.buildDrillKey(paramsHash, dimensionName, nodeId);
            const request = store.get(compositeKey);

            request.onsuccess = () => {
                const { result } = request;
                resolve(result?.data ?? null);
            };

            request.onerror = () => {
                console.error('[IndexedDBStorage] getDrillDownData failed:', request.error);
                reject(request.error);
            };
        });
    }

    async clearAll(): Promise<void> {
        await this.ensureDB();

        return new Promise<void>((resolve, reject) => {
            const tx = this.db!.transaction([ROOT_STORE, DRILL_STORE], 'readwrite');

            tx.objectStore(ROOT_STORE).clear();
            tx.objectStore(DRILL_STORE).clear();

            tx.oncomplete = () => resolve();
            tx.onerror = () => {
                console.error('[IndexedDBStorage] clearAll failed:', tx.error);
                reject(tx.error);
            };
        });
    }

    async clearByHash(paramsHash: string): Promise<void> {
        await this.ensureDB();

        return new Promise<void>((resolve, reject) => {
            const tx = this.db!.transaction([ROOT_STORE, DRILL_STORE], 'readwrite');

            // Delete root entry
            tx.objectStore(ROOT_STORE).delete(paramsHash);

            // Delete all drill entries for this hash
            const drillStore = tx.objectStore(DRILL_STORE);
            const index = drillStore.index('byParamsHash');
            const cursorRequest = index.openCursor(IDBKeyRange.only(paramsHash));

            cursorRequest.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            tx.oncomplete = () => resolve();
            tx.onerror = () => {
                console.error('[IndexedDBStorage] clearByHash failed:', tx.error);
                reject(tx.error);
            };
        });
    }

    private async ensureDB(): Promise<void> {
        if (!this.db) {
            await this.init();
        }
    }

    static buildDrillKey(paramsHash: string, dimensionName: string, nodeId: string): string {
        return `${paramsHash}::${dimensionName}::${nodeId}`;
    }

    /**
     * Computes a simple hash string from IPivotParams for cache keying.
     */
    static computeParamsHash(params: {
        columns?: unknown[];
        rows?: unknown[];
        values?: unknown[];
        layers?: unknown[];
        where?: unknown;
    }): string {
        const key = JSON.stringify({
            columns: params.columns,
            rows: params.rows,
            values: params.values,
            layers: params.layers,
            where: params.where,
        });

        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            const char = key.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0; // Convert to 32-bit integer
        }

        return `ph_${Math.abs(hash).toString(36)}`;
    }
}
