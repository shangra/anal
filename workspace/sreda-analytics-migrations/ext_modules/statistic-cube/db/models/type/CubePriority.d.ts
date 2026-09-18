import { Model } from 'sequelize';

export interface CubePriorityAttributes {
    id: string;
    cube_id: string;
    priority: number;
    manual: boolean;
    createdAt: Date;
    updatedAt: Date;
};


export interface CubePriorityCreationAttributes extends Partial<CubePriorityAttributes> {
    id?: string;
}


export class CubePriority
    extends Model<CubePriorityAttributes, CubePriorityCreationAttributes>
    implements CubePriorityAttributes {
        id!: string;
        cube_id!: string;
        priority!: number;
        manual!: boolean;
        createdAt!: Date;
        updatedAt!: Date;

        static associate(models: any): void;
};