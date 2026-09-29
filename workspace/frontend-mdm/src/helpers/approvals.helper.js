import $api from './axios';

const $approvals = {
    createProcess: (objectInfo, processId, callback = undefined) => {
        const body = {
            typeObject: objectInfo.type,
            object: objectInfo.id,
            process: processId,
            context: objectInfo?.context ?? {},
        };
        return $api
            .post('/process/', body)
            .then(async (res) => {
                if (callback) await callback(res);
            })
            .catch((err) => {
                console.log(err);
            });
    },

    startProcess: (processId, callback = undefined) =>
        $api
            .put(`/process/${processId}/start`, {})
            .then((res) => {
                if (callback) callback(res);
            })
            .catch((err) => {
                console.log(err);
            }),

    taskAnswer: (taskId, callback = undefined) =>
        $api
            .put(`/process/${taskId}/answer`, { answer: 'test' })
            .then((res) => {
                console.log(res);
                if (callback) callback(res);
            })
            .catch((err) => {
                console.log(err);
            }),

    getServerProcess: (processId, callback = undefined) => {
        $api.get(`/process/${processId}`)
            .then((res) => {
                if (callback) callback(res);
            })
            .catch((err) => {
                console.log(err);
            });
    },

    getServerTask: (taskId, callback = undefined) => {
        $api.get(`/process/${taskId}/task`)
            .then((res) => {
                if (callback) callback(res);
            })
            .catch((err) => {
                console.log(err);
            });
    },

    resetProcess: () => {
        // defaultSchema
    },
};

export default $approvals;
