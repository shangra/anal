import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Float } from 'components/MetadataForms/Inputs/Float';

// Мок для styles
jest.mock('../style.module.css', () => ({
    commonInputWrapper: 'commonInputWrapper',
}));

describe('Float', () => {
    const mockOnChange = jest.fn();
    const mockOnClear = jest.fn();

    const defaultProps = {
        label: 'Тестовое поле',
        placeholder: 'Введите значение',
        value: 42.5,
        onChange: mockOnChange,
        onClear: mockOnClear,
        disabled: false,
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('должен отрендерить компонент с defaultProps', () => {
        render(<Float {...defaultProps} />);

        expect(screen.getByPlaceholderText('Введите значение')).toBeInTheDocument();
        expect(screen.getByDisplayValue('42.50')).toBeInTheDocument();
    });

    it('должен отрендерить кнопку удаления', () => {
        render(<Float {...defaultProps} />);

        const buttons = screen.getAllByRole('button');
        expect(buttons[0]).toBeInTheDocument();
        expect(buttons[0]).toHaveTextContent('');
    });

    it('должен отрендерить кнопки изменения диапазона', () => {
        render(<Float {...defaultProps} />);

        const buttons = screen.getAllByRole('button');
        // Кнопки range (2 штуки): increment и decrement
        expect(buttons.length).toBeGreaterThanOrEqual(3); // delete + 2 range buttons
    });

    it('должен очистить значение при клике на кнопку удаления', async () => {
        const user = userEvent.setup();
        render(<Float {...defaultProps} />);

        const input = screen.getByDisplayValue('42.50');
        const buttons = screen.getAllByRole('button');
        const deleteButton = buttons[2];

        if (deleteButton) {
            await user.click(deleteButton);
        }

        await waitFor(() => {
            expect(input).toHaveValue('0.00');
        });
    });

    it('должен отображать пустое значение когда props.value не передан', () => {
        render(<Float {...defaultProps} value={undefined} />);

        expect(screen.getByDisplayValue('0.00')).toBeInTheDocument();
    });

    it('должен отображать 0 когда props.value равен null', () => {
        render(<Float {...defaultProps} value={null} />);

        expect(screen.getByDisplayValue('0.00')).toBeInTheDocument();
    });

    it('должен отображать disabled состояние', () => {
        render(<Float {...defaultProps} disabled />);

        const input = screen.getByPlaceholderText('Введите значение');
        expect(input).toBeDisabled();
    });

    it('должен корректно обрабатывать изменение value извне (componentDidUpdate)', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<Float {...defaultProps} value={10.25} />);

        let input = screen.getByDisplayValue('10.25');
        const buttons = screen.getAllByRole('button');
        const incrementButton = buttons[0];

        if (incrementButton) {
            await user.click(incrementButton);
        }

        // Ререндерим с новым значением извне
        rerender(<Float {...defaultProps} value={20.75} />);

        input = screen.getByDisplayValue('20.75');
        await waitFor(() => {
            expect(input).toBeInTheDocument();
        });
    });

    it('должен увеличить значение при клике на кнопку увеличения', async () => {
        const user = userEvent.setup();
        render(<Float {...defaultProps} />);

        const buttons = screen.getAllByRole('button');
        const incrementButton = buttons[0];

        if (incrementButton) {
            await user.click(incrementButton);
        }

        await waitFor(() => {
            expect(mockOnChange).toHaveBeenCalledWith(42.51);
        });
    });

    it('должен уменьшить значение при клике на кнопку уменьшения', async () => {
        const user = userEvent.setup();
        render(<Float {...defaultProps} />);

        const buttons = screen.getAllByRole('button');

        const decrementButton = buttons[1];

        if (decrementButton) {
            await user.click(decrementButton);
        }

        await waitFor(() => {
            expect(mockOnChange).toHaveBeenCalledWith(42.49);
        });
    });

    it('должен игнорировать ввод символов в конце строки с двумя числами после запятой', async () => {
        const user = userEvent.setup();
        render(<Float {...defaultProps} />);

        const input = screen.getByPlaceholderText('Введите значение');

        await user.type(input, 'abc123');

        expect(input).toHaveValue('42.50');
    });

    it('должен корректно обрабатывать шаг изменения (step)', async () => {
        const user = userEvent.setup();
        render(<Float {...defaultProps} step={0.5} />);

        const buttons = screen.getAllByRole('button');
        const incrementButton = buttons[0];

        if (incrementButton) {
            await user.click(incrementButton);
        }

        await waitFor(() => {
            expect(mockOnChange).toHaveBeenCalledWith(43);
        });
    });

    it('должен корректно обрабатывать ввод с десятичной точкой', async () => {
        const user = userEvent.setup();
        render(<Float {...defaultProps} />);

        const input = screen.getByPlaceholderText('Введите значение');

        await user.clear(input);
        await user.type(input, '7.5');

        expect(input).toHaveValue('7.50');
        expect(mockOnChange).toHaveBeenCalledWith(7.5);
    });

    it('должен корректно обрабатывать отрицательные числа', async () => {
        const user = userEvent.setup();
        render(<Float {...defaultProps} value={-10.5} />);

        const input = screen.getByDisplayValue('-10.50');
        const buttons = screen.getAllByRole('button');
        const incrementButton = buttons[0];

        if (incrementButton) {
            await user.click(incrementButton);
        }

        await waitFor(() => {
            expect(input).toHaveValue('-10.49');
            expect(mockOnChange).toHaveBeenCalledWith(-10.49);
        });
    });

    it('должен корректно обрабатывать ввод с запятой как десятичным разделителем', async () => {
        const user = userEvent.setup();
        render(<Float {...defaultProps} />);

        const input = screen.getByPlaceholderText('Введите значение');

        await user.clear(input);
        await user.type(input, '12,5');

        expect(input).toHaveValue('12.50');
        expect(mockOnChange).toHaveBeenCalledWith(12.5);
    });
});
