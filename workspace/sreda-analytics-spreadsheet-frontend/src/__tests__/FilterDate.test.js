import '@testing-library/jest-dom';

import { configure, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { FilterDate } from '../components/FilterDate'; // Предполагаемый путь к вашему компоненту

configure({
    testIdAttribute: 'data-test-id',
});

describe('Календарный фильтр', () => {
    const mockDeleteFilter = jest.fn();

    beforeEach(() => {
        mockDeleteFilter.mockClear();
    });

    test('Удаление корректного элемента', async () => {
        render(
            <FilterDate deleteFilter={mockDeleteFilter} isFirst={false} onSelectFilter={() => {}} container={{ id: 123 }} />,
        );

        const deleteButton = await screen.findByTestId('delete-icon');

        fireEvent.click(deleteButton);

        expect(mockDeleteFilter).toHaveBeenCalledTimes(1);

        expect(mockDeleteFilter).toHaveBeenCalledWith(123);
    });

    test('Наличе селекта И и ИЛИ', async () => {
        render(
            <FilterDate deleteFilter={mockDeleteFilter} isFirst={false} onSelectFilter={() => {}} container={{ id: 123 }} />,
        );

        const select = await screen.findByTestId('orAndSelect');

        expect(select).toBeInTheDocument();
    });

    test('Открытие поповера с календарем', async () => {
        render(
            <FilterDate deleteFilter={mockDeleteFilter} isFirst={false} onSelectFilter={() => {}} container={{ id: 123 }} />,
        );

        const input = await screen.findByTestId('datepicker-input-input');

        fireEvent.click(input);

        const calendar = await screen.findByTestId('datepicker-popper-open');

        expect(calendar).toBeInTheDocument();
    });
});
