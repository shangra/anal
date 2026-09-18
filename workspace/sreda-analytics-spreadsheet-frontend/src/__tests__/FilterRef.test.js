import '@testing-library/jest-dom';

import { configure, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { FilterRef } from '../components/FilterRef';

configure({
    testIdAttribute: 'data-test-id',
});

describe('Иерархичный фильтр', () => {
    const mockDeleteFilter = jest.fn();

    beforeEach(() => {
        mockDeleteFilter.mockClear();
    });

    test('Удаление корректного элемента', async () => {
        render(<FilterRef deleteFilter={mockDeleteFilter} onSelectFilter={() => {}} container={{ id: 123, items: [] }} />);

        const deleteButton = await screen.findByTestId('delete-icon');

        fireEvent.click(deleteButton);

        expect(mockDeleteFilter).toHaveBeenCalledTimes(1);

        expect(mockDeleteFilter).toHaveBeenCalledWith(123);
    });
});
