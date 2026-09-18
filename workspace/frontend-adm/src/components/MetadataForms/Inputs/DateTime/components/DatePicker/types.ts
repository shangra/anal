import { CSSProperties, FocusEvent, MouseEvent, ReactNode } from "react";
import { InputVariants } from "ui-kit";
import { PresetItem } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Presets/types";
import { PRESET_ITEMS } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Presets/constants";
import {FullTimeValueType} from "components/MetadataForms/Inputs/DateTime/components/TimePicker/types";

export type DateValue = Date | null;
export type DateRangeValue = [DateValue, DateValue];
export type PresetItems = (typeof PRESET_ITEMS)[keyof typeof PRESET_ITEMS];
export type DatePickerProps = BasePickerProps & {
    /**
     * Значение даты
     */
    value: DateValue;
    /**
     * Значение времени
     */
    time: FullTimeValueType;
    /**
     * Открыт ли DatePicker по умолчанию
     */
    defaultOpen?: boolean;
    /**
     * Обработчик вызываемый при изменении значения `value`
     */
    onChangeDate?: (date: DateValue) => void;
    onChangeTime?: (time: FullTimeValueType) => void;
};

export type DateRangePickerProps = BasePickerProps & {
    /**
     * Пользовательские пресеты
     */
    customPresets?: PresetItem[];
    /**
     * Видимость панели пресетов для DateRangePicker
     */
    showPresets?: boolean;
    /**
     * Включение предустановленных пресетов
     */
    includeDefaultPresets?: boolean;
    /**
     * Значение даты
     */
    value: DateRangeValue;
    /**
     * Обработчик вызываемый при изменении значения `value`
     */
    onChange?: (date: DateRangeValue) => void;
};

export type BasePickerProps = {
    /**
     * Отображене правой иконки
     */
    hideRightIcon?: boolean;
    /**
     * Id для тестирования
     */
    testId?: string;
    /**
     * Управляет состоянием ошибки для стилизации компонента и текста-подсказки
     */
    error?: boolean;
    /**
     * Плейсхолдер
     */
    placeholder?: string;
    /**
     * Текст-подсказка, появляется под полем ввода
     */
    hint?: string;
    /**
     * Управляет отключенным состоянием компонента
     */
    disabled?: boolean;
    /**
     * Сделать поле во всю ширину
     */
    fullWidth?: boolean;
    /**
     * Пользовательские стили
     */
    style?: CSSProperties;
    /**
     * Пользовательское имя класса
     */
    className?: string;
    /**
     * Вариант поля
     */
    variant?: InputVariants;
    /**
     * Минимальная дата, которую может выбрать пользователь
     */
    minDate?: Date;
    /**
     * Максимальная дата, которую может выбрать пользователь
     */
    maxDate?: Date;
    /**
     * Right Icon
     */
    rightIcon?: ReactNode;
    /**
     * Обработчик вызываемый при установке фокуса
     */
    onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
    /**
     * Обработчик вызываемый при потере фокуса
     */
    onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
    /**
     * Обработчик вызываемый при наведении курсора мыши
     */
    onMouseEnter?: (event: MouseEvent<HTMLElement>) => void;
    /**
     * бработчик вызываемый при потере наведения курсора мыши
     */
    onMouseLeave?: (event: MouseEvent<HTMLElement>) => void;
    /**
     * Обработчик вызываемый при клике на поле
     */
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    /**
     * Обработчик вызываемый при нажатой левой кнопки мыши
     */
    onMouseDown?: (event: MouseEvent<HTMLElement>) => void;
    /**
     * Обработчик вызываемый при отпущенной левой кнопки мыши
     */
    onMouseUp?: (event: MouseEvent<HTMLElement>) => void;
};