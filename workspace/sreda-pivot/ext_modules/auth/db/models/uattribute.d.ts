declare function _exports(
    sequelize: Sequelize,
    DataTypes: typeof DataTypes
): typeof UAttribute;
export = _exports;
export type TUAttributeAttributes =
    import('./types/UAttribute').TUAttributeAttributes;
export type TUAttributeCreationAttributes =
    import('./types/UAttribute').TUAttributeCreationAttributes;
import { Sequelize } from 'sequelize/types/sequelize';
import { DataTypes } from 'sequelize';
/**
 * @typedef {import('./type/UAttribute').TUAttributeAttributes} TUAttributeAttributes
 * @typedef {import('./type/UAttribute').TUAttributeCreationAttributes} TUAttributeCreationAttributes
 */
/**
 * @class UAttribute
 * @extends {DB<TUAttributeAttributes, TUAttributeCreationAttributes>}
 */
declare class UAttribute extends DB<
    import('./types/UAttribute').TUAttributeAttributes,
    import('./types/UAttribute').TUAttributeCreationAttributes
> {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ UserData }: { UserData: any }): void;
    constructor(
        values?: import('sequelize').Optional<
            import('./types/UAttribute').TUAttributeCreationAttributes,
            import('sequelize/types/utils').NullishPropertiesOf<
                import('./types/UAttribute').TUAttributeCreationAttributes
            >
        >,
        options?: import('sequelize').BuildOptions
    );
}
import DB = require('../../../../core/db/rls/DB');
//# sourceMappingURL=uattribute.d.ts.map
