import { ChangeEventHandler, FocusEventHandler, MouseEventHandler, useMemo, useState } from 'react';
import cn from 'classnames';
import { Input, Popover, SELECT_STATUS, SELECT_VARIANT, List, SelectProps, SearchIcon, Loader } from 'ui-kit';
import styles from './style.module.css';

interface ICustomInputProps<T = string, R extends boolean = true> extends SelectProps<T, R> {
    opened: boolean;
    setOpen: () => void;
    popoverOffset?: number;
}

/**
 * Кастомный Select для работы с выпадающими списками в CommonInput.
 * Открывается в зависимости от состояния параметра props.opened.
 */
export const CustomSelect = (props: ICustomInputProps) => {
    const {
        placeholder,
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

    const [search, setSearch] = useState('');
    const [hovered, setHover] = useState(false);
    const [focused, setFocus] = useState(false);

    const computedValueInput = useMemo(
        () =>
            options
                .filter((option) => option.value === value)
                .map((option) => option.label)
                .join(', ')
                .replace(/^\s*/g, ''),
        [value, options],
    );

    const computedOptions = useMemo(
        () => options.filter((option) => option.label?.toLocaleLowerCase().includes(search.toLocaleLowerCase())),
        [options, search],
    );

    const visibleValue = value !== null && value !== undefined;
    const visiblePlaceholder = !visibleValue;

    const computedVariant = Object.values(SELECT_VARIANT).includes(variant) ? variant : SELECT_VARIANT.OUTLINED;
    const computedStatus = status && Object.values(SELECT_STATUS).includes(status) ? status : undefined;

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
    const inputContainerClassName = cn('body', styles['input-container']);

    const mainContainerClassName = cn(styles['main-container'], {
        [styles['full-width']]: fullWidth,
    });

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

    const handleListChange = (newValue: (string | null)[]) => {
        const computedNewValue = newValue[0] ?? null;

        if (computedNewValue === value && !resettable) {
            
        } else if (computedNewValue === value && !!resettable) {
            // @ts-ignore
            onChange?.(null);
        } else {
            // @ts-ignore
            onChange?.(computedNewValue);
        }
    };

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
                    onOpened={setOpen}
                    opened={opened}
                    closeOnContentClick
                    closeOnOutsideClick
                    offset={popoverOffset ?? 10}
                    className={styles.popover}
                    containerFullWidth={fullWidth}
                    widthMode="auto"
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
                                value={value ? [value] : []}
                                style={{ width: '100%' }}
                                onChange={handleListChange}
                                options={computedOptions}
                            />
                        </div>
                    }
                >
                    <div className={inputContainerClassName}>
                        {loading && <Loader size="small" />}
                        {loading && <span className={styles['input-placeholder']}>Загрузка данных…</span>}
                        {visibleValue && !loading && <span className={styles['input-text']}>{computedValueInput}</span>}
                        {visiblePlaceholder && !loading && <span className={styles['input-placeholder']}>{placeholder}</span>}
                    </div>
                </Popover>
                {hint && <span className={hintClassName}>{hint}</span>}
            </div>
        </div>
    );
};
