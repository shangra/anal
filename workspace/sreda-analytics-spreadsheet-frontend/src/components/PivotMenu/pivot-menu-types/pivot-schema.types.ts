import { HistoryCacheType } from '../../SpreadSheetPlugins/PluginPivot/types';
import { IPivotParams } from './index';

// Интерфейс сохраненных настроек таблицы
interface ITableParams {
    // Количество колонок
    columnsCount: number;
    // Список объектов с информацией о колонках (ширина, высота, цвет, итд.)
    columnsMeta: Record<number, unknown>;
    // Количество строк
    rowsCount: number;
    // Список объектов с информацией о строках (ширина, высота, цвет, итд.)
    rowsMeta: Record<number, unknown>;
}

export interface ISnapshotOld {
    // Наименование снапшота
    name: string;
    // UUID сервиса
    infoserviceId: string;
    // Ссылка на куб, для которого был сделан снапшот
    url: string;
    // Версия снапшота
    version: string;
    /**
     * Сохраненная схема данных
     * @deprecated Use args instead
     */
    schemaSettings?: IPivotParams;
    args: IPivotParams;
    pivotParams: Record<string, string>;
    // Сохраненные параметры таблицы
    tableParams: ITableParams;
    // Сохраненные данные полей
    cacheFields?: unknown[];
    history?: (keyof HistoryCacheType['loadNewChunk'])[];
    historyCache?: HistoryCacheType;
}

interface ISnapshotNewOptions {
    cubeId: string;
    infoserviceId: string;
    reqLimit: string;
    server: string;
}

export interface ISnapshotNew {
    key: string;
    options?: ISnapshotNewOptions;
    state: any;
    url: string;
    version: string;
}

// Интерфейс снапшота данных
type ISnapshot = ISnapshotNew | ISnapshotOld;

interface ILayerRlsCondition {
    name: string;
    description: string;
    apply: boolean;
}

interface ILayerRls {
    name: string;
    description: string;
    isMask?: boolean;
    conditions: ILayerRlsCondition[];
}

export type { IPivotParams, ISnapshot, ILayerRls };
