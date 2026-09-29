import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Select } from '../index';

// Мок для css-модулей
jest.mock('../style.module.css', () => ({
    selectCustom: 'selectCustom',
    commonInputReset: 'commonInputReset',
}));

jest.mock('../../style.module.css', () => ({
    commonInputWrapper: 'commonInputWrapper',
}));

jest.mock('../../../CommonInput/styles.module.css', () => ({
    commonInputWrapper: 'commonInputWrapper',
    commonInputWrapperFullWidth: 'commonInputWrapperFullWidth',
    commonInputCustom: 'commonInputCustom',
    commonInputButton: 'commonInputButton',
}));

jest.mock('../../../../CommonInput/icons/CloseIcon', () => ({
    CloseIcon: () => <svg data-testid='close-icon' />,
}));

jest.mock('../../../../CommonInput/icons/DropDownIcon', () => ({
    DropDownIcon: () => <svg data-testid='dropdown-icon' />,
}));

// Мок для ui-kit Popover и List — Popover рендерит контент только если opened=true
jest.mock('ui-kit', () => {
    const actual = jest.requireActual('ui-kit');
    return {
        ...actual,
        Popover: ({ children, content, opened }: any) => (
            <div data-testid='popover'>
                {children}
                {opened && <div data-testid='popover-content'>{content}</div>}
            </div>
        ),
        List: ({ options, onChange, value }: any) => (
            <div data-testid='list'>
                {options.map((opt: { value: string; label: string }) => (
                    <div
                        key={opt.value}
                        data-testid={`list-item-${opt.value}`}
                        onClick={() => onChange?.([opt.value])}
                    >
                        {opt.label}
                    </div>
                ))}
            </div>
        ),
    };
});

describe('Select', () => {
    const mockOnChange = jest.fn();
    const mockOnClear = jest.fn();

    const options = [
        { value: '1', label: 'Вариант 1' },
        { value: '2', label: 'Вариант 2' },
        { value: '3', label: 'Вариант 3' },
    ];

    const defaultProps = {
        label: 'Тестовое поле',
        placeholder: 'Выберите значение',
        value: '1',
        options,
        onChange: mockOnChange,
        onClear: mockOnClear,
        disabled: false,
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('должен отрендерить компонент с defaultProps', () => {
        render(<Select {...defaultProps} />);

        // проверка, что Popover есть
        expect(screen.getByTestId('popover')).toBeInTheDocument();
        // placeholder не виден так как есть выбранное значение
        // в инпуте должен быть текст "Вариант 1"
        expect(screen.getByText('Вариант 1')).toBeInTheDocument();
    });

    it('должен отрендерить кнопку удаления', () => {
        render(<Select {...defaultProps} />);

        const deleteButton =
            screen.getByTestId('dropdown-icon')?.closest('button') ||
            screen.getAllByRole('button')[0];
        expect(deleteButton).toBeInTheDocument();
    });

    it('должен вызывать onClear при клике на кнопку удаления', async () => {
        const user = userEvent.setup();
        render(<Select {...defaultProps} />);

        const buttons = screen.getAllByRole('button');
        // кнопка удаления — последняя
        const deleteButton = buttons[buttons.length - 1];

        await user.click(deleteButton);

        await waitFor(() => {
            expect(mockOnClear).toHaveBeenCalled();
        });
    });

    it('должен открывать/закрывать выпадающий список при клике на кнопку select', async () => {
        const user = userEvent.setup();
        render(<Select {...defaultProps} />);

        // контент попапа не должен быть виден изначально
        expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument();

        // кнопка select (с иконкой DropDownIcon)
        const selectButton = screen
            .getByTestId('dropdown-icon')
            .closest('button')!;

        // клик — открываем
        await user.click(selectButton);
        // После клика по кнопке select открывается Popover
        expect(screen.getByTestId('popover-content')).toBeInTheDocument();
    });

    it('должен вызывать onChange при выборе опции', async () => {
        const user = userEvent.setup();
        render(<Select {...defaultProps} />);

        const selectButton = screen
            .getByTestId('dropdown-icon')
            .closest('button')!;
        await user.click(selectButton);

        // после открытия Popover контент доступен
        const option2 = screen.getByTestId('list-item-2');
        await user.click(option2);

        await waitFor(() => {
            expect(mockOnChange).toHaveBeenCalledWith('2');
        });
    });

    it('должен синхронизироваться при изменении props.value извне', () => {
        const { rerender } = render(<Select {...defaultProps} value='1' />);
        expect(screen.getByText('Вариант 1')).toBeInTheDocument();

        rerender(<Select {...defaultProps} value='2' />);
        expect(screen.getByText('Вариант 2')).toBeInTheDocument();
    });

    it('должен рендерить все опции в выпадающем списке', async () => {
        const user = userEvent.setup();
        render(<Select {...defaultProps} />);

        const selectButton = screen
            .getByTestId('dropdown-icon')
            .closest('button')!;
        await user.click(selectButton);

        expect(screen.getByTestId('list-item-1')).toBeInTheDocument();
        expect(screen.getByTestId('list-item-2')).toBeInTheDocument();
        expect(screen.getByTestId('list-item-3')).toBeInTheDocument();
    });
});
