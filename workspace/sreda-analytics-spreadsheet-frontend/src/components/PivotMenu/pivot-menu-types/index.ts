import type {
    IField,
    IFieldResponse,
    ILayer,
    ILayerResponse,
    IPivotMenuProps,
    IPivotMenuState,
    ISchemaInfo,
} from './pivot-menu.types';
// Типы блока схем
import type { ISnapshot } from './pivot-schema.types';

// Интерфейс отображаемых блоков в меню
interface IFeatures {
    /**
     * Флаг отображения блока слоев
     */
    isLayersShow: boolean;
    /**
     * Флаг отображения блока фильтров
     */
    isFiltersShow: boolean;
    /**
     * Флаг отображения блока колонок
     */
    isColumnsShow: boolean;
    /**
     * Флаг отображения блока строк
     */
    isRowsShow: boolean;
    /**
     * Флаг отображения блока значений
     */
    isValuesShow: boolean;
    /**
     * Флаг отображения флага итога колонок
     */
    isColumnsTotalShow: boolean;
    /**
     * Флаг отображения флага итога строк
     */
    isRowsTotalShow: boolean;
    /**
     * Флаг отображения флага "Сохранять раскрытие иерархий"
     */
    isRecalculateShow: boolean;
    /**
     * Флаг повторения подписей элементов
     */
    isRepeatHeaders: boolean;
    /**
     * Флаг отображения флага "Обезличенные данные"
     */
    isMaskShow: boolean;
    /**
     * Флаг отображения флага "Классический макет"
     */
    isClassic: boolean;
    /**
     * Флаг отображения измерения "Слои"
     */
    isStaticLayers: boolean;
    /**
     * Флаг отображения измерения "Значения"
     */
    isStaticValues: boolean;
    /**
     * Флаг отображения флага "Все значения"
     */
    isColumnAllValuesShow: boolean;
    /**
     * Флаг отображения флага "Все значения"
     */
    isRowsAllValuesShow: boolean;
}

// Интерфейс параметров меню
interface IPivotParams {
    columns: unknown[];
    rows: unknown[];
    values: unknown[];
    filter: unknown[];
    layers: ILayer[];
    fields: IField[];
    rowsTotal: boolean;
    columnsTotal: boolean;
    recalculate: boolean;
    isMask: boolean;
    isClassic: boolean;
    columnsAllValues: boolean;
    rowsAllValues: boolean;
    measureUnit?: string;
}

// Интерфейс данных для формирования хэша
interface IHashData {
    columns: unknown[];
    rows: unknown[];
    values: unknown[];
    filter: unknown[];
}

export type {
    IPivotParams,
    IHashData,
    IPivotMenuProps,
    IPivotMenuState,
    IFeatures,
    ISnapshot,
    IFieldResponse,
    IField,
    ILayerResponse,
    ILayer,
    ISchemaInfo,
};
