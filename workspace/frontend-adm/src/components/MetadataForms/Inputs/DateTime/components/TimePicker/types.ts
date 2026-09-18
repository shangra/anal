import { ChangeEvent, CSSProperties } from 'react';
import { InputStatuses, InputTypes, InputVariants } from 'ui-kit';

export type TimePopperProps = {
    isOpen: boolean;
    hours: number;
    minutes: number;
    increaseHours: () => void;
    increaseMinutes: () => void;
    decreaseHours: () => void;
    decreaseMinutes: () => void;
    handleHoursChange: (e: ChangeEvent<HTMLInputElement>) => void;
    handleMinutesChange: (e: ChangeEvent<HTMLInputElement>) => void;
    formatTime: (value: number) => string;
};

export type TimeValueType = {
    hours: string;
    minutes: string;
};

export type FullTimeValueType = TimeValueType & {
    seconds: string;
}

export type TimePickerProps = {
    /**
     * Id для тестирования
     */
    testId?: string;

    /**
     * Текст лейбла в поле ввода
     */
    label?: string;

    /**
     * Текст-подсказка
     */
    hint?: string;

    /**
     * Пользовательское имя класса
     */
    className?: string;
    /**
     * Пользовательское имя класса
     */
    style?: CSSProperties;
    inputStyle?: CSSProperties;
    /**
     * Плейсхолдер
     */
    placeholder?: string;

    /**
     * Коллбек при изменении дополнительных инпутов
     */
    onChange?: (time: TimeValueType) => void;

    /**
     * Значение инпута
     */
    value?: TimeValueType;
    /**
     * Состояние ошибки/"ok" для стилизации компонента
     */
    status?: InputStatuses;

    /**
     * Вариант инпута
     */
    variant?: InputVariants;

    /**
     * Цвет инпута
     */
    color?: InputTypes;

    /**
     * Растяжение ширины
     */
    fullWidth?: boolean;

    /**
     * Открыт ли попап пикера по умолчанию
     */
    defaultOpen?: boolean;

    /**
     * Запрещено ли редактирование даты в инпуте вручную
     */
    readOnly?: boolean;
    disabled?: boolean;

    inputRounded?: boolean;
};
