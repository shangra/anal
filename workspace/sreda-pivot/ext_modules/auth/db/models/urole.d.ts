declare function _exports(
    sequelize: Sequelize,
    DataTypes: typeof DataTypes
): typeof URole;
export = _exports;
export type TURoleAttributes = import('./types/URole').TURoleAttributes;
export type TURoleCreationAttributes =
    import('./types/URole').TURoleCreationAttributes;
import { Sequelize } from 'sequelize/types/sequelize';
import { DataTypes } from 'sequelize';
/**
 * @typedef {import('./type/URole').TURoleAttributes} TURoleAttributes
 * @typedef {import('./type/URole').TURoleCreationAttributes} TURoleCreationAttributes
 */
/**
 * @class URole
 * @extends {DB<TURoleAttributes, TURoleCreationAttributes>}
 */
declare class URole extends DB<
    import('./types/URole').TURoleAttributes,
    import('./types/URole').TURoleCreationAttributes
> {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ User, URule }: { User: any; URule: any }): void;
    constructor(
        values?: import('sequelize').Optional<
            import('./types/URole').TURoleCreationAttributes,
            import('sequelize/types/utils').NullishPropertiesOf<
                import('./types/URole').TURoleCreationAttributes
            >
        >,
        options?: import('sequelize').BuildOptions
    );
}
import DB = require('../../../../core/db/rls/DB');
//# sourceMappingURL=urole.d.ts.map
