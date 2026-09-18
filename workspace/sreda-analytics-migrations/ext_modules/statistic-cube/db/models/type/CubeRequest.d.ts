import { Model } from "sequelize";

export interface CubeRequestAttributes {
  id: string;
  cube_id: string;
  response_time: number;
  parameters: JSON;
  status: string;
  createdAt: Date;
  createdUser: string;
  updatedAt: Date;
  errorMessage: string;
  extra: JSON;
}

export interface CubeRequestCreationAttributes extends Partial<CubeRequestAttributes> {
  id?: string;
}

export class CubeRequest
  extends Model<CubeRequestAttributes, CubeRequestCreationAttributes>
  implements CubeRequestAttributes
{
  id!: string;
  cube_id!: string;
  response_time!: number;
  parameters!: JSON;
  status!: string;
  createdAt!: Date;
  createdUser!: string;
  updatedAt!: Date;
  errorMessage!: string;
  extra!: JSON;

  static associate(models: any): void;
}
