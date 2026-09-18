/*
Вот пример тестов для модуля `SessionSet.service.js`, написанных с использованием библиотеки Jest:

Создайте файл `__tests__/tests/SessionSet.service.test.js` следующего содержания:


**Что здесь происходит:**

1. Мы имитируем модуль `httpContext` с помощью `jest.mock()` для управления поведением метода `.get()`.
2. Определяем тестовый случай `'Тест метода get()'`.
3. Устанавливаем ожидаемое значение для возврата методом `httpContext.get()`.
4. Создаем экземпляр класса `SessionSetService`.
5. Вызываем метод `.get()` и сохраняем результат.
6. Проверяем, что полученный результат соответствует ожидаемому значению.
7. Также проверяем, что внутренний метод был вызван с нужным параметром ('sessionStorage').

Эти тесты помогут убедиться, что сервис работает корректно и возвращает правильное значение сессии из хранилища.
*/

jest.mock('../../../core/services/http-context');

const httpContext = require('../../../core/services/http-context');
const SessionSetService = require('../../services/SessionSet.service');

describe('SessionSetService', () => {
    test('Тест метода get()', async () => {
        // Подготавливаем моки
        const sessionData = { userId: 1 };
        httpContext.get.mockReturnValue(sessionData);

        // Создаем экземпляр сервиса
        const service = new SessionSetService();

        // Вызываем метод и проверяем результат
        const result = await service.get();

        // Проверяем, что метод вернул ожидаемые данные
        expect(result).toEqual(sessionData);

        // Проверяем, что метод httpContext.get был вызван с правильным аргументом
        expect(httpContext.get).toHaveBeenCalledWith('sessionStorage');
    });
});
