const concat = require('concat-stream');
const crypto = require('crypto');

const { createClient } = require('redis');

/** @import { ChunkStorageEngine } from './types' */

function getFilename(req, file, cb) {
    crypto.randomBytes(16, function (err, raw) {
        cb(err, err ? undefined : raw.toString('hex'));
    });
}

/**
 * @implements {ChunkStorageEngine}
 * @class RedisStorage
 * @constructor RedisStorage
 * @param {{
 *   prefix?: string;
 *   ttl?: number;
 *   filename?: (req, file, cb) => void;
 *   client: import('redis').RedisClientOptions<import('redis').RedisModules, import('redis').RedisFunctions, import('redis').RedisScripts>;
 *   retryAttempt?: 50;
 *   retryTime?: 5000 ;
 * }} opts
 */
function RedisStorage(opts) {
    this.prefix = opts.prefix || 'upload';
    this.ttl = opts.ttl || 10 * 60 * 1000;
    this.getFilename = opts.filename || getFilename;

    /** @type {import('redis').RedisClientOptions["socket"]["reconnectStrategy"]} */
    const reconnectStrategy = (retries) =>
        retries <= (opts.retryAttempt || 50) ? opts.retryTime || 5000 : false;

    this.client = createClient({
        ...opts.client,
        socket: { ...(opts.client.socket ?? {}), reconnectStrategy },
    })
        .on('error', (e) => console.error('multer', 'Redis Client Error', e))
        .on('connect', () => console.log('multer', 'Redis Client Connected', opts.client))
        .on('reconnect', () => console.log('multer', 'Redis Client Reconnected'))
        .on('ready', () => console.log('multer', 'Redis Client Ready'));
}

RedisStorage.prototype._getClient = function _getClient(req, file, cb) {
    if (!this.client.isOpen) {
        this.client
            .connect()
            .then((client) => cb(null, client))
            .catch(cb);
    } else {
        cb(null, this.client);
    }
};

RedisStorage.prototype.stat = function stat(req, filename, cb) {
    const that = this;

    that._getClient(req, null, function (err, client) {
        if (err) return cb(err);

        client
            .strLen(`${that.prefix}:${filename}`)
            .then((size) =>
                cb(null, {
                    filename,
                    size,
                })
            )
            .catch(cb);
    });
};

RedisStorage.prototype.list = function list(req, pattern, cb) {
    const that = this;

    that._getClient(req, null, function (err, client) {
        if (err) return cb(err);

        const regexp = new RegExp(pattern);

        client
            .keys(`${that.prefix}:*`)
            .then((keys) =>
                cb(
                    null,
                    keys
                        .filter((key) => regexp.test(key))
                        .map((key) => key.split(':').slice(1).join(':'))
                )
            )
            .catch(cb);
    });
};

RedisStorage.prototype.read = function read(req, filename, cb) {
    const that = this;

    that._getClient(req, null, function (err, client) {
        if (err) return cb(err);

        client
            .get(client.commandOptions({ returnBuffers: true }), `${that.prefix}:${filename}`)
            .then((buffer) => cb(null, buffer))
            .catch(cb);
    });
};

RedisStorage.prototype.del = function del(req, filename, cb) {
    const that = this;

    that._getClient(req, null, function (err, client) {
        if (err) return cb(err);

        client
            .del(`${that.prefix}:${filename}`)
            .then(() => cb(null))
            .catch(cb);
    });
};

RedisStorage.prototype._handleFile = function _handleFile(req, file, cb) {
    const that = this;

    that._getClient(req, file, function (err, client) {
        if (err) return cb(err);

        that.getFilename(req, file, function (err, filename) {
            if (err) return cb(err);

            file.stream.pipe(
                concat({ encoding: 'buffer' }, (data) => {
                    client
                        .set(`${that.prefix}:${filename}`, data, { PX: that.ttl })
                        .then(() =>
                            cb(null, {
                                filename,
                                buffer: data,
                                size: data.length,
                            })
                        )
                        .catch(cb);
                })
            );
        });
    });
};

RedisStorage.prototype._removeFile = function _removeFile(req, file, cb) {
    const that = this;

    that._getClient(req, file, function (err, client) {
        if (err) return cb(err);

        client
            .del(`${that.prefix}:${file.filename}`)
            .then(() => cb(null))
            .catch(cb);
    });
};

/**
 * @param {{
 *   prefix?: string;
 *   ttl?: number;
 *   filename?: (req, file, cb) => void;
 *   client: import('redis').RedisClientOptions<import('redis').RedisModules, import('redis').RedisFunctions, import('redis').RedisScripts>;
 *   retryAttempt?: 50;
 *   retryTime?: 5000 ;
 * }} opts
 * @returns {ChunkStorageEngine}
 */
module.exports = function (opts) {
    return new RedisStorage(opts);
};
