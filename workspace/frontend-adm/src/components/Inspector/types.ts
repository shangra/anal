import type React from 'react';
import type { NormalizedNode } from 'components/MetadataHier/types';
import type { Restrictions } from 'components/Inspector/conditionTypes';

/** Манифест формы — имя и описание */
export interface FormManifest {
    name: string;
    description: string;
}

/** Схема связи поля (link) */
export interface FormLink {
    type: string;
    metalink?: string;
    parent?: string;
    field?: string[];
}

/** Допустимые типы полей формы */
export type FormFieldType =
    | 'STRING'
    | 'INTEGER'
    | 'REAL'
    | 'BOOL'
    | 'TEXT'
    | 'JSON'
    | 'LIST'
    | 'COMPOSITE'
    | 'REF'
    | 'GREF'
    | 'DATE'
    | 'DATETIME'
    | 'COLOR';

/** Данные кнопок */
export interface FormButton {
    component: string;
    name: string;
    props: Record<string, any>;
}

/** Описание одного поля формы */
export interface FormFieldItem {
    name: string;
    description: string;
    type: FormFieldType;
    readOnly?: boolean;
    template?: string;
    list?: Record<string, string>;
    link?: FormLink;
    useParent?: boolean;
    parent?: string;
    component?: string;
    props?: Record<string, any>;
    children?: FormFieldItem[];
    disabled?: boolean;
    required?: boolean;
    default?: unknown;
    nullable?: boolean;
    valueType?: string;
    buttons?: FormButton[];
    tabs?: { name: string; content: Record<string, FormFieldItem>[] }[];
    restrictions?: Restrictions;
}

/** Схема метаданных — то, что приходит в formData */
export interface FormSchema {
    type: 'create' | 'update';
    form: FormFieldItem[];
    buttons?: FormButton[];
    manifest: FormManifest;
    data: Record<string, any>;
}

/** Одно значение внутри COMPOSITE поля */
export interface FormCompositeValue {
    type: number;
    value: string;
    link?: string;
}

/** Плоские значения формы — собираются в buildValuesFromForm */
export interface FormValues {
    'manifest.name': string;
    'manifest.description': string;
    [key: string]: string | FormCompositeValue[] | undefined;
}

/** Контекст для onSave */
export interface OnSaveContext {
    node: NormalizedNode;
    form: FormSchema;
    server?: string;
    winId?: string;
}

// ---- Общие пропсы для Form-компонентов ----

export interface FormComponentData {
    name: string;
    description?: string;
    template?: string;
    type?: FormFieldType | string;
    list?: Record<string, string | Record<string, string>>;
    link?: string | Record<string, unknown>;
    default?: unknown;
    readonly?: boolean;
    disabled?: boolean;
    nullable?: boolean;
    required?: boolean;
    buttons?: { type?: string; component?: string; name?: string; props?: Record<string, unknown> }[];
    parent?: string;
    useParent?: boolean;
    [key: string]: unknown;
}

export type FormOnChange = (name: string, value: unknown, parentInfo?: Record<string, unknown>) => void;

export type FormParentInfo = Record<string, Record<string, unknown> | string>;

export interface FormComponentProps {
    server?: string;
    value?: unknown;
    data: FormComponentData;
    disabled?: boolean;
    readOnly?: boolean;
    forceValue?: unknown;
    onChange?: FormOnChange;
    onLoadData?: (parentInfo: Record<string, unknown>) => void;
    children?: React.ReactNode;
    node?: unknown;
    formValues?: Record<string, unknown>;
    parentInfo?: FormParentInfo;
    style?: React.CSSProperties;
    loading?: boolean;
    required?: boolean;
    type?: string;
    name?: string;
}
