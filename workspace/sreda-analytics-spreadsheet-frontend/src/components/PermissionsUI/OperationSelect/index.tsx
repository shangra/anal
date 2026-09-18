import React, { useEffect, useRef, useState } from 'react';
import { Checkbox, Loader, PopConfirm } from 'ui-kit';

import { OPERATION_ORDER } from '../constants';
import { EOperation } from '../types';
import styles from './styles.module.css';
import { getHighestOperation, getOperationUpTo } from './utils';

interface IOperationProps {
    confirm?: boolean;
    checked?: boolean;
    disabled?: boolean;
    onChange?: (checked: boolean) => void;
}

const Operation: React.FC<IOperationProps> = ({
    checked: propsChecked = false,
    disabled = false,
    confirm = false,
    onChange = () => {},
}: IOperationProps) => {
    const [checked, setChecked] = useState<boolean>(propsChecked);

    useEffect(() => {
        setChecked(propsChecked);
    }, [propsChecked]);

    if (confirm && !disabled) {
        return (
            <PopConfirm
                title="Изменение доступа"
                content="Вы уверены, что хотите изменить доступ?"
                rejectLabel="Нет"
                confirmLabel="Да"
                closeOnOutsideClick
                onConfirm={() => {
                    setChecked(!checked);
                    onChange(!checked);
                }}
            >
                <Checkbox checked={checked} disabled={disabled} />
            </PopConfirm>
        );
    }

    return (
        <Checkbox
            checked={checked}
            disabled={disabled}
            onChange={(e) => {
                setChecked(e.target.checked);
                onChange(e.target.checked);
            }}
        />
    );
};

export interface IOperationSelectProps {
    /** Множество доступных к выбору операций */
    options: Set<EOperation>;
    /** Массив выбранных операций */
    value: EOperation[];
    /**
     * Требовать подтверждение изменения операции
     */
    confirm?: boolean;
    /**
     * Блокировка операций.
     * - `true` — блокирует все чекбоксы карточки.
     * - `EOperation[]` — блокирует только перечисленные операции.
     * - `false` / `undefined` — всё активно.
     */
    disabled: boolean | EOperation[];
    /**
     * Callback изменения операций
     * @param value измененный список операций
     */
    onChange?: (value: EOperation[]) => void;
}

export const OperationSelect: React.FC<IOperationSelectProps> = (props: IOperationSelectProps) => {
    const mounted = useRef(true);

    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        mounted.current = true;
        setLoading(false);
        return () => {
            mounted.current = false;
        };
    }, []);

    /** Множество выбранных операций */
    const [value, setValue] = useState<Set<EOperation>>(new Set());

    useEffect(() => {
        setValue(new Set(props.value.filter((o) => props.options.has(o))));
    }, [props.value, props.options]);

    /** `true` если вся карточка заблокирована */
    const cardDisabled = props.disabled === true;

    /** Проверяет, заблокирована ли конкретная операция */
    const isOpDisabled = (op: EOperation): boolean =>
        cardDisabled || (Array.isArray(props.disabled) && props.disabled.includes(op));

    const handleChange = async (operation: EOperation, isChecked: boolean) => {
        if (isOpDisabled(operation)) return;

        mounted.current && setLoading(true);

        const index = OPERATION_ORDER.indexOf(operation);
        if (index === -1) {
            throw new Error(`Неизвестная операция: ${operation}`);
        }

        const newValue = OPERATION_ORDER.slice(0, index + Number(isChecked)).filter((o) => props.options.has(o));

        setValue(new Set(newValue));

        try {
            await props.onChange?.(newValue);
        } catch (e) {
            console.error(e);
            setValue(new Set(props.value.filter((o) => props.options.has(o))));
        } finally {
            mounted.current && setLoading(false);
        }
    };

    const highest = getHighestOperation([...value]);
    const upTo = highest ? getOperationUpTo(highest) : [];

    return (
        <div className={styles.container}>
            {loading && (
                <div className={styles.icon_container}>
                    <Loader size="small" />
                </div>
            )}
            {OPERATION_ORDER.filter((o) => props.options.has(o)).map((p) => (
                <Operation
                    key={p}
                    checked={upTo.includes(p)}
                    onChange={(c) => handleChange(p, c)}
                    confirm={props.confirm}
                    disabled={isOpDisabled(p) || loading}
                />
            ))}
        </div>
    );
};
