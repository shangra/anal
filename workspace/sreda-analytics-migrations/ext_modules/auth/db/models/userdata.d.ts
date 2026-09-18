declare function _exports(
    sequelize: Sequelize,
    DataTypes: typeof DataTypes
): typeof UserData;
export = _exports;
export type TUserDataAttributes =
    import('./types/UserData').TUserDataAttributes;
export type TUserDataCreationAttributes =
    import('./types/UserData').TUserDataCreationAttributes;
import { Sequelize } from 'sequelize/types/sequelize';
import { DataTypes } from 'sequelize';
/**
 * @typedef {import('./type/UserData').TUserDataAttributes} TUserDataAttributes
 * @typedef {import('./type/UserData').TUserDataCreationAttributes} TUserDataCreationAttributes
 */
/**
 * @class UserData
 * @extends {DB<TUserDataAttributes, TUserDataCreationAttributes>}
 */
declare class UserData extends DB<
    import('./types/UserData').TUserDataAttributes,
    import('./types/UserData').TUserDataCreationAttributes
> {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ UAttributes }: { UAttributes: any }): void;
    constructor(
        values?: import('sequelize').Optional<
            import('./types/UserData').TUserDataCreationAttributes,
            import('sequelize/types/utils').NullishPropertiesOf<
                import('./types/UserData').TUserDataCreationAttributes
            >
        >,
        options?: import('sequelize').BuildOptions
    );
}
import DB = require('../../../../core/db/rls/DB');
//# sourceMappingURL=userdata.d.ts.map
