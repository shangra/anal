declare function _exports(
    sequelize: Sequelize,
    DataTypes: typeof DataTypes
): typeof GroupUser;
export = _exports;
export type TGroupUserAttributes =
    import('./types/GroupUser').TGroupUserAttributes;
export type TGroupUserCreationAttributes =
    import('./types/GroupUser').TGroupUserCreationAttributes;
import { Sequelize } from 'sequelize/types/sequelize';
import { DataTypes } from 'sequelize';
/**
 * @typedef {import('./type/GroupUser').TGroupUserAttributes} TGroupUserAttributes
 * @typedef {import('./type/GroupUser').TGroupUserCreationAttributes} TGroupUserCreationAttributes
 */
/**
 * @class GroupUser
 * @extends {DB<TGroupUserAttributes, TGroupUserCreationAttributes>}
 */
declare class GroupUser extends DB<
    import('./types/GroupUser').TGroupUserAttributes,
    import('./types/GroupUser').TGroupUserCreationAttributes
> {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ Group }: { Group: any }): void;
    constructor(
        values?: import('sequelize').Optional<
            import('./types/GroupUser').TGroupUserCreationAttributes,
            import('sequelize/types/utils').NullishPropertiesOf<
                import('./types/GroupUser').TGroupUserCreationAttributes
            >
        >,
        options?: import('sequelize').BuildOptions
    );
}
import DB = require('../../../../core/db/rls/DB');
//# sourceMappingURL=groupuser.d.ts.map
