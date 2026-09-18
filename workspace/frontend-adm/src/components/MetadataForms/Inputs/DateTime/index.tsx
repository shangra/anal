import cn from "classnames"
import dayjs, { type Dayjs } from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"
import React, { type ChangeEvent, Component, type KeyboardEventHandler, type MouseEvent, type ReactNode } from "react"
import type { DateValue } from "ui-kit"
import { CommonInput, type CommonInputProps } from "components/CommonInput"
import { ErrorBoundary } from "components/ErrorBoundary"
import commonStyle from "../style.module.css"
import { generateLogsFileName } from "components/MetadataForms/Inputs/utils"
import { DatePicker } from "components/MetadataForms/Inputs/DateTime/components/DatePicker"
import { allowedKeyboardKeys } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/constants"
import type { FullTimeValueType } from "components/MetadataForms/Inputs/DateTime/components/TimePicker/types"

interface IDateTimeProps extends Omit<CommonInputProps, "value" | "onChange"> {
    /** Дата в формате ISO */
    readOnly?: boolean
    value?: string
    onChange?: (value: string | null) => void
}

interface IDateTimeState {
    value: {
        /** Строка даты для DatePicker */
        date: string | null
        /** Объект времени { hours, minutes } для TimePicker */
        time: FullTimeValueType
        /** Объект даты */
        dateTime: Dayjs | null
    }
    /** Строка с датой для отображения в инпуте (dd.mm.yyyy hh.mm.ss) */
    viewDateTime: string | null
    isOpenPickers: boolean
    validateError: string | null
}

const DATE_FORMAT = "DD.MM.YYYY"
const DATETIME_FORMAT = "DD.MM.YYYY HH:mm:ss"
const ISO_UTC_FORMAT = "YYYY-MM-DDTHH:mm:ss"

/**
 * Компонент для работы с датой и временем в формате dd.mm.yyyy hh.mm.ss.
 */
class DateTimeContent extends Component<IDateTimeProps, IDateTimeState> {
    private readonly refDatePickerInput: React.RefObject<HTMLDivElement>

    constructor(props: IDateTimeProps) {
        super(props)

        dayjs.extend(customParseFormat)

        const propsDate = props.value ? dayjs(props.value) : null

        this.state = {
            value: {
                date: propsDate ? propsDate.format(DATE_FORMAT) : null,
                time: {
                    hours: propsDate ? propsDate.hour().toString().padStart(2, "0") : "00",
                    minutes: propsDate ? propsDate.minute().toString().padStart(2, "0") : "00",
                    seconds: propsDate ? propsDate.second().toString().padStart(2, "0") : "00",
                },
                dateTime: propsDate,
            },
            viewDateTime: propsDate ? propsDate?.format(DATETIME_FORMAT) : '',
            isOpenPickers: false,
            validateError: null,
        }

        this.refDatePickerInput = React.createRef()
    }

    componentDidUpdate(prevProps: IDateTimeProps) {
        if (prevProps.value !== this.props.value) {
            const propsDate = this.props.value ? dayjs(this.props.value) : null

            this.setState({
                value: {
                    date: propsDate ? propsDate.format(DATE_FORMAT) : null,
                    time: {
                        hours: propsDate ? propsDate.hour().toString().padStart(2, "0") : "00",
                        minutes: propsDate ? propsDate.minute().toString().padStart(2, "0") : "00",
                        seconds: propsDate ? propsDate.second().toString().padStart(2, "0") : "00",
                    },
                    dateTime: propsDate,
                },
                viewDateTime: propsDate ? propsDate?.format(DATETIME_FORMAT) : '',
            })
        }
    }

    /**
     * Обработка ручного ввода
     * @param e {ChangeEvent<HTMLInputElement>}
     * @description Получить часть с датой и временем из строки поля ввода и обновить каждую из них в state.
     * Получаем формат dd.mm.yyyy hh.mm.ss
     */
    onChange = (e: ChangeEvent<HTMLInputElement>) => {
        const dateTimeStr = e.target.value

        if (!dateTimeStr) {
            this.clearValue()
            return
        }

        // Проверка формата
        const dateTimeRegex =
            /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.\d{4} ([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/

        if (!dateTimeRegex.test(dateTimeStr)) {
            this.setState({
                validateError: "Формат ввода должен соответствовать формату: ДД.ММ.ГГГГ ЧЧ:ММ:СС",
                viewDateTime: dateTimeStr,
            })
            return
        }

        const newDate = dayjs(dateTimeStr, DATETIME_FORMAT, true)

        this.setState(
            {
                value: {
                    date: newDate ? newDate.format(DATE_FORMAT) : null,
                    time: {
                        hours: newDate ? newDate.hour().toString().padStart(2, "0") : "00",
                        minutes: newDate ? newDate.minute().toString().padStart(2, "0") : "00",
                        seconds: newDate ? newDate.second().toString().padStart(2, "0") : "00",
                    },
                    dateTime: newDate,
                },
                viewDateTime: dateTimeStr,
                validateError: null,
            },
            () => {
                this.props.onChange?.(this.state.value.dateTime!.format(ISO_UTC_FORMAT))
            },
        )
    }

    onClickDateChange = () => {
        // this.refDatePickerInput.current?.click();
        // @ts-ignore
        this.refDatePickerInput.current?.components?.input?.click() // current
    }

    /**
     * Обработка выбора даты в календаре
     * @param value {DateValue} - объект даты
     * @description В state записать объект Date, в props.onChange передаётся строка ISO
     */
    onSelectDateValue = (value: DateValue) => {
        const newDate = dayjs(value)

        if (value) {
            this.setState(
                (prevState) => ({
                    ...prevState,
                    viewDateTime: newDate.format(DATETIME_FORMAT),
                    value: {
                        ...prevState.value,
                        date: newDate.format(DATE_FORMAT),
                        dateTime: newDate,
                    },
                    validateError: null,
                }),
                () => {
                    this.props.onChange?.(this.state.value.dateTime!.format(ISO_UTC_FORMAT)) // отправка в формате ISO
                },
            )
        }
    }

    /**
     * Обработка выбора времени в TimePicker
     * @param value {FullTimeValueType} - объект с часами и минутами
     * @description В state обновить value.time, в props.onChange передаётся строка ISO
     */
    onSelectTimeValue = (value: FullTimeValueType) => {
        if (value && this.state.value.dateTime) {
            let newDate = this.state.value.dateTime
            newDate = newDate.set("hours", +value.hours).minute(+value.minutes).second(+value.seconds)

            this.setState(
                (prevState) => {
                    if (prevState.value.dateTime) {
                        return {
                            ...prevState,
                            value: {
                                ...prevState.value,
                                time: value,
                                dateTime: newDate,
                            },
                            viewDateTime: newDate.format(DATETIME_FORMAT),
                            validateError: null,
                        }
                    }

                    return prevState
                },
                () => {
                    this.props.onChange?.(this.state.value.dateTime!.format(ISO_UTC_FORMAT))
                },
            )
        }
    }

    /**
     * Обработка клика на CommonInput
     * @param e {MouseEvent<HTMLDivElement>}
     * @description Прервать передачу события, чтобы не открывать Popover при нажатии на поле ввода
     */
    onClickCommonInput = (e: MouseEvent<HTMLDivElement>) => {
        // нужно протестировать как будет работать без него, иначе ячейки не выделяются
        // e.stopPropagation();
    }

    /**
     * Обработка нажатий клавиш клавиатуры
     * @param e {KeyboardEvent<HTMLInputElement>}
     * @description Прервать передачу события, чтобы не открывать Popover при нажатии пробела.
     * Пробел нужен для корректного ручного ввода.
     */
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

    onClickDelete = () => {
        this.clearValue()
    }

    clearValue = () => {
        this.setState(
            {
                value: {
                    date: null,
                    time: { hours: "00", minutes: "00", seconds: "00" },
                    dateTime: null,
                },
                viewDateTime: null,
                validateError: null,
            },
            () => {
                this.props.onClear?.()
            },
        )
    }

    render() {
        const readOnly = this.props.readOnly ?? false

        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: this.state },
                    fileName: generateLogsFileName("MetadataForms_Inputs_DateTimeContent"),
                }}
            >
                <div className={cn(commonStyle.commonInputWrapper)}>
                    <CommonInput
                        {...this.props}
                        value={this.state.viewDateTime ?? undefined}
                        readOnly={readOnly}
                        dateButton={!readOnly}
                        deleteButton={!readOnly}
                        status={this.state.validateError ? "error" : undefined}
                        hint={this.state.validateError ?? ""}
                        onChange={this.onChange}
                        onClickDateChange={this.onClickDateChange}
                        onClick={this.onClickCommonInput}
                        onClickDelete={this.onClickDelete}
                        onKeyDown={this.onKeyDown}
                    />
                    <DatePicker
                        ref={this.refDatePickerInput}
                        style={{ display: "none" }}
                        value={this.state.value.dateTime?.toDate() ?? null}
                        time={this.state.value.time}
                        onChangeDate={this.onSelectDateValue}
                        onChangeTime={this.onSelectTimeValue}
                    />
                </div>
            </ErrorBoundary>
        )
    }
}

export class DateTime extends Component<IDateTimeProps> {
    render(): ReactNode {
        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: {} },
                    fileName: generateLogsFileName("MetadataForms_Inputs_DateTime"),
                }}
            >
                <DateTimeContent {...this.props} />
            </ErrorBoundary>
        )
    }
}
