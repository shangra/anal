import cn from 'classnames';
import React, { Component } from 'react';
import { ErrorBoundary } from 'components/ErrorBoundary';
import { BlobInput } from 'components/MetadataForms/Inputs/BlobInput';
import { BooleanInput } from 'components/MetadataForms/Inputs/BooleanInput';
import { Composite } from 'components/MetadataForms/Inputs/Composite';
import { CronInput } from 'components/MetadataForms/Inputs/CronInput';
import { DateInput } from 'components/MetadataForms/Inputs/DateInput';
import { DateTime } from 'components/MetadataForms/Inputs/DateTime';
import { Float } from 'components/MetadataForms/Inputs/Float';
import { Integer } from 'components/MetadataForms/Inputs/Integer';
import { Ref } from 'components/MetadataForms/Inputs/Ref';
import { Select } from 'components/MetadataForms/Inputs/Select';
import { String } from 'components/MetadataForms/Inputs/String';
import { Period } from 'components/MetadataForms/Inputs/Period';
import { Text } from 'components/MetadataForms/Inputs/Text';
import { generateLogsFileName } from 'components/MetadataForms/Inputs/utils';
import {
    clearedValueByTypeName,
    defaultValueByTypeName,
    fieldTypeName,
    typeCodeToTypeNameMapping,
    typeNameToTypeCodeMapping,
} from './constant';
import styles from './MetaInput.module.css';
import { getPlaceholder, getType } from 'components/MetadataForms/MetaInput/utils';

/** Значение из БД/record: строка или уже объект композита */
function normalizeStoredComposite(raw) {
    if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
        if ('type' in raw || 'link' in raw) {
            return raw;
        }
        if ('value' in raw && 'label' in raw && !('type' in raw)) {
            return { type: null, value: raw.value, link: null };
        }
        return raw;
    }
    return { type: null, value: raw ?? null, link: null };
}

function compositeTypeToCode(typeField) {
    if (typeField === null || typeField === undefined || typeField === '') {
        return null;
    }
    if (typeof typeField === 'number') {
        return typeField;
    }
    return typeNameToTypeCodeMapping[typeField] ?? null;
}

export class MetaInputContent extends Component {
    constructor(props) {
        super(props);

        if (!this.props?.DataManager) console.error('Для работы компонента MetaInput обязателен параметр DataManager!');
        this.DataManager = this.props?.DataManager ?? {};

        if (!this.props?.field && !this.props?.name)
            console.error('Для работы компонента MetaInput обязателен параметр field или name!');

        let field = this.props?.field ?? '';
        if (this.DataManager && this.props?.name) {
            for (const fieldName in this.DataManager.metadata.treeObject.Fields) {
                const Field = this.DataManager.metadata.treeObject.Fields[fieldName];
                if (Field.name === this.props.name) {
                    field = Field.field;
                }
            }
        }

        //field = TabularParts.dic_rrrr_tab.0.ffff
        let key;
        if (field.includes('list')) {
            key = field;
        } else {
            key = 'record.' + field;
        }

        this.DataManager.hookChangeFieldData(key, this);

        let fieldUI, dataManagerValue;
        if (field.indexOf('.') > 0) {
            if (field.includes('list')) {
                const [, rowIndex, fieldName] = field.split('.');
                fieldUI = this.createFieldByData('', this.DataManager.metadata.treeObject.Fields[fieldName]);
                dataManagerValue = this.DataManager.data?.['list']?.[rowIndex]?.[fieldName] || 'Error';
            } else {
                const [, tbname, rowIndex, fieldName] = field.split('.');
                fieldUI = this.createFieldByData(
                    '',
                    this.DataManager.metadata.treeObject.TabularParts[tbname]?.info.Fields[fieldName],
                );
                dataManagerValue = this.DataManager.data.record.TabularParts[tbname][rowIndex][fieldName];
            }
        } else {
            fieldUI = this.createFieldByData('', this.DataManager.metadata.treeObject.Fields[field]);
            dataManagerValue = this.DataManager.data.record[field];
        }

        dataManagerValue = this.getByStringKey(this.DataManager.data, key);
        // если передаем type с Формы шаблона:
        this.typeForDefinitionType = this.props.type ? this.props.type : null;

        const resolvedInputType = getType(fieldUI, this.typeForDefinitionType);

        let initialValue = dataManagerValue !== undefined ? dataManagerValue : defaultValueByTypeName[resolvedInputType];

        if (resolvedInputType === fieldTypeName.COMPOSITE) {
            initialValue = normalizeStoredComposite(initialValue);
        }

        // Этот пропс {table} не достоин жить, и его нужно удалить!
        const showLabel = !this.props.table;

        this.state = {
            showLabel: this.props.showLabel ?? showLabel ?? true,
            field: field,
            fieldUI,
            value: initialValue,
            inputType: resolvedInputType,
            placeholder: getPlaceholder(fieldUI),
        };
    }

    componentDidMount(prevProps, prevState) {
        //getType(this.state.fieldUI, this.typeForDefinitionType)
        if (this.state.resolvedInputType === fieldTypeName.COMPOSITE) {
            const tv = this.state.value?.type;
            const resolvedName = tv !== undefined && tv !== null ? typeCodeToTypeNameMapping[tv] : null;

            this.setNewValueDataManager(this.state.field, {
                type: tv,
                value: this.state.value?.value,
                link: this.state.value?.link,
                ...(resolvedName === fieldTypeName.REF && { label: this.state.value?.label }),
            });
        } else {
            this.setNewValueDataManager(this.state.field, this.state.value);
        }
    }

    getByStringKey(obj, key) {
        const keyParts = key.split('.');
        let current = obj;

        for (const part of keyParts) {
            if (current === null || current === undefined) return undefined;
            current = current[part];
        }

        return current;
    }

    createFieldByData(value, fieldMetadata) {
        if (fieldMetadata) {
            const field = {
                type: typeof fieldMetadata.ref === 'object' ? 'ref' : fieldMetadata.type,
                ref: fieldMetadata.ref,
                placeholder: '',
                show: fieldMetadata.show ?? false,
                name: fieldMetadata.field,
                description: fieldMetadata.description,
                value: value,
                options: fieldMetadata.options,
                ...(fieldMetadata.type === fieldTypeName.FLOAT && {
                    precision: fieldMetadata.precision,
                }),
            };

            if (fieldMetadata.ref && typeof field.value !== 'object' && field.value !== null) {
                const label = this.refs?.[field.name]?.[field.value] ?? '';
                field.value = {
                    value: field.value,
                    label: label,
                };
            } else if (field.type === 'composite') {
                const v = field.value;
                if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
                    if ('type' in v || 'link' in v) {
                        field.value = v;
                    } else if ('value' in v && 'label' in v && !('type' in v)) {
                        field.value = { type: null, value: v.value, link: null };
                    }
                } else {
                    field.value = { type: null, value: v ?? null, link: null };
                }
            }

            return field;
        }
        return undefined;
    }

    setNewValueDataManager(field, value, dataManager) {
        if (field.indexOf('.') > 0) {
            if (field.includes('list')) {
                const [, rowIndex, fieldName] = field.split('.');
                this.DataManager.data['list'][rowIndex][fieldName] = value;
            } else {
                const [, tbname, rowIndex, fieldName] = field.split('.');
                this.DataManager.data.record.TabularParts[tbname][rowIndex][fieldName] = value;
            }
        } else {
            this.DataManager.data.record[field] = value;
        }
    }

    changeMasterData(fieldUI) {
        if (!this.state) return;
        const value = fieldUI.value;
        const inputType = getType(fieldUI, this.typeForDefinitionType);
        this.setState(
            {
                fieldUI: fieldUI,
                value: value,
                inputType: inputType,
                placeholder: getPlaceholder(fieldUI),
            },
            () => {
                this.props?.onChange?.(value);
            },
        );
    }

    onRefChange = (newValue) => {
        if (newValue?.label) this.setRefsLabelDataManager(this.state.field, newValue.value, newValue?.label);

        this.onChange(newValue.value);
    };

    onChange = (valueOrEvent) => {
        const newValue =
            valueOrEvent && typeof valueOrEvent === 'object' && valueOrEvent.value !== undefined
                ? valueOrEvent.value
                : valueOrEvent;

        this.setNewValueDataManager(this.state.field, newValue);
        this.props?.onChange?.(newValue);

        this.setState({ value: newValue });
    };

    onClear = () => {
        // const typeName = getType(this.state.fieldUI, this.typeForDefinitionType)
        const typeName = this.state.inputType; //getType(this.state.fieldUI, this.typeForDefinitionType)
        let clearedValue = clearedValueByTypeName[typeName];

        if (typeName === fieldTypeName.FLOAT && this.props?.precision) {
            clearedValue = clearedValue.toFixed(this.props.precision);
        }

        this.setState(
            {
                value: clearedValue,
            },
            () => {
                this.setNewValueDataManager(
                    this.state.field,
                    this.state.fieldUI.type === fieldTypeName.REF ? clearedValue.value : clearedValue,
                );

                this.props?.onChange?.(clearedValue);
            },
        );
        this.props?.onClear?.();
    };

    onChoiceClear = () => {
        this.setState({ value: { value: '', label: '' } });
    };

    onCompositeChange = (newValue) => {
        const value = {
            type: compositeTypeToCode(newValue.type),
            value: newValue.value,
            link: newValue.link,
        };
        this.onChange(value);
        if (newValue?.label) this.setRefsLabelDataManager(this.state.field, value.value, newValue?.label);
    };

    onCompositeClear = () => {
        this.setState({ value: clearedValueByTypeName[fieldTypeName.COMPOSITE] }, () => {
            this.DataManager.data.record[this.state.field] = clearedValueByTypeName[fieldTypeName.COMPOSITE];
            this.props?.onClear?.();
        });
    };

    handleOnClick = (event) => {
        if (!this.props.readOnly) {
            event.stopPropagation();
        }
    };

    handleInputDoubleClick = (event) => {
        if (this.props.onDoubleClick) {
            this.props.onDoubleClick(event);
        }
    };

    handleInputKeyDown = (event) => {
        // работает для выхода из режима редактирования ячейки
        if (this.props.onKeyDown) {
            this.props.onKeyDown(event);
        }

        if (event.key === 'Enter') {
            event.preventDefault();
        }
    };

    getRefsLabel = () => {
        let field = this.state.field ?? this.state.fieldUI?.name;

        const value = this.state.value?.value ?? this.state.value;

        if (field === undefined) return undefined;

        let refsLabel;

        if (field.indexOf('.') > 0) {
            if (field.includes('list')) {
                const [, rowIndex, fieldName] = field.split('.');

                refsLabel = this.DataManager.meta?.list?.refs?.[fieldName]?.[value];
            } else {
                const [, tbname, rowIndex, fieldName] = field.split('.');
                // dataManagerValue = this.DataManager.data.record.TabularParts[tbname][rowIndex][fieldName]
                refsLabel = this.DataManager.meta?.record?.refs?.[fieldName]?.[value];
            }
        } else {
            refsLabel = this.DataManager.meta?.record?.refs?.[field]?.[value];
        }

        return refsLabel ?? this.state.value?.label ?? this.state.fieldUI?.label;
    };

    setRefsLabelDataManager(field, value, label) {
        if (field.indexOf('.') > 0) {
            if (field.includes('list')) {
                const [, rowIndex, fieldName] = field.split('.');

                this.DataManager.meta.list ||= {};
                this.DataManager.meta.list.refs ||= {};
                this.DataManager.meta.list.refs[fieldName] ||= {};
                this.DataManager.meta.list.refs[fieldName][value] = label;
            } else {
                const [, tbname, rowIndex, fieldName] = field.split('.');

                this.DataManager.meta.record ||= {};
                this.DataManager.meta.record.refs ||= {};
                this.DataManager.meta.record.refs[fieldName] ||= {};
                this.DataManager.meta.record.refs[fieldName][value] = label;
            }
        } else {
            this.DataManager.meta.record ||= {};
            this.DataManager.meta.record.refs ||= {};
            this.DataManager.meta.record.refs[field] ||= {};
            this.DataManager.meta.record.refs[field][value] = label;
        }
    }

    renderInputByType = (params) => {
        const inputType = this.state.inputType;
        const readOnly = this.props.readOnly;
        const isTable = this.props.table;
        const { metaRef, name, value, placeholder, onChange, ...otherProps } = params;

        let baseProps = {
            value,
            name,
            placeholder: readOnly ? '' : placeholder,
            fullWidth: true,
            onChange,
            readOnly:
                readOnly || (inputType !== fieldTypeName.REF && inputType !== fieldTypeName.COMPOSITE && this.getRefsLabel()),
            onClear: this.onClear,
            onDoubleClick: this.handleInputDoubleClick,
            ...otherProps,
        };

        let dataTypes = [];
        let compositeType = null;

        if (inputType === fieldTypeName.COMPOSITE) {
            const field = this.state.field;
            let multiRef = this.DataManager.metadata.treeObject.Fields[field]?.multiRef;

            if (field.indexOf('.') > 0) {
                if (field.includes('list')) {
                    const [, rowIndex, fieldName] = field.split('.');
                    multiRef = this.DataManager.metadata.treeObject.Fields[fieldName]?.multiRef;
                } else {
                    const [, tbname, rowIndex, fieldName] = field.split('.');
                    multiRef = this.DataManager.metadata.treeObject.TabularParts[tbname]?.info.Fields[fieldName]?.multiRef;
                }
            } else {
                multiRef = this.DataManager.metadata.treeObject.Fields[field]?.multiRef;
            }

            dataTypes = multiRef.map((ref) => ({
                ...ref,
                value: ref.value.toLowerCase(),
                typeName: typeCodeToTypeNameMapping[ref.type],
            }));
            if (this.state.value?.type !== undefined && this.state.value?.type !== null) {
                const typeName = typeCodeToTypeNameMapping[this.state.value?.type];

                if (typeName === fieldTypeName.REF) {
                    const selectedType = dataTypes.find((type) => type.value === this.state.value?.link);
                    compositeType = selectedType?.value || 10;
                } else {
                    compositeType = typeName;
                }
            }
        }

        if (inputType === fieldTypeName.REF || inputType === fieldTypeName.COMPOSITE) {
            baseProps = {
                ...baseProps,
                refSearchFields: this.props?.refSearchFields,
                labelMask: this.props?.labelMask,
            };
        }

        switch (inputType) {
            case fieldTypeName.INTEGER: {
                return <Integer {...baseProps} isTable={isTable} />;
            }
            //Временно отключено для того, чтобы убрать схлопывание строк
            //слишком много перерендеров и из-за этого схлопывается
            case fieldTypeName.REAL:
            case fieldTypeName.FLOAT: {
                return <Float {...baseProps} precision={this.state.fieldUI?.precision} isTable={isTable} />;
            }

            case fieldTypeName.BOOLEAN: {
                return <BooleanInput {...baseProps} />;
            }

            case fieldTypeName.DATE: {
                return <DateInput {...baseProps} />;
            }

            case fieldTypeName.DATETIME: {
                return <DateTime {...baseProps} />;
            }

            case fieldTypeName.BLOB: {
                return <BlobInput {...baseProps} server={this.DataManager?.server ?? ''} />;
            }

            case fieldTypeName.REF:
            case fieldTypeName.GREF: {
                const label =
                    this.state.value !== undefined && this.state.value !== null
                        ? this.getRefsLabel() ?? `Ошибка поиска значения ${value}`
                        : '';

                return (
                    <Ref
                        {...baseProps}
                        DataManager={this.DataManager}
                        server={this.DataManager?.server ?? ''}
                        value={{
                            value: this.state.value,
                            label,
                        }}
                        metaRef={metaRef}
                        onChange={(newValue) => {
                            this.onRefChange({ ...newValue, link: this.state.fieldUI.ref?.link });
                        }}
                        onBeforeLoad={this.props.onBeforeLoad}
                        onAfterLoad={this.props.onAfterLoad}
                        onClear={() => {
                            this.onRefChange({ value: null, label: '', link: this.state.fieldUI.ref?.link });
                        }}
                    />
                );
            }

            case fieldTypeName.LIST: {
                return (
                    <Select
                        {...baseProps}
                        options={this.state.fieldUI?.options}
                        fullWidth={false}
                    />
                );
            }

            case fieldTypeName.COMPOSITE: {
                return (
                    <Composite
                        {...baseProps}
                        dataTypes={dataTypes}
                        value={{
                            type: compositeType,
                            value: this.state.value?.value ?? null,
                            link: this.state.value?.link,
                            label: this.state.value?.value
                                ? this.getRefsLabel() ?? `Ошибка поиска значения ${this.state.value?.value}`
                                : null,
                        }}
                        onChange={this.onCompositeChange}
                        onClear={this.onCompositeClear}
                    />
                );
            }
            case fieldTypeName.PERIOD: {
                return <Period {...baseProps} value={this.getRefsLabel() ?? baseProps.value} />;
            }

            case fieldTypeName.UUID: {
                return <String {...baseProps} value={baseProps.value} />;
            }

            // Пока UI-KIT не доработали TextEditor - комментим
            // case fieldTypeName.TEXT: {
            //     return <Text {...baseProps} value={baseProps.value} />
            // }

            case fieldTypeName.TEXT:
            case fieldTypeName.STRING:
            default: {
                // Поле «schedule» метаданных Планировщика — это cron-выражение.
                // Подменяем дефолтный String на CronInput с конструктором расписания.
                const fieldKey = this.state.field;
                const isScheduleField =
                    fieldKey === 'schedule' || fieldKey.endsWith('.schedule');
                if (isScheduleField) {
                    return (
                        <CronInput
                            {...baseProps}
                            value={this.getRefsLabel() ?? baseProps.value}
                            modalTitle={this.state.fieldUI?.description ?? 'Расписание'}
                        />
                    );
                }

                return <String {...baseProps} value={this.getRefsLabel() ?? baseProps.value} />;
            }
        }
    };

    render() {
        const fullWidth = this.props.fullWidth;
        const border = this.props.border;

        // КАК И ЗДЕСЬ this.props.table - этого не должно существовать.
        // Инпут ничего не должен знать о каких-то табличных частях
        const table = this.props.table;
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
                    logObj: { props: restProps, state: this.state },
                    fileName: generateLogsFileName('MetadataForms_MetaInput_MetaInputContent'),
                }}
            >
                <div className={mainWrapperClass}>
                    {this.state.showLabel && (
                        <div className={styles.label}>{this.state?.fieldUI?.description ?? this.props.name}</div>
                    )}
                    <div className={inputWrapperClass} onClick={this.handleOnClick}>
                        {this.renderInputByType({
                            metaRef: this.state.fieldUI?.ref,
                            name: this.state?.fieldUI?.name ?? this.props.name,
                            value: this.state.value,
                            placeholder: this.state.placeholder,
                            onChange: this.onChange,
                            onKeyDown: this.handleInputKeyDown,
                        })}
                    </div>
                </div>
            </ErrorBoundary>
        );
    }
}

export class MetaInput extends Component {
    render() {
        const { DataManager, ...propsWithoutDataManager } = this.props;

        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: propsWithoutDataManager, state: {} },
                    fileName: generateLogsFileName('MetadataForms_MetaInput_MetaInput'),
                }}
            >
                <MetaInputContent {...this.props} ref={this.contentRef} />
            </ErrorBoundary>
        );
    }
}
