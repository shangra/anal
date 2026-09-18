import { Component, type ReactNode } from 'react';
import { FormInputWrapper } from 'components/Inspector/helpers/FormBuilderComponents/FormInputWrapper';
import { DatePicker } from 'ui-kit';
import type { FormComponentProps } from 'components/Inspector/types';

export class FormDate extends Component<FormComponentProps> {
    handleChange = (date: string | null): void => {
        this.props?.onChange?.(this.props.data.name, date);
    };

    render(): ReactNode {
        return (
            <FormInputWrapper description={this.props.data.description}>
                <DatePicker
                    name={this.props.data.name}
                    // @ts-expect-error - string|undefined несовместим с DateValue, но код работал в JS
                    value={this.props.value as string | undefined}
                    placeholder={this.props.data.template}
                    disabled={this.props.disabled}
                    // @ts-expect-error - handleChange несовместим с onChange DatePicker, но код работал в JS
                    onChange={this.handleChange}
                    fullWidth
                />
            </FormInputWrapper>
        );
    }
}
