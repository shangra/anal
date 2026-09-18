declare function _exports(
    sequelize: Sequelize,
    DataTypes: typeof DataTypes
): typeof Users;
export = _exports;
export type TUserAttributes = import('./types/User').TUserAttributes;
export type TUserCreationAttributes =
    import('./types/User').TUserCreationAttributes;
import { Sequelize } from 'sequelize/types/sequelize';
import { DataTypes } from 'sequelize';
/**
 * @typedef {import('./type/User').TUserAttributes} TUserAttributes
 * @typedef {import('./type/User').TUserCreationAttributes} TUserCreationAttributes
 */
/**
 * @class User
 * @extends {DB<TUserAttributes, TUserCreationAttributes>}
 */
declare class Users extends DB<
    import('./types/User').TUserAttributes,
    import('./types/User').TUserCreationAttributes
> {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({
        URules,
        URoles,
        Group,
        UserInfos,
        Users,
    }: {
        URules: any;
        URoles: any;
        Group: any;
        UserInfos: any;
        Users: any;
    }): void;
    /**
     * @param {{ id: any; }} data
     */
    static DumpInstruction(data: { id: any }): {};
    constructor(
        values?: import('sequelize').Optional<
            import('./types/User').TUserCreationAttributes,
            import('sequelize/types/utils').NullishPropertiesOf<
                import('./types/User').TUserCreationAttributes
            >
        >,
        options?: import('sequelize').BuildOptions
    );
}
import DB = require('../../../../core/db/rls/DB');
//# sourceMappingURL=user.d.ts.map
