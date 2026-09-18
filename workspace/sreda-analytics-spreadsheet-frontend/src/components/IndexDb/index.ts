/**
 * Сервис работы с IndexDb
 */
// eslint-disable-next-line no-undef
export default class IndexDbService<TKey extends IDBValidKey = string, TValue = unknown> {
    /**
     * Наименование БД
     */
    readonly dbName: string;

    /**
     * Наименование хранилища (таблицы)
     */
    readonly storeName: string;

    /**
     * Свойство, по которому будет получаться ключевое поле
     */
    readonly keyPath: string;

    /**
     * Инстанс БД
     * @private
     */
    private db: IDBDatabase | null;

    constructor(dbName = 'TreeCacheDB', storeName = 'nodes', keyPath = 'id') {
        this.dbName = dbName;
        this.storeName = storeName;
        this.keyPath = keyPath;
        this.db = null;
    }

    /**
     * Метод инициализации соединения с БД
     * @returns
     */
    async init(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: this.keyPath });
                }
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve();
            };

            request.onerror = (event) => {
                reject((event.target as IDBOpenDBRequest).error);
            };
        });
    }

    /**
     * Метод закрытия соединения с БД
     */
    async close(): Promise<void> {
        if (this.db) {
            // Ждем завершения всех транзакций
            await this.waitForTransactions();

            this.db.close();
        }
    }

    // Ожидание завершения транзакций
    // @todo проверить
    private async waitForTransactions() {
        return new Promise((resolve) => {
            const checkTransactions = () => {
                // IndexedDB не предоставляет прямого API для проверки активных транзакций
                // Но мы можем использовать setTimeout для гарантии
                setTimeout(resolve, 100);
            };
            checkTransactions();
        });
    }

    /**
     * Метод сохранения/обновления элемента
     * @param node
     */
    async save(node: TValue): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!this.db) {
                reject(new Error('БД не инициализирована'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(node);

            request.onsuccess = () => resolve();
            request.onerror = (event: any) => reject(event.target.error);
        });
    }

    /**
     * Метод чтения элемента
     * @param id Уникальный идентификатор записи
     * @returns Полученная запись
     */
    async read(id: TKey): Promise<TValue> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('БД не инициализирована'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(id);

            request.onsuccess = (event: any) => {
                resolve(event.target.result);
            };

            request.onerror = (event: any) => {
                reject(event.target.error);
            };
        });
    }

    /**
     * Метод чтения всех элементов
     * @returns Все записи таблицы
     */
    async readAll(): Promise<TValue[]> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('БД не инициализирована'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = (event: any) => {
                resolve(event.target.result);
            };

            request.onerror = (event: any) => {
                reject(event.target.error);
            };
        });
    }

    /**
     * Метод удаления элемента из кеша
     * @param id Идентификатор удаляемой строки
     */
    async deleteById(id: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!this.db) {
                reject(new Error('БД не инициализирована'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = (event: any) => reject(event.target.error);
        });
    }
}
