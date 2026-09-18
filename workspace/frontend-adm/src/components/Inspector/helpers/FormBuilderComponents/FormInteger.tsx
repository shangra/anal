import { Component, type ReactNode } from 'react';
import { FormInputWrapper } from 'components/Inspector/helpers/FormBuilderComponents/FormInputWrapper';
import { Integer } from 'components/MetadataForms/Inputs/Integer';
import type { FormComponentProps } from 'components/Inspector/types';

export class FormInteger extends Component<FormComponentProps> {
    handleChange = (newValue: string): void => {
        this.props?.onChange?.(this.props.data.name, newValue);
    };

    render(): ReactNode {
        return (
            <FormInputWrapper description={this.props.data.description}>
                {/* @ts-expect-error - пропсы value/onChange несовместимы, но код работал в JS */}
                <Integer
                    type="number"
                    name={this.props.data.name}
                    value={this.props.value as Integer}
                    placeholder={this.props.data.template}
                    readOnly={this.props.readOnly}
                    disabled={this.props.disabled}
                    onChange={this.handleChange}
                    minNumber={0}
                    maxNumber={100000}
                />
            </FormInputWrapper>
        );
    }
}
