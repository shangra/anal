const WrapperService = require('../../services/wrapper.service');
const path = require('node:path');

describe('WrapperService', () => {
    let wrapperService;

    beforeEach(() => {
        wrapperService = new WrapperService();
    });

    test('findService should resolve with true when a valid local service is found', async () => {
        jest.spyOn(path, 'join').mockReturnValueOnce('valid/path/to/service');

        const servicePathArray = ['some', 'path'];
        const serviceName = 'service.js';

        jest.mock('valid/path/to/service', () => {}, { virtual: true });

        const result = await wrapperService.findService(
            servicePathArray,
            serviceName
        );
        expect(result).toBe(true);
    });

    test('findService should resolve with false when no local service is found', async () => {
        jest.spyOn(path, 'join').mockReturnValueOnce('invalid/path/to/service');

        const servicePathArray = ['some', 'path'];
        const serviceName = 'nonexistent-service.js';

        jest.unmock('invalid/path/to/service');

        const result = await wrapperService.findService(
            servicePathArray,
            serviceName
        );
        expect(result).toBe(false);
    });

    test('getFunctionResult should always call local post', async () => {
        jest.spyOn(wrapperService, 'post').mockResolvedValueOnce({
            result: 'local',
        });

        const params = [['some', 'path'], [], 'method', []];

        const result = await wrapperService.getFunctionResult(...params);
        expect(result).toEqual({ result: 'local' });
        expect(wrapperService.post).toHaveBeenCalledTimes(1);
    });

    test('post method should work as expected', async () => {
        const localPath = path.join('..', '..', 'some', 'path', 'service.js');
        const ModuleClassMock = jest.fn().mockImplementation(() => ({
            someMethod: jest.fn().mockResolvedValue('resolved'),
        }));

        jest.mock(localPath, () => ModuleClassMock, { virtual: true });

        const body = {
            servicePathArray: ['some', 'path'],
            serviceName: 'service.js',
            constructorArgumentsList: [],
            functionName: 'someMethod',
            functionArgumentsList: [],
        };

        const result = await wrapperService.post('from', 'service', body);
        expect(result).toBe('resolved');
    });
});