const axios = require('axios');
const fetchPolifil = require('cross-fetch'); //в node.js 22 версии cross-fetch перестает работать
// const fetchPolifil = fetch ?? require('cross-fetch');
const https = require('https');
const { readFileSync } = require('fs');

let httpsAgent;

const {
    CHECK_CERT,
    CLIENT_CA,
    SERVER_KEY,
    SERVER_CERT,
    SERVER_CA,
    REJECT_UNAUTH = false,
} = process.env;
let protocol = 'http';

if (
    CHECK_CERT === 'true' &&
    SERVER_KEY !== undefined &&
    SERVER_CERT !== undefined &&
    SERVER_CA !== undefined
) {
    protocol += 's';
}

if (CHECK_CERT === 'true' && CLIENT_CA !== undefined) {
    const options = {
        key: readFileSync(SERVER_KEY),
        cert: readFileSync(SERVER_CERT),
        ca: readFileSync(CLIENT_CA),
        requestCert: true,
        rejectUnauthorized: REJECT_UNAUTH === 'true',
    };
    httpsAgent = new https.Agent(options);
}

const sameOptions = {
    headers: {
        Host: process.env.ESB_HOST,
        origin: `${protocol}://${process.env.HOST}`,
        NOSUDIR: 'true', // TODO: костыль для wrapper
    },
    httpsAgent,
    agent: httpsAgent,
};

class esbApi {
    constructor() {
        // Иногда теряется контекс this, поэтому забиндим, но по хорошему нужно разбираться в коде почему
        this.simpleFetch = this.simpleFetch.bind(this);
        this.fetch = this.fetch.bind(this);
    }

    prepareBody(body) {
        if (typeof body === 'string' || Buffer.isBuffer(body)) {
            return body;
        }
        if (body === undefined) {
            return undefined;
        }
        if (typeof body?.getBoundary === 'function') {
            return body;
        }
        return JSON.stringify(body);
    }

    getAgent(options) {
        let agent = httpsAgent;
        if (options?.agent) {
            const opt = {
                requestCert: options.agent?.requestCert ?? true,
                rejectUnauthorized: options.agent?.rejectUnauthorized ?? true, // Вот эта строка отключает проверку
            };

            if (options.agent?.server_key)
                opt.key = readFileSync(options.agent?.server_key);
            if (options.agent?.server_cert)
                opt.cert = readFileSync(options.agent?.server_cert);
            if (options.agent?.client_ca)
                opt.ca = readFileSync(options.agent?.client_ca);

            agent = new https.Agent(opt);
        }
        return agent;
    }

    axios() {
        return axios.create({
            baseURL: `${protocol}://${process.env.ESB_HOST}`,
            ...sameOptions,
        });
    }

    async fetch(inputUrl, options) {
        let url = inputUrl;
        const opt = {
            ...sameOptions,
            ...options,
            agent: this.getAgent(options),
            body: this.prepareBody(options.body),
        };

        const res = await fetchPolifil(
            `${protocol}://${process.env.ESB_HOST}${url}`,
            opt
        );
        return res;
    }

    async simpleFetch(inputUrl, options) {
        let url = inputUrl;
        if (protocol === 'https' && url.slice(0, 5) !== 'https') {
            url = url.replace('http://', 'https://');
        }

        const agent = this.getAgent(options);
        const opt = {
            ...sameOptions,
            ...options,
            httpsAgent: agent,
            agent: agent,
            body: this.prepareBody(options.body),
        };

        if (options.agent) url = url.replace('http://', 'https://');

        const res = await fetchPolifil(url, opt);

        return res;
    }
}

module.exports = new esbApi(); //один на сервис
