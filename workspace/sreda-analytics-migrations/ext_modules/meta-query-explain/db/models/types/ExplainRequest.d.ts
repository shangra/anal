import { Optional } from "sequelize";
import { TDBAttributes, TDBCreationAttributes } from "../../../../../core/db/rls/types";

export type TExplainRequestAttributes = {
  id: string;
  answerId: string;
  plan: string;
};

export type TExplainRequestCreationAttributes = Optional<TExplainRequestAttributes, "id">;
