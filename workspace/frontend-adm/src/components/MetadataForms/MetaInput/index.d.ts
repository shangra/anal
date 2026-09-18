/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-check

import * as React from 'react';
import { type DataManager } from 'components/MetadataForms/DataManager';
import type { IRefInputRequiredProps } from 'components/MetadataForms/Inputs/Ref';

declare global {
    namespace JSX {
        interface IntrinsicElements {
            div: any;
        }
    }
}

export interface IFieldUI {
    type?: string;
    ref?: IRefInputRequiredProps['metaRef'];
    placeholder?: string;
    show?: boolean;
    name?: string;
    description?: string;
    value?: any;
    precision?: number;
    options?: Array<{ value: string | number; label: string }>;
}

export interface IMetaInputContentProps {
    DataManager: any; // Необходимо уточнить тип интерфейса DataManager
    field?: string;
    name?: string;
    onChange?: (value: any) => void;
    onClear?: () => void;
    onDoubleClick?: (event: MouseEvent) => void;
    onKeyDown?: (event: KeyboardEvent) => void;
    readOnly?: boolean;
    fullWidth?: boolean;
    border?: boolean;
    table?: boolean;
    searchName?: string;
    accountName?: string;
    precision?: number;
    refSearchFields?: string[];
    labelMask?: string;
}

export interface IMetaInputContentState {
    field: string;
    fieldUI: IFieldUI;
    value: any;
    inputType: string;
    placeholder: string;
}

export class MetaInputContent<P = IMetaInputContentProps, S = IMetaInputContentState> extends React.Component<P, S> {
    constructor(props: IMetaInputContentProps);

    DataManager: DataManager;

    componentDidMount(): void;

    getByStringKey(obj: object, key: string): any;

    createFieldByData(value: any, fieldMetadata: IFieldUI): IFieldUI;

    setNewValueDataManager(field: string, value: any, dataManager?: any): void;

    changeMasterData(fieldUI: IFieldUI): void;

    getType(fieldUI: IFieldUI): string;

    onRefChange(newValue: any): void;

    onChange(value: any): void;

    onClear(): void;

    onChoiceClear(): void;

    onCompositeChange(newValue: any): void;

    onCompositeClear(): void;

    handleOnClick(event: React.MouseEvent): void;

    handleInputDoubleClick(event: React.MouseEvent): void;

    handleInputKeyDown(event: React.KeyboardEvent): void;

    getRefsLabel(): string | undefined;

    setRefsLabelDataManager(field: string, value: any, label: string): void;

    renderInputByType(params: any): React.ReactNode;

    render(): React.ReactElement;
}

interface IMetaInputProps extends IMetaInputContentProps {}

export class MetaInput extends React.Component<IMetaInputProps> {
    contentRef: React.RefObject<any>;

    render(): React.ReactElement;
}
