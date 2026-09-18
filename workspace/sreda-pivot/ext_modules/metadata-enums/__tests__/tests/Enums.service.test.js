/*
Вот пример тестов для указанного вами модуля `EnumsService`, написанный с использованием библиотеки Jest:

Создайте файл `__tests__/tests/Enums.service.test.js` следующего содержания:


Эти тесты проверяют следующее:

1. Метод `form()` возвращает ожидаемый результат.
2. Метод `read()` вызывает метод `MainMetadata.read()` с правильными параметрами.
3. Методы `create()`, `update()` и `delete()` пока ничего не делают (возвращают undefined).

Не забудьте установить библиотеку Jest командой:

npm install --save-dev jest

Также добавьте скрипт запуска тестов в ваш `package.json`:

"scripts": {
    "test": "jest"
},

Теперь вы можете запустить тесты командой `npm run test`.
*/

const EnumsService = require('../../services/Enums.service');

describe('EnumsService', () => {
    
    test('form method returns correct structure', async () => {
        const enumsService = new EnumsService();
        
        const expectedResult = {
            form: []
        };
        
        const actualResult = await enumsService.form();
        
        expect(actualResult).toEqual(expectedResult);
    });

    test('read method calls MainMetadata.read and returns its value', async () => {
        const enumsService = new EnumsService();
        const spyOnRead = jest.spyOn(MainMetadata.prototype, 'read');
        
        const id = 'some-id';
        const options = {};
        
        await enumsService.read(id, options);
        
        expect(spyOnRead).toHaveBeenCalledWith(id, options);
    });

    describe('CRUD methods are not implemented yet', () => {
        const serviceMethods = ['create', 'update', 'delete'];
        
        serviceMethods.forEach(methodName => {
            test(`${methodName} method does nothing`, async () => {
                const enumsService = new EnumsService();
                
                if (methodName === 'create') {
                    await expect(enumsService.create('some-id', {})).resolves.toBeUndefined();
                } else if (methodName === 'update') {
                    await expect(enumsService.update('some-id', {})).resolves.toBeUndefined();
                } else if (methodName === 'delete') {
                    await expect(enumsService.delete('some-id', {})).resolves.toBeUndefined();
                }
            });
        });
    });
});
