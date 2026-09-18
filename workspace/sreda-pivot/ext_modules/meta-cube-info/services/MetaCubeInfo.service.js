const Extensions = require('../../../core/class/Extensions.class');
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');

const Metadata = new MetadataClass();

/**
 * @typedef {import('./types/Button')} Button
 */
class MetaCubeInfoService extends Extensions {
    /**
     * @param {{ buttons?: Button[] }} innerResult
     * @param {{ id?: string }} functionInput
     * @returns
     */
    async formAfter(innerResult, functionInput) {
        const { id } = functionInput;

        if (!id) return innerResult;

        const cubeInfo = await Metadata.getItem(id);

        /** @type {Button} */
        const newButton = {
            name: 'MetaCubeInfo',
            component: 'MetaCubeInfo',
            props: {
                type: 'update',
                icon: 'bi bi-info-circle',
                title: 'Информация о кубе',
                server: sreda.env?.ESB_NAME || '',
                service: `metadata/object/${id}`,
                cubeInfo,
            },
        };

        innerResult.buttons?.push(newButton);

        return innerResult;
    }
}

module.exports = MetaCubeInfoService;
