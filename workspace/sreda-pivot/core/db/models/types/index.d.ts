import { Sequelize } from 'sequelize';

export interface IDatabase {
    sequelize: Sequelize;
    Sequelize: Sequelize;
}

export interface ReceivedFile {
    path: string;
    originalname: string;
    mimetype: string;
}

export interface BaseFailureResult {
    result: false;
}

export interface BaseSuccessResult {
    result: true;
}

export interface DataValues {
    id: string;
    code: number;
    markdel?: 0 | 1;
    createdUser: string;
    updatedUser: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Объекта Sequalize
 */
export interface SObject extends DataValues {
    dataValues: DataValues;
    _previousDataValues: DataValues;
    uniqno: number;
    _changed: Set<DataValues>;
    _options: {
        isNewRecord: boolean;
        _schema: string;
        _schemaDelimiter: string;
        raw: string;
        attributes: string[];
    };
    isNewRecord: boolean;
}
