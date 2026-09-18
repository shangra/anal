/*
Вот пример тестов для класса `LoggersService` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/Loggers.service.test.js` следующего содержания:


Эти тесты проверяют основные функции класса `LoggersService`: парсинг заголовков и построение лога с различными сценариями.
*/

const LoggersService = require('../../services/Loggers.service');

describe('Loggers Service Test Suite', () => {
    let loggersService;
    
    beforeEach(() => {
        loggersService = new LoggersService();
    });

    test('resHeaderParse should parse headers correctly', async () => {
        const inputHeaders = `
            Content-Type: text/plain
            Cache-Control: no-cache
            X-Powered-By: Express`;
        
        const expectedOutput = {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache',
            'X-Powered-By': 'Express'
        };
        
        const parsedHeaders = await loggersService.resHeaderParse(inputHeaders);
        expect(parsedHeaders).toEqual(expectedOutput);
    });

    test('buildLog returns correct structure', async () => {
        const fakeReq = {
            method: 'GET',
            url: '/api/test',
            originalUrl: '/api/test',
            params: {},
            query: {},
            _startTime: new Date(),
            cookies: {},
            signedCookies: {},
            sessionID: 'fakeSessionID',
            route: { path: '/api/test' },
            headers: {},
            hostname: 'localhost',
            body: {}
        };

        const fakeRes = {
            _header: null,
            statusCode: 200,
            statusMessage: 'OK',
            _startTime: new Date()
        };

        const fakeContext = { traceId: 'fakeTraceId' };

        const logData = await loggersService.buildLog('INFO', fakeReq, fakeRes, {}, '', fakeContext);

        expect(logData.typeMessage).toBe('INFO');
        expect(logData.server).toBe(process.env.ESB_NAME);
        expect(typeof logData.date).toBe('number');
        expect(logData.method).toBe(fakeReq.method);
        expect(logData.url).toBe(fakeReq.url);
        expect(logData.traceId).toBe(fakeContext.traceId);
    });

    test('buildLog handles empty sessionStorage correctly', async () => {
        const fakeReq = {
            method: 'GET',
            url: '/api/test',
            originalUrl: '/api/test',
            params: {},
            query: {},
            _startTime: new Date(),
            cookies: {},
            signedCookies: {},
            sessionID: 'fakeSessionID',
            route: { path: '/api/test' },
            headers: {},
            hostname: 'localhost',
            body: {}
        };

        const fakeRes = {
            _header: null,
            statusCode: 200,
            statusMessage: 'OK',
            _startTime: new Date()
        };

        const fakeContext = { traceId: 'fakeTraceId' };

        const logData = await loggersService.buildLog('INFO', fakeReq, fakeRes, {}, '', fakeContext);

        expect(logData.themes).toEqual({});
        expect(logData.assistants).toEqual({});
        expect(logData.user).toEqual({
            id: undefined,
            login: undefined,
            status: undefined,
            info: undefined,
            rules: undefined,
            roles: undefined,
            groups: undefined
        });
    });

    test('buildLog handles non-JSON response data correctly', async () => {
        const fakeReq = {
            method: 'GET',
            url: '/api/test',
            originalUrl: '/api/test',
            params: {},
            query: {},
            _startTime: new Date(),
            cookies: {},
            signedCookies: {},
            sessionID: 'fakeSessionID',
            route: { path: '/api/test' },
            headers: {},
            hostname: 'localhost',
            body: {}
        };

        const fakeRes = {
            _header: null,
            statusCode: 200,
            statusMessage: 'OK',
            _startTime: new Date()
        };

        const fakeContext = { traceId: 'fakeTraceId' };

        const responseData = 'This is a plain text response';

        const logData = await loggersService.buildLog('INFO', fakeReq, fakeRes, {}, responseData, fakeContext);

        expect(logData.responseJSON).toBe('');
        expect(logData.responseTEXT).toBe(Buffer.from(responseData).toString('base64'));
    });
});
