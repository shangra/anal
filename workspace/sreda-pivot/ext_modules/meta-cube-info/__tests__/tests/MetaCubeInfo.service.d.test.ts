/*
Вот пример тестов для вашего модуля `MetaCubeInfo`, написанных с использованием библиотеки Jest:


Эти тесты проверяют следующее:

1. Основной сценарий работы метода `formAfter()` с валидным вводом
2. Сценарий обработки пустого массива кнопок
3. Проверку поведения метода при некорректном вводе данных
*/

// __tests__/tests/MetaCubeInfo.service.test.js

const MetaCubeInfoService = require('../../services/MetaCubeInfo.service');

describe('MetaCubeInfoService', () => {
    
    test('formAfter should return correct structure with buttons array', async () => {
        const metaCubeInfoService = new MetaCubeInfoService();
        
        const inputData = {
            buttons: [
                { label: 'button1', action: 'action1' },
                { label: 'button2', action: 'action2' }
            ]
        };
        
        const functionInput = {
            id: 'some-id'
        };
        
        const expectedOutput = {
            buttons: [
                { label: 'button1', action: 'action1' },
                { label: 'button2', action: 'action2' }
            ]
        };
        
        const output = await metaCubeInfoService.formAfter(inputData, functionInput);
        
        expect(output).toEqual(expectedOutput);
    });

    test('formAfter should handle empty buttons array correctly', async () => {
        const metaCubeInfoService = new MetaCubeInfoService();
        
        const inputData = {};
        
        const functionInput = {
            id: 'another-id'
        };
        
        const expectedOutput = {};
        
        const output = await metaCubeInfoService.formAfter(inputData, functionInput);
        
        expect(output).toEqual(expectedOutput);
    });

    test('formAfter should throw error when invalid input is provided', async () => {
        const metaCubeInfoService = new MetaCubeInfoService();
        
        const inputData = null; // Некорректное значение
        
        const functionInput = {
            id: 'invalid-id'
        };
        
        await expect(metaCubeInfoService.formAfter(inputData, functionInput))
            .rejects.toThrowError();
    });
});
