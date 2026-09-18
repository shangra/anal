import cn from 'classnames';
import { createContext, forwardRef, type MouseEvent, type MouseEventHandler, useContext, useEffect } from 'react';
import { Dropdown, type DropdownOption, IconButton, Input, type InputProps } from 'ui-kit';
import { ErrorBoundary } from 'components/ErrorBoundary';
import { generateLogsFileName } from 'components/MetadataForms/Inputs/utils';
import { CloseIcon } from 'components/CommonInput/icons/CloseIcon';
import { DateIcon } from 'components/CommonInput/icons/DateIcon';
import { DropDownIcon } from 'components/CommonInput/icons/DropDownIcon';
import { MoreIcon } from 'components/CommonInput/icons/MoreIcon';
import { WindowFrameIcon } from 'components/CommonInput/icons/WindowFrameIcon';
import styles from './styles.module.css';
import { type CommonInputType } from 'components/CommonInput/types';
import { HoldChangeButtons } from 'components/MetadataForms/Buttons/HoldChangeButtons';

export type CommonInputProps = Omit<InputProps, 'type'> & {
    type?: CommonInputType;
    step?: number;
    dropdownOptions?: DropdownOption[];
    showNativeInput?: boolean;
    selectButton?: boolean;
    changeButton?: boolean;
    deleteButton?: boolean;
    dateButton?: boolean;
    rangeButton?: boolean;
    openButton?: boolean;
    readonly?: boolean;
    onClickSelect?: MouseEventHandler<HTMLButtonElement>;
    onClickChange?: MouseEventHandler<HTMLButtonElement>;
    onClickDelete?: MouseEventHandler<HTMLButtonElement>;
    onMouseDownRange?: (value: number) => void;
    onClickRange?: (button: 'top' | 'bottom', e: MouseEvent<HTMLButtonElement>) => void;
    onClickOpen?: MouseEventHandler<HTMLButtonElement>;
    onClickDateChange?: MouseEventHandler<HTMLButtonElement>;
    onClear?: () => void;
    containerClassName?: string;
    isTable?: boolean;
    numericValue?: number;
};

export const CommonInputContext = createContext<CommonInputProps>({});

// @ts-ignore
const govnoRef = (inputRef: LegacyRef): InputRef => {
    if (inputRef) {
        return {
            ...(inputRef.current as HTMLDivElement),
            components: {
                label: inputRef.current?.components.label || document.createElement('label'),
                input: inputRef.current?.components.input || document.createElement('input'),
            },
        };
    }
    return inputRef;
};

/**
 * Универсальный компонент input с кнопками
 */
const CommonInputContent = forwardRef<HTMLInputElement, CommonInputProps>((props, ref) => {
    const context = useContext(CommonInputContext);

    const {value} = props;
        const {numericValue} = props;
        const type = props.type ?? 'text';
        const {dropdownOptions} = props;
        const showNativeInput = props.showNativeInput ?? true;
        const {step} = props;
        const selectButton = context.selectButton ?? props.selectButton ?? false;
        const changeButton = context.changeButton ?? props.changeButton ?? false;
        const deleteButton = context.deleteButton ?? props.deleteButton ?? false;
        const dateButton = context.dateButton ?? props.dateButton ?? false;
        const rangeButton = context.rangeButton ?? props.rangeButton ?? false;
        const openButton = context.openButton ?? props.openButton ?? false;
        const {onClickSelect} = props;
        const {onClickChange} = props;
        const {onClickDelete} = props;
        const {onMouseDownRange} = props;
        const {onClickRange} = props;
        const {onClickOpen} = props;
        const {onClickDateChange} = props;
        const readOnly = context.readOnly ?? props.readOnly ?? false;

    const handleClickDeleteButton = (e: MouseEvent<HTMLButtonElement>) => {
        onClickDelete?.(e);
        onMouseDownRange?.(0);
        props.onClear?.();
    };

    const inputProps = { ...props };
    delete inputProps.numericValue;

    const renderButtons = () => {
        if (readOnly) {
            return;
        }

        return (
            <>
                {
                    // TODO - удалить из CommonInput пропс type === "select" !!!
                    selectButton && type === 'select' && (
                        <IconButton
                            icon={DropDownIcon}
                            color="controlled"
                            className={cn(styles.commonInputButton, 'dropdown')}
                            disabled={props.disabled ?? false}
                            onClick={onClickSelect}
                            testId={props.testId ? `${props.testId}::select-button` : props.testId}
                        />
                    )
                }

                {
                    // TODO - удалить из CommonInput пропс type === "dropdown"!!!
                    selectButton && type === 'dropdown' && (
                        <Dropdown
                            color="controlled"
                            style={{ padding: '0 7px' }}
                            options={dropdownOptions}
                            className={styles.commonInputButton}
                            onClick={onClickSelect}
                            testId={props.testId ? `${props.testId}::dropdown-button` : props.testId}
                        />
                    )
                }

                {dateButton && (
                    <IconButton
                        icon={DateIcon}
                        color="controlled"
                        className={cn(styles.commonInputButton, 'calendar')}
                        disabled={props.disabled ?? false}
                        onClick={onClickDateChange}
                        testId={props.testId ? `${props.testId}::date-button` : props.testId}
                    />
                )}
                {rangeButton && (
                    <HoldChangeButtons
                        value={typeof numericValue === 'number' ? numericValue : Number(value) || 0}
                        step={step}
                        disabled={props.disabled ?? false}
                        onValueChange={onMouseDownRange}
                        onClickRange={onClickRange}
                        className={styles.rangeButtonWrapper}
                        testId={props.testId}
                        buttonClassName={styles.commonInputButton}
                    />
                )}
                {changeButton && (
                    <IconButton
                        icon={MoreIcon}
                        color="controlled"
                        className={styles.commonInputButton}
                        disabled={props.disabled ?? false}
                        onClick={onClickChange}
                        testId={props.testId ? `${props.testId}::change-button` : props.testId}
                    />
                )}
                {openButton && (
                    <IconButton
                        icon={WindowFrameIcon}
                        color="controlled"
                        className={styles.commonInputButton}
                        disabled={props.disabled ?? false}
                        onClick={onClickOpen}
                        testId={props.testId ? `${props.testId}::open-button` : props.testId}
                    />
                )}
                {deleteButton && (
                    <IconButton
                        icon={CloseIcon}
                        color="controlled"
                        disabled={props.disabled ?? false}
                        className={styles.commonInputButton}
                        onClick={handleClickDeleteButton}
                        testId={props.testId ? `${props.testId}::delete-button` : props.testId}
                    />
                )}
            </>
        );
    };

    return (
        <ErrorBoundary
            downloadLogs={{
                logObj: { props, state: {} },
                fileName: generateLogsFileName('CommonInputContent'),
            }}
        >
            <div
                className={cn(styles.commonInputWrapper, props.className, {
                    [styles.commonInputWrapperFullWidth]: props.fullWidth,
                })}
                style={props.style}
            >
                {(type === 'number' || type === 'text' || showNativeInput) && (
                    <Input
                        {...inputProps}
                        ref={govnoRef(ref)}
                        data-testMyId="adasds"
                        value={value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        type="text"
                        className={styles.commonInputCustom}
                        testId={props.testId ? `${props.testId}::input` : props.testId}
                    />
                )}

                {renderButtons()}
            </div>
        </ErrorBoundary>
    );
});

export const CommonInput = forwardRef<HTMLInputElement, CommonInputProps>((props, ref) => (
        <ErrorBoundary
            downloadLogs={{
                logObj: { props, state: {} },
                fileName: generateLogsFileName('CommonInput'),
            }}
        >
            <CommonInputContent {...props} ref={ref} />
        </ErrorBoundary>
    ));
