// Интерфейс параметров (props) меню

import { ReactElement } from 'react';
import { ButtonColors } from 'ui-kit';

import { NumericScale, PluginPivotArg } from '../../SpreadSheetPlugins/PluginPivot/types';
import { IFeatures, IPivotParams } from './index';

// Интерфейс инстанса плагина, отвечающего за отрисовку куба
interface IMasterInstance {
    export: () => unknown;
    import: (json: object) => void;
    clearHistory?: () => void;
}

// Интерфейс параметров меню
interface IPivotMenuProps {
    // UUID таблицы
    tableId: string;
    // Список скрываемых блоков, записанный через запятую
    features?: (
        | 'layers'
        | 'filter'
        | 'columns'
        | 'columns.totals'
        | 'rows'
        | 'rows.totals'
        | 'values'
        | 'recalculate'
        | 'mask'
        | 'columns.allValues'
        | 'rows.allValues'
    )[];
    // Параметры меню
    pivotParams: string;
    // Инстанс плагина, отвечающего за отрисовку куба
    masterInstance: IMasterInstance;
    // Функция получения названия и отслеживания именения схемы
    handleSchemaInfo: ({
        name,
        isChanged,
        values,
        measureUnit,
    }: {
        name?: string;
        isChanged?: boolean;
        values?: PluginPivotArg[];
        measureUnit?: NumericScale;
    }) => void;
    // Список классов
    className?: string;
    // Callback начала загрузки
    onFetchStart?: (...args: unknown[]) => unknown;
    // Callback конца загрузки
    onFetchEnd?: (...args: unknown[]) => unknown;
    // Callback изменения данных меню
    onChange?: (...args: unknown[]) => unknown;
    // Callback получения данных меню
    handleClickGetData?: (...args: unknown[]) => unknown;
    isFetching: boolean;

    orientation: 'horizontal' | 'vertical';

    cancelRequest?: () => void;
}

interface IPreview {
    container: string;
    index: number;
}

// Интерфейс сохраненной информации о схеме
interface ISchemaInfo {
    standart: boolean;
    forAll: boolean;
    name: string;
    createdUser: string;
    updatedUser?: string;
    updatedAt?: string;
}

// Интерфейс параметра
interface IFieldResponse {
    id: string;
    description: string;
    name: string;
    label: string;
    typeParam: 'Measure' | 'Dimension';
    type: string;
    child?: unknown[];
    ref?: {
        link: string;
        value: string;
    };
    useMeasure?: boolean;
}

// Интерфейс подготовленного параметра
interface IField extends IFieldResponse {
    isActiveTableItem: boolean;
    isSelected: boolean;
    isLoading: boolean;
    isUsed: boolean;
    hasChild: boolean;
    isActiveDropdown?: boolean;
    hasChildToUpload?: boolean;
    onoffFilter?: boolean;
}

// Интерфейс слоя
interface ILayerResponse {
    id: string;
    parent: string;
    class_id: string;
    class: string;
    name: string;
    description: string;
    rank: number;
    onoff: boolean;
    ref?: string;
}

// Интерфейс состояния меню
interface IPivotMenuState extends IFeatures {
    // Флаг валидности формы
    isValid: boolean;
    // UUID таблицы
    tableId: string;
    // Флаг загрузки меню
    isFetching: boolean;
    // Хэш схемы данных
    hashSchema: string;
    // Хэш предыдущей схемы данных
    // oldHashSchema: string;
    // Флаг очистки истории
    clearHistory: boolean;
    // Параметры меню
    pivotParams: IPivotParams;
    // Список актуальных полей
    actualFields: IFieldResponse[];
    // Список актуальных слоев
    actualLayers: ILayerResponse[];
    // UUID выбранной схемы
    schemaId: string;
    // Данный выбранной схемы
    schemaInfo: ISchemaInfo;
    // Прогресс сжатия снапшота
    loadingProgress: {
        isActive: boolean;
        progress: number;
        step: string;
        error: boolean;
    };
    activeId: string | null;
    activeElement: ReactElement | null;
    draggingItem: unknown | null;
    preview: IPreview | null;
    orientation: 'horizontal' | 'vertical';
}

export interface ILayerNoticeItem {
    icon: string;
    color: ButtonColors;
    content?: Partial<ILayerNoticeItem>[] | Partial<ILayerNoticeItem> | string;
}

// Интерфейс подготовленного слоя
interface ILayer {
    id: string;
    description: string;
    name: string;
    label: string;
    isSelected: boolean;
    hasCheck: boolean;
    hasChild: boolean;
    hasSorting: boolean;
    hasFilter: boolean;
    hasDelete: boolean;
    isIrrelevant: boolean;
    isMask: boolean;
    disabled: boolean;
    ref: string;
    onoff: boolean;
    reason: string;
    notices: ILayerNoticeItem[];
}

export type { IPivotMenuProps, IPivotMenuState, IFieldResponse, ILayerResponse, IField, ILayer, ISchemaInfo };
