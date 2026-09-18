import cn from 'classnames';
import { IconButton } from 'ui-kit';
import type { MouseEvent } from 'react';
import { RangeButtonPlacement } from 'components/CommonInput/types';
import { useHoldToChangeCounter } from 'components/CommonInput/useHoldToChangeCounter.hook';
import { DropUpIcon } from 'components/CommonInput/icons/DropUpIcon';
import { DropDownIcon } from 'components/CommonInput/icons/DropDownIcon';

export interface HoldChangeButtonsProps {
    value: number;
    step?: number;
    disabled?: boolean;
    onValueChange?: (newValue: number) => void;
    onClickRange?: (button: 'top' | 'bottom', e: MouseEvent<HTMLButtonElement>) => void;
    className?: string;
    testId?: string;
    buttonClassName?: string;
}

export const HoldChangeButtons = ({
    value,
    step,
    disabled = false,
    onValueChange,
    onClickRange,
    className,
    testId,
    buttonClassName,
}: HoldChangeButtonsProps) => {
    const { incrementButtonProps, decrementButtonProps } = useHoldToChangeCounter({
        initialValue: value,
        step,
        changeCallback: onValueChange,
    });

    return (
        <div className={className}>
            <IconButton
                icon={DropUpIcon}
                color="controlled"
                className={cn(buttonClassName)}
                style={{ height: 16 }}
                disabled={disabled}
                {...incrementButtonProps}
                onClick={(e) => {
                    onClickRange?.(RangeButtonPlacement.TOP, e);
                }}
                testId={testId ? `${testId}::range-increment-button` : undefined}
            />
            <IconButton
                icon={DropDownIcon}
                color="controlled"
                className={cn(buttonClassName)}
                style={{ height: 16 }}
                disabled={disabled}
                {...decrementButtonProps}
                onClick={(e) => {
                    onClickRange?.(RangeButtonPlacement.BOTTOM, e);
                }}
                testId={testId ? `${testId}::range-decrement-button` : undefined}
            />
        </div>
    );
};
