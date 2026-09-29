import { Component, ReactNode } from 'react';
import { SelectOption } from 'ui-kit';
import { CommonInput, CommonInputProps } from '../../../CommonInput';
import { CustomSelect } from './components/CustomSelect';
import style from './style.module.css';
import commonStyle from '../style.module.css';
import cn from 'classnames';
import { ErrorBoundary } from '../../../ErrorBoundary';
import { generateLogsFileName } from '../utils';

interface ISelectProps extends Omit<CommonInputProps, 'value' | 'onChange'> {
    value?: string;
    options?: SelectOption<string>[];
    onChange?: (value: string | null) => void;
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
        if (prevProps.value !== this.props.value) {
            this.setState({ value: this.props.value ?? null });
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
        this.setState({ value: '' });
        this.props.onClear?.();
    };

    onOpenSelect = () => {
        this.setState((prevState) => ({
            ...prevState,
            opened: !prevState.opened,
        }));
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
                    fileName: generateLogsFileName(
                        'MetadataForms_Inputs_SelectContent'
                    ),
                }}
            >
                <div
                    className={cn(
                        commonStyle.commonInputWrapper,
                        this.props.containerClassName
                    )}
                >
                    <CustomSelect
                        opened={this.state.opened}
                        options={this.props.options}
                        value={this.state.value}
                        fullWidth
                        onChange={this.onChange}
                        resettable={true}
                        className={style.selectCustom}
                    />
                    <CommonInput
                        {...this.props}
                        type='select'
                        value={this.state.value ?? ''}
                        selectButton
                        deleteButton
                        showNativeInput={false}
                        className={style.commonInputReset}
                        onClickDelete={this.onClickDelete}
                        onClickSelect={this.onOpenSelect}
                        onChange={() => {}}
                        onBlur={this.onBlur}
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
                    fileName: generateLogsFileName(
                        'MetadataForms_Inputs_Select'
                    ),
                }}
            >
                <SelectContent {...this.props} />
            </ErrorBoundary>
        );
    }
}
