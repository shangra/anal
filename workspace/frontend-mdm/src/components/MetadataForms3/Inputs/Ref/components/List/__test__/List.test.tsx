import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { List } from '../index';

// Мок для ui-kit
jest.mock('ui-kit', () => {
    const actual = jest.requireActual('ui-kit');
    return {
        ...actual,
        List: ({
            testId,
            className,
            options,
            type,
            value,
            resettable,
            onChange,
            onClick,
            onMouseEnter,
            onMouseLeave,
            onMouseDown,
            onMouseUp,
            ...restProps
        }: any) => (
            <div
                data-testid={testId || 'list'}
                className={className}
                {...restProps}
            >
                {options.map(
                    ({
                        value: val,
                        label,
                    }: {
                        value: string;
                        label: string;
                    }) => (
                        <div
                            key={val}
                            data-testid={`list-item-${val}`}
                            data-selected={value?.includes(val) || false}
                            onClick={() => {
                                onChange?.([val]);
                                onClick?.(val);
                            }}
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            onMouseDown={onMouseDown}
                            onMouseUp={onMouseUp}
                        >
                            {label}
                        </div>
                    )
                )}
            </div>
        ),
    };
});

describe('List (Ref)', () => {
    const mockOnChange = jest.fn();
    const mockOnClick = jest.fn();

    const options = [
        { value: '1', label: 'Опция 1' },
        { value: '2', label: 'Опция 2' },
        { value: '3', label: 'Опция 3' },
    ];

    const defaultProps = {
        testId: 'ref-list',
        options,
        value: ['1'],
        onChange: mockOnChange,
        onClick: mockOnClick,
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('должен отрендерить список опций', () => {
        render(<List {...defaultProps} />);

        expect(screen.getByTestId('ref-list')).toBeInTheDocument();
        expect(screen.getByTestId('list-item-1')).toBeInTheDocument();
        expect(screen.getByTestId('list-item-2')).toBeInTheDocument();
        expect(screen.getByTestId('list-item-3')).toBeInTheDocument();
        expect(screen.getByText('Опция 1')).toBeInTheDocument();
        expect(screen.getByText('Опция 2')).toBeInTheDocument();
        expect(screen.getByText('Опция 3')).toBeInTheDocument();
    });

    it('должен вызвать onChange при клике на опцию', async () => {
        const user = userEvent.setup();
        render(<List {...defaultProps} />);

        await user.click(screen.getByTestId('list-item-2'));

        expect(mockOnChange).toHaveBeenCalledTimes(1);
        expect(mockOnChange).toHaveBeenCalledWith(['2']);
    });

    it('должен применить className', () => {
        render(<List {...defaultProps} className='custom-class' />);

        expect(screen.getByTestId('ref-list')).toHaveClass('custom-class');
    });

    it('должен вызвать onClick при клике на опцию', async () => {
        const user = userEvent.setup();

        const onClickSpy = jest.fn();

        render(
            <List {...defaultProps} onClick={onClickSpy} onChange={jest.fn()} />
        );

        await user.click(screen.getByTestId('list-item-1'));

        expect(onClickSpy).toHaveBeenCalledTimes(1);
        expect(onClickSpy).toHaveBeenCalledWith('1');
    });

    it('должен вызвать onMouseEnter/onMouseLeave при наведении', async () => {
        const mockOnMouseEnter = jest.fn();
        const mockOnMouseLeave = jest.fn();
        const user = userEvent.setup();

        render(
            <List
                {...defaultProps}
                onMouseEnter={mockOnMouseEnter}
                onMouseLeave={mockOnMouseLeave}
            />
        );

        const item = screen.getByTestId('list-item-1');
        await user.hover(item);

        expect(mockOnMouseEnter).toHaveBeenCalledTimes(1);
    });
});
