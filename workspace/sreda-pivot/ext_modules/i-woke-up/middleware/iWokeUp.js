const esbApi = require('../../../core/services/esb-api');

const SendMessageToESB = () => {
    esbApi
        .axios()
        .post(
            `/esbservice/worker/${process.env.ESB_NAME}`,
            { ext_modules: Object.keys(sreda.versions) },
            { headers: { Origin: process.env.HOST } }
        )
        .then((response) => response)
        .catch((error) => {
            console.error(
                `Не удалось подключиться к esb причина: ${error?.message}`
            );
            return error.response;
        });
};

SendMessageToESB();

module.exports = (req, res, next) => {
    next();
};
