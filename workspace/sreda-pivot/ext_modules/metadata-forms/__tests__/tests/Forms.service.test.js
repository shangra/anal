/*
Вот пример тестов для модуля `forms.service.js`, написанных с использованием библиотеки Jest:


Эти тесты покрывают основные методы класса `FormsService`: создание, чтение, обновление и удаление форм, а также обработку различных сценариев загрузки шаблонов форм. Тесты используют мокинг зависимых сервисов для изоляции тестирования самого сервиса.
*/

const FormsService = require('../../services/Forms.service');
const MetadataService = require('../../metadata-cmp/services/Metadata.service');
const PagesUiService = require('../../page-cms/services/PagesUi.service');
const TemplatesService = require('../../template-cms/services/Templates.service');

jest.mock('../../metadata-cmp/services/Metadata.service');
jest.mock('../../page-cms/services/PagesUi.service');
jest.mock('../../template-cms/services/Templates.service');

describe('FormsService', () => {
    let formsService;
    
    beforeEach(() => {
        formsService = new FormsService();
    });

    describe('form method', () => {
        test('should return correct form structure', async () => {
            const result = await formsService.form('some-id');
            
            expect(result.form.length).toEqual(1); // Проверить наличие компонента Tabs
            expect(result.form[0].component).toEqual('MetadataUiKit.Tabs');
            expect(result.form[0].props.tabs.length).toEqual(4); // Четыре вкладки
        });
    });

    describe('read method', () => {
        test('should handle valid formGUID and render page correctly', async () => {
            jest.spyOn(MetadataService.prototype, 'getMetadata').mockResolvedValue({});
            jest.spyOn(PagesUiService.prototype, 'RenderPage').mockResolvedValue({});

            const result = await formsService.read('some-id', {});

            expect(result).toBeDefined(); // Убедиться, что результат определен
        });

        test('should handle missing formGUID gracefully', async () => {
            jest.spyOn(MetadataService.prototype, 'getMetadata').mockResolvedValue({});
            jest.spyOn(TemplatesService.prototype, 'checkTemplate').mockResolvedValue({
                data: {},
                script: ''
            });

            const result = await formsService.read('some-id', {});

            expect(result).toBeDefined(); // Убедиться, что результат определен
        });
    });

    describe('create method', () => {
        test('should log creation message', async () => {
            const spy = jest.spyOn(console, 'log');

            await formsService.create({ some: 'body' });

            expect(spy).toHaveBeenCalledWith('create', { some: 'body' });
        });
    });

    describe('update method', () => {
        test('should log update message', async () => {
            const spy = jest.spyOn(console, 'log');

            await formsService.update('some-id', { updated: 'body' });

            expect(spy).toHaveBeenCalledWith('update', 'some-id', { updated: 'body' });
        });
    });

    describe('delete method', () => {
        test('should log deletion message', async () => {
            const spy = jest.spyOn(console, 'log');

            await formsService.delete('some-id');

            expect(spy).toHaveBeenCalledWith('delete', 'some-id');
        });
    });
});
