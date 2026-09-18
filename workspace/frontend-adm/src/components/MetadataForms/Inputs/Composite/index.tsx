import type React from 'react';
import { type ChangeEventHandler, Component, type FC, memo, type ReactNode, useEffect, useMemo, useState } from 'react';
import { List, type ListOption } from 'ui-kit';
import { CommonInput, CommonInputContext, type CommonInputProps } from 'components/CommonInput';
import { ErrorBoundary } from 'components/ErrorBoundary';
import $modal from 'components/ui/MyModal/modal.helper';
import { defaultValueByTypeName, fieldTypeName, typeCodeToTypeNameMapping } from 'components/MetadataForms/MetaInput/constant';
import { getPlaceholder } from 'components/MetadataForms/MetaInput/utils';
import { BooleanInput } from 'components/MetadataForms/Inputs/BooleanInput';
import { DateTime } from 'components/MetadataForms/Inputs/DateTime';
import { Float } from 'components/MetadataForms/Inputs/Float';
import { Integer } from 'components/MetadataForms/Inputs/Integer';
import { type IRefInputRequiredProps, Ref } from 'components/MetadataForms/Inputs/Ref';
import type { SearchSelectPropsType } from 'components/MetadataForms/Inputs/Ref/components/SearchSelect';
import { String } from 'components/MetadataForms/Inputs/String';
import style from '../style.module.css';
import { generateLogsFileName } from 'components/MetadataForms/Inputs/utils';
import { DATA_TYPES, type DataType, type ICompositeValue } from 'components/MetadataForms/Inputs/Composite/types';

export interface ICompositeInputProps extends Omit<CommonInputProps, 'value' | 'onChange'> {
    value: ICompositeValue;
    dataTypes: DataType[];
    onChange: (value: ICompositeValue) => void;

    // RefInput
    refSearchFields?: string[];
    labelMask?: string;
}

const CompositeContent: FC<ICompositeInputProps> = (props) => {
    const { name = '', value, dataTypes } = props;
    const normalizeType = (type: unknown) => (typeof type === 'string' ? type.toLowerCase() : type);

    const resolveTypeKey = (t: unknown) => {
        if (typeof t === 'number' && t in typeCodeToTypeNameMapping) {
            return typeCodeToTypeNameMapping[t as keyof typeof typeCodeToTypeNameMapping];
        }
        return t;
    };

    const findDataType = (t: unknown) => {
        const key = resolveTypeKey(t);
        return dataTypes.find(
            (dataType) =>
                normalizeType(dataType.typeName) === normalizeType(key) ||
                normalizeType(dataType.value) === normalizeType(key),
        );
    };

    const [selectedType, setSelectedType] = useState<DataType>(
        findDataType(value?.type) ??
            ({
                label: 'Строка',
                value: DATA_TYPES.string,
                typeName: fieldTypeName.STRING,
            } as DataType),
    );

    const [inputValue, setInputValue] = useState<ICompositeValue['value']>(value.value);
    const [selectedLinkOption, setSelectedLinkOption] = useState<string | null>(value.link ? value.label || null : null);

    useEffect(() => {
        const propsType = findDataType(value?.type);
        const newValue = propsType || ({ label: 'Строка', value: DATA_TYPES.string, typeName: fieldTypeName.STRING } as DataType);

        setInputValue(value?.value ?? null);
        setSelectedType(newValue);
        if (value.link) {
            setSelectedLinkOption(value?.label ?? '');
        }
    }, [value]);

    const getInputTypeBySelectedType = (type: DATA_TYPES | null): DATA_TYPES => {
        const normalizedType = normalizeType(type);

        switch (normalizedType) {
            case normalizeType(DATA_TYPES.float):
                return DATA_TYPES.float;

            case normalizeType(DATA_TYPES.integer):
                return DATA_TYPES.integer;

            case normalizeType(DATA_TYPES.datetime):
                return DATA_TYPES.datetime;

            case normalizeType(DATA_TYPES.string):
                return DATA_TYPES.string;

            case normalizeType(DATA_TYPES.boolean):
                return DATA_TYPES.boolean;

            default:
                return DATA_TYPES.ref;
        }
    };

    const inputSelected = useMemo(() => getInputTypeBySelectedType(selectedType?.value), [selectedType]);

    const payloadTypeName = useMemo((): string | null => {
        if (selectedType?.typeName) {
            return selectedType.typeName;
        }
        const n = normalizeType(inputSelected);
        if (n === normalizeType(DATA_TYPES.string)) {
            return fieldTypeName.STRING;
        }
        if (n === normalizeType(DATA_TYPES.boolean)) {
            return fieldTypeName.BOOLEAN;
        }
        if (n === normalizeType(DATA_TYPES.datetime)) {
            return fieldTypeName.DATETIME;
        }
        if (n === normalizeType(DATA_TYPES.float)) {
            return fieldTypeName.FLOAT;
        }
        if (n === normalizeType(DATA_TYPES.integer)) {
            return fieldTypeName.INTEGER;
        }
        return fieldTypeName.REF;
    }, [selectedType, inputSelected]);

    /**
     * Обработчик выбора типа данных из списка в модальном окне
     * @param newValue - массив выбранных опций
     * @param option - выбранная опция
     */
    const onSelectDataType = (newValue: DATA_TYPES[], option: ListOption<DATA_TYPES>) => {
        if (option?.value) {
            const type = dataTypes?.find((dataType) =>
                normalizeType(dataType.typeName) === normalizeType(fieldTypeName.REF)
                    ? normalizeType(dataType.value) === normalizeType(option.value)
                    : normalizeType(dataType.typeName) === normalizeType(option.value),
            );
            if (!type) return;

            const compositeValuesByTypeName = Object.fromEntries(
                Object.entries(defaultValueByTypeName).filter(([key]) => ![fieldTypeName.COMPOSITE].includes(key)),
            );

            const newCompositeValue = (compositeValuesByTypeName[type.value ?? ''] ?? null) as ICompositeValue['value'];
            const newCompositeLabel = '';
            let newValueObject: ICompositeValue = { type: null, value: null, link: null, label: null };

            if (type.typeName !== fieldTypeName.REF) {
                newValueObject = { type: type.typeName!, value: newCompositeValue, label: '', link: null };
            } else {
                newValueObject = {
                    label: null,
                    value: newCompositeValue,
                    link: type.value ?? null,
                    type: type.typeName!,
                };
            }

            setSelectedLinkOption(newCompositeLabel);
            setInputValue(newCompositeValue);
            props.onChange(newValueObject);
            setSelectedType(type);
        }
        $modal.hide();
    };

    const onPrimitiveChange = (newValue: ICompositeValue['value']) => {
        const payload: ICompositeValue = {
            type: payloadTypeName,
            value: newValue !== undefined ? newValue : null,
            link: value?.link && newValue ? value.link : null,
            label: null,
        };

        setSelectedLinkOption(null);
        props.onChange(payload);
    };

    /**
     * Открытие формы выбора типа данных
     * @description Типы берутся из props.dataTypes, приводятся к объекту {label, value} и передаются в List
     */
    const onClickFormTypeSelection = () => {
        const selectList = dataTypes?.map(({ label, typeName, value }) => ({
            label,
            value: typeName === fieldTypeName.REF ? value : typeName ?? null,
        }));

        $modal.show(
            'Выбор типа данных',
            <div>
                <List
                    options={selectList as ListOption<DATA_TYPES>[]}
                    type="single"
                    value={
                        selectedType?.value
                            ? [selectedType.typeName === fieldTypeName.REF ? selectedType.value : selectedType.typeName!]
                            : []
                    }
                    resettable
                    onChange={onSelectDataType}
                />
            </div>,
        );
    };

    /**
     * Обработчик изменения значения инпута для text и number
     */
    const onChangeInputValue: ChangeEventHandler<HTMLInputElement> = (e) => {
        const newValue = {
            type: payloadTypeName,
            value: e.target.value !== undefined ? e.target.value : null,
            link: null,
            label: null,
        } as ICompositeValue;
        props.onChange(newValue);
        setInputValue(e.target.value);
    };

    /**
     * Обработчик изменения значения инпута для date
     */
    const onChangeDatePickerValue = (date: string | null) => {
        const newValue = { type: payloadTypeName, value: date, link: null, label: null };
        setInputValue(date);
        props.onChange(newValue);
    };

    /**
     * Обработчик изменения значения инпута для ref
     * @param value - значение выбранного элемента ссылки
     * @param label - подпись выбранного элемента ссылки
     */
    const onChangeRefValue = ({ value: newValue, label }: IRefInputRequiredProps['value']) => {
        const payload = {
            type: payloadTypeName,
            value: (newValue || null) as DATA_TYPES,
            link: value?.link && newValue ? value.link : null,
            label,
        } as ICompositeValue;

        setSelectedLinkOption(label ?? '');
        props.onChange(payload);
    };

    const onClear = () => {
        setSelectedLinkOption('');
        setInputValue('');
        setSelectedType({ label: '', value: null });
        props?.onClear?.();
    };

    const onDoubleClick = (event: React.MouseEvent<HTMLInputElement>) => {
        if (props.onDoubleClick) {
            props.onDoubleClick(event);
        }
    };

    const renderInputByType = () => {
        const type = !value.link ? selectedType?.typeName : fieldTypeName.REF;
        const customPlaceholder = props.readOnly ? '' : getPlaceholder({ type });

        const baseProps = {
            ...props,
            containerClassName: style.resetCommonInputWrapper,
            name,
            placeholder: customPlaceholder,
        };

        switch (inputSelected) {
            case DATA_TYPES.string:
                return (
                    <String
                        {...baseProps}
                        value={inputValue as string}
                        onChange={onPrimitiveChange}
                        onDoubleClick={onDoubleClick}
                    />
                );

            // deprecated
            case DATA_TYPES.integer:
                return (
                    <Integer
                        {...baseProps}
                        value={inputValue as number}
                        onChange={onPrimitiveChange}
                        onDoubleClick={onDoubleClick}
                    />
                );

            case DATA_TYPES.float:
                return (
                    <Float
                        {...baseProps}
                        value={inputValue as number}
                        onChange={onPrimitiveChange}
                        onDoubleClick={onDoubleClick}
                    />
                );

            case DATA_TYPES.boolean:
                return (
                    <BooleanInput
                        {...baseProps}
                        value={inputValue as boolean}
                        onChange={onPrimitiveChange}
                        onDoubleClick={onDoubleClick}
                    />
                );

            case DATA_TYPES.datetime:
                return (
                    <DateTime
                        {...baseProps}
                        value={inputValue as string}
                        onChange={onChangeDatePickerValue}
                        onDoubleClick={onDoubleClick}
                    />
                );

            case DATA_TYPES.ref:
            default:
                return (
                    <Ref
                        readOnly={props.readOnly}
                        metaRef={{
                            link: selectedType?.link ?? '',
                            value: selectedType.value ?? '',
                        }}
                        value={
                            {
                                value: inputValue,
                                label: selectedLinkOption || '',
                            } as SearchSelectPropsType['value']
                        }
                        refSearchFields={props.refSearchFields}
                        labelMask={props.labelMask}
                        onChange={onChangeRefValue}
                        onDoubleClick={onDoubleClick}
                    />
                );
        }
    };

    return (
        <ErrorBoundary
            downloadLogs={{
                logObj: {
                    props,
                    state: {
                        selectedType,
                        inputValue,
                        selectedLinkOption,
                    },
                },
                fileName: generateLogsFileName('MetadataForms_Inputs_CompositeContent'),
            }}
        >
            <div className={style.commonInputWrapper}>
                <CommonInputContext.Provider value={{ deleteButton: false }}>
                    {renderInputByType()}
                </CommonInputContext.Provider>
                <CommonInput
                    {...props}
                    name={name}
                    value={inputValue as string}
                    type="ref"
                    className={style.resetCommonInput}
                    fullWidth={false}
                    disabled={!selectedType}
                    showNativeInput={false}
                    changeButton
                    deleteButton
                    readOnly={props.readOnly}
                    onDoubleClick={onDoubleClick}
                    onClear={onClear}
                    onChange={onChangeInputValue}
                    onClickChange={onClickFormTypeSelection}
                />
            </div>
        </ErrorBoundary>
    );
};

const MemoizedComposite = memo(CompositeContent);

export class Composite extends Component<ICompositeInputProps> {
    render(): ReactNode {
        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: {} },
                    fileName: generateLogsFileName('MetadataForms_Inputs_Composite'),
                }}
            >
                <MemoizedComposite {...this.props} />
            </ErrorBoundary>
        );
    }
}
