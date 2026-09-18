import { ChangeEvent, useState, useEffect, MouseEventHandler, forwardRef } from 'react';
import cn from 'classnames';
import { TimePickerProps } from 'components/MetadataForms/Inputs/DateTime/components/TimePicker/types';
import { MAX_HOUR, MAX_MINUTE, SEPARATOR, TIMEPICKER_DEFAULT_TEST_ID } from 'components/MetadataForms/Inputs/DateTime/components/TimePicker/constants';
import { Popover, Input, BUTTON_SIZE, IconButton } from 'ui-kit';
import { MinusIcon } from "components/MetadataForms/Inputs/DateTime/components/TimePicker/icons/MinusIcon";
import { PlusIcon } from "components/MetadataForms/Inputs/DateTime/components/TimePicker/icons/PlusIcon";
import { TimeIcon } from "components/MetadataForms/Inputs/DateTime/components/TimePicker/icons/TimeIcon";
import styles from './styles/styles.module.css';
import { getValidTime } from 'components/MetadataForms/Inputs/DateTime/components/TimePicker/helpers';

// import { withInputRef } from 'components/MetadataForms/Inputs/UiKitInput';

export const TimePicker = forwardRef<HTMLDivElement, TimePickerProps>((props, ref) => {
    const {
        value = { hours: '12', minutes: '0' },
        onChange,
        variant,
        fullWidth = false,
        testId = TIMEPICKER_DEFAULT_TEST_ID,
        placeholder,
        defaultOpen = false,
        readOnly = false,
        disabled = false,
        hint,
        className,
        style,
        inputStyle,
        status,
        inputRounded,
    } = props

    const hoursValue = Number(value?.hours);
    const minutesValue = Number(value?.minutes);

    const [hours, setHours] = useState(hoursValue);
    const [minutes, setMinutes] = useState(minutesValue);

    const [opened, setOpen] = useState(defaultOpen);

    const computedOpened = !disabled && !readOnly && opened;

    const formatTime = (value: number) => {
        const naturalValue = Math.max(value, 0);

        if (value < 10) {
            return `0${naturalValue}`;
        } return `${naturalValue}`;
    };

    const [time, setTime] = useState(`${formatTime(hours)}${SEPARATOR}${formatTime(minutes)}`);

    useEffect(() => {
        setTime(`${formatTime(hours)}${SEPARATOR}${formatTime(minutes)}`);
    }, [hours, minutes])
    
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

    const handleHoursChange = (e: ChangeEvent<HTMLInputElement>) => {
        const hours = e.target.value.replace(/\D/g, '');
        const validHours = getValidTime(hours, MAX_HOUR);
        setHours(Number(validHours));
        onChange?.({ hours: String(validHours), minutes: String(minutes) });
    };

    const handleMinutesChange = (e: ChangeEvent<HTMLInputElement>) => {
        const minutes = e.target.value.replace(/\D/g, '');
        const validMinutes = getValidTime(minutes, MAX_MINUTE);
        setMinutes(Number(validMinutes));
        onChange?.({ hours: String(hours), minutes: String(validMinutes) });
    };

    const setPickerTime = (e: ChangeEvent<HTMLInputElement>) => {
        const num = e.target.value;
        if(num.indexOf(SEPARATOR) === -1) {
            const validHours = getValidTime(value.hours, MAX_HOUR);
            const validMinutes = getValidTime(value.minutes, MAX_MINUTE);
            setTime(`${formatTime(validHours)}${SEPARATOR}${formatTime(validMinutes)}`);
            return;
        };

        let [hrs, min] = num.split(`${SEPARATOR}`);
        if(e?.currentTarget?.selectionStart && e.currentTarget.selectionStart >=2 && hrs.length === 1){
            hrs = formatTime(+hrs.replace(/\D/g, ''));
        };
        if(hrs.length > 2){
            hrs = hrs[0] + hrs[1];
        }
        if(min.length > 2){
            min = min[0] + min[1];
        }
        setTime(`${hrs}${SEPARATOR}${min}`);
        if(hrs.replace(/\D/g, '').length >= 2 && min.replace(/\D/g, '').length >= 2){
            setHours(getValidTime(hrs, MAX_HOUR));
            setMinutes(getValidTime(min, MAX_MINUTE));
            onChange?.({hours: String(getValidTime(hrs, MAX_HOUR)), minutes: String(getValidTime(min, MAX_MINUTE))})
        };
    };

    const handleChangeInput = (e: ChangeEvent<HTMLInputElement>) => {
        setPickerTime(e);

    };

    const inputClassName =
        cn(
            styles["input-main"],
            {
                [styles["input-main__disabled"]]: disabled,
            }
        );

    const handleSetOpenedPopover: MouseEventHandler<HTMLInputElement> = (event) => {
        event.preventDefault();

        if (disabled || readOnly) {
            event.stopPropagation();
            setOpen(false);
        } else {
            setOpen(opened)
        }
    }
   
    return (
        <Popover
            content={
                    <div>
                        <div className={styles.btnsContainer}>
                            <div className={styles.unit}>
                                <span style={style} className={cn("body", styles.unitName)}>Часы</span>
                                
                                <div className={styles.btnBlock}>
                                    <IconButton
                                        color="controlled"
                                        variant='contained'
                                        className={styles.btn}
                                        onClick={decreaseHours}
                                        size={BUTTON_SIZE.MEDIUM}
                                        icon={MinusIcon}
                                    />
                                    <Input
                                        className={styles.input}
                                        variant="contained"
                                        onChange={handleHoursChange}
                                        value={formatTime(hours)}
                                        style={{backgroundColor:'var(--ui-kit-button-color)'}}
                                    />
                                    <IconButton
                                        color="controlled"
                                        variant='contained'
                                        className={styles.btn}
                                        size={BUTTON_SIZE.MEDIUM}
                                        onClick={increaseHours}
                                        icon={PlusIcon}
                                        />
                                </div>
                            </div>

                            <div className={styles.unit}>
                                <span className={cn("body", styles.unitName)}>Минуты</span>
                                
                                <div className={styles.btnBlock}>
                                    <IconButton
                                        color="controlled"
                                        className={styles.btn}
                                        onClick={decreaseMinutes}
                                        size={BUTTON_SIZE.MEDIUM}
                                        icon={MinusIcon}
                                    />
                                    <Input
                                        className={styles.input}
                                        variant="contained"
                                        onChange={handleMinutesChange}
                                        value={formatTime(minutes)}
                                        style={{backgroundColor:'var(--ui-kit-button-color)'}}
                                    />
                                    <IconButton
                                        color="controlled"
                                        className={styles.btn}
                                        onClick={increaseMinutes}
                                        size={BUTTON_SIZE.MEDIUM}
                                        icon={PlusIcon}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
        }
            testId={`${testId}-popper`}
            containerClassName={className}
            placement='bottom'
            opened={computedOpened}
            autoWidth={false}
            offset={11}
            defaultOpen={defaultOpen}
            showArrow
            containerFullWidth={fullWidth}
        >
            <Input
                ref={ref as any} // говнореф на 1.5.3
                testId={`${testId}-input`}
                className={inputClassName}
                variant={variant}
                fullWidth={fullWidth}
                value={time}
                readOnly
                disabled={disabled}
                rightIcon={TimeIcon}
                placeholder={placeholder || 'ЧЧ:MM'}
                status={status}
                hint={hint}
                rounded={inputRounded}
                style={inputStyle}
                onChange={handleChangeInput}
                onBlur={()=>{}}
                onFocus={()=>{}}
                onClick={handleSetOpenedPopover}
            />
        </Popover>
    );
});
