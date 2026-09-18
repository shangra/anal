import { Component, type ChangeEvent, type ReactNode } from 'react';
import { Switch } from 'ui-kit';
import { FormInputWrapper } from 'components/Inspector/helpers/FormBuilderComponents/FormInputWrapper';
import type { FormComponentProps } from 'components/Inspector/types';

interface FormBoolState {
    value: boolean;
}

export class FormBool extends Component<FormComponentProps, FormBoolState> {
    constructor(props: FormComponentProps) {
        super(props);

        let value = false;
        if (props.forceValue !== undefined) {
            value = Boolean(props.forceValue);
        } else if (props.value !== undefined && props.value !== null) {
            value = Boolean(props.value);
        } else if (props.data?.default !== undefined) {
            value = Boolean(props.data.default);
        }

        this.state = { value };
    }

    componentDidMount(): void {
        this.props?.onChange?.(this.props.data.name, this.state.value);
    }

    componentDidUpdate(prevProps: FormComponentProps): void {
        if (this.props.value !== prevProps.value) {
            this.setState(() => ({ value: this.props.value as boolean }));
        }
    }

    handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const { checked } = e.target;
        this.setState({ value: checked });
        this.props?.onChange?.(this.props.data.name, checked);
    };

    render(): ReactNode {
        const isDisabled = this.props.disabled || typeof this.props.forceValue === 'boolean';
        return (
            <FormInputWrapper description={this.props.data.description}>
                <Switch
                    disabled={isDisabled}
                    name={this.props.data.name}
                    // value={this.state.value}
                    checked={this.state.value}
                    onChange={this.handleChange}
                    label={this.state.value ? 'Да' : 'Нет'}
                    type="checkbox"
                    style={{ width: '100%' }}
                />
            </FormInputWrapper>
        );
    }
}
