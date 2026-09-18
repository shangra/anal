import { Component, type ReactNode } from 'react';
import { Select } from 'components/MetadataForms/Inputs/Select';
import './FormList.css';
import { FormInputWrapper } from 'components/Inspector/helpers/FormBuilderComponents/FormInputWrapper';

interface FormGroupListProps {
    value: unknown;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>;
    disabled?: boolean;
    loading?: boolean;
    children?: ReactNode;
    link?: string;
    onChange: (name: string, value: string | undefined) => void;
    titleLabels?: Record<string, string>;
}

interface FormGroupListState {
    value: string | undefined;
}

export class FormGroupList extends Component<FormGroupListProps, FormGroupListState> {
    constructor(props: FormGroupListProps) {
        super(props);

        const value =
            typeof this.props.value === 'object'
                ? this.props.value
                : { link: this.props?.data?.link, value: this.props.value };

        this.state = {
            value: JSON.stringify(value),
        };
    }

    componentDidUpdate(): void {
        const value =
            typeof this.props.value === 'object' ? this.props.value : { link: this.props?.link, value: this.props.value };

        if (JSON.stringify(value) !== this.state.value) {
            this.setState({ value: JSON.stringify(value) });
        }
    }

    // мне только одному показалась странной несогласованность компонента? Функция имеет тип аргумента null, а родительская функция принимает undefined
    handleChange = (value: string | null): void => {
        this.setState({ value: value ?? undefined });

        try {
            if (value) {
                JSON.parse(value);
            }
        } catch (e) {
            // Keep as string for single values
        }

        this.props?.onChange(this.props.data.name, value ?? undefined);
    };

    render() {
        const options: { value: string; label: string; options?: { value: string; label: string }[] }[] = [];
        const { titleLabels } = this.props;

        for (const groupValue in this.props.data.list) {
            const label = this.props.data.list[groupValue];
            if (typeof label === 'object') {
                const option: { value: string; label: string }[] = [];
                for (const itemValue in label) {
                    const itemLabel = label[itemValue];
                    option.push({
                        value: itemValue,
                        label: itemLabel,
                    });
                }
                options.push({
                    value: groupValue,
                    label: titleLabels?.[groupValue] ?? groupValue,
                    options: option,
                });
            } else {
                options.push({
                    value: groupValue,
                    label,
                });
            }
        }

        return (
            <FormInputWrapper description={this.props.data.description}>
                <Select
                    name={this.props.data.name}
                    value={this.state.value}
                    options={options}
                    disabled={this.props.disabled}
                    onChange={this.handleChange}
                    placeholder={this.props.data.template}
                    grouped
                    loading={this.props.loading}
                    popoverOffset={16}
                />
                {this.props.children}
            </FormInputWrapper>
        );
    }
}
