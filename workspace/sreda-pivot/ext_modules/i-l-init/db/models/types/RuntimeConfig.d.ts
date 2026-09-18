import { Optional } from "sequelize";
import { TDBAttributes, TDBCreationAttributes } from "../../../../../core/db/rls/types";

export type RuntimeConfigAttributes = {
    id: string;
    key: string;
    value: string;
};

export type RuntimeConfigCreationAttributes = Optional<RuntimeConfigAttributes, "id">;