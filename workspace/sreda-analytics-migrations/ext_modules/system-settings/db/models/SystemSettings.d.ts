declare namespace _exports {
    export { TSystemSettingsAttributes, TSystemSettingsCreationAttributes };
}
declare function _exports(sequelize: Sequelize, DataTypes: typeof import("sequelize/types/data-types")): typeof SystemSettings;
export = _exports;
type TSystemSettingsAttributes = import("./type/SystemSettings").TSystemSettingsAttributes;
type TSystemSettingsCreationAttributes = import("./type/SystemSettings").TSystemSettingsCreationAttributes;
import { Sequelize } from "sequelize/types/sequelize";
/**
 * @typedef {import('./type/SystemSettings').TSystemSettingsAttributes} TSystemSettingsAttributes
 * @typedef {import('./type/SystemSettings').TSystemSettingsCreationAttributes} TSystemSettingsCreationAttributes
 */
/**
 * @class SystemSettings
 * @extends {DB<TSystemSettingsAttributes, TSystemSettingsCreationAttributes>}
 */
declare class SystemSettings extends DB<import("./type/SystemSettings").TSystemSettingsAttributes, import("./type/SystemSettings").TSystemSettingsCreationAttributes> {
    static associate(models: any): void;
    constructor(values?: import("sequelize").Optional<import("./type/SystemSettings").TSystemSettingsCreationAttributes, import("sequelize/types/utils").NullishPropertiesOf<import("./type/SystemSettings").TSystemSettingsCreationAttributes>>, options?: import("sequelize").BuildOptions);
}
import DB = require("../../../../core/db/rls/DB");
//# sourceMappingURL=SystemSettings.d.ts.map