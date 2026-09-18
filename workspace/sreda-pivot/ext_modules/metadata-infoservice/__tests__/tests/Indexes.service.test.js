/*
Вот пример тестов для вашего модуля `Indexes.service.js`, написанных с использованием библиотеки Jest:

Создайте файл `__tests__/tests/Indexes.service.test.js` следующего содержания:


**Что проверяют эти тесты?**

1. **Конструктор**: Тестируется создание экземпляра класса `IndexesService` и проверка того, что свойства `id` и `component` инициализируются корректно.
   
2. **Методы**: Здесь пока нет проверок методов, поскольку в вашем сервисе они не определены. Но если позже появятся какие-либо методы, например, `getIndex()` или другие, добавьте соответствующие тесты для проверки их функциональности.

Эти тесты помогут убедиться, что ваш сервис работает стабильно и соответствует ожиданиям.
*/

const IndexesService = require('../../services/Indexes.service');

describe('IndexesService', () => {
    
    test('Проверка конструктора класса', () => {
        const indexesService = new IndexesService();
        
        // Проверка наследования и базовых свойств
        expect(indexesService instanceof IndexesService).toBeTruthy();
        expect(typeof indexesService.constructor === 'function').toBe(true);

        // Проверка заданных свойств
        expect(indexesService.id).toEqual('201823bd-924f-4a4b-9a8a-658d020c5e01');
        expect(indexesService.component).toEqual('Indexes');
    });

    // Добавьте дополнительные тесты методов, если они имеются
    // Например, если бы существовал метод getIndex(), вы могли бы написать следующее:
    /*
    test('Метод getIndex возвращает ожидаемый результат', () => {
        const indexesService = new IndexesService();
        const indexResult = indexesService.getIndex(); // Замените на реальный вызов метода
        expect(indexResult).toEqual(expectedValue); // Укажите ожидаемое значение
    });
    */

});
