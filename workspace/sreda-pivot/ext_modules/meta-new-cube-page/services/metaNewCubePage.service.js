const Extensions = require('../../../core/class/Extensions.class');
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataClass();
const PagesClass = wrapper('backend', '../../page-cms/services/Pages.service');
const Pages = new PagesClass();

class metaNewCubePageService extends Extensions {
    async formAfter(innerResult, functionInput) {
        const { id } = functionInput;

        if (!innerResult.buttons) {
            innerResult.buttons = [];
        }
        innerResult.buttons.push({
            name: 'MetaOLAPPage',
            component: 'MetaOLAPPage',
            props: {
                id: id,
                icon: 'bi bi-box-fill',
                server: sreda.env.ESB_NAME || '',
                service: `metadata/metanewcubepage/${id}`,
                title: 'Ссылка на КУБ',
            },
        });

        return innerResult;
    }

    async formReportsAfter(innerResult, functionInput) {
        const { id } = functionInput;

        if (!innerResult.buttons) {
            innerResult.buttons = [];
        }
        innerResult.buttons.push({
            name: 'MetaOLAPPage',
            component: 'MetaOLAPPage',
            props: {
                id: id,
                icon: 'bi bi-box-fill',
                server: sreda.env.ESB_NAME || '',
                service: `metadata/metanewreportspage/${id}`,
                title: 'Ссылка на ОТЧЕТ',
            },
        });

        return innerResult;
    }

    /**
     * @param {string} id
     * @returns
     */
    async get(id) {
        const pagesParamsList = await Pages.getPagesWhereParams('text', id);
        const ids = pagesParamsList.map((page) => {
            return page.page_id;
        });
        let pagesList = await Pages.getPages(ids);
        pagesList = pagesList.map((page) => {
            const { id, name, description, uri } = page;
            return { id, name, description, uri };
        });
        let result = pagesList;
        return result;
    }

    async post(id, options) {
        let result = { result: false };
        const parentId = options;
        if (parentId) {
            const mData = await Metadata.getMetadata(id, { instance: true });
            const data = {
                name: mData.name,
                description: mData.description,
                parent: parentId.parent,
                parentUri: '',
                active: 1,
                markdel: 0,
                template: parentId.template,
            };
            const pageLink = await Pages.addPage(data);
            result = await Pages.editPublicPageParamByName(pageLink.id, parentId.paramName, {
                value: id,
            });
        }
        return result;
    }

    async postCube(id, body) {
        let options = sreda.env.OLAP_PARENT;

        if (typeof options === 'string') {
            try {
                options = JSON.parse(options);
            } catch (e) {
                console.error(e);
            }
        }

        return this.post(id, options);
    }

    async postReport(id, body) {
        let options = sreda.env.REPORTS_PARENT;

        if (typeof options === 'string') {
            try {
                options = JSON.parse(options);
            } catch (e) {
                console.error(e);
            }
        }

        return this.post(id, options);
    }
}

module.exports = metaNewCubePageService;
