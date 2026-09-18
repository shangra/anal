import { useEffect, useRef, useState } from 'react';

interface IUseHoldToChangeCounterOptions {
    initialValue: number;
    step?: number;
    /** Задержка перед началом автоматического изменения счётчика.
     * Нужна для того, чтобы отрабатывало одиночное нажатие по onClick.
     */
    delayBeforeHold?: number;
    /** Измерение частоты обновления значения */
    holdInterval?: number;
    /** Коллбек, который нужно вызвать при изменении счётчика */
    changeCallback?: (value: number) => void;
}

const DEFAULT_STEP = 1;
const DEFAULT_HOLD_INTERVAL = 100;
const DEFAULT_DELAY_BEFORE_HOLD = 300;

const getDecimalNumbersCount = (num: number) => {
    const numStr = num.toString();
    return numStr.includes('.') ? numStr.split('.')[1].length : 0;
};

export type useHoldToChangeCounterReturnValue = ReturnType<typeof useHoldToChangeCounter>;

/**
 * Хук для автоматического изменения счётчика по зажатию левой клавиши мыши.
 * Работает в направлениях 'increment' | 'decrement'. При обновлении счётчика вызывается changeCallback со значением счётчика
 * для обновления state извне.
 */
export const useHoldToChangeCounter = (options: IUseHoldToChangeCounterOptions) => {
    const {
        initialValue,
        step = DEFAULT_STEP,
        delayBeforeHold = DEFAULT_DELAY_BEFORE_HOLD,
        holdInterval = DEFAULT_HOLD_INTERVAL,
        changeCallback,
    } = options;

    const [count, setCount] = useState<number>(initialValue);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isHoldingRef = useRef<boolean>(false);
    const directionRef = useRef<'increment' | 'decrement' | null>(null);

    const clearCounterInterval = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        isHoldingRef.current = false;
        directionRef.current = null;
    };

    const startHold = (direction: 'increment' | 'decrement') => {
        document.addEventListener('mouseup', endHold);
        directionRef.current = direction;
        isHoldingRef.current = true;

        changeCounter();

        intervalRef.current = setTimeout(() => {
            if (isHoldingRef.current) {
                intervalRef.current = setInterval(changeCounter, holdInterval);
            }
        }, delayBeforeHold);
    };

    const endHold = () => {
        clearCounterInterval();
        document.removeEventListener('mouseup', endHold);
    };

    /** Обработка поднятия курсора на всём документе */
    useEffect(() => () => {
            clearCounterInterval(); // очистить все таймеры и интервалы при размонтировании
            document.removeEventListener('mouseup', endHold);
        }, []);

    const changeCounter = () => {
        setCount((prevCount) => {
            let newCount = prevCount;
            if (directionRef.current === 'increment') {
                newCount = Number((prevCount + step).toFixed(getDecimalNumbersCount(step)));
            } else if (directionRef.current === 'decrement') {
                newCount = Number((prevCount - step).toFixed(getDecimalNumbersCount(step)));
            }
            changeCallback?.(newCount);

            return newCount;
        });
    };

    const handleIncrementMouseDown = () => startHold('increment');
    const handleDecrementMouseDown = () => startHold('decrement');
    const handleMouseUp = () => endHold();

    return {
        count,
        setCount,
        incrementButtonProps: {
            onMouseDown: handleIncrementMouseDown,
            onMouseUp: handleMouseUp,
        },
        decrementButtonProps: {
            onMouseDown: handleDecrementMouseDown,
            onMouseUp: handleMouseUp,
        },
    };
};
