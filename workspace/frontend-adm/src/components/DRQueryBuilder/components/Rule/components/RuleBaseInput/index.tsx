import { Component, type ReactNode } from "react"
import { BooleanInput } from "components/MetadataForms/Inputs/BooleanInput"
import { Composite } from "components/MetadataForms/Inputs/Composite"
import type { DataType, ICompositeValue } from "components/MetadataForms/Inputs/Composite/types"
import { DateInput } from "components/MetadataForms/Inputs/DateInput"
import { DateTime } from "components/MetadataForms/Inputs/DateTime"
import { Float } from "components/MetadataForms/Inputs/Float"
import { Integer } from "components/MetadataForms/Inputs/Integer"
import { Ref } from "components/MetadataForms/Inputs/Ref"
import { String } from "components/MetadataForms/Inputs/String"
import { fieldTypeName, typeCodeToTypeNameMapping, typeNameToTypeCodeMapping } from "components/MetadataForms/MetaInput/constant"
import type { MetaField } from "components/DRQueryBuilder/types"

interface IRuleBaseInputProps {
    type: MetaField['type'];
    value: any;
    handleChange: (newValue: any) => void;
    inputMetaProps?: {
        metaRef?: string;
        dataTypes?: DataType[]
    }
    placeholder?: string;
}

type IRuleBaseInputState = {}

export class RuleBaseInput extends Component<IRuleBaseInputProps, IRuleBaseInputState> {
    isValidUuid = (uuid: string): boolean => uuid.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);


    handleUUIDChange = (value: string) => {
        this.setState({ localUuidValue: value });

        if (this.isValidUuid(value)) {
            this.props.handleChange(value);
        }
    }

    handleCompositeChange = (value: ICompositeValue) => {
        this.props.handleChange({
            value: value.value,
            link: value.link,
            type: typeof value.type === 'number' ? value.type : typeNameToTypeCodeMapping[value.type || 'ref'],
            label: value.label || '',
        });
    }

    render(): ReactNode {
        const { type, inputMetaProps, value, handleChange, placeholder } = this.props;
    
        switch (type) {
            case fieldTypeName.REF:
                return (
                    <Ref
                            metaRef={{value: inputMetaProps?.metaRef ?? null, link: inputMetaProps?.metaRef  ?? null}}
                            value={value as any}
                            onChange={(newValue) => handleChange(newValue)}
                        />
                );
            case fieldTypeName.BOOLEAN:
                return (
                    <BooleanInput
                        value={value as any}
                        onChange={handleChange}
                        onClear={() => handleChange(null)}
                        placeholder={placeholder}
                    /> 
                );
            case fieldTypeName.INTEGER:
                return (
                    <Integer
                        value={value as number}
                        onChange={(newValue) => handleChange(newValue)}
                        onClear={() => handleChange('')}
                        placeholder={placeholder}
                    />
                );
            case fieldTypeName.FLOAT:
                return (
                    <Float
                        value={value as number}
                        onChange={(newValue) => handleChange(newValue)}
                        onClear={() => handleChange('')}
                        placeholder={placeholder}
                    />
                );
            case fieldTypeName.DATE:
                return (
                    <DateInput
                        placeholder={placeholder ?? "Выберете дату"}
                        value={value as string}
                        fullWidth
                        onChange={handleChange}
                        onClear={() => handleChange('')}
                    /> 
                );
            case fieldTypeName.DATETIME:
            case fieldTypeName.TIMESTAMP:
                return (
                    <DateTime
                        placeholder={placeholder ?? "Выберете дату"}
                        value={value as string}
                        fullWidth
                        onChange={handleChange}
                        onClear={() => handleChange('')}
                    /> 
                );
            case fieldTypeName.UUID:
                return (
                    <String
                        value={value as string}
                        onChange={(newValue) => handleChange(newValue)}
                        onClear={() => handleChange('')}
                        placeholder={placeholder}
                    />
                );
            case fieldTypeName.COMPOSITE: {

                const dataTypes = this.props.inputMetaProps?.dataTypes!
                let compositeType = null
                if (value instanceof Object && value.type) {
                    const type = value.type as number ?? 10
                    const typeName = typeof type === 'number' ? typeCodeToTypeNameMapping[type] : type
    
                    if (typeName === fieldTypeName.REF) {
                        const selectedType = dataTypes.find((type) => type.value === value?.link)
                        compositeType = selectedType?.value || 'ref'
                    } else {
                        compositeType = typeName
                    }
                }
                return (
                    <Composite
                        dataTypes={dataTypes}
                        value={{
                            type: compositeType,
                            value: value.value ?? null,
                            link: value.link ?? null,
                            label: value.label ?? '',
                            // label: this.getRefsLabel() ?? `Ошибка поиска значения ${value?.value}`,
                        }}
                        onChange={(newValue) => this.handleCompositeChange(newValue)}
                        onClear={() => this.handleCompositeChange({value: null, link: null, type: 'ref', label: ''})}
                        placeholder={placeholder}
                    />
                );
            }
            case fieldTypeName.TEXT:
            case fieldTypeName.STRING:
                return (
                    <String
                        value={value as string}
                        onChange={(newValue) => handleChange(newValue)}
                        onClear={() => handleChange('')}
                        placeholder={placeholder}
                    />
                );
            default:
                return (
                    <String
                        value={value as string}
                        onChange={(newValue) => handleChange(newValue)}
                        onClear={() => handleChange('')}
                        placeholder={placeholder}
                    />
                );
        }
    }
}