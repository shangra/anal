/*
Вот пример тестов для модуля `MetaQueryExplainService` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/MetaQueryExplainService.test.js` следующего содержания:


Эти тесты покрывают основные методы класса `MetaQueryExplainService`: получение объяснений запросов, метаданных, удаление записей, а также работу методов инициализации профилирования и добавления сообщений консоли. Тесты используют мокирование зависимостей через `jest.spyOn()` и проверяют ожидаемое поведение каждого метода.
*/

const MetaQueryExplainService = require('../../services/MetaQueryExplainService');
const ExplainRequest = require('../../services/models/ExplainRequest.model');
const ExplainRequestMeta = require('../../services/models/ExplainRequestMeta.model');
const httpContext = require('../../core/services/http-context');

let service;
beforeEach(() => {
    service = new MetaQueryExplainService();
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('MetaQueryExplainService', () => {
    
    describe('get method', () => {
        test('should retrieve explain request by ID', async () => {
            const mockData = { id: 1, answerId: 1, plan: '{}' };
            
            jest.spyOn(ExplainRequest, 'get').mockResolvedValue(mockData);
        
            const result = await service.get(1);
        
            expect(result).toEqual(mockData);
            expect(ExplainRequest.get).toHaveBeenCalledWith(1);
        });
    });

    describe('getMeta method', () => {
        test('should retrieve and transform explain request metadata', async () => {
            const mockData = { dataValues: { id: 1, answerId: 1, meta: '{"key":"value"}' }};
            
            jest.spyOn(ExplainRequestMeta, 'get').mockResolvedValue(mockData.dataValues);
        
            const result = await service.getMeta(1);
        
            expect(result.id).toEqual(1);
            expect(result.answerId).toEqual(1);
            expect(result.meta).toEqual(JSON.parse(mockData.dataValues.meta));
            expect(ExplainRequestMeta.get).toHaveBeenCalledWith(1);
        });
    });

    describe('del method', () => {
        test('should delete explain request by ID', async () => {
            const mockResponse = { success: true };
            
            jest.spyOn(ExplainRequest, 'del').mockResolvedValue(mockResponse);
        
            const result = await service.del(1);
        
            expect(result).toEqual(mockResponse);
            expect(ExplainRequest.del).toHaveBeenCalledWith(1);
        });
    });

    describe('init method', () => {
        test('should initialize profiling when explain flag is set', async () => {
            const inner = jest.fn();
            const original = jest.fn().mockReturnValue(Promise.resolve());
            const fargs = {
                result: { answerId: 1 },
                id: 1,
                params: { explain: true },
                options: {}
            };

            await service.init(inner, fargs, original);

            expect(httpContext.set).toHaveBeenCalledWith('explain', { answerId: 1, steps: [] });
            expect(original).toHaveBeenCalled();
        });

        test('should not initialize profiling when explain flag is missing', async () => {
            const inner = jest.fn();
            const original = jest.fn().mockReturnValue(Promise.resolve());
            const fargs = {
                result: { answerId: 1 },
                id: 1,
                params: {},
                options: {}
            };

            await service.init(inner, fargs, original);

            expect(httpContext.set).not.toHaveBeenCalled();
            expect(original).toHaveBeenCalled();
        });
    });

    describe('addConsole method', () => {
        test('should log console messages during profiling', async () => {
            const innerResult = {};
            const originalMethod = jest.fn().mockReturnValue(Promise.resolve());
            const functionParams = { msg: 'Test Message', meta: { key: 'value' } };

            jest.spyOn(httpContext, 'get').mockReturnValue({ answerId: 1, steps: [] });

            await service.addConsole(innerResult, functionParams, originalMethod);

            expect(originalMethod).toHaveBeenCalled();
            expect(httpContext.get).toHaveBeenCalledWith('explain');
        });

        test('should ignore logging without active profiling', async () => {
            const innerResult = {};
            const originalMethod = jest.fn().mockReturnValue(Promise.resolve());
            const functionParams = { msg: 'Test Message', meta: { key: 'value' } };

            jest.spyOn(httpContext, 'get').mockReturnValue(null);

            await service.addConsole(innerResult, functionParams, originalMethod);

            expect(originalMethod).toHaveBeenCalled();
            expect(httpContext.get).not.toHaveBeenCalled();
        });
    });
});
