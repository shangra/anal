/*
Вот пример тестов для указанного вами модуля `metaNewCubePage.service.js`, написанных с использованием библиотеки Jest:

Создайте файл `__tests__/tests/metaNewCubePage.service.test.js` следующего содержания:


Также вам понадобятся моки зависимых сервисов. Создайте соответствующие файлы-моки:

**metadata-cmp/mocks/Metadata.mock.js**

**page-cms/mocks/Pages.mock.js**

Эти тесты покрывают основные методы вашего сервиса и проверяют корректность обработки различных сценариев.
*/

const metaNewCubePageService = require('../../services/metaNewCubePage.service');
const metadataMock = require('../../metadata-cmp/mocks/Metadata.mock');
const pagesMock = require('../../page-cms/mocks/Pages.mock');

jest.mock('../../../core/class/Extensions.class');
jest.mock('../../metadata-cmp/services/Metadata.service');
jest.mock('../../page-cms/services/Pages.service');

describe('metaNewCubePageService tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('formAfter should add button correctly', async () => {
        const serviceInstance = new metaNewCubePageService();
        const input = { id: 'some-id' };
        const initialInnerResult = {};
        
        const expectedButton = {
            name: 'MetaOLAPPage',
            component: 'MetaOLAPPage',
            props: {
                id: 'some-id',
                icon: 'bi bi-box-fill',
                server: process.env.ESB_NAME || '',
                service: `metadata/metanewcubepage/some-id`,
                title: 'Ссылка на КУБ',
            }
        };
    
        const result = await serviceInstance.formAfter(initialInnerResult, input);
    
        expect(result.buttons.length).toEqual(1);
        expect(result.buttons[0]).toEqual(expectedButton);
    });

    test('formReportsAfter should add button correctly', async () => {
        const serviceInstance = new metaNewCubePageService();
        const input = { id: 'some-report-id' };
        const initialInnerResult = {};

        const expectedButton = {
            name: 'MetaOLAPPage',
            component: 'MetaOLAPPage',
            props: {
                id: 'some-report-id',
                icon: 'bi bi-box-fill',
                server: process.env.ESB_NAME || '',
                service: `metadata/metanewreportspage/some-report-id`,
                title: 'Ссылка на ОТЧЕТ',
            }
        };

        const result = await serviceInstance.formReportsAfter(initialInnerResult, input);

        expect(result.buttons.length).toEqual(1);
        expect(result.buttons[0]).toEqual(expectedButton);
    });

    test('get should fetch and format pages correctly', async () => {
        const serviceInstance = new metaNewCubePageService();
        const id = 'some-id';

        pagesMock.getPagesWhereParams.mockResolvedValue([
            { page_id: 'page1', text: id },
            { page_id: 'page2', text: id }
        ]);

        pagesMock.getPages.mockResolvedValue([
            { id: 'page1', name: 'Page One', description: 'Desc One', uri: '/uri-one' },
            { id: 'page2', name: 'Page Two', description: 'Desc Two', uri: '/uri-two' }
        ]);

        const result = await serviceInstance.get(id);

        expect(pagesMock.getPagesWhereParams).toHaveBeenCalledWith('text', id);
        expect(pagesMock.getPages).toHaveBeenCalledWith(['page1', 'page2']);
        expect(result).toEqual([
            { id: 'page1', name: 'Page One', description: 'Desc One', uri: '/uri-one' },
            { id: 'page2', name: 'Page Two', description: 'Desc Two', uri: '/uri-two' }
        ]);
    });

    test('post should create a new page link successfully', async () => {
        const serviceInstance = new metaNewCubePageService();
        const id = 'some-metadata-id';
        const options = {
            parent: 'parent-id',
            paramName: 'param-name',
            template: 'template-id'
        };

        metadataMock.getMetadata.mockResolvedValue({ name: 'Test Name', description: 'Test Desc' });
        pagesMock.addPage.mockResolvedValue({ id: 'new-page-id' });
        pagesMock.editPublicPageParamByName.mockResolvedValue(true);

        const result = await serviceInstance.post(id, options);

        expect(metadataMock.getMetadata).toHaveBeenCalledWith(id, { instance: true });
        expect(pagesMock.addPage).toHaveBeenCalledWith({
            name: 'Test Name',
            description: 'Test Desc',
            parent: 'parent-id',
            parentUri: '',
            active: 1,
            markdel: 0,
            template: 'template-id'
        });
        expect(pagesMock.editPublicPageParamByName).toHaveBeenCalledWith(
            'new-page-id',
            'param-name',
            { value: id }
        );
        expect(result).toBe(true);
    });

    test('postCube should parse env variable and call post method', async () => {
        const serviceInstance = new metaNewCubePageService();
        const id = 'cube-id';
        process.env.OLAP_PARENT = '{"parent":"olap-parent","paramName":"olap-param"}';

        await serviceInstance.postCube(id);

        expect(serviceInstance.post).toHaveBeenCalledWith(id, {
            parent: 'olap-parent',
            paramName: 'olap-param'
        });
    });

    test('postReport should parse env variable and call post method', async () => {
        const serviceInstance = new metaNewCubePageService();
        const id = 'report-id';
        process.env.REPORTS_PARENT = '{"parent":"reports-parent","paramName":"reports-param"}';

        await serviceInstance.postReport(id);

        expect(serviceInstance.post).toHaveBeenCalledWith(id, {
            parent: 'reports-parent',
            paramName: 'reports-param'
        });
    });
});
module.exports = {
    getMetadata: jest.fn()
};
module.exports = {
    getPagesWhereParams: jest.fn(),
    getPages: jest.fn(),
    addPage: jest.fn(),
    editPublicPageParamByName: jest.fn()
};
