import { Component, ReactNode } from 'react';
import { SelectOption } from 'ui-kit';
import { CommonInput, CommonInputProps } from 'components/CommonInput';
import { CustomSelect } from 'components/MetadataForms/Inputs/Select/components/CustomSelect';
import { GroupedSelect, IGroupedSelectOption } from 'components/MetadataForms/Inputs/Select/components/GroupedSelect';
import style from './style.module.css';
import commonStyle from '../style.module.css';
import cn from 'classnames';
import { ErrorBoundary } from 'components/ErrorBoundary';
import { generateLogsFileName } from 'components/MetadataForms/Inputs/utils';

interface ISelectProps extends Omit<CommonInputProps, 'value' | 'onChange'> {
    value?: string;
    options?: SelectOption<string>[] | (IGroupedSelectOption<string> | { value: string; label: string })[];
    onChange?: (value: string | null) => void;
    grouped?: boolean;
    loading?: boolean;
    popoverOffset?: number;
}

interface ISelectState {
    value: string | null;
    opened: boolean;
}

class SelectContent extends Component<ISelectProps, ISelectState> {
    constructor(props: ISelectProps) {
        super(props);

        this.state = {
            value: props.value ?? null,
            opened: false,
        };
    }

    componentDidUpdate(prevProps: ISelectProps) {
        if (prevProps.value !== this.props.value && this.props.value) {
            this.setState({ value: this.props.value });
        }
    }

    /**
     * Обработка выбора элемента в выпадающем списке
     * @param value {string | null} - поле value выбранного элемента
     * @description Обновить state и вызвать onChange из props.
     */
    onChange = (value: string | null) => {
        this.setState({ value }, () => {
            this.props.onChange?.(value);
        });
    };

    onClickDelete = () => {
        if (this.props.grouped) {
            this.setState({ value: `{ "value": "" }` });
            this.props.onChange?.(`{ "value": "" }`);
        } else {
            this.setState({ value: '' });
            this.props.onChange?.('');
        }
        this.props.onClear?.();
    };

    onOpenSelect = () => {
        this.setState((prevState) => ({ ...prevState, opened: !prevState.opened }));
    };

    onBlur = () => {
        this.setState({ opened: false });
    };

    render() {
        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: {
                        props: this.props,
                        state: this.state,
                    },
                    fileName: generateLogsFileName('MetadataForms_Inputs_SelectContent'),
                }}
            >
                <div className={cn(commonStyle.commonInputWrapper, this.props.containerClassName)}>
                    {this.props.grouped ? (
                        <GroupedSelect
                            setOpen={this.onOpenSelect}
                            opened={this.state.opened}
                            options={this.props.options as (IGroupedSelectOption<string> | { value: string; label: string })[]}
                            value={this.state.value}
                            fullWidth
                            disabled={this.props.disabled}
                            onChange={this.onChange}
                            resettable
                            className={style.selectCustom}
                            loading={this.props.loading}
                            popoverOffset={this.props.popoverOffset}
                        />
                    ) : (
                        <CustomSelect
                            setOpen={this.onOpenSelect}
                            opened={this.state.opened}
                            options={this.props.options}
                            value={this.state.value}
                            fullWidth
                            disabled={this.props.disabled}
                            onChange={this.onChange}
                            resettable
                            className={style.selectCustom}
                            loading={this.props.loading}
                            popoverOffset={this.props.popoverOffset}
                        />
                    )}
                    <CommonInput
                        {...this.props}
                        type="select"
                        value={this.state.value ?? ''}
                        selectButton
                        deleteButton
                        showNativeInput={false}
                        className={style.commonInputReset}
                        onClickDelete={this.onClickDelete}
                        onClickSelect={this.onOpenSelect}
                        onChange={() => {}}
                        onBlur={this.onBlur}
                        disabled={this.props.disabled || this.props.loading}
                    />
                </div>
            </ErrorBoundary>
        );
    }
}

export class Select extends Component<ISelectProps> {
    render(): ReactNode {
        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: {} },
                    fileName: generateLogsFileName('MetadataForms_Inputs_Select'),
                }}
            >
                <SelectContent {...this.props} />
            </ErrorBoundary>
        );
    }
}
