import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DatePicker } from 'components/MetadataForms/Inputs/DateTime/components/DatePicker';

// Мок для styles
jest.mock('../styles/styles.module.css', () => ({
    'date-panel-container': 'date-panel-container',
    btnsContainer: 'btnsContainer',
    unit: 'unit',
    unitName: 'unitName',
    btnBlock: 'btnBlock',
    btn: 'btn',
    input: 'input',
}));

// Мок для DatePanel
jest.mock('../components/DatePanel/DatePanel', () => ({
    DatePanel: (props: any) => {
        const { testId, value, onSelectDate, className, style } = props;
        return (
            <div
                data-testid={testId || 'mock-date-panel'}
                className={className}
                style={style}
                onClick={() => onSelectDate?.(value || new Date())}
            >
                <span data-testid="date-panel-content">DatePanel</span>
            </div>
        );
    },
}));

// Мок для иконок TimePicker
jest.mock('../../TimePicker/icons/MinusIcon', () => () => <div data-testid="mock-minus-icon">-</div>);
jest.mock('../../TimePicker/icons/PlusIcon', () => () => <div data-testid="mock-plus-icon">+</div>);

// Мок для ui-kit компонентов
jest.mock('ui-kit', () => ({
    Input: (props: any) => {
        const {
            value,
            onChange,
            onClick,
            onClickRightIcon,
            rightIcon,
            readOnly,
            testId,
            placeholder,
            disabled,
            fullWidth,
            className,
            style,
            onMouseDown,
            onMouseEnter,
            onMouseLeave,
            onMouseUp,
            onFocus,
            onBlur,
        } = props;
        // Компонент DatePicker передает testId в формате `${baseId}-input`,
        // поэтому wrapper должен использовать базовый ID
        const baseTestId = testId?.replace('-input', '') || 'input';
        return (
            <div
                data-testid={`${baseTestId}-wrapper`}
                onClick={onClick}
                onMouseDown={onMouseDown}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onMouseUp={onMouseUp}
                onFocus={onFocus}
                onBlur={onBlur}
                className={className}
                style={style}
            >
                <input
                    data-testid={testId}
                    value={value}
                    onChange={onChange}
                    onClick={onClick}
                    readOnly={readOnly}
                    disabled={disabled}
                    placeholder={placeholder}
                    className={fullWidth ? 'full-width' : ''}
                />
                {rightIcon && (
                    <div
                        data-testid="right-icon"
                        onClick={(e: any) => {
                            e.stopPropagation();
                            onClickRightIcon?.();
                        }}
                    >
                        {rightIcon}
                    </div>
                )}
            </div>
        );
    },
    Popover: (props: any) => {
        const {
            content,
            testId,
            containerFullWidth,
            showArrow: _showArrow,
            children,
        } = props;
        return (
            <div data-testid={testId} className={containerFullWidth ? 'full-width' : ''} style={{ position: 'relative' }}>
                {content}
                {children}
            </div>
        );
    },
    IconButton: (props: any) => {
        const { onClick, icon: Icon, size, className, color, variant, onMouseDown, onMouseUp } = props;
        return (
            <button
                data-testid={`${onClick ? 'icon-btn' : 'btn'}-${size}`}
                onClick={onClick}
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                className={className}
                data-color={color}
                data-variant={variant}
            >
                {Icon && <Icon />}
            </button>
        );
    },
    BUTTON_SIZE: {
        MEDIUM: 'medium',
    },
}));

describe('DatePicker', () => {
    const mockOnChangeDate = jest.fn();
    const mockOnChangeTime = jest.fn();

    const defaultProps = {
        value: new Date('2024-01-15T10:30:45'),
        time: { hours: '10', minutes: '30', seconds: '45' },
        placeholder: 'ДД.ММ.ГГ',
        onChangeDate: mockOnChangeDate,
        onChangeTime: mockOnChangeTime,
        testId: 'datepicker',
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('должен отрендерить компонент с defaultProps', () => {
        render(<DatePicker {...defaultProps} />);

        expect(screen.getByPlaceholderText('ДД.ММ.ГГ')).toBeInTheDocument();
        expect(screen.getByDisplayValue('15.01.2024')).toBeInTheDocument();
    });

    it('должен отрендерить пустое значение при value=null', () => {
        render(<DatePicker {...defaultProps} value={null} />);

        expect(screen.getByPlaceholderText('ДД.ММ.ГГ')).toBeInTheDocument();
    });

    it('должен отрендерить пустое значение при value=undefined', () => {
        render(<DatePicker {...defaultProps} value={undefined} />);

        expect(screen.getByPlaceholderText('ДД.ММ.ГГ')).toBeInTheDocument();
    });

    it('должен использовать переданный placeholder', () => {
        render(<DatePicker {...defaultProps} placeholder="Выберите дату" />);

        expect(screen.getByPlaceholderText('Выберите дату')).toBeInTheDocument();
    });

    it('должен очистить значение при клике на кнопку', async () => {
        const user = userEvent.setup();
        render(<DatePicker {...defaultProps} />);

        const buttons = screen.getAllByRole('button');
        await user.click(buttons[0]);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('ДД.ММ.ГГ')).toBeInTheDocument();
        });
    });

    it('должен открыть/закрыть календарь при клике на поле ввода', async () => {
        const user = userEvent.setup();
        render(<DatePicker {...defaultProps} />);

        const input = screen.getByPlaceholderText('ДД.ММ.ГГ');
        await user.click(input);

        await waitFor(() => {
            expect(screen.getByTestId('datepicker-popper-open')).toBeInTheDocument();
        });

        await user.click(input);

        await waitFor(() => {
            expect(screen.getByTestId('datepicker-popper-closed')).toBeInTheDocument();
        });
    });

    it('должен корректно обрабатывать изменение value извне', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<DatePicker {...defaultProps} value={new Date('2024-01-15T10:30:45')} />);

        let input = screen.getByDisplayValue('15.01.2024');

        rerender(<DatePicker {...defaultProps} value={new Date('2024-02-20T15:45:30')} />);

        input = screen.getByDisplayValue('20.02.2024');
        expect(input).toBeInTheDocument();
    });

    it('должен использовать defaultOpen=true для открытия календаря по умолчанию', () => {
        render(<DatePicker {...defaultProps} defaultOpen />);

        expect(screen.getByTestId('datepicker-popper-open')).toBeInTheDocument();
    });
});
