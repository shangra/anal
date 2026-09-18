/*
Вот пример тестов для класса `MemorySaveExtHelpersService`, использующего библиотеку Jest:

Создайте файл `__tests__/tests/MemorySaveExtHelpers.service.test.js` следующего содержания:


Эти тесты проверяют два основных метода класса `MemorySaveExtHelpersService`: `getUserRoles()` и `getCache()`. Первый тест проверяет тип возвращаемого значения методом `getUserRoles()`, второй тест имитирует работу метода `getCache()` с использованием фиктивных параметров и проверяет правильность возврата результата.

Не забудьте установить пакет Jest командой:

npm install --save-dev jest

После установки запустите тесты командой:

npx jest

Это позволит убедиться, что ваш сервис работает ожидаемым образом.
*/

const MemorySaveExtHelpersService = require('../../services/MemorySaveExtHelpers.service');

describe('MemorySaveExtHelpersService', () => {
    
    test('Тест метода getUserRoles', async () => {
        const memorySaveExtHelperService = new MemorySaveExtHelpersService();
        
        // Проверить результат ожидаемого значения
        const roles = await memorySaveExtHelperService.getUserRoles();
        expect(typeof roles).toEqual('string');
    });

    test('Тест метода getCache', async () => {
        const memorySaveExtHelperService = new MemorySaveExtHelpersService();
        
        // Создаем фиктивные параметры для тестирования
        const innerResult = { key: 'value' };
        const functionParams = ['param1', 'param2'];
        const originalMethod = jest.fn(() => ({ cachedData: 'cachedValue' }));

        // Тестируем работу метода
        const cacheResult = await memorySaveExtHelperService.getCache(
            innerResult,
            functionParams,
            originalMethod
        );

        // Ожидаем, что метод вернет кэшированное значение
        expect(cacheResult.cachedData).toEqual('cachedValue');
    });
});
