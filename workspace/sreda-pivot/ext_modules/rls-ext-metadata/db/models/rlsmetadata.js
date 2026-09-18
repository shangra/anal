const MetadataCb = require('../../../metadata-cmp/db/models/metadata');

const METADATA_WRITE_RULE = '232a43fb-ed52-414e-8562-75a814a1e8d1';

module.exports = (sequelize, DataTypes, models) => {
    const CleanModel = models?.['Metadata'] ?? MetadataCb(sequelize, DataTypes);

    CleanModel.RLSRule = () => ({
        CreateRules: [METADATA_WRITE_RULE],
        UpdateRules: [METADATA_WRITE_RULE],
        DeleteRules: [METADATA_WRITE_RULE],
    });

    const _afterRestore = CleanModel.afterRestore?.bind(CleanModel);
    const rlsAfterRestore = async function (data) {
        await _afterRestore?.(data);
        const { parent, id } = data;

        const RlsCoreServiceClass = require('../../../rls-core/services/RlsCore.service');
        const RlsCoreService = new RlsCoreServiceClass();

        await RlsCoreService.addParentPermissionsNested(parent, id, 'Metadata').catch(
            console.error
        );
        return data;
    };
    CleanModel.afterRestore = rlsAfterRestore.bind(CleanModel);

    const _DumpInstruction = CleanModel.DumpInstruction?.bind(CleanModel);
    const rlsDumpInstruction = function (data) {
        let result = {};
        if (data) {
            const dumpDataCleanModel = _DumpInstruction?.(data) ?? {};
            result = {
                ...dumpDataCleanModel,
                current: {
                    ...dumpDataCleanModel.current,
                    afterRestore: CleanModel.afterRestore,
                },
            };
        }
        return result;
    };
    CleanModel.DumpInstruction = rlsDumpInstruction.bind(CleanModel);

    return CleanModel;
};
