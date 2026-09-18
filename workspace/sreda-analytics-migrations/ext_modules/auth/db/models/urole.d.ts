declare function _exports(
    sequelize: Sequelize,
    DataTypes: typeof DataTypes
): typeof URoles;
export = _exports;
export type TURolesAttributes = import('./types/URoles').TURolesAttributes;
export type TURolesCreationAttributes =
    import('./types/URoles').TURolesCreationAttributes;
import { Sequelize } from 'sequelize/types/sequelize';
import { DataTypes } from 'sequelize';
/**
 * @typedef {import('./type/URoles').TURolesAttributes} TURolesAttributes
 * @typedef {import('./type/URoles').TURolesCreationAttributes} TURolesCreationAttributes
 */
/**
 * @class URoles
 * @extends {DB<TURolesAttributes, TURolesCreationAttributes>}
 */
declare class URoles extends DB<
    import('./types/URoles').TURolesAttributes,
    import('./types/URoles').TURolesCreationAttributes
> {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ User, URules }: { User: any; URules: any }): void;
    constructor(
        values?: import('sequelize').Optional<
            import('./types/URoles').TURolesCreationAttributes,
            import('sequelize/types/utils').NullishPropertiesOf<
                import('./types/URoles').TURolesCreationAttributes
            >
        >,
        options?: import('sequelize').BuildOptions
    );
}
import DB = require('../../../../core/db/rls/DB');
//# sourceMappingURL=urole.d.ts.map
