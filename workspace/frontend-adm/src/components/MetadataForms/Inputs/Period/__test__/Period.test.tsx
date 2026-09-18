import React, { Component } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { convertPeriodToHumanReadable } from 'components/MetadataForms/Inputs/Period/autocode';
import { extractActualValue } from 'components/MetadataForms/Inputs/Period/utils';
import { Period } from 'components/MetadataForms/Inputs/Period';

jest.mock('../autocode', () => ({
    convertPeriodToHumanReadable: jest.fn(),
}));

jest.mock('../utils', () => ({
    extractActualValue: jest.fn(),
}));

const mockOnChange = jest.fn();
const defaultProps = {
    value: 'M=1',
    onChange: mockOnChange,
} as any;

beforeEach(() => {
    jest.clearAllMocks();
});

it('должен отрендерить компонент с defaultProps', () => {
    (convertPeriodToHumanReadable as jest.Mock).mockReturnValue('Этот месяц');
    (extractActualValue as jest.Mock).mockReturnValue('M=1');

    render(<Period {...defaultProps} />);
    expect(screen.getByPlaceholderText('Выберите диапазон')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Этот месяц')).toBeInTheDocument();
});

it('должен отрендерить кнопку удаления', () => {
    render(<Period {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeInTheDocument();
    expect(buttons[0]).toHaveTextContent('');
});

it('должен корректно обрабатывать изменение value извне (componentDidUpdate)', async () => {
    (convertPeriodToHumanReadable as jest.Mock)
        .mockReturnValueOnce('Этот месяц')
        .mockReturnValueOnce('Прошлая неделя');
    (extractActualValue as jest.Mock)
        .mockReturnValueOnce('M=1')
        .mockReturnValueOnce('W-1');

    const { rerender } = render(<Period {...defaultProps} />);

    rerender(<Period {...defaultProps} value="W-1" />);

    await waitFor(() => {
        expect(screen.getByPlaceholderText('Выберите диапазон')).toHaveValue('Прошлая неделя');
    });
});

it('должен очистить значение при клике на кнопку удаления', async () => {
    (convertPeriodToHumanReadable as jest.Mock).mockReturnValue('Этот месяц');
    (extractActualValue as jest.Mock).mockReturnValue('M=1');

    render(<Period {...defaultProps} />);

    const input = screen.getByPlaceholderText('Выберите диапазон');
    const buttons = screen.getAllByRole('button');

    await userEvent.click(buttons[1]);

    await waitFor(() => {
        expect(input).toHaveValue('');
    });
});