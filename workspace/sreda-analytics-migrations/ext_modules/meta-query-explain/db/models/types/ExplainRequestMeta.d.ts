import { Optional } from "sequelize";
import { TDBAttributes, TDBCreationAttributes } from "../../../../../core/db/rls/types";

export type TExplainRequestMetaAttributes = {
  id: string;
  meta: string;
};

export type TExplainRequestMetaCreationAttributes = Optional<TExplainRequestMetaAttributes, "id">;
