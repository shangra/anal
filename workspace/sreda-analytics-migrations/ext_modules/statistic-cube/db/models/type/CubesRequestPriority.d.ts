import { Model } from 'sequelize';

export interface CubesRequestPriorityAttributes {
    id: string;
    cube_id: string;
    priority: number;
    parameters: JSON;
    createdAt: Date;
    updatedAt: Date;
};


export interface CubesRequestPriorityCreationAttributes extends Partial<CubesRequestPriorityAttributes> {
    id?: string;
}


export class CubeRequest
    extends Model<CubesRequestPriorityAttributes, CubesRequestPriorityCreationAttributes>
    implements CubesRequestPriorityAttributes {
        id!: string;
        cube_id!: string;
        priority!: number;
        parameters!: JSON;
        createdAt!: Date;
        updatedAt!: Date;

        static associate(models: any): void;
};