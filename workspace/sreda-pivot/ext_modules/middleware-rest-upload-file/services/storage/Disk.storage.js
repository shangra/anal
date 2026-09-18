// TODO: ОЧЕНЬ ГРЯЗНЫЙ ХАК, ЧТОБЫ РАСШИРИТЬ multer.diskStorage
// СКОПИРОВАНО ИЗ node_modules/multer/storage/disk.js

var fs = require('fs');
var os = require('os');
var path = require('path');
var crypto = require('crypto');
var mkdirp = require('mkdirp');

/** @import { ChunkStorageEngine } from './types' */

function getFilename(req, file, cb) {
    crypto.randomBytes(16, function (err, raw) {
        cb(err, err ? undefined : raw.toString('hex'));
    });
}

function getDestination(req, file, cb) {
    cb(null, os.tmpdir());
}

/**
 * @implements {ChunkStorageEngine}
 * @class DiskStorage
 * @constructor DiskStorage
 */
function DiskStorage(opts) {
    this.getFilename = opts.filename || getFilename;

    if (typeof opts.destination === 'string') {
        mkdirp.sync(opts.destination);
        this.getDestination = function ($0, $1, cb) {
            cb(null, opts.destination);
        };
    } else {
        this.getDestination = opts.destination || getDestination;
    }
}

DiskStorage.prototype.stat = function stat(req, filename, cb) {
    const that = this;

    that.getDestination(req, null, function (err, destination) {
        if (err) return cb(err);

        const _path = path.join(destination, filename);

        fs.stat(_path, (err, stats) => {
            if (err) return cb(err);

            cb(null, {
                destination: destination,
                filename: filename,
                path: _path,
                size: stats.size,
            });
        });
    });
};

DiskStorage.prototype.list = function list(req, pattern, cb) {
    const that = this;

    that.getDestination(req, null, function (err, destination) {
        if (err) return cb(err);

        const regexp = new RegExp(pattern);
        fs.readdir(destination, (err, files) => {
            if (err) return cb(err);

            files = files
                .filter((file) => regexp.test(file))
                .sort((a, b) => {
                    const [aIndex] = a.split('_');
                    const [bIndex] = b.split('_');
                    return Number(aIndex) - Number(bIndex);
                });

            cb(null, files);
        });
    });
};

DiskStorage.prototype.read = function read(req, filename, cb) {
    const that = this;

    that.stat(req, filename, function (err, stat) {
        if (err) return cb(err);

        fs.readFile(stat.path, cb);
    });
};

DiskStorage.prototype.del = function del(req, filename, cb) {
    const that = this;

    that.stat(req, filename, function (err, stat) {
        if (err) return cb(err);

        fs.unlink(stat.path, cb);
    });
};

DiskStorage.prototype._handleFile = function _handleFile(req, file, cb) {
    var that = this;

    that.getDestination(req, file, function (err, destination) {
        if (err) return cb(err);

        that.getFilename(req, file, function (err, filename) {
            if (err) return cb(err);

            var finalPath = path.join(destination, filename);
            var outStream = fs.createWriteStream(finalPath);

            file.stream.pipe(outStream);
            outStream.on('error', cb);
            outStream.on('finish', function () {
                cb(null, {
                    destination: destination,
                    filename: filename,
                    path: finalPath,
                    size: outStream.bytesWritten,
                });
            });
        });
    });
};

DiskStorage.prototype._removeFile = function _removeFile(req, file, cb) {
    var path = file.path;

    delete file.destination;
    delete file.filename;
    delete file.path;

    fs.unlink(path, cb);
};

/**
 * @returns {ChunkStorageEngine}
 */
module.exports = function (opts) {
    return new DiskStorage(opts);
};
