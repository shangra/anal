const Extensions = require('../../../core/class/Extensions.class');
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataClass();

class MetaEyeService extends Extensions {
    async formAfter(innerResult, functionInput) {
        const { id } = functionInput;
        if (!innerResult.buttons) {
            innerResult.buttons = [];
        }
        innerResult.buttons.push({
            name: 'MetaEye',
            component: 'MetaEye',
            props: {
                id,
                route: functionInput?.this.component?.toLowerCase(),
                server: sreda.env.ESB_NAME || '',
                service: `metadata/metaeye/eye/${id}`,
                title: 'Просмотр сущности метаданных',
            },
        });

        return innerResult;
    }

    /**
     * @param {string} id
     */
    async eye(id) {
        const mData = await Metadata.getMetadata(id);
        return { result: mData };
    }
}

module.exports = MetaEyeService;
