import { renderHook, act } from '@testing-library/react';
import { usePicker } from 'components/MetadataForms/Inputs/DateTime/components/DatePicker/hooks/usePicker';

describe('usePicker', () => {
    describe('usePicker', () => {
        it('должен вернуть начальное состояние openedCalendar=defaultOpen', () => {
            const { result } = renderHook(() =>
                usePicker({
                    minDate: undefined,
                    maxDate: undefined,
                    disabled: false,
                    defaultOpen: true,
                    onClick: undefined,
                }),
            );

            expect(result.current.openedCalendar).toBe(true);
        });

        it('должен вернуть начальное состояние openedCalendar=false при defaultOpen=false', () => {
            const { result } = renderHook(() =>
                usePicker({
                    minDate: undefined,
                    maxDate: undefined,
                    disabled: false,
                    defaultOpen: false,
                    onClick: undefined,
                }),
            );

            expect(result.current.openedCalendar).toBe(false);
        });

        it('должен открыть календарь при handleCalendarOpen', () => {
            const { result } = renderHook(() =>
                usePicker({
                    minDate: undefined,
                    maxDate: undefined,
                    disabled: false,
                    defaultOpen: false,
                    onClick: undefined,
                }),
            );

            act(() => {
                result.current.handleCalendarOpen();
            });

            expect(result.current.openedCalendar).toBe(true);
        });

        it('должен закрыть календарь при handleCalendarClose', () => {
            const { result } = renderHook(() =>
                usePicker({
                    minDate: undefined,
                    maxDate: undefined,
                    disabled: false,
                    defaultOpen: true,
                    onClick: undefined,
                }),
            );

            act(() => {
                result.current.handleCalendarClose();
            });

            expect(result.current.openedCalendar).toBe(false);
        });

        it('должен переключать состояние календаря при handleInputClick', () => {
            const { result } = renderHook(() =>
                usePicker({
                    minDate: undefined,
                    maxDate: undefined,
                    disabled: false,
                    defaultOpen: false,
                    onClick: undefined,
                }),
            );

            // Открыть
            act(() => {
                result.current.handleInputClick({ preventDefault: () => {}, stopPropagation: () => {} } as any);
            });
            expect(result.current.openedCalendar).toBe(true);

            // Закрыть
            act(() => {
                result.current.handleInputClick({ preventDefault: () => {}, stopPropagation: () => {} } as any);
            });
            expect(result.current.openedCalendar).toBe(false);
        });

        it('не должен открывать календарь если disabled=true', () => {
            const { result } = renderHook(() =>
                usePicker({
                    minDate: undefined,
                    maxDate: undefined,
                    disabled: true,
                    defaultOpen: false,
                    onClick: undefined,
                }),
            );

            act(() => {
                result.current.handleCalendarOpen();
            });

            expect(result.current.openedCalendar).toBe(false);
        });

        it('должен вызвать onClick при handleInputClick', () => {
            const onClickMock = jest.fn();
            const { result } = renderHook(() =>
                usePicker({
                    minDate: undefined,
                    maxDate: undefined,
                    disabled: false,
                    defaultOpen: false,
                    onClick: onClickMock,
                }),
            );

            act(() => {
                result.current.handleInputClick({ preventDefault: () => {}, stopPropagation: () => {} } as any);
            });

            expect(onClickMock).toHaveBeenCalled();
        });
    });
});
