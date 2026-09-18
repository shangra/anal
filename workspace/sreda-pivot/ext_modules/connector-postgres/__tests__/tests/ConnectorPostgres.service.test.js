/*
Вот пример тестов для класса `ConnectorPostgres` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/ConnectorPostgres.service.test.js` следующего содержания:


Эти тесты проверяют две основные функции класса:

1. Метод `loadConnectorsBefore()` должен добавлять объект `Connector` в параметры под ключом `'postgres'`.
   
2. Метод `formAfter()` должен корректно изменять структуру формы, добавляя элемент `'postgres': 'POSTGRES'` в нужное место иерархической структуры.

Тесты используют асинхронное выполнение методов, ожидаемых от оригинального кода, хотя сами методы здесь выполняют синхронную работу.
*/

const ConnectorPostgres = require('../../services/ConnectorPostgres.service');

describe('ConnectorPostgres service tests', () => {
    test('loadConnectorsBefore should add Postgres connector to params', async () => {
        const connectorPostgres = new ConnectorPostgres();

        const params = { ConnectorList: {} };
        await connectorPostgres.loadConnectorsBefore({}, params);

        expect(params.ConnectorList.postgres).toEqual(
            require('../../services/connector/PostgresConnector')
        );
    });

    test('formAfter should modify form structure correctly', async () => {
        const connectorPostgres = new ConnectorPostgres();

        const res = {
            form: [
                {
                    props: {
                        tabs: [
                            {
                                content: [
                                    {
                                        list: {},
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
        };

        const modifiedRes = await connectorPostgres.formAfter(res, {});

        expect(
            modifiedRes.form[0].props.tabs[0].content[0].list.postgres
        ).toEqual('POSTGRES');
    });
});
