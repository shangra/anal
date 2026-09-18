import { useRef } from "react";

interface IUseHoldToChangeTimeOptions {
    step?: number;
    /** Задержка перед началом автоматического изменения значения.
     * Нужна для того, чтобы отрабатывало одиночное нажатие по onClick.
     */
    delayBeforeHold?: number;
    /** Измерение частоты обновления значения */
    holdInterval?: number;
    /** Функция, которую нужно вызвать при изменении значения */
    onAction: () => void;
}

const DEFAULT_STEP = 1;
const DEFAULT_HOLD_INTERVAL = 100;
const DEFAULT_DELAY_BEFORE_HOLD = 300;


export type useHoldToChangeTimeReturnValue = ReturnType<typeof useHoldToChangeTime>


// ** Хук для изменения значений - часы, минуты, секунды по зажатию левой клавиши мыши **

export const useHoldToChangeTime = (options: IUseHoldToChangeTimeOptions) => {
    const {
        step = DEFAULT_STEP,
        delayBeforeHold = DEFAULT_DELAY_BEFORE_HOLD,
        holdInterval = DEFAULT_HOLD_INTERVAL,
        onAction,
    } = options;

    const holdTimOutRef = useRef<NodeJS.Timeout | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const isHoldingRef = useRef<boolean>(false);



    const startHold = () => {
        isHoldingRef.current = true;
        holdTimOutRef.current = setTimeout(() => {
            if (isHoldingRef.current) {
                intervalRef.current = setInterval(onAction, delayBeforeHold)
            }
        }, delayBeforeHold);
    }

    const endHold = () => {
        isHoldingRef.current = false;
        if (holdTimOutRef.current) {
            clearInterval(holdTimOutRef.current);
            holdTimOutRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }

    const handleClick = () => {
        if (!isHoldingRef.current) {
            onAction()
        }
    }

    return {
        startHold,
        endHold,
        handleClick
    }
}