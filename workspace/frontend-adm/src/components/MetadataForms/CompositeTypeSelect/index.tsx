import cn from 'classnames';
import { Component, type ReactNode } from 'react';
import { ErrorBoundary } from 'components/ErrorBoundary';
import { type DataManager } from 'components/MetadataForms/DataManager';
import type { DataType } from 'components/MetadataForms/Inputs/Composite/types';
import { type IRefInputRequiredProps, Ref, RefType } from 'components/MetadataForms/Inputs/Ref';
import { generateLogsFileName } from 'components/MetadataForms/Inputs/utils';
import {
    type IMetaInputContentProps,
    type IMetaInputContentState,
    MetaInputContent,
} from 'components/MetadataForms/MetaInput';
import styles from '../MetaInput/MetaInput.module.css';
import { ITabularPartState } from 'components/MetadataForms/TabularPart';

interface CompositeTypeSelectProps extends Omit<IMetaInputContentProps, 'onChange' | 'onDoubleClick' | 'onKeyDown'> {
    name?: string;
    field?: string;
    DataManager: DataManager;
    tabularPartName: string;
    compositeName: string;
    onChange?(value: string | null): void;
    onDoubleClick?: IRefInputRequiredProps['onDoubleClick'];
    onKeyDown?(): IRefInputRequiredProps['onKeyDown'];
}

interface CompositeTypeSelectState extends IMetaInputContentState {
    existedTypes: DataType[];
    tabularPartName: string;
    compositeName: string;
}

class CompositeTypeSelectContent extends MetaInputContent<CompositeTypeSelectProps, CompositeTypeSelectState> {
    constructor(props: CompositeTypeSelectProps) {
        super(props as IMetaInputContentProps);

        let tabularPartName = this.props?.tabularPartName ?? '';
        if (this.DataManager && this.props?.tabularPartName) {
            for (const fieldName in this.DataManager.metadata.treeObject.TabularParts) {
                const Field = this.DataManager.metadata.treeObject.TabularParts[fieldName];
                if (Field.name === this.props.tabularPartName) {
                    tabularPartName = Field.table;
                }
            }
        }

        let compositeName = this.props?.compositeName ?? '';
        if (this.DataManager && this.props?.compositeName) {
            for (const fieldName in this.DataManager.metadata.treeObject.TabularParts[tabularPartName].info.Fields) {
                const Field = this.DataManager.metadata.treeObject.TabularParts[tabularPartName].info.Fields[fieldName];

                if (Field.name === this.props.compositeName) {
                    compositeName = Field.field;
                }
            }
        }

        this.state = {
            ...this.state,
            tabularPartName,
            compositeName,
            existedTypes:
                this.DataManager.metadata.treeObject.TabularParts[tabularPartName]?.info.Fields[compositeName]?.multiRef,
        };
    }

    componentDidUpdate() {
        if (this.state.value) {
            this.DataManager.metadata.treeObject.TabularParts[this.state.tabularPartName].info.Fields[
                this.state.compositeName
            ].multiRef = this.state.existedTypes.filter((ref) => ref.value === this.state.value);
        } else {
            this.DataManager.metadata.treeObject.TabularParts[this.state.tabularPartName].info.Fields[
                this.state.compositeName
            ].multiRef = [];
        }
    }

    handleRefChange(newValue: RefType & { label?: string | null }) {
        const { value } = newValue;
        this.onRefChange(newValue);

        const filteredValue = this.state.existedTypes.find((ref) => ref.value === value) ?? null;

        if (filteredValue !== null) {
            this.DataManager.metadata.treeObject.TabularParts[this.state.tabularPartName].info.Fields[
                this.state.compositeName
            ].multiRef = [filteredValue];
        } else {
            this.DataManager.metadata.treeObject.TabularParts[this.state.tabularPartName].info.Fields[
                this.state.compositeName
            ].multiRef = [];
        }

        this.selectTypesAndValuesComposite(filteredValue);
    }

    selectTypesAndValuesComposite(type: DataType | null) {
        if (
            !this.DataManager.data.record?.TabularParts?.[this.state.tabularPartName] ||
            this.DataManager.data.record.TabularParts[this.state.tabularPartName].length <= 0
        )
            return;

        this.DataManager.data.record.TabularParts[this.state.tabularPartName] = [
            {
                ...this.DataManager.data.record.TabularParts[this.state.tabularPartName][0],
                value: {
                    value: null,
                    type: type?.type ? 10 : null,
                    link: type?.value ?? null,
                },
            },
        ];

        const regex = new RegExp(`${this.state.tabularPartName}\\.[0-9]+\\.${this.state.compositeName}$`);

        const compositesStates = Object.entries(this.DataManager.formRefs)
            .filter((item) => regex.test(item[0]))
            .map((i) => i[1]);

        if (compositesStates.length > 0) {
            (compositesStates[0] as MetaInputContent).onCompositeChange({
                value: null,
                type: 10,
                link: type?.value ?? null,
            });
        }

        this.DataManager.formRefs[`record.TabularParts.${this.state.tabularPartName}`]?.setState(
            (prev: ITabularPartState) => ({
                table: prev.table
                    ? {
                          ...prev.table,
                          activeCell: null,
                      }
                    : null,
            }),
        );
    }

    render() {
        const { DataManager, name, field, onChange, ...optionalProps } = this.props;

        const { fullWidth } = this.props;
        const { border } = this.props;
        const { table } = this.props;
        const mainWrapperClass = cn(styles.wrapper, {
            [styles.fullWidth]: fullWidth && table,
            [styles.noBorder]: !border && table,
        });

        const inputWrapperClass = cn(styles.inputWrapper, {
            [styles.fullWidth]: fullWidth && table,
            [styles.noBorder]: !border && table,
        });

        const label = this.state.value ? this.getRefsLabel() ?? `Ошибка поиска значения ${this.state.value}` : null;

        return (
            <div className={mainWrapperClass}>
                {!this.props.table && <div className={styles.label}>{this.state.fieldUI.description ?? this.props.name}</div>}
                <div className={inputWrapperClass}>
                    <Ref
                        {...optionalProps}
                        value={{
                            value: this.state.value,
                            label,
                        }}
                        metaRef={this.state.fieldUI?.ref ?? { value: null, link: null }}
                        onChange={(newValue) => {
                            this.handleRefChange({ ...newValue, link: this.state.fieldUI.ref?.link ?? null });
                        }}
                        onClear={() => {
                            this.handleRefChange({ value: null, label: '', link: this.state.fieldUI.ref?.link ?? null });
                        }}
                    />
                </div>
            </div>
        );
    }
}

export class CompositeTypeSelect extends Component<CompositeTypeSelectProps> {
    render(): ReactNode {
        const { DataManager, ...propsWithoutDataManager } = this.props;

        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: propsWithoutDataManager, state: {} },
                    fileName: generateLogsFileName('MetadataForms_StringBuilderInput_StringBuilderInput'),
                }}
            >
                <CompositeTypeSelectContent {...this.props} />
            </ErrorBoundary>
        );
    }
}
