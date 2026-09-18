const MetadataClass = require('../../../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataClass();

const Extensions = require("../../../../../core/class/Extensions.class");

class OverloadsClass extends Extensions {
    async prepareOptionsAfter(innerResult, functionParams) {
        const fthis = functionParams.this;
        const options = functionParams._args[1];
        const treeObject = functionParams._args[2];

        if (!fthis.isProcessing) {
            return innerResult;
        }

        for (const field in treeObject.Fields) {
            const val = treeObject.Fields[field];

            val.value = null;

            const [processing] = Object.values(fthis.tableInfo.Processing);

            if (val.field === processing.TimeDimension.nameField) {
                val.value = 'date';
            }
        }

        return innerResult;
    }

    async getEntityAfter(innerResult, functionParams) {
    const fthis = functionParams.this;

    if (!fthis.isProcessing) { return innerResult; }

    const [processingId] = Object.keys(fthis.tableInfo.Processing);

    const entity = await Metadata.getParentInstance(processingId);

    return { id: processingId, entity };
}
}

module.exports = OverloadsClass;