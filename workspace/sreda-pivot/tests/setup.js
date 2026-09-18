const supertest = require('supertest');
const path = require('node:path');

jest.mock('../ext_modules'/* , () => jest.requireActual('../ext_modules/__mocks__') */);
jest.mock('../ext_modules/rest'/* , () => jest.requireActual('../ext_modules/__mocks__/rest') */);
jest.mock('../ext_modules/services'/* , () => jest.requireActual('../ext_modules/__mocks__/services') */);
jest.mock('../ext_modules/models'/* , () => jest.requireActual('../ext_modules/__mocks__/models') */);

require('../core');

Object.keys(sreda.versions).forEach((moduleName) => {
    const spath = path.join('..', 'ext_modules', moduleName, '__tests__', 'setup.js');
    try {
        require(spath);
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
            console.error(e);
        }
    }
})

agent = supertest.agent(sreda.restmodule.router);