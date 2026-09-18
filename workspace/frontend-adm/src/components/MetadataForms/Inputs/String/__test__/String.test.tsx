import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { String } from 'components/MetadataForms/Inputs/String';

// Мок для styles
jest.mock('../style.module.css', () => ({
    commonInputWrapper: 'commonInputWrapper',
}));

describe('String', () => {
    const mockOnChange = jest.fn();
    const mockOnClear = jest.fn();

    const defaultProps = {
        label: 'Тестовое поле',
        placeholder: 'Введите значение',
        value: 'test value',
        onChange: mockOnChange,
        onClear: mockOnClear,
        disabled: false,
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('должен отрендерить компонент с defaultProps', () => {
        render(<String {...defaultProps} />);

        expect(screen.getByPlaceholderText('Введите значение')).toBeInTheDocument();
        expect(screen.getByDisplayValue('test value')).toBeInTheDocument();
    });

    it('должен отрендерить кнопку удаления', () => {
        render(<String {...defaultProps} />);

        const buttons = screen.getAllByRole('button');
        expect(buttons[0]).toBeInTheDocument();
        expect(buttons[0]).toHaveTextContent('');
    });

    it('должен очистить значение при клике на кнопку удаления', async () => {
        const user = userEvent.setup();
        render(<String {...defaultProps} />);

        const input = screen.getByDisplayValue('test value');
        const buttons = screen.getAllByRole('button');

        await user.click(buttons[0]);

        await waitFor(() => {
            expect(input).toHaveValue('');
            expect(mockOnClear).toHaveBeenCalledTimes(1);
        });
    });

    it('должен обновить значение при вводе текста', async () => {
        const user = userEvent.setup();
        render(<String {...defaultProps} />);

        const input = screen.getByPlaceholderText('Введите значение');

        await user.type(input, ' new text');

        expect(input).toHaveValue('test value new text');
        expect(mockOnChange).toHaveBeenCalledWith('test value new text');
    });

    it('должен обновить значение при нажатии клавиши Delete или Backspace', async () => {
        const user = userEvent.setup();
        render(<String {...defaultProps} />);

        const input = screen.getByPlaceholderText('Введите значение');

        await user.clear(input);

        await waitFor(() => {
            expect(input).toHaveValue('');
            expect(mockOnChange).toHaveBeenCalledWith(null);
        });
    });

    it('должен отображать пустое значение props.value не передан или пустой', () => {
        render(<String {...defaultProps} value="" />);

        expect(screen.getByDisplayValue('')).toBeInTheDocument();
    });

    it('должен отображать null как пустое значение', () => {
        render(<String {...defaultProps} value={null} />);

        expect(screen.getByDisplayValue('')).toBeInTheDocument();
    });

    it('должен отображать disabled состояние', () => {
        render(<String {...defaultProps} disabled />);

        const input = screen.getByPlaceholderText('Введите значение');
        expect(input).toBeDisabled();
    });

    it('должен корректно обрабатывать изменение value извне (componentDidUpdate)', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<String {...defaultProps} value="initial" />);

        let input = screen.getByDisplayValue('initial');
        await user.type(input, ' updated');

        expect(mockOnChange).toHaveBeenCalledWith('initial updated');

        // Ререндерим с новым значением извне
        rerender(<String {...defaultProps} value="external" />);

        input = screen.getByDisplayValue('external');
        expect(input).toBeInTheDocument();
    });
});
