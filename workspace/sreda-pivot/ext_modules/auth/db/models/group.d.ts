declare function _exports(
    sequelize: Sequelize,
    DataTypes: typeof DataTypes
): typeof Group;
export = _exports;
export type TGroupAttributes = import('./types/Group').TGroupAttributes;
export type TGroupCreationAttributes =
    import('./types/Group').TGroupCreationAttributes;
import { Sequelize } from 'sequelize/types/sequelize';
import { DataTypes } from 'sequelize';
/**
 * @typedef {import('./type/Group').TGroupAttributes} TGroupAttributes
 * @typedef {import('./type/Group').TGroupCreationAttributes} TGroupCreationAttributes
 */
/**
 * @class Group
 * @extends {DB<TGroupAttributes, TGroupCreationAttributes>}
 */
declare class Group extends DB<
    import('./types/Group').TGroupAttributes,
    import('./types/Group').TGroupCreationAttributes
> {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ User }: { User: any }): void;
    constructor(
        values?: import('sequelize').Optional<
            import('./types/Group').TGroupCreationAttributes,
            import('sequelize/types/utils').NullishPropertiesOf<
                import('./types/Group').TGroupCreationAttributes
            >
        >,
        options?: import('sequelize').BuildOptions
    );
}
import DB = require('../../../../core/db/rls/DB');
//# sourceMappingURL=group.d.ts.map
