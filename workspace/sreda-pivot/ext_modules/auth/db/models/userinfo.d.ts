declare function _exports(
    sequelize: Sequelize,
    DataTypes: typeof DataTypes
): typeof UserInfo;
export = _exports;
export type TUserInfoAttributes =
    import('./types/UserInfo').TUserInfoAttributes;
export type TUserInfoCreationAttributes =
    import('./types/UserInfo').TUserInfoCreationAttributes;
import { Sequelize } from 'sequelize/types/sequelize';
import { DataTypes } from 'sequelize';
/**
 * @typedef {import('./type/UserInfo').TUserInfoAttributes} TUserInfoAttributes
 * @typedef {import('./type/UserInfo').TUserInfoCreationAttributes} TUserInfoCreationAttributes
 */
/**
 * @class UserInfo
 * @extends {DB<TUserInfoAttributes, TUserInfoCreationAttributes>}
 */
declare class UserInfo extends DB<
    import('./types/UserInfo').TUserInfoAttributes,
    import('./types/UserInfo').TUserInfoCreationAttributes
> {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ User }: { User: any }): void;
    constructor(
        values?: import('sequelize').Optional<
            import('./types/UserInfo').TUserInfoCreationAttributes,
            import('sequelize/types/utils').NullishPropertiesOf<
                import('./types/UserInfo').TUserInfoCreationAttributes
            >
        >,
        options?: import('sequelize').BuildOptions
    );
}
import DB = require('../../../../core/db/rls/DB');
//# sourceMappingURL=userinfo.d.ts.map
