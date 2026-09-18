const router = sreda.restmodule.Router();
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const url = path.join(__dirname, '../../*/controllers/*.controller.js');
const jDocOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: process.env.SERVICE_NAME,
            version: '1.0.0',
        },
    },
    apis: [url],
};
const openapiSpecification = swaggerJsdoc(jDocOptions);

const DisableTryItOutPlugin = function () {
    return {
        statePlugins: {
            spec: {
                wrapSelectors: {
                    allowTryItOutFor: () => () => false,
                },
            },
        },
    };
};
const DisableAuthorizePlugin = function () {
    return {
        wrapComponents: {
            authorizeBtn: () => () => false,
        },
    };
};

const swaggerOptions = {
    swaggerOptions: {
        validatorUrl: null,
        plugins: [DisableTryItOutPlugin, DisableAuthorizePlugin],
        operationsSorter: 'alpha',
        docExpansion: 'none',
    },
};

router.use('/', swaggerUi.serve, swaggerUi.setup(openapiSpecification, swaggerOptions));

module.exports = router;
