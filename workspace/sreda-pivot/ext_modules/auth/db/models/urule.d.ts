declare function _exports(
    sequelize: Sequelize,
    DataTypes: typeof DataTypes
): typeof URule;
export = _exports;
export type TURuleAttributes = import('./types/URule').TURuleAttributes;
export type TURuleCreationAttributes =
    import('./types/URule').TURuleCreationAttributes;
import { Sequelize } from 'sequelize/types/sequelize';
import { DataTypes } from 'sequelize';
/**
 * @typedef {import('./type/URule').TURuleAttributes} TURuleAttributes
 * @typedef {import('./type/URule').TURuleCreationAttributes} TURuleCreationAttributes
 */
/**
 * @class URule
 * @extends {DB<TURuleAttributes, TURuleCreationAttributes>}
 */
declare class URule extends DB<
    import('./types/URule').TURuleAttributes,
    import('./types/URule').TURuleCreationAttributes
> {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ User, URole }: { User: any; URole: any }): void;
    constructor(
        values?: import('sequelize').Optional<
            import('./types/URule').TURuleCreationAttributes,
            import('sequelize/types/utils').NullishPropertiesOf<
                import('./types/URule').TURuleCreationAttributes
            >
        >,
        options?: import('sequelize').BuildOptions
    );
}
import DB = require('../../../../core/db/rls/DB');
//# sourceMappingURL=urule.d.ts.map
