import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Integer } from 'components/MetadataForms/Inputs/Integer';

// Мок для styles
jest.mock('../style.module.css', () => ({
    commonInputWrapper: 'commonInputWrapper',
}));

describe('Integer', () => {
    const mockOnChange = jest.fn();
    const mockOnClear = jest.fn();

    const defaultProps = {
        label: 'Тестовое поле',
        placeholder: 'Введите значение',
        value: 42,
        onChange: mockOnChange,
        onClear: mockOnClear,
        disabled: false,
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('должен отрендерить компонент с defaultProps', () => {
        render(<Integer {...defaultProps} />);

        expect(screen.getByPlaceholderText('Введите значение')).toBeInTheDocument();
        expect(screen.getByDisplayValue('42')).toBeInTheDocument();
    });

    it('должен отрендерить кнопку удаления', () => {
        render(<Integer {...defaultProps} />);

        const buttons = screen.getAllByRole('button');
        expect(buttons[0]).toBeInTheDocument();
        expect(buttons[0]).toHaveTextContent('');
    });

    it('должен отрендерить кнопки изменения диапазона', () => {
        render(<Integer {...defaultProps} />);

        const buttons = screen.getAllByRole('button');
        // Кнопки range (2 штуки): increment и decrement
        expect(buttons.length).toBeGreaterThanOrEqual(3); // delete + 2 range buttons
    });

    it('должен очистить значение при клике на кнопку удаления', async () => {
        const user = userEvent.setup();
        render(<Integer {...defaultProps} />);

        const input = screen.getByDisplayValue('42');
        const buttons = screen.getAllByRole('button');
        const deleteButton = buttons[2];

        if (deleteButton) {
            await user.click(deleteButton);
        }

        await waitFor(() => {
            expect(input).toHaveValue('0');
        });
    });

    it('должен обновить значение при вводе текста', async () => {
        const user = userEvent.setup();
        render(<Integer {...defaultProps} />);

        const input = screen.getByPlaceholderText('Введите значение');

        await user.type(input, '5');

        expect(input).toHaveValue('425');
        expect(mockOnChange).toHaveBeenCalledWith(425);
    });

    it('должен обновить значение при нажатии клавиши Delete или Backspace', async () => {
        const user = userEvent.setup();
        render(<Integer {...defaultProps} />);

        const input = screen.getByPlaceholderText('Введите значение');

        await user.clear(input);

        await waitFor(() => {
            expect(input).toHaveValue('0');
            expect(mockOnChange).toHaveBeenCalledWith(0);
        });
    });

    it('должен отображать пустое значение когда props.value не передан', () => {
        render(<Integer {...defaultProps} value={undefined} />);

        expect(screen.getByDisplayValue('0')).toBeInTheDocument();
    });

    it('должен отображать 0 когда props.value равен null', () => {
        render(<Integer {...defaultProps} value={null as any} />);

        expect(screen.getByDisplayValue('0')).toBeInTheDocument();
    });

    it('должен отображать disabled состояние', () => {
        render(<Integer {...defaultProps} disabled />);

        const input = screen.getByPlaceholderText('Введите значение');
        expect(input).toBeDisabled();
    });

    it('должен корректно обрабатывать изменение value извне (componentDidUpdate)', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<Integer {...defaultProps} value={10} />);

        let input = screen.getByDisplayValue('10');
        await user.type(input, '5');

        expect(mockOnChange).toHaveBeenCalledWith(105);

        // Ререндерим с новым значением извне
        rerender(<Integer {...defaultProps} value={20} />);

        input = screen.getByDisplayValue('20');
        expect(input).toBeInTheDocument();
    });

    it('должен увеличить значение при клике на кнопку увеличения', async () => {
        const user = userEvent.setup();
        render(<Integer {...defaultProps} />);

        const buttons = screen.getAllByRole('button');
        const incrementButton = buttons[0];

        if (incrementButton) {
            await user.click(incrementButton);
        }

        await waitFor(() => {
            expect(mockOnChange).toHaveBeenCalledWith(43);
        });
    });

    it('должен уменьшить значение при клике на кнопку уменьшения', async () => {
        const user = userEvent.setup();
        render(<Integer {...defaultProps} />);

        const buttons = screen.getAllByRole('button');

        const decrementButton = buttons[1];

        if (decrementButton) {
            await user.click(decrementButton);
        }

        await waitFor(() => {
            expect(mockOnChange).toHaveBeenCalledWith(41);
        });
    });

    it('должен игнорировать ввод нецифровых символов', async () => {
        const user = userEvent.setup();
        render(<Integer {...defaultProps} />);

        const input = screen.getByPlaceholderText('Введите значение');

        await user.type(input, 'abc123');

        expect(input).toHaveValue('42123');
        expect(mockOnChange).toHaveBeenCalledWith(42123);
    });

    it('должен корректно обрабатывать шаг изменения (step)', async () => {
        const user = userEvent.setup();
        render(<Integer {...defaultProps} step={5} />);

        const buttons = screen.getAllByRole('button');
        const incrementButton = buttons[0];

        if (incrementButton) {
            await user.click(incrementButton);
        }

        await waitFor(() => {
            expect(mockOnChange).toHaveBeenCalledWith(47);
        });
    });
});
