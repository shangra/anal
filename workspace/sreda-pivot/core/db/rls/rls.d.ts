/**
 * @import { TRlsAttributes, TRlsCreationAttributes } from './types/rls'
 */
/**
 * @class Rls
 * @extends {Sequelize.Model<TRlsAttributes, TRlsCreationAttributes>}
 */
export class Rls extends Sequelize.Model<TRlsAttributes, TRlsAttributes> {
    static associate(): void;
    constructor(values?: Sequelize.Optional<TRlsAttributes, Sequelize.Utils.NullishPropertiesOf<TRlsAttributes>>, options?: Sequelize.BuildOptions);
}
import type { TRlsAttributes } from './types/rls';
import Sequelize = require("sequelize");
//# sourceMappingURL=rls.d.ts.map