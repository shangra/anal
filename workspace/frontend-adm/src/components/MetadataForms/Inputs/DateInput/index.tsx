import cn from "classnames"
import dayjs, { type Dayjs } from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"
import React, { type ChangeEvent, Component, type ReactNode } from "react"
import type { DateValue } from "ui-kit"
import { CommonInput, type CommonInputProps } from "components/CommonInput"
import { ErrorBoundary } from "components/ErrorBoundary"
import commonStyle from "../style.module.css"
import { generateLogsFileName } from "components/MetadataForms/Inputs/utils"
import { DatePicker } from "components/MetadataForms/Inputs/DateInput/components/DatePicker"
import style from "./style.module.css"

interface IDateInputProps extends Omit<CommonInputProps, "value" | "onChange"> {
    value?: string
    onChange?: (value: string | null) => void
}

interface IDateInputState {
    value: {
        /** Объект даты */
        date: Dayjs | null
        /** Строка даты для отображения в поле ввода */
        inputString: string | null
    }
    validateError: string | null
}

const DATE_FORMAT = "DD.MM.YYYY"
const ISO_UTC_FORMAT = "YYYY-MM-DDTHH:mm:ss"

/**
 * Компонент для работы с датой в формах.
 * Рисует CommonInput с кнопками календаря и очистки поля и календарь из ui-kit (fork DatePicker в components).
 * В props принимает value типа string (ISO), в state хранит объект Date, отрисовывает в поле string (dd.mm.yyyy).
 */
class DateInputContent extends Component<IDateInputProps, IDateInputState> {
    // ref для инпута в DatePicker
    private readonly refDatePickerInput: React.RefObject<HTMLDivElement>

    constructor(props: IDateInputProps) {
        super(props)

        dayjs.extend(customParseFormat)
        
        const newDate = props.value ? dayjs(props.value) : null 
        this.state = {
            value: {
                date: newDate,
                inputString: newDate === null ? null : newDate.format(DATE_FORMAT),
            },
            validateError: null,
        }

        this.refDatePickerInput = React.createRef()
    }

    componentDidUpdate(prevProps: IDateInputProps) {
        if (prevProps.value !== this.props.value) {
            const newDate = this.props.value === null ? null : dayjs(this.props.value)
            this.setState({
                value: {
                    date: newDate,
                    inputString: newDate === null ? null : newDate.format(DATE_FORMAT),
                },
            })
        }
    }

    /**
     * Обработка клика по кнопке календаря
     */
    onClickDateChange = () => {
        // console.log("onClickDateChange", this.refDatePickerInput)
        // @ts-ignore
        this.refDatePickerInput.current?.components?.input?.click() // current
    }

    onClear = () => {
        this.setState(
            {
                value: {
                    date: null,
                    inputString: null,
                },
            },
            () => this.props.onClear?.(),
        )
    }

    /**
     * Обработка выбора даты в календаре
     * @param value {DateValue} - объект даты
     * @description В state записать объект Date, в props.onChange передаётся строка ISO
     */
    onSelectDateValue = (value: DateValue) => {
        if (value) {
            const newDate = dayjs(value)
            this.setState(
                {
                    value: {
                        date: newDate,
                        inputString: newDate.format(DATE_FORMAT),
                    },
                },
                () => this.props.onChange?.(newDate.format(ISO_UTC_FORMAT)),
            )
        }
    }

    /**
     * Обработка ручного ввода
     * @param e {ChangeEvent<HTMLInputElement>}
     * @description Получить часть с датой и временем из строки поля ввода и обновить каждую из них в state.
     * Получаем формат dd.mm.yyyy hh.mm.ss
     */
    onChange = (e: ChangeEvent<HTMLInputElement>) => {
        const {value} = e.target

        const day = "(0[1-9]|[12][0-9]|3[01])" // День: 01-31
        const month = "(0[1-9]|1[0-2])" // Месяц: 01-12
        const year = "\\d{4}" // Год: 4 цифры
        const dateTimeRegex = new RegExp(`^${day}\\.${month}\\.${year}$`)

        if(!value) {
            this.onClear()
            return
        }

        if (!dateTimeRegex.test(value)) {
            this.setState({
                validateError: "Формат ввода должен соответствовать формату: ДД.ММ.ГГГГ",
                value: {
                    date: null,
                    inputString: value,
                },
            })
            return
        } 
            this.setState({
                validateError: "",
            })
        

        const newDate = dayjs(value, DATE_FORMAT, true)
        this.setState(
            {
                value: {
                    date: newDate,
                    inputString: newDate.format(DATE_FORMAT),
                },
            },
            () => {
                if (!this.state.validateError) {
                    const isoDate = this.state.value.date!.format(ISO_UTC_FORMAT)
                    this.props.onChange?.(isoDate)
                }
            },
        )
    }

    render() {
        // console.log("refDatePickerInput", this.refDatePickerInput);

        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: this.state },
                    fileName: generateLogsFileName("MetadataForms_Inputs_DateInputContent"),
                }}
            >
                <div className={cn(commonStyle.commonInputWrapper, this.props.containerClassName)}>
                    <CommonInput
                        {...this.props}
                        value={this.state.value.inputString ?? undefined}
                        dateButton
                        deleteButton
                        status={this.state.validateError ? "error" : undefined}
                        hint={this.state.validateError ?? ""}
                        onClickDateChange={this.onClickDateChange}
                        onClear={this.onClear}
                        onChange={this.onChange}
                    />
                    <DatePicker
                        ref={this.refDatePickerInput}
                        className={style.inputDatePicker}
                        style={{ display: "none" }}
                        value={this.state.value.date ? this.state.value.date.toDate() : null}
                        onChange={this.onSelectDateValue}
                    />
                </div>
            </ErrorBoundary>
        )
    }
}

export class DateInput extends Component<IDateInputProps> {
    render(): ReactNode {
        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: {} },
                    fileName: generateLogsFileName("MetadataForms_Inputs_DateInput"),
                }}
            >
                <DateInputContent {...this.props} />
            </ErrorBoundary>
        )
    }
}
