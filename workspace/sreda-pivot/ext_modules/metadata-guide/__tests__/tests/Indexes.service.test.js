/*
Вот пример тестов для вашего модуля `Indexes.service.js`, написанных с использованием библиотеки Jest:


Эти тесты проверяют следующее:

1. Успешную инициализацию класса `IndexesService`.
2. Корректность наследования от базового класса `DefaultMetaObject`.
3. Присвоенные значения свойствам `id` и `component` в конструкторе.

Не забудьте заменить `constants.Indexes.component` и `constants.Indexes.id` реальными значениями из вашего файла констант, либо импортируйте этот файл перед тестами.
*/

// __tests__/tests/Indexes.service.test.js

const IndexesService = require('../../services/Indexes.service');

describe('IndexesService', () => {
    
    test('Проверка конструктора класса', () => {
        const indexesService = new IndexesService();
        
        // Проверка того, что класс успешно инициализируется
        expect(indexesService).toBeInstanceOf(IndexesService);
        
        // Проверка свойств класса
        expect(typeof indexesService.id).toEqual('string');
        expect(typeof indexesService.component).toEqual('string');
    });

    test('Проверка наследования от DefaultMetaObject', () => {
        const indexesService = new IndexesService();
        
        // Проверка того, что класс действительно наследуется от DefaultMetaObject
        expect(indexesService instanceof DefaultMetaObject).toBeTruthy();
    });

    test('Проверка значения свойства component', () => {
        const indexesService = new IndexesService();
        
        // Проверка заданного значения компонента
        expect(indexesService.component).toEqual(constants.Indexes.component);
    });

    test('Проверка значения свойства id', () => {
        const indexesService = new IndexesService();
        
        // Проверка заданного значения ID
        expect(indexesService.id).toEqual(constants.Indexes.id);
    });

});
