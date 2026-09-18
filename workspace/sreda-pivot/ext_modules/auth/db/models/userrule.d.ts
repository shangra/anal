declare function _exports(
    sequelize: Sequelize,
    DataTypes: typeof DataTypes
): typeof UserRule;
export = _exports;
export type TUserRuleAttributes =
    import('./types/UserRule').TUserRuleAttributes;
export type TUserRuleCreationAttributes =
    import('./types/UserRule').TUserRuleCreationAttributes;
import { Sequelize } from 'sequelize/types/sequelize';
import { DataTypes } from 'sequelize';
/**
 * @typedef {import('./type/UserRule').TUserRuleAttributes} TUserRuleAttributes
 * @typedef {import('./type/UserRule').TUserRuleCreationAttributes} TUserRuleCreationAttributes
 */
/**
 * @class UserRule
 * @extends {DB<TUserRuleAttributes, TUserRuleCreationAttributes>}
 */
declare class UserRule extends DB<
    import('./types/UserRule').TUserRuleAttributes,
    import('./types/UserRule').TUserRuleCreationAttributes
> {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     * @param {any} models
     */
    static associate(models: any): void;
    /**
     * @param {{ rule_id: any; }} data
     */
    static DumpInstruction(data: { rule_id: any }): {};
    constructor(
        values?: import('sequelize').Optional<
            import('./types/UserRule').TUserRuleCreationAttributes,
            import('sequelize/types/utils').NullishPropertiesOf<
                import('./types/UserRule').TUserRuleCreationAttributes
            >
        >,
        options?: import('sequelize').BuildOptions
    );
}
import DB = require('../../../../core/db/rls/DB');
//# sourceMappingURL=userrule.d.ts.map
