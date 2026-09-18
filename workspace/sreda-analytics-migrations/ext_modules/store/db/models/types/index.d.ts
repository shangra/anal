import { DBStatic } from "../../../../../core/db/rls/types";
import { IModels } from "../../../../../core/db/models/types";

import store from "../store";

export type TStore = DBStatic<InstanceType<ReturnType<typeof store>>>;

declare module "../../../../../core/db/models/types" {
  interface IModels {
    Store: TStore;
  }
}
