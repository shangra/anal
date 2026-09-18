/*
Вот пример тестов для модуля `MetaDDLDump.service.js`, написанных с использованием библиотеки Jest. Тесты покрывают основные сценарии использования методов класса `MetaDDLDumpService` и вспомогательных функций.

---

### Пример тестов:


---

### Что покрыто этими тестами:

1. **Методы класса**:
   - Проверка успешного возврата результата методом `postQuery()` с правильной структурой.
   - Обработка ошибок при получении метаданных.
   
2. **Вспомогательные функции**:
   - Проверка корректной очистки лишних отступов функцией `_dedent()`.
   - Проверка корректного применения отступов функцией `_indent()`.
   - Проверка соответствия типов полей функцией `db_type_meta2real()`.

Эти тесты помогут убедиться, что модуль ведёт себя предсказуемым образом в различных ситуациях и обеспечивает стабильность функционала.
*/

const MetaDDLDumpService = require('../../services/MetaDDLDump.service');
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataClass();

describe('Тестирование модуля MetaDDLDump.service.js', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Класс MetaDDLDumpService', () => {

        it('Метод postQuery возвращает корректную структуру результата', async () => {
            const service = new MetaDDLDumpService();
            
            // Mock метода Metadata.getItem()
            Metadata.getItem.mockResolvedValueOnce({
                id: 'some-id',
                name: 'Test Model Name',
                manifest: {
                    settings: {
                        connector: { value: 'connector-ref-value' }
                    }
                }
            });

            const result = await service.postQuery('some-id', {});

            expect(result).toHaveProperty('sql');
            expect(typeof result.sql).toEqual('string');
        });

        it('Метод postQuery формирует корректный скрипт при успешной обработке', async () => {
            const service = new MetaDDLDumpService();

            // Mock методов Metadata.getItem(), mksql_Selectable()
            Metadata.getItem.mockResolvedValueOnce({
                id: 'some-id',
                name: 'Test Model Name',
                manifest: {
                    settings: {
                        connector: { value: 'connector-ref-value' }
                    }
                }
            });

            const expectedResult = {
                sql: '-- some generated ddl script here...'
            };

            // Mock результата mksql_Selectable()
            global.mksql_Selectable = jest.fn().mockReturnValue(expectedResult);

            const result = await service.postQuery('some-id', {});

            expect(result).toEqual(expectedResult);
        });

        it('Метод postQuery обрабатывает исключения и возвращает ошибку', async () => {
            const service = new MetaDDLDumpService();

            // Mock исключений
            Metadata.getItem.mockRejectedValue(new Error('Mocked metadata fetch error'));

            await expect(service.postQuery('some-id', {})).rejects.toThrow(Error);
        });

    });

    describe('Функциональные проверки вспомогательных функций', () => {

        it('_dedent корректно очищает отступы', () => {
            const input = `
                \tThis is an example
                  With mixed tabs and spaces
                      And deeper indentations
            `;

            const expectedOutput = `This is an example
With mixed tabs and spaces
And deeper indentations`;

            const result = _dedent(input);
            expect(result).toEqual(expectedOutput);
        });

        it('_indent корректно применяет заданный отступ', () => {
            const input = 'Some text to indent';
            const padding = '    ';
            const expectedOutput = '    Some text to indent';

            const result = _indent(padding, input);
            expect(result).toEqual(expectedOutput);
        });

        it('db_type_meta2real корректно преобразует типы полей', () => {
            const metaTypes = {
                uuid: 'UUID',
                text: 'TEXT',
                string: 'VARCHAR',
                integer: 'INTEGER',
                float: 'FLOAT',
                date: 'DATE',
                datetime: 'DATETIME',
                boolean: 'BOOLEAN',
                ref: 'UUID',
            };

            for (const [metaType, expectedRealType] of Object.entries(metaTypes)) {
                const result = db_type_meta2real(metaType);
                expect(result).toEqual(expectedRealType);
            }
        });

    });

});
