/*
Вот пример тестов для вашего модуля `Indexes.service.js`, написанный с использованием библиотеки Jest:

Создайте файл `__tests__/tests/Indexes.service.test.js` следующего содержания:


### Пояснение:

1. **Импорт классов и констант**: импортируем необходимые классы и константы для тестирования.
   
2. **beforeEach**: перед каждым тестом создаем новый экземпляр `IndexesService`, чтобы каждый тест работал с чистым состоянием.

3. **Тест конструктора**:
   Проверяется, что конструктор устанавливает правильные значения свойств `id` и `component`, взятые из констант.

4. **Тест наследования**:
   Проверяется, что класс успешно наследуется от базового класса `DefaultMetaObject`.

5. **Дополнительные тесты методов**:
   Здесь вы можете добавить дополнительные тесты для любых специфических методов, реализованных вами в классе `IndexesService`. Пример закомментирован выше – вам потребуется заменить комментарии реальными методами и ожиданиями.

Эти тесты помогут убедиться, что ваш сервис инициализируется корректно и работает должным образом.
*/

const IndexesService = require('../../services/Indexes.service');
const constants = require('../../services/constants');

describe('IndexesService', () => {
    let indexesService;

    beforeEach(() => {
        indexesService = new IndexesService();
    });

    test('Проверка конструктора класса', () => {
        expect(indexesService.id).toEqual(constants.Indexes.id);
        expect(indexesService.component).toEqual(constants.Indexes.component);
    });

    test('Наследование от DefaultMetaObject', () => {
        expect(indexesService instanceof DefaultMetaObject).toBeTruthy();
    });

    describe('Методы класса', () => {
        // Добавьте сюда тесты для методов, если они имеются в вашем сервисе
        // Например:
        /*
        test('Метод getIndexData возвращает ожидаемые данные', async () => {
            const expectedResult = { /* ожидаемое значение */;
            const actualResult = await indexesService.getIndexData(/* параметры */);
            expect(actualResult).toEqual(expectedResult);
        });
        */
    });
});
