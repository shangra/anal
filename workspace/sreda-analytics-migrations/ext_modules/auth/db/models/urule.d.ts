declare function _exports(
    sequelize: Sequelize,
    DataTypes: typeof DataTypes
): typeof URules;
export = _exports;
export type TURulesAttributes = import('./types/URules').TURulesAttributes;
export type TURulesCreationAttributes =
    import('./types/URules').TURulesCreationAttributes;
import { Sequelize } from 'sequelize/types/sequelize';
import { DataTypes } from 'sequelize';
/**
 * @typedef {import('./type/URules').TURulesAttributes} TURulesAttributes
 * @typedef {import('./type/URules').TURulesCreationAttributes} TURulesCreationAttributes
 */
/**
 * @class URules
 * @extends {DB<TURulesAttributes, TURulesCreationAttributes>}
 */
declare class URules extends DB<
    import('./types/URules').TURulesAttributes,
    import('./types/URules').TURulesCreationAttributes
> {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ User, URoles }: { User: any; URoles: any }): void;
    constructor(
        values?: import('sequelize').Optional<
            import('./types/URules').TURulesCreationAttributes,
            import('sequelize/types/utils').NullishPropertiesOf<
                import('./types/URules').TURulesCreationAttributes
            >
        >,
        options?: import('sequelize').BuildOptions
    );
}
import DB = require('../../../../core/db/rls/DB');
//# sourceMappingURL=urule.d.ts.map
