import '@testing-library/jest-dom';

import { configure, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { FilterString } from '../components/FilterString'; // Предполагаемый путь к вашему компоненту

configure({
    testIdAttribute: 'data-test-id',
});

describe('Строковый фильтр', () => {
    const mockDeleteFilter = jest.fn();

    beforeEach(() => {
        mockDeleteFilter.mockClear();
    });

    test('Удаление корректного элемента', async () => {
        render(
            <FilterString deleteFilter={mockDeleteFilter} isFirst={false} onSelectFilter={() => {}} container={{ id: 123 }} />,
        );

        const deleteButton = await screen.findByTestId('delete-icon');

        fireEvent.click(deleteButton);

        expect(mockDeleteFilter).toHaveBeenCalledTimes(1);

        expect(mockDeleteFilter).toHaveBeenCalledWith(123);
    });

    test('Наличе селекта И и ИЛИ', async () => {
        render(
            <FilterString deleteFilter={mockDeleteFilter} isFirst={false} onSelectFilter={() => {}} container={{ id: 123 }} />,
        );

        const select = await screen.findByTestId('orAndSelect');

        expect(select).toBeInTheDocument();
    });

    test('Ввод значений', async () => {
        render(
            <FilterString deleteFilter={mockDeleteFilter} isFirst={false} onSelectFilter={() => {}} container={{ id: 123 }} />,
        );

        const input = await screen.findByTestId('input-input');

        fireEvent.change(input, { target: { value: 'asd' } });

        expect(input.value).toBe('asd');
    });
});
