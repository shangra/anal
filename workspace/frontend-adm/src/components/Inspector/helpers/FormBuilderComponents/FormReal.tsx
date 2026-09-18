import { Component, type ReactNode } from 'react';
import { FormInputWrapper } from 'components/Inspector/helpers/FormBuilderComponents/FormInputWrapper';
import { Float } from 'components/MetadataForms/Inputs/Float';
import type { FormComponentProps } from 'components/Inspector/types';

export class FormReal extends Component<FormComponentProps> {
    handleChange = (value: number): void => {
        this.props?.onChange?.(this.props.data.name, value);
    };

    render(): ReactNode {
        if (typeof this.props.value !== 'number') return null;
        return (
            <FormInputWrapper description={this.props.data.description}>
                <Float
                    name={this.props.data.name}
                    value={this.props.value}
                    placeholder={this.props.data.template}
                    readOnly={this.props.readOnly}
                    disabled={this.props.disabled}
                    onChange={this.handleChange}
                    step={0.01}
                />
            </FormInputWrapper>
        );
    }
}
