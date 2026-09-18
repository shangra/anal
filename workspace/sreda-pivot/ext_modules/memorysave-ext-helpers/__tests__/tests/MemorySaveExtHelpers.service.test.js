/*
Вот пример тестов для класса `MemorySaveExtHelpersService` с использованием библиотеки Jest:


Эти тесты покрывают основные сценарии поведения методов `getUserRoles()` и `getCache()` класса `MemorySaveExtHelpersService`.
*/

// __tests__/tests/MemorySaveExtHelpers.service.test.js

const MemorySaveExtHelpersService = require('../../services/MemorySaveExtHelpers.service');
const httpContext = require('../../../core/services/http-context');

jest.mock('../../../core/services/http-context');

describe('MemorySaveExtHelpersService', () => {
    
    beforeEach(() => {
        jest.clearAllMocks(); // Очистить мокнутые значения перед каждым тестом
    });

    test('getUserRoles возвращает ID пользователя из сессии', async () => {
        // Подготавливаем моки
        const userId = 'some-user-id';
        httpContext.get.mockReturnValueOnce({ user: { id: userId } });
        
        // Создаем экземпляр сервиса
        const memorySaveExtHelpersService = new MemorySaveExtHelpersService();
        
        // Проверяем результат метода
        const roles = await memorySaveExtHelpersService.getUserRoles();
        expect(roles).toEqual(userId); // ожидаем получить именно этот ID
    });

    test('getCache возвращает кэшированное значение, когда кеш включен', async () => {
        // Подготавливаем моки
        const key = 'cache-key';
        const innerResult = { cachedData: 'cached' };
        const originalMethodMock = jest.fn().mockResolvedValue(innerResult);
        
        // Создаем экземпляр сервиса
        const memorySaveExtHelpersService = new MemorySaveExtHelpersService();
        
        // Вызываем метод
        const result = await memorySaveExtHelpersService.getCache(
            innerResult,
            { key },
            originalMethodMock
        );
        
        // Проверяем результаты
        expect(result).toEqual(innerResult); // ожидание совпадения результата
        expect(originalMethodMock).toHaveBeenCalledWith(key); // проверяем вызов оригинального метода
    });

    test('getCache не возвращает ничего, когда кеш отключен через переменную окружения', async () => {
        process.env.DISABLE_OVERRITE_CACHE = 'true'; // имитируем отключение кеша через переменные окружения
        
        // Подготавливаем моки
        const key = 'cache-key';
        const innerResult = { cachedData: 'cached' };
        const originalMethodMock = jest.fn().mockResolvedValue(innerResult);
        
        // Создаем экземпляр сервиса
        const memorySaveExtHelpersService = new MemorySaveExtHelpersService();
        
        // Вызываем метод
        const result = await memorySaveExtHelpersService.getCache(
            innerResult,
            { key },
            originalMethodMock
        );
        
        // Проверяем результаты
        expect(result).toBeNull(); // ожидаемый результат должен быть null
        expect(originalMethodMock).not.toHaveBeenCalled(); // оригинальный метод не должен быть вызван
        
        // Восстанавливаем состояние переменных окружения
        delete process.env.DISABLE_OVERRITE_CACHE;
    });
});
