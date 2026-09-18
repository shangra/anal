import { IModels } from "../../../../../core/db/models/types";

import { DBStatic } from "../../../../../core/db/rls/types/DBStatic";

import * as systemSettings from "../SystemSettings";

export type SystemSettings = DBStatic<ReturnType<typeof systemSettings>>;

declare module "../../../../../core/db/models/types" {
  interface IModels {
    SystemSettings: SystemSettings;
  }
}
