import { ChangeEvent, Component, ReactNode } from "react";
import { CommonInput, CommonInputProps } from "components/CommonInput";
import style from '../style.module.css';
import cn from "classnames";
import { ErrorBoundary } from "components/ErrorBoundary";
import { generateLogsFileName } from "components/MetadataForms/Inputs/utils";

interface IIntegerProps extends Omit<CommonInputProps, 'value' | 'onChange'> {
    value?: number,
    step?: number,
    onChange?: (value: number) => void,
    isTable?: boolean,
}

interface IIntegerState {
    value: number,
}

const DEFAULT_STEP = 1;

class IntegerContent extends Component<IIntegerProps, IIntegerState> {
    constructor(props: IIntegerProps) {
        super(props);

        this.state = {
            value: props.value ?? 0,
        }
    }

    componentDidUpdate(prevProps: IIntegerProps) {
        if (prevProps.value !== this.props.value && this.props.value) {
            this.setState({ value: this.props.value });
        }
    }

    /**
     * Обработка ручного ввода числа
     * @param e {ChangeEvent<HTMLInputElement>}
     */
    onChange = (e: ChangeEvent<HTMLInputElement>) => {
        let str = e.target.value;
        str = str.replace(/\D/g, "");

        if (str === '') {
            this.setState(() => ({ value: 0 }), () => {
                this.props.onChange?.(0);
            });
        } else {
            this.setState(() => ({ value: Number.parseInt(str) }), () => {
                this.props.onChange?.(Number.parseInt(str));
            });
        }
    }

    /**
     * Обработчик зажатия кнопки изменений диапазона
     * @param value {number} - актуальное значение счётчика, которое возвращает хук внутри CommonInput
     * @description Обновить state.value и вызвать обработчик props.onChange
     */
    onMouseDownRange = (value: number) => {
        this.setState({ value }, () => this.props.onChange?.(value));
    }

    onClickDelete = () => {
        this.setState({ value: 0 });
        this.props.onClear?.();
    }

    render() {
        return (
            <ErrorBoundary downloadLogs={{
                logObj: { props: this.props, state: this.state },
                fileName: generateLogsFileName("MetadataForms_Inputs_IntegerContent"),
            }}>
                <div className={cn(style.commonInputWrapper, this.props.containerClassName)}>
                    <CommonInput
                        {...this.props}
                        value={String(this.state.value)}
                        type='number'
                        rangeButton
                        deleteButton
                        step={this.props.step ?? DEFAULT_STEP}
                        onChange={this.onChange}
                        onMouseDownRange={this.onMouseDownRange}
                        onClickDelete={this.onClickDelete}
                        isTable={this.props.isTable}
                    />
                </div>
            </ErrorBoundary>
        );
    }
}

export class Integer extends Component<IIntegerProps> {
    render(): ReactNode {
        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: {} },
                    fileName: generateLogsFileName("MetadataForms_Inputs_Integer")
                }}
            >
                <IntegerContent {...this.props}/>
            </ErrorBoundary>
        )
    }
}