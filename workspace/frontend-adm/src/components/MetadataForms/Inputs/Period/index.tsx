import React, { Component, MouseEvent, ChangeEvent, KeyboardEventHandler, ReactNode } from "react";
import cn from "classnames";
import { Popover } from 'ui-kit';
import { CommonInput, CommonInputProps } from "components/CommonInput";
import { PeriodForm } from 'components/MetadataForms/Inputs/Period/PeriodForm';
import commonStyle from "../style.module.css";
import style from "./style.module.css";
import { convertPeriodToHumanReadable } from 'components/MetadataForms/Inputs/Period/autocode';
import { ErrorBoundary } from "components/ErrorBoundary";
import { generateLogsFileName } from "components/MetadataForms/Inputs/utils";
import { extractActualValue } from 'components/MetadataForms/Inputs/Period/utils';

/**
Философия input'а - это перечисление периодов времени, в отличии от даты, период в каждый момент времени разный
Так вчера это не дата, по типу 01.06.2025, а время D-1 где D - это текущее время (день), а -1 - это отступ от текущего времени.
Если сегодня D-1 - это 01.06.25, то завтра D-1 это уже 02.06.25 и т.д.
Если пользователю нужен всегда отчет или данные за предыдущий день, не требуется каждый день менять дату в ui интерфейсе
достаточно указапть "Предыдущий день" (D-1), ui передаст на сервер тип периода, и для обратной совместимости расчитанные даты.


Существуют следующие виды периодов:
                День, Неделя, Декада, Месяц, Квартал, Полугодие, Год
Предыдущий      D-1   W-1     TD-1      M-1     Q-1     HY-1     Y-1
Текущий         D=1   W=1     TD=1      M=1     Q=1     HY=1     Y=1
Следующий       D+1   W+1     TD+1      M+1     Q+1     HY+1     Y+1

Начало Периода  SD    SW      STD       SM      SQ      SHY      SY
Конец Периода   ED    EW      ETD       EM      EQ      EHY      EY

Начало Периода и Конец Периода можно комбинировать в условие
И их комбинации: "Период С (Sx)">"Период По (Ex)" (SQ-1>EQ=1)

Как их читать и преобразовывать:
К примеру сегодня (new Date()) - 21.05.25 (21 мая 25 года - 2-й квартал)
По приведенной записи можно прочитать и сформировать период (SQ-1>EQ=1)
Начиная с предыдущего квартала (1-й квартал) по конец текущего квартала, т.е. период равен 01.01.2025-30.06.25

Если указано Q=1, то можно прочитать и сформировать период равны текущему кварталу.
Для даты 21.05.25 (21 мая 25 года) - это 2-й квартал, а период будет равен 01.04.25 - 30.06.25

Для проверки значения можно использовать следующее выражение
regexp = /(?<sSE>S|E)(?<start>(?<sPERIOD>D|W|TD|M|Q|HY|Y)(?<sWHERE>\-|\+|\=)(?<sCOUNT>[1]))>(?<eSE>S|E)(?<end>(?<ePERIOD>D|W|TD|M|Q|HY|Y)(?<eWHERE>\-|\+|\=)(?<eCOUNT>[1]))/gm

более простое значение можно проверить следующим выражением
regexp = /(?<PERIOD>D|W|TD|M|Q|HY|Y)(?<WHERE>\-|\+|\=)(?<COUNT>[1])/gm
*/

interface IPeriodProps extends Omit<CommonInputProps, "onChange" | "value"> {
    /** Диапазон расчёта */
    value?: string | { value: string },
    onChange?: (obj: any) => void,
}

interface IPeriodState {
    value: string | null | undefined,
    title: string | null | undefined,
    validateError: string | null,
}

class PeriodContent extends Component<IPeriodProps, IPeriodState> {
    constructor(props: IPeriodProps) {
        super(props);

        const title = convertPeriodToHumanReadable(props.value);

        this.state = {
            value: extractActualValue(props.value) ?? null,
            title: title ?? "",
            validateError: null,
        }
    }

    componentDidUpdate(prevProps: IPeriodProps, prevState: IPeriodState) {
        if (
            prevProps.value !== this.props.value) {
            const actualValue = extractActualValue(this.props.value)
            const title = convertPeriodToHumanReadable(actualValue) ?? ''
            if (actualValue !== this.state.value)
                this.setState({
                    value: actualValue,
                    title
                });
        }

    }

    /**
     * Обработка очистки поля по нажатии на кнопку крестика
     * @param e {MouseEvent<HTMLButtonElement>}
     * @description Прервать передачу события, чтобы не открывать Popover при нажатии на кнопку очистки поля
     */
    onClickDelete = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();

        this.setState({
            value: null,
            title: "",
        });

        this.props.onChange?.({ value: null });
    }

    /**
     * Обработка клика на CommonInput
     * @param e {MouseEvent<HTMLDivElement>}
     * @description Прервать передачу события, чтобы не открывать Popover при нажатии на поле ввода
     */
    onClickCommonInput = (e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
    }

    /**
     * Обработка нажатий клавиш клавиатуры
     * @param e {KeyboardEvent<HTMLInputElement>}
     * @description Прервать передачу события, чтобы не открывать Popover при нажатии пробела.
     * Пробел нужен для корректного ручного ввода.
     */
    onKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
        e.stopPropagation();
    }

    onChange = (value: string) => {
        // console.log("onChange", value, title);
        const actualValue = extractActualValue(value)
        const title = convertPeriodToHumanReadable(actualValue);
        this.setState({ value, title }, () => {
            this.props.onChange?.({ value: actualValue });
        });
    }

    render() {
        return (
            <ErrorBoundary downloadLogs={{
                logObj: { props: this.props, state: this.state },
                fileName: generateLogsFileName("MetadataForms_Inputs_PeriodContent"),
            }}>
                <div className={cn(commonStyle.commonInputWrapper, this.props.containerClassName)}>
                    <Popover
                        content={<PeriodForm period={this.state.value} onChange={this.onChange} />}
                        containerClassName={style.periodPopover}
                        placement="bottom-end"
                        showArrow={false}
                    >
                        <CommonInput
                            {...this.props}
                            value={this.state.title ?? ""}
                            dateButton
                            deleteButton
                            fullWidth
                            status={this.state.validateError ? "error" : undefined}
                            hint={this.state.validateError ?? ""}
                            placeholder="Выберите диапазон"
                            // onChange={this.onChange}
                            onClickDateChange={() => { }}
                            onClickDelete={this.onClickDelete}
                            onClick={this.onClickCommonInput}
                            onKeyDown={this.onKeyDown}
                        />
                    </Popover>
                </div>
            </ErrorBoundary>

        )
    }
}

export class Period extends Component<IPeriodProps> {
    render(): ReactNode {
        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: {} },
                    fileName: generateLogsFileName("MetadataForms_Inputs_Period")
                }}
            >
                <PeriodContent {...this.props} />
            </ErrorBoundary>
        )
    }
}