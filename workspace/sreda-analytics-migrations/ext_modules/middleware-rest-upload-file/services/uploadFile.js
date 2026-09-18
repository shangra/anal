const multer = require('multer');
const path = require('path');
const { Readable } = require('stream');

const httpContext = require('../../../core/services/http-context');

const UPLOAD_DIR = path.resolve(sreda.env.VAR, sreda.env.UPLOAD_DIR ?? 'uploads');
const FILE_SIZE_LIMIT = sreda.env.FILE_SIZE_LIMIT ?? 50 * 1024 * 1024;

/** @import { ChunkStorageEngine } from './storage/types' */

const diskStorage = require('./storage/Disk.storage');
const redisStorage = require('./storage/Redis.storage');

const REDIS_CLIENT = sreda.env.REDIS_MULTER_CLIENT ?? sreda.env.REDIS_CLIENT;

const filename = function filename(req, file, cb) {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${file.originalname}__${Date.now()}`);
};

/** @type {ChunkStorageEngine} */
const storage = REDIS_CLIENT
    ? redisStorage({
          client: REDIS_CLIENT,
          prefix: sreda.env.UPLOAD_DIR,
          ttl: sreda.env.UPLOAD_TTL,
          filename,
      })
    : diskStorage({ destination: UPLOAD_DIR, filename });

const upload = multer({ storage, limits: { fileSize: FILE_SIZE_LIMIT } }).single('upload');

module.exports = function uploadFile(req, res, next) {
    console.log('uploadFile');

    httpContext.ns.bindEmitter(req);
    httpContext.ns.bindEmitter(res);

    upload(req, res, async (err) => {
        if (err) {
            return res.status(415).json({ message: err?.message ?? 'Что-то пошло не так......' });
        }

        const { splitId, splitDownload } = req.query;

        if (splitDownload) {
            // если общий размер загруженных чанков превышает лимит, удаляем файлы и выбрасываем исключение
            const [, chunkSplitId] = req.file.filename.split('_');

            const filenames = await new Promise((resolve, reject) => {
                storage.list(req, chunkSplitId, (err, filenames) => {
                    if (err) return reject(err);

                    resolve(filenames);
                });
            });

            const stats = await Promise.all(
                filenames.map(
                    (filename) =>
                        new Promise((resolve, reject) => {
                            storage.stat(req, filename, (err, stat) => {
                                if (err) return reject(err);

                                resolve(stat);
                            });
                        })
                )
            );

            const size = stats.reduce((acc, cur) => {
                acc += cur.size;
                return acc;
            }, 0);

            if (size > FILE_SIZE_LIMIT) {
                const promises = stats.map(
                    (stat) =>
                        new Promise((resolve, reject) => {
                            storage.del(req, stat.filename, (err) => {
                                if (err) return reject(err);

                                resolve();
                            });
                        })
                );

                const _ = await Promise.all(promises);

                return res.status(400).json({ message: 'Превышен разрешенный размер файла' });
            }

            console.debug('SPLIT DOWNLOAD');

            return res.json({ result: true });
        }

        if (splitId) {
            console.debug('SPLIT DOWNLOAD FINISHED');

            // из директории загрузки получаем все чанки файла по splitId
            const filenames = (
                await new Promise((resolve, reject) => {
                    storage.list(req, splitId, (err, filenames) => {
                        if (err) return reject(err);

                        resolve(filenames);
                    });
                })
            ).sort((a, b) => {
                const [aIndex] = a.split('_');
                const [bIndex] = b.split('_');
                return Number(aIndex) - Number(bIndex);
            });

            /** @type {Buffer[]} */
            const buffers = await Promise.all(
                filenames.map(
                    (filename) =>
                        new Promise((resolve, reject) => {
                            storage.read(req, filename, (err, buffer) => {
                                if (err) return reject(err);

                                resolve(buffer);

                                storage.del(req, filename, (err) => {
                                    if (err) {
                                        console.error(err);
                                    }
                                });
                            });
                        })
                )
            );

            const file = await new Promise((resolve, reject) => {
                storage._handleFile(
                    req,
                    {
                        ...req.file,
                        stream: Readable.from(buffers),
                    },
                    (err, file) => {
                        if (err) return reject(err);

                        resolve(file);
                    }
                );
            });

            req.file = { ...req.file, ...file };
        }

        next();
    });
};
