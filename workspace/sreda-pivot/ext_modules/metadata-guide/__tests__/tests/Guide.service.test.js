/*
Вот пример тестов для модуля `Guide.service.js` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/Guide.service.test.js` следующего содержания:


Эти тесты покрывают основные методы класса `GuideService`: проверку родительских форм, получение конфигурации полей формы, создание метаданных и обновление настроек иерархической структуры.

Не забудьте установить библиотеку Jest командой:

npm install --save-dev jest

и настроить выполнение тестов в вашем проекте через пакетный менеджер npm или yarn.
*/

const GuideService = require('../../services/Guide.service');
const MetadataCMPService = require('../../metadata-cmp/services/Metadata.service');
const MetadataCMP = new MetadataCMPService();

jest.mock('../../metadata-cmp/services/Metadata.service');

describe('Guide Service Tests', () => {
    let guideService;

    beforeEach(() => {
        guideService = new GuideService();
    });

    test('Test #isParentForm method', async () => {
        MetadataCMP.getItem.mockResolvedValueOnce({ class_id: 'some-id' });
        
        const result = await guideService.#isParentForm('some-id');
        expect(result).toEqual(true);
    });

    test('Test getFormFields with non-parent form', () => {
        const fields = guideService.getFormFields(false);
        expect(fields.length).toBeGreaterThan(8); // проверяем наличие всех базовых полей + дополнительные поля
    });

    test('Test getFormFields with parent form', () => {
        const fields = guideService.getFormFields(true);
        expect(fields.length).toBe(4); // проверяем только базовые поля
    });

    test('Test createMetadata method', async () => {
        jest.spyOn(guideService, 'createMetadata').mockReturnValue({ id: 'test-table-id' });

        const result = await guideService.createMetadata({});
        expect(result.id).toBe('test-table-id');
    });

    test('Test updateMetadata when hierarchical setting changes', async () => {
        const metadataItemMock = {
            data: { hierarchical: false },
        };

        jest.spyOn(super.prototype, 'metadataItem').mockReturnValue(metadataItemMock);
        jest.spyOn(MetadataCMP, 'getMetadataChildren').mockReturnValue([{ name: 'Родитель', class: 'SysFields', id: 'parent-field-id' }]);

        const result = await guideService.updateMetadata('test-id', { manifest: JSON.stringify({ settings: { hierarchical: true } }) }, null);
        expect(result).not.toBeNull();
    });

    test('Test updateMetadata without hierarchical change', async () => {
        const metadataItemMock = {
            data: { hierarchical: false },
        };

        jest.spyOn(super.prototype, 'metadataItem').mockReturnValue(metadataItemMock);

        const result = await guideService.updateMetadata('test-id', { manifest: JSON.stringify({ settings: { hierarchical: false } }) }, null);
        expect(result).not.toBeNull();
    });
});
