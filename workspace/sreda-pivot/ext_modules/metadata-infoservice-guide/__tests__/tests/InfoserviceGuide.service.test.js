/*
Вот пример тестов для вашего сервиса `InfoserviceGuideService` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/InfoserviceGuide.service.test.js` следующего содержания:


Эти тесты проверяют основные методы класса `InfoserviceGuideService`: 

1. Структуру метода `form()` и правильность возвращаемых данных.
2. Логику проверки ошибок в методе `validate()`.
3. Корректность логгирования в методах `create()`, `update()` и `delete()`.
4. Вызовы зависимых методов в методе `read()`.

Перед запуском тестов убедитесь, что вы установили библиотеку Jest командой `npm install --save-dev jest` и настроили конфигурационный файл Jest в вашем проекте.
*/

const InfoserviceGuideService = require('../../services/InfoserviceGuide.service');

describe('Test for InfoserviceGuideService', () => {
    let service;

    beforeEach(() => {
        service = new InfoserviceGuideService();
    });

    test('form method returns correct structure', async () => {
        const result = await service.form();
        expect(result).toHaveProperty('form');
        expect(Array.isArray(result.form)).toBe(true);
        expect(result.form.length).toEqual(11); // Проверка количества полей формы
    });

    test('validate method detects hierarchy error correctly', async () => {
        const body = {
            settings: {
                id: 'some-id',
                fieldhierarchy: 'same-value-as-fieldview',
            }
        };

        const errors = await service.validate(body);
        expect(errors.length).toEqual(1);
        expect(errors[0]).toContain("'Поле родителя иерархии' не может быть равно 'Поле представления'");
    });

    test('validate method passes without errors when no conflict detected', async () => {
        const body = {
            settings: {
                id: 'some-id',
                fieldhierarchy: 'different-value-than-fieldview',
            }
        };

        const errors = await service.validate(body);
        expect(errors.length).toEqual(0);
    });

    test('create method logs input', async () => {
        jest.spyOn(console, 'log');
        const body = { someKey: 'someValue' };
        await service.create(body);
        expect(console.log).toHaveBeenCalledWith('create', body);
    });

    test('update method logs input', async () => {
        jest.spyOn(console, 'log');
        const id = 'some-id';
        const body = { someKey: 'someValue' };
        await service.update(id, body);
        expect(console.log).toHaveBeenCalledWith('update', id, body);
    });

    test('delete method logs input', async () => {
        jest.spyOn(console, 'log');
        const id = 'some-id';
        await service.delete(id);
        expect(console.log).toHaveBeenCalledWith('delete', id);
    });

    test('read method calls InfoServiceMetadata.read with correct arguments', async () => {
        const id = 'some-id';
        const options = {};
        
        // Создаем мок для InfoServiceMetadata
        jest.mock('../../services/metadata/InfoserviceGuide.class');
        const mockedRead = jest.fn();
        require('../../services/metadata/InfoserviceGuide.class').prototype.read = mockedRead;

        await service.read(id, options);
        expect(mockedRead).toHaveBeenCalledWith(id, options);
    });
});
