const { createClient, createCluster } = require('redis');

/**
 * @implements {IMemorySave}
 */
class RedisMemory {
    client;

    isConnecting = false;

    connectionRetries = 0;

    MAX_RETRIES = 5;

    isExternal = true;

    PREFIX = sreda.env.CACHE_PREFIX || 'metadata';

    HASH_PREFIX = 'HASH_';

    MAX_ARRAY_SIZE = sreda.env.REDIS_MIN_LO_SIZE || 20000;

    CHUNK_SIZE = sreda.env.REDIS_LO_CHUNK_SIZE || 50;

    BATCH_CONCURRENCY = sreda.env.REDIS_LO_BATCH_CONCURRENCY || 10;

    constructor() {
        const REDIS_CLIENT = sreda.env.REDIS_MEMORYSAVE_CLIENT ||
            sreda.env.REDIS_CLIENT || { url: 'redis://localhost:6379' };

        const REDIS_RETRY_ATTEMPT = +sreda.env.REDIS_RETRY_ATTEMPT || 50;
        const REDIS_RETRY_TIME = +sreda.env.REDIS_RETRY_TIME || 5000; // 5 sec

        /** @type {import('redis').RedisClientOptions["socket"]["reconnectStrategy"]} */
        const reconnectStrategy = (retries) =>
            retries <= REDIS_RETRY_ATTEMPT ? REDIS_RETRY_TIME : false;

        /** @type {import('redis').RedisClientOptions} */
        const config = JSON.parse(JSON.stringify(REDIS_CLIENT));
        config.socket ||= {};
        config.socket.reconnectStrategy = reconnectStrategy;

        config.socket.keepAlive = 30000; // 30 seconds
        config.pingInterval = 10000; // 10 seconds

        this.client = createClient(config)
            .on('error', (e) => {
                console.error('Redis Client Error:', e);
                this._handleConnectionError(e);
            })
            .on('connect', () => {
                console.log('Redis Client Connected.', `Config: ${JSON.stringify(config)}`);
                this.connectionRetries = 0;
                this.isConnecting = false;
            })
            .on('reconnect', () => {
                console.log('Redis Client Reconnected');
                this.connectionRetries = 0;
                this.isConnecting = false;
            })
            .on('ready', () => {
                console.log('Redis Client Ready');
                this.connectionRetries = 0;
                this.isConnecting = false;
            })
            .on('end', () => {
                console.log('Redis Client Connection Closed');
                this.isConnecting = false;
            });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await this.quit();
            process.exit(0);
        });

        this.init();
    }

    /**
     * Handle connection errors and attempt recovery
     */
    _handleConnectionError(error) {
        if (
            error.code === 'EPIPE' ||
            error.code === 'ECONNRESET' ||
            error.code === 'CONNECTION_BROKEN'
        ) {
            console.log('Redis connection broken, attempting recovery...');
            this._recoverConnection();
        }
    }

    /**
     * Recover broken connection
     */
    async _recoverConnection() {
        if (this.isConnecting || this.connectionRetries >= this.MAX_RETRIES) {
            return;
        }

        this.isConnecting = true;
        this.connectionRetries++;

        try {
            console.log(
                `Attempting Redis connection recovery (${this.connectionRetries}/${this.MAX_RETRIES})`
            );

            // Force disconnect if client exists
            if (this.client) {
                try {
                    await this.client.disconnect();
                } catch (disconnectError) {
                    // Ignore disconnect errors during recovery
                }
            }

            // Reconnect with delay
            await new Promise((resolve) => setTimeout(resolve, 1000 * this.connectionRetries));
            await this.client.connect();

            console.log('Redis connection recovered successfully');
            this.connectionRetries = 0;
        } catch (recoveryError) {
            console.error('Redis connection recovery failed:', recoveryError.message);

            if (this.connectionRetries < this.MAX_RETRIES) {
                // Retry with exponential backoff
                setTimeout(() => this._recoverConnection(), 5000 * this.connectionRetries);
            } else {
                console.error('Max Redis connection recovery attempts reached');
                this.isConnecting = false;
            }
        }
    }

    /**
     * Ensure Redis connection is active
     */
    async _ensureConnection() {
        if (!this.client) {
            throw new Error('Redis client not initialized');
        }

        if (!this.client.isOpen && !this.isConnecting) {
            await this.init();
        }

        // Additional health check - ping the server
        try {
            if (this.client.isOpen) {
                await this.client.ping();
            }
        } catch (error) {
            console.log('Redis ping failed, connection may be broken');
            await this._recoverConnection();
        }
    }

    async init() {
        //SIDENOTE this may be ridiculous attempting to deside in what state the interface may IN FACT accept commands.
        //SIDENOTE socket creation is synchronious as well as connection launching, but connection readiness is async;
        //SIDENOTE also the protocol command queue gets ready asynchroniously too.
        //SIDENOTE should one wait for client to be "connected"? no need for await -- it's sync.
        //SIDENOTE should one wait for client to be "ready to accept commands"? it's sync and commands are queued.
        //SIDENOTE should one wait for client to be "ready to process commands"? it's async...
        //SIDENOTE so GENERALLY for proper client library there's no need to await for this.client.connect(),
        //SIDENOTE therefore no need to await for result of this.init() -- the function may be sync.
        //SIDENOTE but better NOT to do so -- due to compatibility with other caching mechanics implementation.

        if (this.isConnecting) {
            // Wait for ongoing connection attempt
            await new Promise((resolve) => setTimeout(resolve, 100));
            return this._ensureConnection();
        }

        if (!this.client?.isOpen) {
            this.isConnecting = true;
            try {
                await this.client.connect();
            } finally {
                this.isConnecting = false;
            }
        }
    }

    /**
     * @param {string} key
     * @returns {Promise<any>}
     */
    async get(key) {
        await this.init();

        const metaData = await this.client.get(`${this.PREFIX}:${this.HASH_PREFIX}${key}:meta`);
        if (metaData) {
            return await this._getLargeArray(key, JSON.parse(metaData));
        }

        const value = await this.client.get(`${this.PREFIX}:${key}`);
        return this._deserialize(value);
    }

    /**
     * @param {string} key
     * @param {any} value
     */
    async set(key, value, options = {}) {
        if (typeof value === 'undefined') return;

        const { ttl = 1000 * 60 * 60 * 24 } = options;

        await this.init();

        if (Array.isArray(value) && value.length > this.MAX_ARRAY_SIZE) {
            await this._setLargeArray(key, value, ttl);
        } else {
            await this._setPrimitive(key, value, ttl);
        }
    }

    /**
     * @param {string | string[] | RegExp} key
     */
    async del(key) {
        await this.init();

        if (key instanceof RegExp) {
            let cleaned = 0;
            for await (const _key of this.client.scanIterator({ MATCH: `${this.PREFIX}:*` })) {
                if (key.test(_key.slice(this.PREFIX.length + 1))) {
                    cleaned += await this.client.del(_key);
                }
            }
            return cleaned;
        }

        return this._del(key);
    }

    async _del(key) {
        const metaKey = `${this.PREFIX}:${this.HASH_PREFIX}${key}:meta`;
        const metaData = await this.client.get(metaKey);

        if (metaData) {
            const { totalChunks } = JSON.parse(metaData);
            const pipeline = this.client.multi();

            pipeline.del(metaKey);
            for (let i = 0; i < totalChunks; i++) {
                pipeline.del(`${this.PREFIX}:${this.HASH_PREFIX}${key}:chunk:${i}`);
            }

            await pipeline.exec();

            // TODO: Whats return pipeline?
            return 1;
        } else {
            return this.client.del(`${this.PREFIX}:${key}`);
        }
    }

    async _setPrimitive(key, value, ttl) {
        const serializedValue = this._serialize(value);

        const options = ttl ? { PX: ttl } : {};
        await this.client.set(`${this.PREFIX}:${key}`, serializedValue, options);
    }

    async _yieldToEventLoop() {
        return new Promise((resolve) => setImmediate(resolve));
    }

    async _setLargeArray(key, array, ttl) {
        const totalChunks = Math.ceil(array.length / this.CHUNK_SIZE);

        const metaData = {
            type: 'array',
            length: array.length,
            chunkSize: this.CHUNK_SIZE,
            totalChunks: totalChunks,
            createdAt: new Date().toISOString(),
        };

        await this.client.set(
            `${this.PREFIX}:${this.HASH_PREFIX}${key}:meta`,
            JSON.stringify(metaData)
        );
        if (ttl) await this.client.pExpire(`${this.PREFIX}:${this.HASH_PREFIX}${key}:meta`, ttl);

        const chunkPromises = [];
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            chunkPromises.push(this._setLargeArrayChunk(key, array, chunkIndex, ttl));

            if (chunkPromises.length >= this.BATCH_CONCURRENCY) {
                await Promise.all(chunkPromises);
                chunkPromises.length = 0;
                await this._yieldToEventLoop();
            }
        }

        if (chunkPromises.length > 0) {
            await Promise.all(chunkPromises);
        }
    }

    async _setLargeArrayChunk(key, array, chunkIndex, ttl) {
        const start = chunkIndex * this.CHUNK_SIZE;
        const end = Math.min(start + this.CHUNK_SIZE, array.length);
        const chunk = array.slice(start, end);

        const fieldValuePairs = [];
        chunk.forEach((item, index) => {
            const fieldKey = String(start + index);
            const fieldValue = JSON.stringify(item);
            fieldValuePairs.push(fieldKey, fieldValue);
        });

        if (fieldValuePairs.length > 0) {
            const hashKey = `${this.PREFIX}:${this.HASH_PREFIX}${key}:chunk:${chunkIndex}`;
            await this.client.hSet(hashKey, fieldValuePairs);
            if (ttl) await this.client.pExpire(hashKey, ttl);
        }
    }

    _batches(totalChunks, batchSize) {
        const batches = [];

        for (let i = 0; i < totalChunks; i += batchSize) {
            const batch = [];
            for (let j = i; j < Math.min(i + batchSize, totalChunks); j++) {
                batch.push(j);
            }
            batches.push(batch);
        }

        return batches;
    }

    _merge(result, chunkResults) {
        for (const { data } of chunkResults) {
            for (const [fieldKey, fieldValue] of Object.entries(data)) {
                const index = parseInt(fieldKey, 10);
                if (index >= 0 && index < result.length && fieldValue) {
                    try {
                        result[index] = JSON.parse(fieldValue);
                    } catch (e) {
                        console.warn(`Failed to parse value at index ${index}:`, e);
                        result[index] = null;
                    }
                }
            }
        }
    }

    async _getLargeArray(key, metadata) {
        const { length, totalChunks } = metadata;
        const result = new Array(length);

        const chunkBatches = this._batches(totalChunks, this.BATCH_CONCURRENCY);

        for (const batch of chunkBatches) {
            const promises = batch.map(async (chunkIndex) => {
                const data = await this.client.hGetAll(
                    `${this.PREFIX}:${this.HASH_PREFIX}${key}:chunk:${chunkIndex}`
                );

                return { chunkIndex, data };
            });

            const chunkResults = await Promise.all(promises);

            this._merge(result, chunkResults);

            await this._yieldToEventLoop();
        }

        return result;
    }

    /**
     * Gracefully shutdown Redis connection
     */
    async quit() {
        try {
            if (this.client?.isOpen) {
                await this.client.quit();
            }
        } catch (error) {
            console.error('Error during Redis shutdown:', error);
            // Force disconnect if quit fails
            try {
                await this.client.disconnect();
            } catch (disconnectError) {
                // Ignore disconnect errors during shutdown
            }
        }
    }

    _serialize(value) {
        if (typeof value === 'string' || Buffer.isBuffer(value)) return value;
        if (value == null) return null;
        return JSON.stringify(value);
    }

    _deserialize(value) {
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }
}

module.exports = new RedisMemory();
