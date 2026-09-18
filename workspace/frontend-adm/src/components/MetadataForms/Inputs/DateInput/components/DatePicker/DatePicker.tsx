import { useMemo, MouseEvent, forwardRef } from "react";
import cn from 'classnames';
import { Input, Popover } from "ui-kit";
import dayjs from 'dayjs';
import {
    DEFAULT_TEST_ID,
    EMPTY_INPUT_VALUE,
    FORMAT_DATE_STRING,
} from "./constants";
import { DatePickerProps, DateValue } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/types";
import { DatePanel } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/components/DatePanel";
import { isValidDate } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/utils";
import { usePicker } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/hooks/usePicker";
import styles from './styles/styles.module.css'
import { ClearIcon } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/icons/ClearIcon";
import { CalendarIcon } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/icons/CalendarIcon";

export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>((props, ref: any) => {
    const {
        className,
        style,
        value,
        hideRightIcon = false,
        minDate,
        maxDate,
        placeholder="ДД.ММ.ГГ",
        hint,
        variant,
        disabled = false,
        testId = DEFAULT_TEST_ID,
        fullWidth,
        defaultOpen = false,
        onChange,
        onFocus,
        onBlur,
        onClick,
        onMouseDown,
        onMouseEnter,
        onMouseLeave,
        onMouseUp,
    } = props;

    if (value) {
        const isValidDateValue = isValidDate(value);
        if (!isValidDateValue) {
            throw new Error("DatePicker: Invalid date");
        }
    }
    const {
        openedCalendar,
        handleInputClick,
        handleCalendarClose,
        handleCalendarOpen,
    } = usePicker({ minDate, maxDate, disabled, defaultOpen, onClick });

    const inputValue = useMemo(() => {
        const isValidDateStart = isValidDate(value);

        if (isValidDateStart) {
            return dayjs(value).format(FORMAT_DATE_STRING);
        }

        return EMPTY_INPUT_VALUE;
    }, [value]);

    const handleCalendarSelect = (date: DateValue) => {
        onChange?.(date);
    };

    const openClick = (event: MouseEvent<HTMLDivElement>) => {
        handleInputClick(event);
    }

    const handleClose = (event: MouseEvent<HTMLElement>)=> {
        event.preventDefault();
        event.stopPropagation();
        onChange?.(null);
        handleCalendarClose();
    };

    const rightClickCondition = () => {
        if (openedCalendar || value) return true;
        if (!openedCalendar) return false;
    }

    const inputClassName = cn(
        'body',
        {
            [styles.input]: !fullWidth,
        }
    );

    // console.log("ref", ref);
    // console.log("withInputRef ref", withInputRef(ref));
    
    return (        
        <Popover
            content={
                <DatePanel
                    testId={`${testId}-panel`}
                    value={value}
                    minDate={minDate}
                    maxDate={maxDate}
                    onSelectDate={handleCalendarSelect}
                    onClose={handleCalendarClose}
                    className={className}
                />
            }
            testId={`${testId}-popper-${openedCalendar ? 'open' : 'closed'}`}
            placement="bottom-end"
            showArrow={false}
            opened={openedCalendar}
            containerFullWidth={fullWidth}
        >
            <Input
                // ref={withInputRef(ref)} //говнореф на 1.5.3 withInputRef
                ref={ref as any}
                testId={`${testId}-input`}
                readOnly
                variant={variant}
                disabled={disabled}
                className={inputClassName}
                value={inputValue}
                placeholder={placeholder}
                hint={hint}
                fullWidth={fullWidth}
                style={style}
                rightIcon={
                    hideRightIcon
                        ? undefined
                        : (value ? ClearIcon : CalendarIcon)
                }
                rounded
                onClickRightIcon={rightClickCondition() ? handleClose : handleCalendarOpen}
                onMouseDown={onMouseDown}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onMouseUp={onMouseUp}
                onBlur={onBlur}
                onFocus={onFocus}
                onClick={openClick}
            />
        </Popover>
    );
});