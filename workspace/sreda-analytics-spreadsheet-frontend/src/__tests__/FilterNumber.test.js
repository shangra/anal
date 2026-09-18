import '@testing-library/jest-dom';

import { configure, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { FilterNumber } from '../components/FilterNumber'; // Предполагаемый путь к вашему компоненту

configure({
    testIdAttribute: 'data-test-id',
});

describe('Числовой фильтр', () => {
    const mockDeleteFilter = jest.fn();

    beforeEach(() => {
        mockDeleteFilter.mockClear();
    });

    test('Удаление корректного элемента', async () => {
        render(
            <FilterNumber deleteFilter={mockDeleteFilter} isFirst={false} onSelectFilter={() => {}} container={{ id: 123 }} />,
        );

        const deleteButton = await screen.findByTestId('delete-icon');

        fireEvent.click(deleteButton);

        expect(mockDeleteFilter).toHaveBeenCalledTimes(1);

        expect(mockDeleteFilter).toHaveBeenCalledWith(123);
    });

    test('Наличе селекта И и ИЛИ', async () => {
        render(
            <FilterNumber deleteFilter={mockDeleteFilter} isFirst={false} onSelectFilter={() => {}} container={{ id: 123 }} />,
        );

        const select = await screen.findByTestId('orAndSelect');

        expect(select).toBeInTheDocument();
    });

    test('Ввод дробных значений для number', async () => {
        render(
            <FilterNumber
                type="number"
                deleteFilter={mockDeleteFilter}
                isFirst={false}
                onSelectFilter={() => {}}
                container={{ id: 123 }}
            />,
        );

        const input = await screen.findByTestId('input-input');

        fireEvent.change(input, { target: { value: '9,5' } });

        expect(input.value).toBe('');
    });

    test('Ввод дробных значений для float', async () => {
        render(
            <FilterNumber
                type="float"
                deleteFilter={mockDeleteFilter}
                isFirst={false}
                onSelectFilter={() => {}}
                container={{ id: 123 }}
            />,
        );

        const input = await screen.findByTestId('input-input');

        fireEvent.change(input, { target: { value: '9,5' } });

        expect(input.value).toBe('9.5');
    });
});
