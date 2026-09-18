import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BooleanInput } from 'components/MetadataForms/Inputs/BooleanInput';

// Мок для styles
jest.mock('../../style.module.css', () => ({
    commonInputWrapper: 'commonInputWrapper',
}));

describe('BooleanInput', () => {
    const mockOnChange = jest.fn();
    const mockOnClear = jest.fn();

    const defaultProps = {
        label: 'Тестовое поле',
        placeholder: 'Выберите значение',
        value: true,
        onChange: mockOnChange,
        onClear: mockOnClear,
        disabled: false,
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('должен отрендерить компонент с defaultProps (value=true)', () => {
        render(<BooleanInput {...defaultProps} />);

        expect(screen.getByDisplayValue('Да')).toBeInTheDocument();
    });

    it('должен отрендерить компонент с value=false', () => {
        render(<BooleanInput {...defaultProps} value={false} />);

        expect(screen.getByDisplayValue('Нет')).toBeInTheDocument();
    });

    it('должен отрендерить компонент с value=null', () => {
        render(<BooleanInput {...defaultProps} value={null} />);

        expect(screen.getByDisplayValue('Не определено')).toBeInTheDocument();
    });

    it('должен изменить значение на true при выборе "Да"', async () => {
        const user = userEvent.setup();
        render(<BooleanInput {...defaultProps} value={false} />);

        const dropdownButton = screen.getAllByRole('button');

        await user.click(dropdownButton[0]);

        const yesOption = screen.getByText('Да');
        await user.click(yesOption);

        await waitFor(() => {
            expect(screen.getByDisplayValue('Да')).toBeInTheDocument();
            expect(mockOnChange).toHaveBeenCalledWith(true);
        });
    });

    it('должен изменить значение на false при выборе "Нет"', async () => {
        const user = userEvent.setup();
        render(<BooleanInput {...defaultProps} value />);

        const dropdownButton = screen.getAllByRole('button');
        await user.click(dropdownButton[0]);

        const noOption = screen.getByText('Нет');
        await user.click(noOption);

        await waitFor(() => {
            expect(screen.getByDisplayValue('Нет')).toBeInTheDocument();
            expect(mockOnChange).toHaveBeenCalledWith(false);
        });
    });

    it('должен изменить значение на null при выборе "Не определено"', async () => {
        const user = userEvent.setup();
        render(<BooleanInput {...defaultProps} value />);

        const dropdownButton = screen.getAllByRole('button');
        await user.click(dropdownButton[0]);

        const undefinedOption = screen.getByText('Не определено');
        await user.click(undefinedOption);

        await waitFor(() => {
            expect(screen.getByDisplayValue('Не определено')).toBeInTheDocument();
            expect(mockOnChange).toHaveBeenCalledWith(null);
        });
    });

    it('должен очистить значение при клике на кнопку удаления', async () => {
        const user = userEvent.setup();
        render(<BooleanInput {...defaultProps} />);

        const buttons = screen.getAllByRole('button');

        const deleteButton = buttons[1];

        await user.click(deleteButton);

        await waitFor(() => {
            expect(screen.getByDisplayValue('Не определено')).toBeInTheDocument();
            expect(mockOnChange).toHaveBeenCalledWith(null);
        });
    });

    it('должен отображать disabled состояние', () => {
        render(<BooleanInput {...defaultProps} disabled />);

        const dropdownButton = screen.getAllByRole('button');
        expect(dropdownButton[1]).toBeDisabled();
    });

    it('должен корректно обрабатывать изменение value извне (componentDidUpdate)', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<BooleanInput {...defaultProps} value />);

        let dropdownButton = screen.getAllByRole('button');
        await user.click(dropdownButton[0]);

        const yesOption = screen.getByText('Да');
        await user.click(yesOption);

        expect(mockOnChange).toHaveBeenCalledWith(true);

        // Ререндерим с новым значением извне
        rerender(<BooleanInput {...defaultProps} value={false} />);

        dropdownButton = screen.getAllByRole('button');
        await user.click(dropdownButton[0]);
        await waitFor(() => {
            expect(screen.getByDisplayValue('Нет')).toBeInTheDocument();
        });
    });

    it('должен отображать пустое значение при отсутствии props.value', async () => {
        render(<BooleanInput {...defaultProps} value={undefined} />);
        const user = userEvent.setup();
        const buttons = screen.getAllByRole('button');
        await user.click(buttons[0]);

        expect(screen.getByDisplayValue('Не определено')).toBeInTheDocument();
    });
});
