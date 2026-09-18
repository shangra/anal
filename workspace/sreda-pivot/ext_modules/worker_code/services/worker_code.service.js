const { Worker, SHARE_ENV, isMainThread, parentPort, workerData } = require('node:worker_threads');

class worker_codeService {
    constructor(fileOrCode) {
        this.file = fileOrCode;
    }

    run(func, ...args) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(this.file, { workerData: { func, args } });
            worker.on('message', (result) => {
                if (result.error) {
                    reject(result.error);
                } else {
                    resolve(result);
                }
            });
            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
            });
        });
    }

    //НЕ ПРОВЕРЕНО НА РАБОТОСПОСОБНОСТЬ
    start(code, ...args) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(this.file, {
                workerData: { func, args },
                eval: true,
                env: SHARE_ENV,
            });
            worker.on('message', resolve);
            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
            });
        });
    }
}

module.exports = worker_codeService;
