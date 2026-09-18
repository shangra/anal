/*
Вот пример тестов для модуля MetaQueryExplain, написанных с использованием библиотеки Jest:


Эти тесты проверяют основные методы класса MetaQueryExplainService, включая базовые проверки наличия результатов и ожидаемые значения. Также протестированы хук-методы `init()` и `addConsole()`, которые являются частью расширений системы через класс `Extensions`.
*/

// __tests__/tests/MetaQueryExplain.service.test.js

const MetaQueryExplainService = require('../../services/MetaQueryExplain.service');

describe('MetaQueryExplainService', () => {
    
    let service;

    beforeEach(() => {
        service = new MetaQueryExplainService();
    });

    test('Тест метода get()', async () => {
        const result = await service.get(1);
        expect(result).not.toBeNull(); // Проверить наличие результата
    });

    test('Тест метода getMeta()', async () => {
        const result = await service.getMeta(1);
        expect(result).not.toBeNull(); // Проверить наличие результата
    });

    test('Тест метода del()', async () => {
        const result = await service.del(1);
        expect(result).toEqual({ result: true }); // Проверить успешное удаление
    });

    describe('Хук-метод init()', () => {
        test('Проверка инициализации', async () => {
            const innerMock = {};
            const fargsMock = [];
            const originalMock = {};
            
            const result = await service.init(innerMock, fargsMock, originalMock);
            expect(result).not.toBeNull(); // Проверить результат инициализации
        });
    });

    describe('Хук-метод addConsole()', () => {
        test('Добавление консоли', async () => {
            const innerResultMock = {};
            const functionParamsMock = [];
            const originalMethodMock = jest.fn();
        
            const result = await service.addConsole(
                innerResultMock,
                functionParamsMock,
                originalMethodMock
            );
            expect(result).not.toBeNull(); // Проверить результат добавления консоли
        });
    });
});
