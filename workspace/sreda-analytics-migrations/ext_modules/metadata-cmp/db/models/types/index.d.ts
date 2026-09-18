import { IModels } from "../../../../../core/db/models/types";
import { DBStatic } from "../../../../../core/db/rls/types";

import { TMetadataAttributes } from "./metadata";

export type TMetadata = DBStatic<InstanceType<ReturnType<typeof metadata>>> & Optional<TMetadataAttributes>;

declare module "../../../../../core/db/models/types" {
  interface IModels {
    Metadata?: TMetadata;
  }
}
