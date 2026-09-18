/*
Вот пример тестов для класса `parseDbmodelMetaService`, использующий библиотеку Jest:


Эти тесты покрывают основные методы сервиса, проверяя их функциональность и взаимодействие с другими компонентами системы.
*/

const parseDbmodelMetaService = require('../../services/parseDbmodelMeta.service');
const Metadata = require('../../metadata-cmp/services/Metadata.service');
const MetadataModel = require('../../metadata-cmp/services/model/Metadata.model');
const ConnectorClass = require('../../metadata-connector/services/metadata/Connector.class');

jest.mock('../../metadata-cmp/services/Metadata.service');
jest.mock('../../metadata-cmp/services/model/Metadata.model');
jest.mock('../../metadata-connector/services/metadata/Connector.class');

describe('parseDbmodelMetaService', () => {
    let service;
    
    beforeEach(() => {
        service = new parseDbmodelMetaService();
    });

    describe('formAfter', () => {
        test('добавляет кнопку Load DB model', async () => {
            const innerResult = {};
            const functionInput = { id: 'some-id' };
            
            const result = await service.formAfter(innerResult, functionInput);

            expect(result.buttons).toHaveLength(1);
            expect(result.buttons[0]).toEqual({
                name: 'Load DB model',
                component: 'DBModelLoader',
                props: {
                    type: 'update',
                    title: 'Загрузить модель данных',
                    server: process.env.ESB_NAME || '',
                    service: `metadata/parsedbmodelmeta/autofill/some-id`,
                },
            });
        });
    });

    describe('parse', () => {
        test('парсит строки в массив объектов полей', async () => {
            const input = `
                field1;string;Поле 1
                field2;number;Поле 2
                field3;date;Дата поля
            `.trim();

            const expectedOutput = [
                { nameField: 'field1', type: 'string', description: 'Поле 1' },
                { nameField: 'field2', type: 'number', description: 'Поле 2' },
                { nameField: 'field3', type: 'date', description: 'Дата поля' },
            ];

            const result = await service.parse(input);
            expect(result).toEqual(expectedOutput);
        });
    });

    describe('getType', () => {
        test('возвращает тип SQL на основе ключа и значения', async () => {
            const cases = [
                { key: 'd', value: null, expected: 'date' },
                { key: 's', value: '', expected: 'text' },
                { key: 'n', value: 123, expected: 'integer' },
                { key: 'r', value: 123.45, expected: 'float' },
                { key: 'b', value: true, expected: 'boolean' },
            ];

            for(const c of cases) {
                const result = await service.getType(c.key, c.value);
                expect(result).toBe(c.expected);
            }
        });
    });

    describe('autofillFromDB', () => {
        test('заполняет поля метаданными из базы данных', async () => {
            jest.spyOn(Metadata, 'getMetadata').mockResolvedValue({ manifest: { settings: { table: 'table_name' } }, children: [{ class: 'Fields', id: 'fields-guid' }] });
            jest.spyOn(service, 'getConnector').mockResolvedValue({ connector: { findAll: jest.fn().mockResolvedValue([{ field1: 'value1', field2: 'value2' }]) } });
            jest.spyOn(service, 'fillFields').mockResolvedValue(true);

            const result = await service.autofillFromDB('some-id');

            expect(result.result).toBe(true);
        });
    });

    describe('fillFields', () => {
        test('создает поля метаданных', async () => {
            jest.spyOn(Metadata, 'setMetadata').mockResolvedValue({});

            const fields = [
                { nameField: 'field1', type: 'string', name: 'Название 1', description: 'Описание 1' },
                { nameField: 'field2', type: 'number', name: 'Название 2', description: 'Описание 2' },
            ];

            const result = await service.fillFields('some-id', fields);

            expect(result).toBe(true);
            expect(Metadata.setMetadata).toHaveBeenCalledTimes(fields.length);
        });
    });

    describe('autofill', () => {
        test('автозаполнение полей из парсинга тела', async () => {
            jest.spyOn(service, 'parse').mockResolvedValue([
                { nameField: 'field1', type: 'string', name: 'Название 1', description: 'Описание 1' },
                { nameField: 'field2', type: 'number', name: 'Название 2', description: 'Описание 2' },
            ]);
            jest.spyOn(service, 'fillFields').mockResolvedValue(true);

            const body = `
                field1;string;Название 1
                field2;number;Название 2
            `.trim();

            const result = await service.autofill('some-id', body);

            expect(result.result).toBe(true);
        });
    });

    describe('getConnector', () => {
        test('получает коннектор по ID', async () => {
            jest.spyOn(ConnectorClass.prototype, 'getConnector').mockResolvedValue({ connector: {}, connectorData: {} });

            const result = await service.getConnector({ manifest: { settings: { connector: 'connector-id' } } });

            expect(result).toHaveProperty('connector');
            expect(result).toHaveProperty('connectorData');
        });
    });
});
