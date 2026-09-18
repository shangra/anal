import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimePicker } from 'components/MetadataForms/Inputs/DateTime/components/TimePicker/TimePicker';



const defaultProps = {
    value: { hours: '12', minutes: '30' },
    placeholder: 'ЧЧ:MM',
    testId: 'timepicker',
} as any;

beforeEach(() => {
    jest.clearAllMocks();
});

it('должен отрендерить компонент с defaultProps', () => {
    render(<TimePicker {...defaultProps} />);

    expect(screen.getByPlaceholderText('ЧЧ:MM')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12:30')).toBeInTheDocument();
});

it('должен отобразить правильное начальное значение времени', () => {
    render(<TimePicker {...defaultProps} value={{ hours: '5', minutes: '7' }} />);

    expect(screen.getByDisplayValue('05:07')).toBeInTheDocument();
});

it('должен отобразить 00:00 при пустом значении', () => {
    render(<TimePicker {...defaultProps} value={{ hours: '0', minutes: '0' }} />);

    expect(screen.getByDisplayValue('00:00')).toBeInTheDocument();
});

it('должен отображать disabled состояние', () => {
    render(<TimePicker {...defaultProps} disabled />);

    const input = screen.getByPlaceholderText('ЧЧ:MM');
    expect(input).toBeDisabled();
});

it('должен отображать readOnly состояние', () => {
    render(<TimePicker {...defaultProps} readOnly />);

    const input = screen.getByPlaceholderText('ЧЧ:MM');
    expect(input).toHaveAttribute('readOnly');
});

it('должен использовать переданный placeholder', () => {
    render(<TimePicker {...defaultProps} placeholder="Выберите время" />);

    expect(screen.getByPlaceholderText('Выберите время')).toBeInTheDocument();
});
