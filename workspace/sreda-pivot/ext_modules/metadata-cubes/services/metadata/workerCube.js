const { workerData, parentPort } = require('node:worker_threads');

require('../../../../core');

const exInfoservicesClass = require('../../../metadata-infoservice/services/metadata/Infoservice.class');

// Тут, асинхронно, не блокируя главный поток,
// можно выполнять тяжёлые вычисления.

class helperWorker {
    static async read(args) {
        const InfoserviceGUID = args[0];
        const options = args[1];
        const metaId = new exInfoservicesClass({ InfoserviceGUID });
        const result = await metaId.read(InfoserviceGUID, options);
        return result;
    }
}

// const func = workerData.func;
// helperWorker[func](workerData.args)
//     .then((result) => {
//         parentPort.postMessage(result);
//     })
//     .catch((error) => {
//         parentPort.postMessage({ error });
//         throw error;
//     });
