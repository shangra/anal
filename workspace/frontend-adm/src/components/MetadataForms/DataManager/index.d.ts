/* eslint-disable no-unused-private-class-members */
/* eslint-disable @typescript-eslint/no-unused-vars */
/** biome-ignore-all lint/suspicious/noDuplicateClassMembers: <explanation> */
/** biome-ignore-all lint/suspicious/useGetterReturn: <explanation> */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/MetadataForms/DataManager/index.d.ts

import React from 'react';

declare module 'on-change' {
    declare function onChange<T>(
        obj: T,
        callback: (path: string, value: any, prevValue: any, applyData?: boolean) => void,
    ): T & { reset(): void };
    export default onChange;
}

/** ====== Доп. типы для структуры metadata / data ====== */
export interface FieldMeta {
    name: string;
    field: string;
    label?: string;
    type?: string;
    id: string;
    description: string;
    inputValue?: string;
    ref?: { link: string; value: string };
    options?: Array<{ value: string | number; label: string }>;
    [k: string]: any;
}

export interface TabularPartInfo {
    Fields: Record<string, FieldMeta>;
    [k: string]: any;
}

export interface TabularPartMeta {
    info: TabularPartInfo;
    [k: string]: any;
}

export interface TreeObject {
    Fields: Record<string, FieldMeta>;
    TabularParts: Record<string, TabularPartMeta>;
}

export interface Metadata {
    id: string;
    treeObject: TreeObject;
    routes: string;
    manifest: {
        settings: {
            hierarchical: boolean;
        };
    };
}

/** refs: мапа значений ссылочных полей на подписи */
export type RefsMap = Record<string, Record<string | number, string>>;

export interface MetaRefs {
    record?: {
        refs?: RefsMap;
        [k: string]: any;
    };
    list?: {
        refs?: RefsMap;
        [k: string]: any;
    };
    [k: string]: any;
}

/** Данные элемента */
export interface ElementData {
    record: {
        /** Плоские поля записи */
        [field: string]: any;
        /** Табличные части: имяТЧ -> массив строк */
        TabularParts: Record<string, Array<Record<string, any>>>;
    };
}

/** Данные списка */
export interface ListData {
    /** Для режима списка */
    list: Array<Record<string, any>>;
}

/** Менеджер может держать и record, и list (в разные моменты времени) */
export type ManagerData = Partial<ElementData & ListData>;

/** ===================================================== */

interface ModalOptions {
    modalUUID?: string;
    parentModalUUID?: string;
    payload?: Record<string, unknown>;
}

interface DataManagerProps {
    metaOwner: string;
    /**
     * Сервер для запросов (прокидывается через контекст/пропсы).
     * '' означает «основной сервер» (default backend). См. SRDMDLTKLN-525.
     */
    server: string;
    options?: {
        type?: 'element' | 'list'; // Тип менеджера данных
        element?: number | string; // Первичный ключ элемента
        primaryKey?: string; // Поле первичного ключа
        method?: string; // Метод загрузки
        limit?: number; // Лимит записей для списка
        offset?: number; // Смещение записей для списка
        where?: Record<string, any>; // Условия фильтрации
        withTabularParts?: boolean; // Загружать ли табличную часть вместе с элементом
    };
    onBeforeLoad?: () => void;
    onLoad?: () => void;
    onAfterLoad?: () => void;
    onBeforeSave?: () => void;
    onSave?: () => void;
    onAfterSave?: () => void;
    onBeforeDelete?: () => void;
    onDelete?: () => void;
    onAfterDelete?: () => void;
    onBeforeMarkDeleted?: () => void;
    onMarkDeleted?: () => void;
    onAfterMarkDeleted?: () => void;
    children?: React.ReactNode;
}

// Общие опции для обоих режимов работы
interface CommonOptions {
    primaryKey?: string;
    element?: any | number | string;
    parentModalUUID?: string;
    modalUUID?: string;
    method?: string;
    payload?: Record<string, unknown>;
    type?: 'list' | 'element';
}

// Настройки для режима 'list'
interface ListOptions extends ElementOptions {
    limit?: number;
    offset?: number;
}

// Настройки для режима 'element'
interface ElementOptions extends CommonOptions {
    where?: { [key: string]: any };
    withTabularParts?: boolean;
}

// Итоговый тип опций
type Options = ListOptions;

export class DataManager extends React.Component<DataManagerProps> {
    /** Внутренний API-менеджер (приватное поле) */
    static readonly #ApiManager: ApiManager;

    /** Сервер для запросов (публичное поле, читается кнопками) */
    server: string;

    /** Текущее состояние менеджера */
    state: {
        type: 'element' | 'list';
        primaryKey: string;
        method: string;
        ready: boolean;
    };

    formId: string;

    primaryKey: string;

    modalUUID: string;

    metaOwner: string;

    options: Options;

    pages: number;

    currentSort: {
        column: string;
        direction: 'ASC' | 'DESC';
    } | null;

    /**
     * Данные менеджера.
     * В режиме элемента — { record: { ..., TabularParts: { tb: [{}] } } }
     * В режиме списка — { list: [ { ... }, ... ] }
     */
    // data: ManagerData;

    /**
     * Короткая мета, которая меняется динамически (refs и т.п.), используется в компонентах:
     * this.DataManager.meta?.record?.refs?.[field]?.[value]
     * this.DataManager.meta?.list?.refs?.[field]?.[value]
     */
    meta: MetaRefs;

    /**
     * Полная метадата (статическая схема), как в примерах:
     * this.DataManager.metadata.treeObject.Fields[fieldName]
     * this.DataManager.metadata.treeObject.TabularParts[tbname].info.Fields[fieldName]
     */
    metadata: Metadata;

    selectedRows: any[];

    formRefs: Record<string, any>;

    subs: ((() => void) | null)[];

    MasterData: ManagerData;

    constructor(props: DataManagerProps);

    get data(): ManagerData;

    set data(value: ManagerData);

    get meta(): MetaRefs;

    set meta(value: MetaRefs);

    /** Перезапись данных из MasterData */
    reWriteData(data: any, MasterData: any): any;

    /** Создание UI-описания поля по метаданным */
    createFieldByData(value: any, fieldMetadata: FieldMeta, innerFieldName?: string): any;

    /** Хук изменения данных */
    hookData(path: string, value: any, previousValue: any, applyData?: boolean): void;

    /** Подписки на изменения */
    addSub(cb: () => void): void;

    removeSub(cb: () => void): void;

    /** Хук изменения метаданных (динамических) */
    hookMetaData(path: string, value: any, previousValue: any, applyData?: boolean): void;

    /**
     * Регистрирует компонент, отображающий поле (используется в примерах):
     * this.DataManager.hookChangeFieldData(key, this)
     */
    hookChangeFieldData(path: string, instance: any): void;

    /** Преобразование данных списка */
    changeListData(originalData: any): void;

    /** Модальное окно с ошибкой */
    showErrorModal(errorStatus: string, errors: any[], errorStack: string, errorTitle: string): void;

    /** Клонирование детей с инжектом пропсов */
    cloneElements(childrens: React.ReactNode): React.ReactNode[];

    /** Пере-загрузка данных */
    ReloadData(): Promise<any>;

    /** Загрузка */
    Load(): Promise<any>;

    /** Сохранение */
    Save(): Promise<any>;

    /** Удаление */
    Delete(): Promise<any>;

    /** Пометка на удаление */
    MarkDeleted(): Promise<any>;
}

class ApiManager {
    constructor(options: {
        DataManager: DataManager;
        metaOwner: string;
        type: 'element' | 'list';
        method: string;
        /**
         * Сервер для запросов. '' означает «основной сервер» (default backend). См. SRDMDLTKLN-525.
         */
        server: string;
        options: Options;
        element: number | string;
        onBeforeLoad: (() => void) | null;
        onLoad: (() => void) | null;
        onAfterLoad: (() => void) | null;
        onBeforeSave: (() => void) | null;
        onSave: (() => void) | null;
        onAfterSave: (() => void) | null;
        onBeforeDelete: (() => void) | null;
        onDelete: (() => void) | null;
        onAfterDelete: (() => void) | null;
        onBeforeMarkDeleted: (() => void) | null;
        onMarkDeleted: (() => void) | null;
        onAfterMarkDeleted: (() => void) | null;
    });

    LoadData(metadata: any, options: any): Promise<any>;

    Load(element: number | string | null): Promise<any>;

    Save(data: any): Promise<any>;

    Delete(ids: number[] | string[]): Promise<any>;

    MarkDeleted(ids: number[] | string[]): Promise<any>;
}

export default DataManager;
