import { debounce } from '../../ReactWindowWrapperCombined/utils/debounce';

describe('debounce', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('should delay function execution', () => {
        const mockFn = jest.fn();
        const debounced = debounce(mockFn, 100);

        debounced('arg1');

        expect(mockFn).not.toHaveBeenCalled();

        jest.advanceTimersByTime(100);

        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('arg1');
    });

    test('should reset delay on rapid calls', () => {
        const mockFn = jest.fn();
        const debounced = debounce(mockFn, 100);

        debounced('first');
        jest.advanceTimersByTime(50);

        debounced('second');
        jest.advanceTimersByTime(50);

        expect(mockFn).not.toHaveBeenCalled();

        jest.advanceTimersByTime(50);

        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('second');
    });

    test('should pass multiple arguments', () => {
        const mockFn = jest.fn();
        const debounced = debounce(mockFn, 100);

        debounced('arg1', 'arg2', { key: 'value' });

        jest.advanceTimersByTime(100);

        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' });
    });

    test('should use provided thisArg', () => {
        const context = { name: 'test', fn: jest.fn() };
        const debounced = debounce(context.fn, 100, context);

        debounced('arg1');

        jest.advanceTimersByTime(100);

        expect(context.fn).toHaveBeenCalledTimes(1);
        expect(context.fn).toHaveBeenCalledWith('arg1');
    });

    test('should allow multiple debounce cycles', () => {
        const mockFn = jest.fn();
        const debounced = debounce(mockFn, 100);

        // First cycle
        debounced('call1');
        jest.advanceTimersByTime(100);
        expect(mockFn).toHaveBeenCalledTimes(1);

        // Second cycle
        debounced('call2');
        jest.advanceTimersByTime(100);
        expect(mockFn).toHaveBeenCalledTimes(2);
        expect(mockFn).toHaveBeenLastCalledWith('call2');
    });

    test('should clear timeout on last call', () => {
        const mockFn = jest.fn();
        const debounced = debounce(mockFn, 100);

        debounced('call1');
        jest.advanceTimersByTime(50);
        debounced('call1'); // reset
        jest.advanceTimersByTime(100);

        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should work with zero delay', () => {
        const mockFn = jest.fn();
        const debounced = debounce(mockFn, 0);

        debounced();
        jest.advanceTimersByTime(0);

        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should handle empty arguments', () => {
        const mockFn = jest.fn();
        const debounced = debounce(mockFn, 100);

        debounced();
        jest.advanceTimersByTime(100);

        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith();
    });
});
