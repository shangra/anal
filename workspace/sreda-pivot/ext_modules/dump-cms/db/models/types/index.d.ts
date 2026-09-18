import { ModelStatic } from 'sequelize';
import { IDatabase } from '../../../../../core/db/models/types';

import dumpmeta from '../dumpmeta';

export type TDumpMeta = ModelStatic<InstanceType<ReturnType<typeof dumpmeta>>>;

declare module '../../../../../core/db/models/types' {
    interface IDatabase {
        DumpMeta: TDumpMeta;
    }
}
