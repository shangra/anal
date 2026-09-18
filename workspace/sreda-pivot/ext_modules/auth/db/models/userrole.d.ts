declare function _exports(
    sequelize: Sequelize,
    DataTypes: typeof DataTypes
): typeof UserRole;
export = _exports;
export type TUserRoleAttributes =
    import('./types/UserRole').TUserRoleAttributes;
export type TUserRoleCreationAttributes =
    import('./types/UserRole').TUserRoleCreationAttributes;
import { Sequelize } from 'sequelize/types/sequelize';
import { DataTypes } from 'sequelize';
/**
 * @typedef {import('./type/UserRole').TUserRoleAttributes} TUserRoleAttributes
 * @typedef {import('./type/UserRole').TUserRoleCreationAttributes} TUserRoleCreationAttributes
 */
/**
 * @class UserRole
 * @extends {DB<TUserRoleAttributes, TUserRoleCreationAttributes>}
 */
declare class UserRole extends DB<
    import('./types/UserRole').TUserRoleAttributes,
    import('./types/UserRole').TUserRoleCreationAttributes
> {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     * @param {any} models
     */
    static associate(models: any): void;
    static DumpInstruction(data: any): {};
    constructor(
        values?: import('sequelize').Optional<
            import('./types/UserRole').TUserRoleCreationAttributes,
            import('sequelize/types/utils').NullishPropertiesOf<
                import('./types/UserRole').TUserRoleCreationAttributes
            >
        >,
        options?: import('sequelize').BuildOptions
    );
}
import DB = require('../../../../core/db/rls/DB');
//# sourceMappingURL=userrole.d.ts.map
