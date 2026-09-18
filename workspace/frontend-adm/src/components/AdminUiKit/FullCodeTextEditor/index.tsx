import { Component, MouseEvent, type ReactNode } from 'react';
import { IconButton, MoreIcon } from 'ui-kit';
import { v4 } from 'uuid';
import $windows from 'components/WindowsCMP/windows.helper';
import './index.css';
import { ErrorBoundary } from '../../ErrorBoundary';
import { generateLogsFileName } from '../../MetadataForms/Inputs/utils';
import type { CommonInputProps } from '../../CommonInput';
import { DataManager, type FieldMeta } from '../../MetadataForms/DataManager';
import cn from 'classnames';
import styles from './FullCodeTextEditor.module.css';
import { CodeEditorCMP } from '../../CodeEditorCMP';

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

export interface FullTextEditorProps extends Omit<CommonInputProps, 'value' | 'onChange'> {
    fieldName: string;
    field: IField | null;
    placeholder?: string;
    DataManager: DataManager;
    onChange?: (value: string) => void;
    showLabel?: boolean;
    border?: boolean;
    table?: boolean;
    fullWidth?: boolean;
    tabularPartInfo?: { table: string };
    rowIndex: number;
    readOnly?: boolean;
    api?: { type: { getFieldsById: (id: string) => Promise<any> } };
    dataManagerFieldPath?: string;
}

interface FullTextEditorState {
    windowId: string;
    value: string;
    showLabel: boolean;
    fullWidth: boolean;
    border: boolean;
    table: boolean;
    field: FieldMeta;
    placeholder: string;
    fieldUI: { value: string };
}

export class FullCodeTextEditorContent extends Component<FullTextEditorProps, FullTextEditorState> {
    setMasterData: (data: string) => void;

    DataManager = this.props?.DataManager ?? {};

    constructor(props: FullTextEditorProps) {
        super(props);

        const field = Object.values(props.DataManager.metadata.treeObject.Fields).find(
            (field) => field.field === props.fieldName || field.naem === props.fieldName,
        )!;

        let { dataManagerFieldPath } = props;

        console.log('this.props', props);

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
            windowId: '',
            field,
            showLabel: props.showLabel ?? true,
            fullWidth: props.fullWidth ?? false,
            border: props.border ?? true,
            table: props.table ?? false,
            value: this.getValueByPath(props.DataManager.MasterData, dataManagerFieldPath) ?? '',
            placeholder: this.props.placeholder ?? 'Введите текст…',
            fieldUI: { value: '' },
        };
    }

    getValueByPath(obj: any, path: string) {
        return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
    }

    changeMasterData(fieldUI: { value: string }) {
        this.setState({
            fieldUI,
            value: fieldUI.value,
        });
    }

    setFieldData(data: string) {
        this.setMasterData(data);
    }

    componentDidMount() {
        this.setState({
            windowId: v4(),
        });
    }

    handleChange = (value: string) => {
        this.setState(
            {
                value,
            },
            () => {
                this.setFieldData(value);
            },
        );
        this.props?.onChange?.(value);
    };

    onClick = () => {
        $windows.open(
            this.state.field.description ?? 'Редактировать запрос',
            <CodeEditorCMP value={this.state.value} onChange={this.handleChange} onSave={this.handleChange} />,
            // <textarea
            //     name={this.state.field.name}
            //     defaultValue={this.state.value}
            //     placeholder={this.state.placeholder}
            //     className="textarea"
            //     onChange={this.handleChange}
            // />,
            { uuid: this.state.windowId },
        );
    };

    handleInputDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
        this.props.onDoubleClick?.(event);
    };

    render() {
        const { fullWidth, border, table, value, field, showLabel } = this.state;
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
                    {showLabel && !this.props.tabularPartInfo ? (
                        <div className={styles.label}>{field?.description ?? '-'}</div>
                    ) : null}
                    <div className={inputWrapperClass} onDoubleClick={this.handleInputDoubleClick}>
                        <div className="inputShortText">
                            {value ? (
                                <span style={{ color: 'var(--ui-kit-input-input-color)' }}>{value}</span>
                            ) : (
                                this.state.placeholder
                            )}
                        </div>
                        <IconButton icon={MoreIcon} onClick={this.onClick} color="controlled" className="textInputButton" />
                    </div>
                </div>
            </ErrorBoundary>
        );
    }
}

export class FullCodeTextEditor extends Component<FullTextEditorProps> {
    render(): ReactNode {
        const { DataManager, ...propsWithoutDataManager } = this.props;

        // DataManager and otherProps

        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: propsWithoutDataManager, state: {} },
                    fileName: generateLogsFileName('MetadataForms_FormTextEditor'),
                }}
            >
                <FullCodeTextEditorContent {...this.props} />
            </ErrorBoundary>
        );
    }
}
