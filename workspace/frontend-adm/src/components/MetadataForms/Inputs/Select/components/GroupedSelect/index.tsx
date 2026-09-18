import { ChangeEventHandler, FocusEventHandler, MouseEventHandler, useMemo, useState } from 'react';
import cn from 'classnames';
import { Input, Popover, SELECT_STATUS, SELECT_VARIANT, List, SelectProps, SearchIcon, Loader } from 'ui-kit';
import styles from './style.module.css';

export interface IGroupedSelectOption<T = string> {
    label: string;
    options?: { value: T; label: string }[];
}

interface ICustomInputProps<T = string, R extends boolean = true> extends SelectProps<T, R> {
    opened: boolean;
    options?: (IGroupedSelectOption<T> | { value: T; label: string })[];
    setOpen: () => void;
    popoverOffset?: number;
}

interface IFlatOption {
    value: string;
    label: string;
    groupLabel?: string;
}

/**
 * Группированный Select для работы с выпадающими списками в двухуровневой структуре.
 * Открывается в зависимости от состояния параметра props.opened.
 */
export const GroupedSelect = (props: ICustomInputProps) => {
    const {
        hint,
        title,
        style,
        className,
        status,
        value = null,
        rounded = false,
        disabled = false,
        fullWidth = false,
        resettable = false,
        options = [],
        variant = SELECT_VARIANT.OUTLINED,
        onBlur,
        onFocus,
        onClick,
        onDoubleClick,
        onMouseDown,
        onChange,
        onMouseEnter,
        onMouseLeave,
        onMouseUp,
        opened = false,
        loading = false,
        setOpen,
        popoverOffset,
    } = props;
    //
    const [search, setSearch] = useState('');
    const [hovered, setHover] = useState(false);
    const [focused, setFocus] = useState(false);

    const inputContainerClassName = cn('body', styles['input-container']);

    const handleMouseEnter: MouseEventHandler<HTMLDivElement> = (event) => {
        if (disabled) return;

        setHover(true);
        onMouseEnter?.(event);
    };
    const handleMouseLeave: MouseEventHandler<HTMLDivElement> = (event) => {
        setHover(false);
        onMouseLeave?.(event);
    };
    const handleFocus: FocusEventHandler<HTMLInputElement> = (event) => {
        if (disabled) return;

        setFocus(true);
        onFocus?.(event);
    };
    const handleBlur: FocusEventHandler<HTMLInputElement> = (event) => {
        setFocus(false);
        onBlur?.(event);
    };

    const handleClick: MouseEventHandler<HTMLDivElement> = (event) => {
        if (disabled) return;
        onClick?.(event);
    };

    const handleStopPropagation: MouseEventHandler<HTMLInputElement> = (event) => event.stopPropagation();
    const handleSearchChange: ChangeEventHandler<HTMLInputElement> = (event) => {
        setSearch(event.target.value);
    };

    const handleListChange = (newValue: string[], flatOptions: IFlatOption[]) => {
        const option = flatOptions.find((option) => option.value === newValue[0]);
        const computedNewValue = newValue[0] ? JSON.stringify({ value: newValue[0], link: option?.groupLabel ?? '0' }) : null;

        if (computedNewValue === value && !resettable) {
            return;
        }
        if (computedNewValue === value && !!resettable) {
            onChange?.(null);
        } else {
            onChange?.(computedNewValue);
        }
    };

    const getFlatOptions = (): IFlatOption[] => {
        const result: { value: string; label: string; groupLabel?: string; disabled?: boolean }[] = [];
        options.forEach((option) => {
            if (option.label !== 'Не выбрано') {
                result.push({
                    value: '',
                    label: option.label,
                    disabled: true,
                });
            }
            if ('options' in option && option.options) {
                option.options.forEach((childOption) => {
                    result.push({
                        value: childOption.value as string,
                        label: `\u00A0\u00A0${childOption.label}`,
                        groupLabel: option.label,
                    });
                });
            } else if ('value' in option) {
                result.push({
                    value: option.value as string,
                    label: option.label,
                });
            }
        });
        return result;
    };

    const getVisibleValue = (): { link: string; value: string } => {
        if (typeof value !== 'string') {
            return { link: '0', value: '0' };
        }
        const obj = JSON.parse(value);
        return obj?.value ? { link: obj.link, value: obj.value } : { link: '0', value: '0' };
    };

    const computedVariant = Object.values(SELECT_VARIANT).includes(variant) ? variant : SELECT_VARIANT.OUTLINED;
    const computedStatus = status && Object.values(SELECT_STATUS).includes(status) ? status : undefined;

    const flatOptions = getFlatOptions();
    const { value: visibleValue } = getVisibleValue();

    const filteredOptions = useMemo(() => {
        if (!search.trim()) {
            return flatOptions;
        }
        const searchLower = search.toLocaleLowerCase();
        return flatOptions.filter((option) => {
            const labelMatch = option.label?.toLocaleLowerCase().includes(searchLower);
            const groupLabelMatch = option.groupLabel?.toLocaleLowerCase().includes(searchLower);
            if (groupLabelMatch) {
                return true;
            }
            return labelMatch;
        });
    }, [flatOptions, search]);

    const computedValueInput = useMemo(
        () =>
            flatOptions
                .filter((option) => option.value === visibleValue)
                .map((option) => option.label)
                .join(', ')
                .replace(/^\s*/g, ''),
        [visibleValue, flatOptions],
    );

    const containerClassName = cn(
        styles.container,
        styles[`container__${computedVariant}`],
        styles[`container__${computedStatus}`],
        {
            [styles['full-width']]: fullWidth,
            [styles.container__hovered]: !disabled && hovered,
            [styles.container__focused]: !disabled && focused,
            [styles.container__rounded]: rounded,
            [styles.container__disabled]: disabled,
        },
        className,
    );
    const hintClassName = cn('captiontext', styles.hint);

    const mainContainerClassName = cn(styles['main-container'], {
        [styles['full-width']]: fullWidth,
    });

    return (
        <div
            tabIndex={-1}
            className={mainContainerClassName}
            onBlur={handleBlur}
            onDoubleClick={onDoubleClick}
            onFocus={handleFocus}
        >
            <div
                className={containerClassName}
                style={style}
                onClick={handleClick}
                onMouseDown={onMouseDown}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onMouseUp={onMouseUp}
                title={title}
            >
                <Popover
                    opened={opened}
                    onOpened={setOpen}
                    closeOnContentClick
                    closeOnOutsideClick
                    offset={popoverOffset ?? 10}
                    className={styles.popover}
                    containerFullWidth={fullWidth}
                    autoWidth
                    containerStyle={{ width: '100%' }}
                    content={
                        <div className={styles['list-container']}>
                            <Input
                                leftIcon={SearchIcon}
                                placeholder="Поиск"
                                variant="outlined"
                                fullWidth
                                value={search}
                                onClick={handleStopPropagation}
                                onChange={handleSearchChange}
                            />
                            <List
                                type="single"
                                options={filteredOptions}
                                value={Array.isArray(visibleValue) ? visibleValue : [visibleValue]}
                                onChange={(value) => handleListChange(value, flatOptions)}
                                resettable={resettable}
                            />
                        </div>
                    }
                >
                    <div className={inputContainerClassName}>
                        {loading && <Loader size="small" />}
                        {loading && <span className={styles['input-placeholder']}>Загрузка данных…</span>}
                        {visibleValue && !loading && <span className={styles['input-text']}>{computedValueInput}</span>}
                    </div>
                </Popover>
                {hint && <span className={hintClassName}>{hint}</span>}
            </div>
        </div>
    );
};
