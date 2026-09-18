import React, { Component } from 'react';
import { Checkbox } from 'ui-kit';
import { FormInputWrapper } from 'components/Inspector/helpers/FormBuilderComponents/FormInputWrapper';
import './FormString.css';
import cn from 'classnames';
import { ErrorBoundary } from 'components/ErrorBoundary';
import { generateLogsFileName } from 'components/MetadataForms/Inputs/utils';
import { String } from 'components/MetadataForms/Inputs/String';
import type { FormComponentProps } from 'components/Inspector/types';

/** Типы для валидации строковых полей */
type FormStringType = 'url' | 'email' | 'name';

interface ValidationRule {
    regex: RegExp;
    error: string;
}

const VALIDATION_RULES: Record<FormStringType, ValidationRule> = {
    url: {
        regex: /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(\/[\w\-./~%]*)?$/i,
        error: 'Не соответствует типу URL',
    },
    email: {
        regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        error: 'Не соответствует типу E-mail',
    },
    name: {
        regex: /^[a-zA-Z0-9_]{1,64}$/,
        error: 'Не соответствует типу name',
    },
};

const REQUIRED_ERROR = 'Обязательное поле';

interface FormStringState {
    disabled: boolean;
    placeholder: string;
    components: { GetComponent: (name: string) => unknown } | null;
    type: FormStringType | string;
    validationError: string | null;
    touched: boolean;
}

export class FormString extends Component<FormComponentProps, FormStringState> {
    private controlRef: React.RefObject<HTMLInputElement>;

    constructor(props: FormComponentProps) {
        super(props);

        this.controlRef = React.createRef<HTMLInputElement>();

        const isNull = this.props.value === null;
        const type = (this.props.type || this.props.data?.type || this.props.data?.inputType) as FormStringType | string;

        this.state = {
            disabled: (this.props.disabled ?? false) || isNull,
            placeholder: isNull ? 'NULL' : (this.props.data.template as string) ?? '',
            components: null,
            type,
            validationError: null,
            touched: false,
        };
    }

    componentDidMount(): void {
        // @ts-expect-error - модуль 'components' не имеет типов
        import('components').then((components: { GetComponent: (name: string) => React.Component }) => {
            this.setState({
                components,
            });
        });
    }

    componentDidUpdate(prevProps: FormComponentProps): void {
        if (this.props.disabled !== prevProps.disabled) {
            this.setState({ disabled: this.props.disabled ?? false });
        }
    }

    ButtonBuilder = (
        buttons: { component?: string; name?: string; props?: Record<string, unknown> }[] = [],
    ): React.ReactNode[] =>
        buttons.map((b) => {
            const cmp = (
                this.state.components as { GetComponent: (name: string) => React.ComponentType<unknown> } | null
            )?.GetComponent(`Components.${b.component}`);
            if (!cmp) return null;
            const elProps: Record<string, unknown> = {
                key: b.name,
                ...b.props,
                server: this.props.server,
                /* @deprecated Используйте прямой доступ к данным формы через field, onChange и getValue */
                controlRef: this.controlRef,
                field: this.props.data.name,
                onChange: (value: string) => this.props?.onChange?.(this.props.data.name, value),
                getValue: () => this.props.value,
            };
            return React.createElement(cmp, elProps);
        });

    computeValidationError = (value: string): string | null => {
        if (value == null || value === '') {
            if (this.state.touched && this.props.required) {
                return REQUIRED_ERROR;
            }
            return null;
        }

        const { type } = this.state;
        if (type && VALIDATION_RULES[type as FormStringType]) {
            const rule = VALIDATION_RULES[type as FormStringType];
            return rule.regex.test(value) ? null : rule.error;
        }

        return null;
    };

    handleSetNull = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const { checked } = e.target;

        this.setState(
            {
                disabled: checked,
                placeholder: checked ? 'NULL' : (this.props.data.template as string) ?? '',
                touched: true,
            },
            () => {
                this.props?.onChange?.(this.props.data.name, checked ? null : this.props.value ?? '');
            },
        );
    };

    handleChange = (e: string | React.ChangeEvent<HTMLInputElement>): void => {
        const value = typeof e === 'string' ? e : e.target.value;
        const error = this.computeValidationError(value);

        this.setState({ validationError: error, touched: true }, () => {
            this.props?.onChange?.(this.props.data.name, value);
        });
    };

    handleStringChange = (value: string | null): void => {
        this.handleChange(value ?? '');
    };

    handleFocus = (): void => {
        if (!this.state.touched) {
            this.setState({ touched: true });
        }
    };

    render(): React.ReactNode {
        const { validationError } = this.state;

        if (!this.state.components) {
            return null;
        }

        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: this.state },
                    fileName: generateLogsFileName('FormString'),
                }}
            >
                <FormInputWrapper description={this.props.data.description} required={this.props.required}>
                    <div className="form-input-group">
                        {this.ButtonBuilder(
                            (
                                this.props.data.buttons as {
                                    type?: string;
                                    component?: string;
                                    name?: string;
                                    props?: Record<string, unknown>;
                                }[]
                            )?.filter((b) => b.type === 'before') ?? [],
                        )}
                        {this.props.data.nullable ? (
                            <div className="form-input">
                                <Checkbox
                                    checked={this.props.value === null}
                                    aria-label="Установить в NULL"
                                    onChange={this.handleSetNull}
                                />
                            </div>
                        ) : null}
                        <String
                            name={this.props.data.name}
                            value={typeof this.props.value === 'string' ? this.props.value : ''}
                            onChange={this.handleStringChange}
                            onFocus={this.handleFocus}
                            placeholder={this.state.placeholder}
                            disabled={this.state.disabled}
                            readOnly={this.props.readOnly}
                            status={validationError ? 'error' : undefined}
                            hint={validationError ?? ''}
                            className={cn(this.props.data.nullable ? 'input-group-checkbox' : undefined)}
                            onClear={() => this.props?.onChange?.(this.props.data.name, '')}
                        />
                        {this.ButtonBuilder(
                            (
                                this.props.data.buttons as {
                                    type?: string;
                                    component?: string;
                                    name?: string;
                                    props?: Record<string, unknown>;
                                }[]
                            )?.filter((b) => b.type === 'after') ?? [],
                        )}
                    </div>
                </FormInputWrapper>
            </ErrorBoundary>
        );
    }
}
