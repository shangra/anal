declare function _exports(sequelize: Sequelize, DataTypes: typeof DataTypes): typeof DumpMeta;
export = _exports;
export type TDumpMetaAttributes = import('./types/DumpMeta').TDumpMetaAttributes;
export type TDumpMetaCreationAttributes = import('./types/DumpMeta').TDumpMetaCreationAttributes;
import { Sequelize } from 'sequelize/types/sequelize';
import { DataTypes } from 'sequelize';
/**
 * @typedef {import('./type/DumpMeta').TDumpMetaAttributes} TDumpMetaAttributes
 * @typedef {import('./type/DumpMeta').TDumpMetaCreationAttributes} TDumpMetaCreationAttributes
 */
/**
 * @class DumpMeta
 * @extends {Model<TDumpMetaAttributes, TDumpMetaCreationAttributes>}
 */
declare class DumpMeta extends Model<
    import('./types/DumpMeta').TDumpMetaAttributes,
    import('./types/DumpMeta').TDumpMetaCreationAttributes
> {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(): void;
    constructor(
        values?: import('sequelize').Optional<
            import('./types/DumpMeta').TDumpMetaCreationAttributes,
            import('sequelize/types/utils').NullishPropertiesOf<
                import('./types/DumpMeta').TDumpMetaCreationAttributes
            >
        >,
        options?: import('sequelize').BuildOptions
    );
}
import { Model } from 'sequelize/types/model';
//# sourceMappingURL=dumpmeta.d.ts.map
