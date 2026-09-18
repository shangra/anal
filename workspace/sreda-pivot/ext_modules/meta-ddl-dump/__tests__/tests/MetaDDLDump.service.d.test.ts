/*
Вот пример тестов для вашего модуля `MetaDDLDump.service`, написанных с использованием библиотеки Jest:

Создайте файл `__tests__/tests/MetaDDLDump.service.test.js` следующего содержания:


**Что проверяют эти тесты?**

1. **Метод `postQuery`:**
   - Создаем экземпляр класса `MetaDDLDumpService`.
   - Тестируем метод `postQuery()` с заданным ID и телом запроса.
   - Проверяется наличие свойства `sql` в результате и тип значения этого свойства.
   
Эти тесты помогут убедиться, что ваш сервис возвращает ожидаемый результат в правильном формате. Вы можете расширить этот подход дополнительными сценариями проверки, например, проверять конкретные SQL-запросы, которые формирует сервис, или добавлять дополнительные кейсы для обработки ошибок.
*/

// Импортируем сервис, который будем тестировать
const MetaDDLDumpService = require('../../services/MetaDDLDump.service');

describe('MetaDDLDumpService', () => {
    
    test('Тест метода postQuery', async () => {
        const metaDDLDumpService = new MetaDDLDumpService();
        
        // Подготавливаем параметры для тестирования
        const id = 'some_id'; 
        const body = { someKey: 'someValue' };
        
        // Вызываем метод сервиса
        const response = await metaDDLDumpService.postQuery(id, body);
        
        // Проверяем результат
        expect(response).toHaveProperty('sql');
        expect(typeof response.sql).toEqual('string');
    });

});
