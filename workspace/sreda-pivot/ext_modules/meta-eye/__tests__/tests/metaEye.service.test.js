/*
Вот пример тестов для вашего модуля `metaEye.service.js`, написанный с использованием библиотеки Jest:


Эти тесты проверяют две основные функции сервиса:

1. **formAfter**: Проверяет, добавляет ли метод кнопку в результат и заполняет ли её правильные свойства.
   
2. **eye**: Тестирует, возвращает ли метод корректную информацию метаданных, полученную через сервис `Metadata`.

Перед каждым тестовым случаем создаётся новый экземпляр класса `MetaEyeService`, чтобы избежать загрязнения состояния между тестами. Также используется мокирование зависимого сервиса `MetadataService`, чтобы контролировать его поведение и проверять взаимодействие с ним.
*/

const MetaEyeService = require('../../services/metaEye.service');
const MetadataService = require('../../metadata-cmp/services/Metadata.service');

jest.mock('../../metadata-cmp/services/Metadata.service');

describe('MetaEyeService', () => {
    let metaEyeService;

    beforeEach(() => {
        metaEyeService = new MetaEyeService();
    });

    describe('formAfter', () => {
        test('should add button to innerResult', async () => {
            const innerResult = {};
            const functionInput = { id: 'someId' };

            const updatedInnerResult = await metaEyeService.formAfter(
                innerResult,
                functionInput
            );

            expect(updatedInnerResult.buttons.length).toEqual(1);
            expect(updatedInnerResult.buttons[0].name).toEqual('MetaEye');
            expect(updatedInnerResult.buttons[0].props.id).toEqual(
                functionInput.id
            );
        });
    });

    describe('eye', () => {
        test('should return metadata from Metadata service', async () => {
            const id = 'someId';
            const mockMetadata = { key: 'value' };

            MetadataService.prototype.getMetadata.mockResolvedValue(
                mockMetadata
            );

            const result = await metaEyeService.eye(id);

            expect(result.result).toEqual(mockMetadata);
            expect(MetadataService.prototype.getMetadata).toHaveBeenCalledWith(
                id
            );
        });
    });
});
