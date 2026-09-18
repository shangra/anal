import { ModelStatic } from "sequelize";
import { IModels } from "../../../../../core/db/models/types";

import * as processing from "../processing";

export type Processing = ModelStatic<ReturnType<typeof processing>>;

declare module "../../../../../core/db/models/types" {
  interface IModels {
    Processing: Processing;
  }
}
