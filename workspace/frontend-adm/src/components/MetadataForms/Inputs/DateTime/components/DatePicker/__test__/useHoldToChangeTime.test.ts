import { renderHook, act } from '@testing-library/react';
import { act as reactAct } from 'react';
import { useHoldToChangeTime } from 'components/MetadataForms/Inputs/DateTime/components/DatePicker/hooks/useHoldToChangeTime.hook';

describe('useHoldToChangeTime', () => {
    const onActionMock = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('должен вызвать onAction при handleClick на isHolding', () => {
        const { result } = renderHook(() =>
            useHoldToChangeTime({
                onAction: onActionMock,
            })
        );

        reactAct(() => {
            result.current.handleClick();
        });

        expect(onActionMock).toHaveBeenCalledTimes(1);
    });

    it('не должен вызвать onAction при handleClick когда isHolding=true', () => {
        const { result } = renderHook(() =>
            useHoldToChangeTime({
                onAction: onActionMock,
            })
        );

        reactAct(() => {
            result.current.startHold();
        });

        reactAct(() => {
            result.current.handleClick();
        });

        expect(onActionMock).not.toHaveBeenCalled();
    });


    it('должен очистить таймеры при endHold', () => {
        const { result } = renderHook(() =>
            useHoldToChangeTime({
                onAction: onActionMock,
            })
        );

        reactAct(() => {
            result.current.startHold();
        });

        reactAct(() => {
            jest.advanceTimersByTime(300);
        });

        reactAct(() => {
            result.current.endHold();
        });

        const initialCallCount = onActionMock.mock.calls.length;

        reactAct(() => {
            jest.advanceTimersByTime(100);
        });

        expect(onActionMock.mock.calls.length).toBe(initialCallCount);
    });

});
