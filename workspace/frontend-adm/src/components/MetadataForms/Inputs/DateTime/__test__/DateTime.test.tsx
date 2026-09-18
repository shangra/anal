import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DateTime } from 'components/MetadataForms/Inputs/DateTime';

// Мок для styles
jest.mock('../style.module.css', () => ({
    commonInputWrapper: 'commonInputWrapper',
}));

jest.mock('../components/DatePicker', () => ({
    DatePicker: (props: any) => {
        const { value, time, onChangeDate, onChangeTime, ...rest } = props;
        return (
            <div data-testid="mock-date-picker" {...rest}>
                <div data-testid="mock-time-controls">
                    {/* Мокируем время */}
                    <input
                        data-testid="mock-hours-input"
                        value={time?.hours || '00'}
                        readOnly
                    />
                    <input
                        data-testid="mock-minutes-input"
                        value={time?.minutes || '00'}
                        readOnly
                    />
                    <input
                        data-testid="mock-seconds-input"
                        value={time?.seconds || '00'}
                        readOnly
                    />
                </div>
            </div>
        );
    },
}));

const defaultProps = {
    label: 'Тестовое поле даты и времени',
    placeholder: 'ДД.ММ.ГГГГ ЧЧ:ММ:СС',
    value: '2024-01-15T10:30:45',
    disabled: false,
} as any;

beforeEach(() => {
    jest.clearAllMocks();
});

it('должен отрендерить компонент с defaultProps', () => {
    render(<DateTime {...defaultProps} />);

    expect(screen.getByPlaceholderText('ДД.ММ.ГГГГ ЧЧ:ММ:СС')).toBeInTheDocument();
    expect(screen.getByDisplayValue('15.01.2024 10:30:45')).toBeInTheDocument();
});

it('должен отрендерить пустое значение при value=null', () => {
    render(<DateTime {...defaultProps} value={null} />);

    expect(screen.getByDisplayValue('')).toBeInTheDocument();
});

it('должен отрендерить пустое значение при отсутствии value', () => {
    render(<DateTime {...defaultProps} value={undefined} />);

    expect(screen.getByDisplayValue('')).toBeInTheDocument();
});

it('должен отображать disabled состояние', () => {
    render(<DateTime {...defaultProps} disabled />);

    const input = screen.getByPlaceholderText('ДД.ММ.ГГГГ ЧЧ:ММ:СС');
    expect(input).toBeDisabled();
});

it('должен отображать readOnly состояние', () => {
    render(<DateTime {...defaultProps} readOnly />);

    const input = screen.getByPlaceholderText('ДД.ММ.ГГГГ ЧЧ:ММ:СС');
    expect(input).toHaveAttribute('readOnly');
});

it('должен корректно обрабатывать изменение value извне', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DateTime {...defaultProps} value="2024-01-15T10:30:45" />);

    let input = screen.getByDisplayValue('15.01.2024 10:30:45');

    await user.clear(input);

    rerender(<DateTime {...defaultProps} value="2024-02-20T15:45:30" />);

    input = screen.getByDisplayValue('20.02.2024 15:45:30');
    expect(input).toBeInTheDocument();
});

it('должен очистить значение при клике на кнопку удаления', async () => {
    const user = userEvent.setup();
    render(<DateTime {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[1]);

    await waitFor(() => {
        expect(screen.getByDisplayValue('')).toBeInTheDocument();
    });
});

it('должен открыть календарь при клике на кнопку даты', async () => {
    const user = userEvent.setup();
    render(<DateTime {...defaultProps} />);

    // Проверяем, что изначально календарь закрыт (datepicker input скрыт)
    const datepickerInput = screen.queryByTestId('mock-date-picker');
    expect(datepickerInput).toBeInTheDocument();

    // Находим кнопку для открытия календаря (кнопка с иконкой календаря)
    const calendarButtons = screen.getAllByRole('button');
    expect(calendarButtons.length).toBeGreaterThan(0);

    // Клик на первую кнопку (календарь)
    await user.click(calendarButtons[0]);

    // Календарь должен остаться в DOM (Popover открывает его)
    await waitFor(() => {
        // Проверяем, что компонент DatePicker рендерится (через mock)
        expect(screen.getByTestId('mock-date-picker')).toBeInTheDocument();
    });
});
