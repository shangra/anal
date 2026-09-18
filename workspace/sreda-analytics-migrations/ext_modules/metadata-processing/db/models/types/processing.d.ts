import { Optional } from "sequelize";

export type TProcessingAttributes = {
  id: string;
  cube_id: string;
  layer_id: string;
  processing_id: string;
  date: Date;
  status: string;
};

export type TProcessingCreationAttributes = Optional<TProcessingAttributes, "id" | "date">;
