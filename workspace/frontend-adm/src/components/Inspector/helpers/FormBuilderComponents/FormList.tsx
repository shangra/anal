import { Component, type ReactNode } from 'react';
import './FormList.css';
import { ErrorBoundary } from 'components/ErrorBoundary';
import { generateLogsFileName } from 'components/MetadataForms/Inputs/utils';
import { FormInputWrapper } from 'components/Inspector/helpers/FormBuilderComponents/FormInputWrapper';
import { Select } from 'components/MetadataForms/Inputs/Select';
import type { FormComponentProps, FormOnChange } from 'components/Inspector/types';

interface FormListState {
    value: string;
    options: { value?: string; label?: string; options?: { value: string; label: string }[] }[];
}

export class FormList extends Component<FormComponentProps, FormListState> {
    constructor(props: FormComponentProps) {
        super(props);

        const options = this.prepareOptions(props.data.list);
        const initialValue = this.determineInitialValue(props.value, options);

        this.state = {
            value: initialValue,
            options,
        };

        this.immediatelyNotifyParent(initialValue);
    }

    immediatelyNotifyParent = (value: string): void => {
        setTimeout(() => {
            try {
                const parsedValue = value.startsWith('{') ? JSON.parse(value) : value;
                this.props.onChange?.(this.props.data.name, parsedValue, {
                    isValid: value !== '',
                });
            } catch (error) {
                console.error('Error parsing value:', error);
                this.props.onChange?.(this.props.data.name, value, {
                    isValid: value !== '',
                });
            }
        }, 0);
    };

    componentDidUpdate(prevProps: FormComponentProps): void {
        if (prevProps.value !== this.props.value && this.props.value !== undefined) {
            const formattedValue = this.formatValue(this.props.value);
            this.setState({ value: formattedValue });
        }
    }

    determineInitialValue = (externalValue: unknown, options: FormListState['options']): string => {
        if (externalValue === undefined || externalValue === null || externalValue === '') {
            return '';
        }

        const formattedValue = this.formatValue(externalValue);
        return this.isValueValid(formattedValue, options) ? formattedValue : '';
    };

    isValueValid = (value: string, options: FormListState['options']): boolean => {
        if (value === '' || !options || options.length === 0) return false;

        for (const option of options) {
            if (option.options) {
                const found = option.options.some((opt) => opt.value === value);
                if (found) return true;
            } else if (option.value === value) {
                return true;
            }
        }

        return false;
    };

    prepareOptions = (list?: Record<string, string | Record<string, string>>): FormListState['options'] => {
        const options: FormListState['options'] = [{ value: '', label: 'Не выбрано' }];

        if (!list) return options;

        for (const value in list) {
            const label = list[value];

            if (typeof label === 'object') {
                const groupOptions: { value: string; label: string }[] = [];
                for (const childValue in label) {
                    groupOptions.push({
                        value: JSON.stringify({ link: value, value: childValue }),
                        label: label[childValue],
                    });
                }
                options.push({
                    label: value,
                    options: groupOptions,
                });
            } else {
                options.push({
                    value,
                    label,
                });
            }
        }
        return options;
    };

    formatValue = (value: unknown): string => {
        if (value === undefined || value === null) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    notifyParent: FormOnChange = (name, value) => {
        const strValue = String(value);
        try {
            const parsedValue = strValue.startsWith('{') ? JSON.parse(strValue) : strValue;
            this.props.onChange?.(this.props.data.name, parsedValue, {
                isValid: strValue !== '',
            });
        } catch (error) {
            console.error('Error parsing value:', error);
            this.props.onChange?.(this.props.data.name, strValue, {
                isValid: strValue !== '',
            });
        }
    };

    handleChange = (newValue: string): void => {
        this.setState({ value: newValue });
        this.notifyParent(this.props.data.name, newValue);
    };

    handleClear = (): void => {
        this.setState({ value: '' });
        this.notifyParent(this.props.data.name, '');
    };

    render(): ReactNode {
        const { data } = this.props;
        const { value, options } = this.state;

        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: this.state },
                    fileName: generateLogsFileName('FormList'),
                }}
            >
                <FormInputWrapper description={data.description}>
                    <Select
                        name={data.name}
                        value={value}
                        disabled={this.props.disabled}
                        onChange={this.handleChange as (value: string | null) => void}
                        aria-label={data.description}
                        options={options}
                        onClear={this.handleClear}
                        popoverOffset={16}
                    />
                    {this.props.children}
                </FormInputWrapper>
            </ErrorBoundary>
        );
    }
}
