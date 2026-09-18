import { Component, type ReactNode } from 'react';
import { TimePicker } from 'ui-kit';
import { FormInputWrapper } from 'components/Inspector/helpers/FormBuilderComponents/FormInputWrapper';
import type { FormComponentProps } from 'components/Inspector/types';

export class FormDateTime extends Component<FormComponentProps> {
    handleChange = (datetime: string | null): void => {
        this.props?.onChange?.(this.props.data.name, datetime);
    };

    render(): ReactNode {
        return (
            <FormInputWrapper description={this.props.data.description}>
                <TimePicker
                    name={this.props.data.name}
                    // @ts-expect-error - string|undefined несовместим с TimeValueType, но код работал в JS
                    value={this.props.value as string | undefined}
                    placeholder={this.props.data.template}
                    disabled={this.props.disabled}
                    // @ts-expect-error - handleChange несовместим с onChange TimePicker, но код работал в JS
                    onChange={this.handleChange}
                    fullWidth
                />
            </FormInputWrapper>
        );
    }
}
