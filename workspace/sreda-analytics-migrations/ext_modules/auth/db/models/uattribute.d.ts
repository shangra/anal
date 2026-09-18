declare function _exports(
    sequelize: Sequelize,
    DataTypes: typeof DataTypes
): typeof UAttributes;
export = _exports;
export type TUAttributesAttributes =
    import('./types/UAttributes').TUAttributesAttributes;
export type TUAttributesCreationAttributes =
    import('./types/UAttributes').TUAttributesCreationAttributes;
import { Sequelize } from 'sequelize/types/sequelize';
import { DataTypes } from 'sequelize';
/**
 * @typedef {import('./type/UAttributes').TUAttributesAttributes} TUAttributesAttributes
 * @typedef {import('./type/UAttributes').TUAttributesCreationAttributes} TUAttributesCreationAttributes
 */
/**
 * @class UAttributes
 * @extends {DB<TUAttributesAttributes, TUAttributesCreationAttributes>}
 */
declare class UAttributes extends DB<
    import('./types/UAttributes').TUAttributesAttributes,
    import('./types/UAttributes').TUAttributesCreationAttributes
> {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ UserData }: { UserData: any }): void;
    constructor(
        values?: import('sequelize').Optional<
            import('./types/UAttributes').TUAttributesCreationAttributes,
            import('sequelize/types/utils').NullishPropertiesOf<
                import('./types/UAttributes').TUAttributesCreationAttributes
            >
        >,
        options?: import('sequelize').BuildOptions
    );
}
import DB = require('../../../../core/db/rls/DB');
//# sourceMappingURL=uattribute.d.ts.map
