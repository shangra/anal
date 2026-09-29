import { Component, type ReactNode, Suspense } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { CommonInputProps } from '../../../CommonInput';
import { DRQueryBuilder } from '../../../DRQueryBuilder';
import { jsonToState } from '../../../DRQueryBuilder/converters/jsonToState';
import { stateToJson } from '../../../DRQueryBuilder/converters/stateToJson';
import type { Group } from '../../../DRQueryBuilder/types';
import { ErrorBoundary } from '../../../ErrorBoundary';
import $windows from '../../../ui/windows.helper';
import styles from './StringBuilderInput.module.css';
import { String } from '../../../MetadataForms/Inputs/String';
import { Api } from '../../../MetadataForms/DataManager/Api';
import { generateLogsFileName } from '../../../MetadataForms/Inputs/utils';
import cn from 'classnames';
import { DataManager, type FieldMeta } from '../../../MetadataForms/DataManager';

export interface StringBuilderProps extends Omit<CommonInputProps, 'value' | 'onChange'> {
    fromName: string;
    name: string;
    toName?: string;
    DataManager: DataManager;
    onChange?: (value: string) => void;
    showLabel?: boolean;
    border?: boolean;
    table?: boolean;
    fullWidth?: boolean;
    tabularPartInfo?: { table: string };
    rowIndex: number;
    dataManagerFieldPath?: string;
    dataManagerFromFieldPath?: string;
    dataManagerToFieldPath?: string;
    readOnly?: boolean;
    api?: { type: { getFieldsById: (id: string) => Promise<any> } };
}

interface IField {
    id: string;
    name: string;
    field: string;
    description: string;
    inputValue?: string;
    ref: { link: string; value: string };
    showLabel?: boolean;
    type: string;
}

export interface StringBuilderState {
    field: IField | null;
    fromField: IField | null;
    toField: IField | null;
    value: string;
    disabled: boolean;
    modalUUID: string | null;
    errorMessage: string | undefined;
    showLabel?: boolean;
    border?: boolean;
    table?: boolean;
    fullWidth?: boolean;
    dataManagerFieldPath: string;
    dataManagerFromFieldPath: string;
    dataManagerToFieldPath: string;
    fieldUI: { value: string };
}

export class StringBuilderInputContent extends Component<StringBuilderProps, StringBuilderState> {
    setMasterData: (data: string) => void;
    DataManager = this.props?.DataManager ?? {};

    constructor(props: StringBuilderProps) {
        super(props);

        let field: StringBuilderState['field'] | null = null;
        let fromField: StringBuilderState['field'] | null = null;
        let toField: StringBuilderState['toField'] | null = null;

        let fields: Record<string, FieldMeta> = {};
        let headerFields: Record<string, any> = {};
        let tabFields: Record<string, any> = {};

        headerFields = fields = props.DataManager.metadata.treeObject.Fields;
        if (props.tabularPartInfo?.table) {
            tabFields = fields = props.DataManager.metadata.treeObject.TabularParts[props.tabularPartInfo.table].info.Fields;
        }

        const headerFieldsRus: Record<string, any> = {};
        const tabFieldsRus: Record<string, any> = {};
        for (const name in headerFields) {
            headerFieldsRus[`${headerFields[name].name}`] = headerFields[name];
        }
        for (const name in tabFields) {
            tabFieldsRus[`${tabFields[name].name}`] = tabFields[name];
        }

        let fromTCh = props.fromName.split('.')[0] === 'ТабличнаяЧасть';
        let toTCh = props.fromName.split('.')[0] === 'ТабличнаяЧасть';

        for (const [_, fieldMeta] of Object.entries(fields)) {
            if (fieldMeta?.name === props.name) field = fieldMeta as StringBuilderState['field'];
        }

        let dataManagerFromFieldPath = '';
        if (fromTCh) {
            fromField = tabFieldsRus[props.fromName.split('.')[1]];
            dataManagerFromFieldPath = `record.TabularParts.${props?.tabularPartInfo?.table}.${props.rowIndex}.${
                fromField!.field
            }`;
        } else {
            fromField = headerFieldsRus[props.fromName.split('.')[0]];
            dataManagerFromFieldPath = `record.${fromField?.field}`;
        }

        let dataManagerToFieldPath = '';
        if (toTCh) {
            toField = tabFieldsRus[props.fromName.split('.')[1]];
            dataManagerToFieldPath = `record.TabularParts.${props?.tabularPartInfo?.table}.${props.rowIndex}.${
                toField!.field
            }`;
        } else {
            toField = headerFieldsRus[props.fromName.split('.')[0]];
            dataManagerToFieldPath = `record.${toField?.field}`;
        }
        let dataManagerFieldPath = props.dataManagerFieldPath;

        // доработать привзяку к полю по умолчанию
        if (props.tabularPartInfo?.table) {
            dataManagerFieldPath =
                dataManagerFieldPath ?? `record.TabularParts.${props.tabularPartInfo.table}.${props.rowIndex}.${field!.field}`;
            this.setMasterData = props.DataManager.hookChangeFieldData(dataManagerFieldPath, this) as unknown as (
                data: string,
            ) => void;
        } else {
            dataManagerFieldPath = dataManagerFieldPath ?? `record.${field?.field}`;
            this.setMasterData = props.DataManager.hookChangeFieldData(dataManagerFieldPath, this) as unknown as (
                data: string,
            ) => void;
        }

        this.state = {
            field: field,
            fromField: fromField,
            toField: toField,
            value: this.getValueByPath(this.DataManager.MasterData, dataManagerFieldPath) ?? '',
            disabled: false,
            modalUUID: null,
            errorMessage: undefined,
            showLabel: props.showLabel ?? true,
            fullWidth: props.fullWidth ?? false,
            border: props.border ?? true,
            table: props.table ?? false,
            dataManagerFieldPath,
            dataManagerFromFieldPath,
            dataManagerToFieldPath,
            fieldUI: { value: '' },
        };
    }

    getValueByPath(obj: any, path: string) {
        return path.split('.').reduce((acc, key) => {
            return acc && acc[key] !== undefined ? acc[key] : undefined;
        }, obj);
    }

    changeMasterData(fieldUI: { value: string }) {
        this.setState({
            fieldUI: fieldUI,
            value: fieldUI.value,
        });
    }

    setFieldData(data: string) {
        this.setMasterData(data);
    }

    onChange = (value: string | null) => {
        this.setState({ value: value ?? '' }, () => {
            this.setFieldData(value ?? '');
        });
        this.props.onChange?.(value ?? '');
    };

    onClickCodeButton = async () => {
        if (this.state.modalUUID) {
            $windows.close(this.state.modalUUID, () => this.setState({ ...this.state, modalUUID: null }));
        }
        
        this.setState({ errorMessage: undefined });

        const fromValue = this.getValueByPath(this.props.DataManager.MasterData, this.state.dataManagerFromFieldPath);

        if (!fromValue) return this.setState({ errorMessage: `Не указан куб` });

        const toValue = this.getValueByPath(this.props.DataManager.MasterData, this.state.dataManagerToFieldPath);

        const fromRes = this.props?.api
            ? await this.props?.api?.type?.getFieldsById?.(fromValue)
            : await Api.fetchFieldsByObject(fromValue);

        if (!fromRes) return this.setState({ errorMessage: `Нет данных` });

        let toRes = null;
        if (toValue) {
            toRes = this.props?.api
                ? await this.props?.api?.type?.getFieldsById?.(toValue)
                : await Api.fetchFieldsByObject(toValue);
        }

        const initialState = await jsonToState(this.state.value, fromRes.registryMetadata?.data.treeObject.Refs || []);

        const content = (
            <Suspense>
                <div>
                    {toRes ? (
                        <DRQueryBuilder
                            mode="mapping"
                            fields={[...fromRes.registryFields, ...fromRes.registryTableFields]}
                            receiverFields={[...toRes.registryFields, ...toRes.registryTableFields]}
                            initialValue={initialState || undefined}
                            onChange={this.onQueryChange}
                        />
                    ) : (
                        <DRQueryBuilder
                            mode="query"
                            fields={[...fromRes.registryFields, ...fromRes.registryTableFields]}
                            initialValue={initialState || undefined}
                            onChange={this.onQueryChange}
                        />
                    )}
                </div>
            </Suspense>
        );

        const uuid = uuidv4();

        this.setState((prevState) => ({ ...prevState, modalUUID: uuid }));
        $windows.open('Создание строки запроса', content, {
            uuid,
        });
    };

    onClear = () => {
        this.setFieldData('');
        this.props.onClear?.();
        $windows.close(this.state.modalUUID, () => this.setState((prevState) => ({ ...prevState, modalUUID: null })));
    };

    onQueryChange = (value: Group) => {
        const newValue = JSON.stringify(stateToJson(value));
        this.setFieldData(newValue);
        this.setState(
            (prevState) => ({
                ...prevState,
                value: newValue,
            }),
            () => {
                this.props.onChange?.(this.state.value);
            },
        );
    };

    handleInputDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (this.props.onDoubleClick) {
            this.props.onDoubleClick(event);
        }
    };

    handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        // работает для выхода из режима редактирования ячейки
        if (this.props.onKeyDown) {
            this.props.onKeyDown(event);
        }

        if (event.key === 'Enter') {
            event.preventDefault();
        }
    };

    render() {
        const { fullWidth, border, table, value } = this.state;
        const { DataManager, ...restProps } = this.props;
        const mainWrapperClass = cn(styles.wrapper, {
            [styles.fullWidth]: fullWidth && table,
            [styles.noBorder]: !border && table,
        });

        const inputWrapperClass = cn(styles.inputWrapper, {
            [styles.fullWidth]: fullWidth && table,
            [styles.noBorder]: !border && table,
        });

        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: this.state },
                    fileName: generateLogsFileName('MetadataForms_StringBuilderInput_MOContent'),
                }}
            >
                <div className={mainWrapperClass}>
                    {this.state.showLabel && !this.props.tabularPartInfo ? (
                        <div className={styles.label}>{this.state.field?.description ?? '-'}</div>
                    ) : null}
                    <div className={inputWrapperClass} onDoubleClick={this.handleInputDoubleClick}>
                        <String
                            placeholder="Выберите условие"
                            {...this.props}
                            disabled={this.state.disabled}
                            value={value ?? ''}
                            name={this.state.field?.name ?? ''}
                            status={this.state.errorMessage ? 'error' : undefined}
                            hint={this.state.errorMessage}
                            onChange={this.onChange}
                            changeButton
                            readOnly={this.props.readOnly}
                            onClickChange={this.onClickCodeButton}
                            onClear={this.onClear}
                            onKeyDown={this.handleInputKeyDown}
                        />
                    </div>
                </div>
            </ErrorBoundary>
        );
    }
}

export class StringBuilder extends Component<StringBuilderProps> {
    render(): ReactNode {
        const { DataManager, ...propsWithoutDataManager } = this.props;

        // DataManager and otherProps

        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: propsWithoutDataManager, state: {} },
                    fileName: generateLogsFileName('MetadataForms_StringBuilderInput_StringBuilderInput'),
                }}
            >
                <StringBuilderInputContent {...this.props} />
            </ErrorBoundary>
        );
    }
}
