/*
Вот пример тестов для вашего сервиса `InfoserviceService` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/Infoservice.service.test.js` следующего содержания:


Эти тесты проверяют основные методы класса `InfoserviceService`: 

1. Проверяется структура результата метода `form`
2. Проверяются логи методов `create`, `update` и `delete`
3. Тестируется вызов метода `read` с правильными аргументами через класс метаданных
*/

const InfoserviceService = require('../../services/Infoservice.service');

describe('Test for InfoserviceService', () => {
    
    test('form method returns correct structure', async () => {
        const serviceInstance = new InfoserviceService();
        
        const expectedResult = {
            form: [
                {
                    name: 'table',
                    description: 'Имя таблицы',
                    type: 'STRING',
                    template: 'test_table',
                },
                {
                    name: 'sqlalias',
                    description: 'Сложный запрос',
                    type: 'TEXT',
                    template: 'SELECT "B".A FROM B WHERE "B".A is not null',
                },
                {
                    name: 'filter',
                    description: 'Фильтр',
                    type: 'JSON',
                    template: '{where : {...} }',
                },
                {
                    name: 'connector',
                    description: 'Коннектор',
                    type: 'REF',
                    useParent: false,
                    link: 'some_connector_id',
                    class: undefined,
                },
                {
                    name: 'onoff',
                    description: 'Отключен для технических работ',
                    type: 'BOOL',
                },
                {
                    name: 'blockMessage',
                    description: 'Сообщение о блокировке',
                    type: 'STRING',
                    template: 'Инфосервис отключен по причине...',
                },
            ]
        };

        const actualResult = await serviceInstance.form();
        expect(actualResult).toEqual(expectedResult);
    });

    test('create method logs input correctly', async () => {
        const spyConsoleLog = jest.spyOn(console, 'log');
        const serviceInstance = new InfoserviceService();
        
        const body = { key: 'value' };
        await serviceInstance.create(body);
        
        expect(spyConsoleLog).toHaveBeenCalledWith('create', body);
        spyConsoleLog.mockRestore();
    });

    test('read method calls metadata read with proper arguments', async () => {
        const MockInfoServiceMetadata = jest.fn(() => ({
            read: jest.fn()
        }));
        
        const serviceInstance = new InfoserviceService();
        serviceInstance.InfoServiceMetadata = MockInfoServiceMetadata;
        
        const id = 'some_id';
        const options = { optionKey: 'optionValue' };
        
        await serviceInstance.read(id, options);
        
        expect(MockInfoServiceMetadata).toHaveBeenCalledWith({ id });
        expect(serviceInstance.InfoServiceMetadata().read).toHaveBeenCalledWith(id, options);
    });

    test('update method logs inputs correctly', async () => {
        const spyConsoleLog = jest.spyOn(console, 'log');
        const serviceInstance = new InfoserviceService();
        
        const id = 'some_id';
        const body = { key: 'value' };
        
        await serviceInstance.update(id, body);
        
        expect(spyConsoleLog).toHaveBeenCalledWith('update', id, body);
        spyConsoleLog.mockRestore();
    });

    test('delete method logs input correctly', async () => {
        const spyConsoleLog = jest.spyOn(console, 'log');
        const serviceInstance = new InfoserviceService();
        
        const id = 'some_id';
        
        await serviceInstance.delete(id);
        
        expect(spyConsoleLog).toHaveBeenCalledWith('delete', id);
        spyConsoleLog.mockRestore();
    });
});
