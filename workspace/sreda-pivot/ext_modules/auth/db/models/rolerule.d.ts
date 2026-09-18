declare function _exports(
    sequelize: Sequelize,
    DataTypes: typeof DataTypes
): typeof RoleRule;
export = _exports;
export type TRoleRuleAttributes =
    import('./types/RoleRule').TRoleRuleAttributes;
export type TRoleRuleCreationAttributes =
    import('./types/RoleRule').TRoleRuleCreationAttributes;
import { Sequelize } from 'sequelize/types/sequelize';
import { DataTypes } from 'sequelize';
/**
 * @typedef {import('./type/RoleRule').TRoleRuleAttributes} TRoleRuleAttributes
 * @typedef {import('./type/RoleRule').TRoleRuleCreationAttributes} TRoleRuleCreationAttributes
 */
/**
 * @class RoleRule
 * @extends {DB<TRoleRuleAttributes, TRoleRuleCreationAttributes>}
 */
declare class RoleRule extends DB<
    import('./types/RoleRule').TRoleRuleAttributes,
    import('./types/RoleRule').TRoleRuleCreationAttributes
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
            import('./types/RoleRule').TRoleRuleCreationAttributes,
            import('sequelize/types/utils').NullishPropertiesOf<
                import('./types/RoleRule').TRoleRuleCreationAttributes
            >
        >,
        options?: import('sequelize').BuildOptions
    );
}
import DB = require('../../../../core/db/rls/DB');
//# sourceMappingURL=rolerule.d.ts.map
