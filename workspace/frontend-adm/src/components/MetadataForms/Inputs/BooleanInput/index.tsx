import cn from "classnames"
import { Component, type KeyboardEventHandler, type ReactNode } from "react"
import { CommonInput, type CommonInputProps } from "components/CommonInput"
import { ErrorBoundary } from "components/ErrorBoundary"
import { allowedKeyboardKeys } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/constants"
import style from "../style.module.css"
import { generateLogsFileName } from "components/MetadataForms/Inputs/utils"
import { getBooleanLabel } from "components/MetadataForms/Inputs/BooleanInput/utils"

interface IBooleanProps extends Omit<CommonInputProps, "value" | "onChange"> {
    value: boolean
    onChange?: (value: boolean | null) => void
}

interface IBooleanState {
    value: boolean | null
}

/**
 * Компонент выбора boolean значения. Предоставляет выпадающий список с двумя значениями (да/нет)
 */
class BooleanContent extends Component<IBooleanProps, IBooleanState> {
    constructor(props: IBooleanProps) {
        super(props)

        this.state = {
            value: typeof this.props.value === "boolean" ? this.props.value : null,
        }
    }

    componentDidUpdate(prevProps: IBooleanProps) {
        if (prevProps.value !== this.props.value) {
            this.setState({ value: typeof this.props.value === "boolean" ? this.props.value : null })
        }
    }

    /**
     * Обработка выбора значения из выпадающего списка
     * @param value {boolean}
     */
    onChange = (value: boolean | null) => {
        this.setState({ value })
        this.props.onChange?.(value)
    }

    /**
     * Очистка значения. При очистке значение сбрасывается на false
     */
    onClickDelete = () => {
        this.setState({ value: null })
        this.props.onChange?.(null)
    }

    onKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
        // Сначала вызываем внешний обработчик (из таблицы)
        if (this.props.onKeyDown) {
            this.props.onKeyDown(e)

            // Если внешний обработчик вызвал preventDefault,
            // не выполняем дальше нашу логику
            if (e.defaultPrevented) {
                return
            }
        }

        // Затем выполняем свою логику
        e.stopPropagation()

        if (!allowedKeyboardKeys.includes(e.key)) {
            e.preventDefault()
        }
    }

    onDoubleClick = (event: React.MouseEvent<HTMLInputElement>) => {
        if (this.props.onDoubleClick) {
            this.props.onDoubleClick(event)
        }
    }

    render() {
        const value = getBooleanLabel(this.state.value)

        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: this.state },
                    fileName: generateLogsFileName("MetadataForms_Inputs_BooleanContent"),
                }}
            >
                <div className={cn(style.commonInputWrapper, this.props.containerClassName)}>
                    <CommonInput
                        {...this.props}
                        type="dropdown"
                        value={value}
                        selectButton
                        deleteButton
                        dropdownOptions={[
                            {
                                label: "Да", // Текст, отображаемый для опции (обязательное свойство)
                                title: "Да", // Текст всплывающей подсказки
                                onClick: () => this.onChange(true),
                            },
                            {
                                label: "Нет", // Текст, отображаемый для опции (обязательное свойство)
                                title: "Нет", // Текст всплывающей подсказки
                                onClick: () => this.onChange(false),
                            },
                            {
                                label: "Не определено",
                                title: "Не определено",
                                onClick: () => this.onChange(null),
                            },
                        ]}
                        onClickDelete={this.onClickDelete}
                        onChange={() => {}}
                        onKeyDown={this.onKeyDown}
                        onDoubleClick={this.onDoubleClick}
                    />
                </div>
            </ErrorBoundary>
        )
    }
}
export class BooleanInput extends Component<IBooleanProps> {
    render(): ReactNode {
        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: {} },
                    fileName: generateLogsFileName("MetadataForms_Inputs_Boolean"),
                }}
            >
                <BooleanContent {...this.props} />
            </ErrorBoundary>
        )
    }
}
