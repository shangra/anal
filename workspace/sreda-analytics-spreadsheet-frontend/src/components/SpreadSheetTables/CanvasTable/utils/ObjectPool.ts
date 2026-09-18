export class ObjectPool<T> {
    private available: T[] = [];

    private inUse = new Set<T>();

    private factory: () => T;

    private reset: (obj: T) => void;

    private maxSize: number;

    constructor(factory: () => T, reset: (obj: T) => void, initialSize: number = 10, maxSize: number = 100) {
        this.factory = factory;
        this.reset = reset;
        this.maxSize = maxSize;

        // Предварительное создание объектов
        for (let i = 0; i < initialSize; i++) {
            this.available.push(this.factory());
        }
    }

    acquire(): T {
        let obj: T;

        if (this.available.length > 0) {
            obj = this.available.pop()!;
        } else {
            obj = this.factory();
        }

        this.inUse.add(obj);
        return obj;
    }

    release(obj: T): void {
        if (!this.inUse.has(obj)) {
            console.warn('Trying to release an object that is not in use');
            return;
        }

        this.inUse.delete(obj);
        this.reset(obj);

        // Ограничиваем размер пула
        if (this.available.length < this.maxSize) {
            this.available.push(obj);
        }
    }

    releaseAll(): void {
        this.inUse.forEach((obj) => {
            this.reset(obj);
            if (this.available.length < this.maxSize) {
                this.available.push(obj);
            }
        });
        this.inUse.clear();
    }

    getStats() {
        return {
            available: this.available.length,
            inUse: this.inUse.size,
            total: this.available.length + this.inUse.size,
        };
    }
}
