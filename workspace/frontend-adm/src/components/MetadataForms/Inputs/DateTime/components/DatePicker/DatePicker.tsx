import { useMemo, useRef, MouseEvent, forwardRef, useState, ChangeEvent, useEffect } from "react";
import cn from 'classnames';
import { BUTTON_SIZE, IconButton, Input, Popover } from "ui-kit";
import dayjs from 'dayjs';
import {
    DEFAULT_TEST_ID,
    EMPTY_INPUT_VALUE,
    FORMAT_DATE_STRING,
} from "./constants";
import { DatePickerProps, DateValue } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/types";
import { DatePanel } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/DatePanel";
import { isValidDate } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/utils";
import { usePicker } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/hooks/usePicker";
import { ClearIcon } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/icons/ClearIcon";
import { CalendarIcon } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/icons/CalendarIcon";
import styles from '../TimePicker/styles/styles.module.css';
import { MinusIcon } from "components/MetadataForms/Inputs/DateTime/components/TimePicker/icons/MinusIcon";
import { PlusIcon } from "components/MetadataForms/Inputs/DateTime/components/TimePicker/icons/PlusIcon";
import { getValidTime } from "components/MetadataForms/Inputs/DateTime/components/TimePicker/helpers";
import { MAX_HOUR, MAX_MINUTE, MAX_SECONDS } from "components/MetadataForms/Inputs/DateTime/components/TimePicker/constants";
import { useHoldToChangeTime } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/hooks/useHoldToChangeTime.hook";


export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>((props, ref) => {
    const {
        className,
        style,
        value,
        time,
        hideRightIcon = false,
        minDate,
        maxDate,
        placeholder = "ДД.ММ.ГГ",
        hint,
        variant,
        disabled = false,
        testId = DEFAULT_TEST_ID,
        fullWidth,
        defaultOpen = false,
        onChangeDate,
        onChangeTime,
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

    const hoursValue = Number(time?.hours);
    const minutesValue = Number(time?.minutes);
    const secondsValue = Number(time?.seconds);

    const [hours, setHours] = useState(hoursValue);
    const [minutes, setMinutes] = useState(minutesValue);
    const [seconds, setSeconds] = useState(secondsValue);

    const inputValue = useMemo(() => {
        const isValidDateStart = isValidDate(value);

        if (isValidDateStart) {
            return dayjs(value).format(FORMAT_DATE_STRING);
        }

        return EMPTY_INPUT_VALUE;
    }, [value]);

    const handleCalendarSelect = (date: DateValue) => {
        onChangeDate?.(date);
    };

    const openClick = (event: MouseEvent<HTMLDivElement>) => {
        handleInputClick(event);
    }

    const handleClose = (event: MouseEvent<HTMLElement>) => {
        event.preventDefault();
        event.stopPropagation();
        onChangeDate?.(null);
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




    // useEffect(() => {
    //     onChangeTime?.({ hours: formatTime(hours), minutes: formatTime(minutes), seconds: formatTime(seconds) })
    // }, [hours, minutes, onChangeTime, seconds])
    const prevValues = useRef({
        hours: hoursValue,
        minutes: minutesValue,
        seconds: secondsValue,
    });

    useEffect(() => {
        if (time) {
            setHours(Number(time.hours));
            setMinutes(Number(time.minutes));
            setSeconds(Number(time.seconds));
        }
    }, [time]);

    useEffect(() => {
        const currentTime = { hours, minutes, seconds };
        const previousTime = prevValues.current;

        if (
            currentTime.hours !== previousTime.hours ||
            currentTime.minutes !== previousTime.minutes ||
            currentTime.seconds !== previousTime.seconds
        ) {
            onChangeTime?.({ hours: formatTime(currentTime.hours), minutes: formatTime(currentTime.minutes), seconds: formatTime(currentTime.seconds) });
        }

        prevValues.current = currentTime;
    }, [hours, minutes, seconds, onChangeTime]);

    const increaseHours = () => {
        setHours((prev) => getValidTime(String(prev + 1), MAX_HOUR));
    };
    const decreaseHours = () => {
        setHours((prev) => getValidTime(String(prev - 1), MAX_HOUR));
    };

    const increaseMinutes = () => {
        setMinutes((prev) => getValidTime(String(prev + 1), MAX_MINUTE));
    };
    const decreaseMinutes = () => {
        setMinutes((prev) => getValidTime(String(prev - 1), MAX_MINUTE));
    };
    
    const increaseSeconds = () => {
        setSeconds((prev) => getValidTime(String(prev + 1), MAX_SECONDS))
    }
    const decreaseSeconds = () => {
        setSeconds((prev) => getValidTime(String(prev - 1), MAX_SECONDS))
    }

    const handleHoursChange = (e: ChangeEvent<HTMLInputElement>) => {
        const hours = e.target.value.replace(/\D/g, '');
        const validHours = getValidTime(hours, MAX_HOUR);
        setHours(Number(validHours));
        onChangeTime?.({ hours: String(validHours), minutes: String(minutes), seconds: String(seconds) });
    };

    const handleMinutesChange = (e: ChangeEvent<HTMLInputElement>) => {
        const minutes = e.target.value.replace(/\D/g, '');
        const validMinutes = getValidTime(minutes, MAX_MINUTE);
        setMinutes(Number(validMinutes));
        onChangeTime?.({ hours: String(hours), minutes: String(validMinutes), seconds: String(seconds) });
    };

    const handleSecondsChange = (e: ChangeEvent<HTMLInputElement>) => {
        const seconds = e.target.value.replace(/\D/g, '');
        const validSeconds = getValidTime(seconds, MAX_SECONDS);
        setSeconds(Number(validSeconds));
        onChangeTime?.({ hours: String(hours), minutes: String(minutes), seconds: String(validSeconds) })
    }

    const formatTime = (value: number) => {
        const naturalValue = Math.max(value, 0);

        if (value < 10) {
            return `0${naturalValue}`;
        } return `${naturalValue}`;
    };

    const { startHold: increaseHoursOnMouseDown, endHold: increaseHoursOnMouseUp, handleClick: increaseHoursClick } = useHoldToChangeTime({ onAction: increaseHours })
    const { startHold: decreaseHoursOnMouseDown, endHold: decreaseHoursOnMouseUp, handleClick: decreaseHoursClick } = useHoldToChangeTime({ onAction: decreaseHours })
    const { startHold: increaseMinutesOnMouseDown, endHold: increaseMinutesOnMouseUp, handleClick: increaseMinutesClick } = useHoldToChangeTime({ onAction: increaseMinutes })
    const { startHold: decreaseMinutesOnMouseDown, endHold: decreaseMinutesOnMouseUp, handleClick: decreaseMinutesClick } = useHoldToChangeTime({ onAction: decreaseMinutes })
    const { startHold: increaseSecondsOnMouseDown, endHold: increaseSecondsOnMouseUp, handleClick: increaseSecondsClick } = useHoldToChangeTime({ onAction: increaseSeconds })
    const { startHold: decreaseSecondsOnMouseDown, endHold: decreaseSecondsOnMouseUp, handleClick: decreaseSecondsClick } = useHoldToChangeTime({ onAction: decreaseSeconds })
    const timeUnits = [
        {
            name: 'Часы',
            value: hours,
            setValue: setHours,
            onChange: handleHoursChange,
            increase: increaseHoursClick,
            decrease: decreaseHoursClick,
            onMouseDownIncrease: increaseHoursOnMouseDown,
            onMouseDownDecrease: decreaseHoursOnMouseDown,
            onMouseUpIncrease: increaseHoursOnMouseUp,
            onMouseUpDecrease: decreaseHoursOnMouseUp,
            max: MAX_HOUR
        },
        {
            name: 'Минуты',
            value: minutes,
            setValue: setMinutes,
            onChange: handleMinutesChange,
            increase: increaseMinutesClick,
            decrease: decreaseMinutesClick,
            onMouseDownIncrease: increaseMinutesOnMouseDown,
            onMouseDownDecrease: decreaseMinutesOnMouseDown,
            onMouseUpIncrease: increaseMinutesOnMouseUp,
            onMouseUpDecrease: decreaseMinutesOnMouseUp,
            max: MAX_MINUTE
        },
        {
            name: 'Секунды',
            value: seconds,
            setValue: setSeconds,
            onChange: handleSecondsChange,
            increase: increaseSecondsClick,
            decrease: decreaseSecondsClick,
            onMouseDownIncrease: increaseSecondsOnMouseDown,
            onMouseDownDecrease: decreaseSecondsOnMouseDown,
            onMouseUpIncrease: increaseSecondsOnMouseUp,
            onMouseUpDecrease: decreaseSecondsOnMouseUp,
            max: MAX_SECONDS
        }
    ];

    return (
        <Popover
            content={
                <>
                    <DatePanel
                        testId={`${testId}-panel`}
                        value={value}
                        minDate={minDate}
                        maxDate={maxDate}
                        onSelectDate={handleCalendarSelect}
                        onClose={handleCalendarClose}
                        className={className}
                    />
                    <div className={styles.btnsContainer}>
                        {timeUnits.map((unit) => (
                            <div key={unit.name} className={styles.unit}>
                                <span className={cn("body", styles.unitName)}>{unit.name}</span>
                                <div className={styles.btnBlock}>
                                    <IconButton
                                        color="controlled"
                                        variant='contained'
                                        className={styles.btn}
                                        onClick={unit.decrease}
                                        onMouseDown={unit.onMouseDownDecrease}
                                        onMouseUp={unit.onMouseUpDecrease}
                                        size={BUTTON_SIZE.MEDIUM}
                                        icon={MinusIcon}
                                    />
                                    <Input
                                        className={styles.input}
                                        variant="contained"
                                        onChange={unit.onChange}
                                        value={formatTime(unit.value)}
                                        style={{ backgroundColor: 'var(--ui-kit-button-color)' }}
                                    />
                                    <IconButton
                                        color="controlled"
                                        variant='contained'
                                        className={styles.btn}
                                        size={BUTTON_SIZE.MEDIUM}
                                        onClick={unit.increase}
                                        onMouseDown={unit.onMouseDownIncrease}
                                        onMouseUp={unit.onMouseUpIncrease}
                                        icon={PlusIcon}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            }
            testId={`${testId}-popper-${openedCalendar ? 'open' : 'closed'}`}
            placement="bottom-end"
            showArrow={false}
            opened={openedCalendar}
            containerFullWidth={fullWidth}
        >
            <Input
                // ref={withInputRef(ref)} //говнореф на 1.5.3
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