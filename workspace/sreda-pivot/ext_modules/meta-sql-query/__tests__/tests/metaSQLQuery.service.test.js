/*
Вот примеры тестов для класса `metaSQLQueryService` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/metaSQLQuery.service.test.js` следующего содержания:


Эти тесты покрывают основные сценарии работы методов `convertAST` и `postQuery`:

1. Проверяют обработку ошибок при некорректном типе AST и использовании запрещённого оператора `INTO`.
2. Тестируют успешную работу метода `convertAST` с правильным запросом.
3. Проверяют реакцию на ошибки синтаксического разбора SQL-запросов методом `postQuery`.
4. Покрывают сценарий успешного выполнения SQL-запроса через метод `postQuery`.

Не забудьте заменить заглушенные зависимости реальными реализациями или настроить дополнительные моки для зависимых классов вроде `Metadata`, `ConnectorClass` и других сервисов, используемых в оригинальном классе.
*/

const metaSQLQueryService = require('../../services/metaSQLQuery.service');
const ApiError = require('../../core/exceptions/ApiError');

describe('Тестирование metaSQLQueryService', () => {
    
    test('convertAST должен отвергнуть недопустимый тип AST', async () => {
        const service = new metaSQLQueryService();
        
        const invalidAst = { type: 'update' };
        await expect(service.convertAST(invalidAst, {})).rejects.toThrow(ApiError);
    });

    test('convertAST должен отвергнуть использование INTO', async () => {
        const service = new metaSQLQueryService();
        
        const invalidAst = { type: 'select', into: { type: 'table' }};
        await expect(service.convertAST(invalidAst, {})).rejects.toThrow(ApiError);
    });

    test('convertAST успешно обрабатывает валидный select-запрос', async () => {
        const service = new metaSQLQueryService();
        
        const validAst = { type: 'select', columns: [], from: [{ table: 'my_table' }] };
        const convertedAst = await service.convertAST(validAst, { schema: 'public', table: 'my_table' });
        
        expect(convertedAst.from[0].table).toEqual('"public"."my_table"');
    });

    test('postQuery возвращает ошибку неверной структуры SQL', async () => {
        const service = new metaSQLQueryService();
        
        const mockParser = jest.spyOn(metaSQLQueryService.prototype, '_parser').mockImplementation(() => ({
            astify: () => { throw new Error('Ошибка парсинга') }
        }));

        await expect(service.postQuery('some_id', { script: 'invalid_sql' }))
            .rejects.toThrow(new ApiError(404, 'Ошибка структуры SQL запроса'));

        mockParser.mockRestore();
    });

    test('postQuery возвращает результат успешного выполнения запроса', async () => {
        const service = new metaSQLQueryService();

        const mockConnector = {
            querySql: jest.fn().mockResolvedValue([{ data: ['row1', 'row2'] }])
        };

        const mockMetadataGetItem = jest.spyOn(Metadata, 'getItem')
            .mockResolvedValue({ manifest: { settings: { table: 'my_table' } } });

        const mockConvertAST = jest.spyOn(service, 'convertAST')
            .mockReturnValue({ /* some valid AST */ });

        const mockParser = jest.spyOn(metaSQLQueryService.prototype, '_parser').mockImplementation(() => ({
            sqlify: () => 'SELECT * FROM my_table LIMIT 100'
        }));

        const result = await service.postQuery('some_id', { script: 'SELECT * FROM my_table' });

        expect(result).toHaveProperty('data');
        expect(mockConnector.querySql).toHaveBeenCalledWith('WITH "tmp" AS (SELECT * FROM my_table LIMIT 100) SELECT * FROM "tmp" LIMIT 100');

        mockMetadataGetItem.mockRestore();
        mockConvertAST.mockRestore();
        mockParser.mockRestore();
    });
});
