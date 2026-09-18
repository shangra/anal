import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Filter } from '..';

jest.mock('on-change', () => jest.fn());
// Мок для uuid
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid-123'),
}));

// Мок для windows.helper
const mockWindowsOpen = jest.fn();
const mockWindowsClose = jest.fn();
jest.mock('components/WindowsCMP/windows.helper.js', () => ({
    open: (...args: any[]) => mockWindowsOpen(...args),
    close: (...args: any[]) => mockWindowsClose(...args),
}));

// Мок для structuredClone
global.structuredClone = jest.fn((val) => JSON.parse(JSON.stringify(val)));

describe('Filter', () => {
    const mockDataManager = {
        formId: 'test-form-id',
        metaOwner: 'test-object',
    };

    const defaultProps = {
        DataManager: mockDataManager,
        description: 'Отбор и сортировка',
        title: 'Отбор и сортировка',
        type: 'icon',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders button with correct props', () => {
        render(<Filter {...defaultProps} />);
        const button = screen.getByTitle('Отбор и сортировка');
        expect(button).toBeInTheDocument();
    });

    describe.skip('transformFilters method', () => {
        // it('transforms ref object values in rules', () => {
        //     const component = new Filter(defaultProps);
        //     const filters = {
        //         rules: [{
        //             field: 'test',
        //             operator: '$eq',
        //             value: { value: '123', label: 'Test Label' }
        //         }]
        //     };

        //     const result = component.transformFilters(filters);
        //     expect(result.rules[0]).toEqual({
        //         field: 'test',
        //         operator: '$eq',
        //         value: '123',
        //         label: 'Test Label'
        //     });
        // });

        // it('transforms array of ref objects in rules', () => {
        //     const component = new Filter(defaultProps);
        //     const filters = {
        //         rules: [{
        //             field: 'test',
        //             operator: '$in',
        //             value: [
        //                 { value: '1', label: 'One' },
        //                 { value: '2', label: 'Two' }
        //             ]
        //         }]
        //     };

        //     const result = component.transformFilters(filters);
        //     expect(result.rules[0]).toEqual({
        //         field: 'test',
        //         operator: '$in',
        //         value: ['1', '2']
        //     });
        // });

        // it('returns null for invalid filters', () => {
        //     const component = new Filter(defaultProps);
        //     expect(component.transformFilters(null)).toBeNull();
        //     expect(component.transformFilters({})).toBeNull();
        //     expect(component.transformFilters({ rules: null })).toBeNull();
        // });
    });

    describe.skip('likeNotLikeTransform method', () => {
        // it('transforms $like and $notLike operator values', () => {
        //     const component = new Filter(defaultProps);
        //     const filters = {
        //         rules: [
        //             { field: 'test1', operator: '$like', value: 'search' },
        //             { field: 'test2', operator: '$notLike', value: 'exclude' }
        //         ]
        //     };

        //     component.likeNotLikeTransform(filters);
        //     expect(filters.rules[0].value).toBe('%search%');
        //     expect(filters.rules[1].value).toBe('%exclude%');
        // });
    });

    describe.skip('applyFilters method', () => {
        // it('applies filters when tempFilters exist', () => {
        //     const component = new Filter(defaultProps);

        //     // Мокаем все методы, которые вызываются внутри applyFilters
        //     component.transformFilters = jest.fn((filters) => filters);
        //     component.likeNotLikeTransform = jest.fn();

        //     // Мокаем setState
        //     const setStateMock = jest.fn();
        //     component.setState = setStateMock;

        //     component.state = {
        //         //@ts-ignore
        //         tempFilters: { rules: [] },
        //         fields: [],
        //         filters: null,
        //         type: 'icon'
        //     };

        //     component.applyFilters('test-uuid');

        //     expect(setStateMock).toHaveBeenCalledWith(
        //         { filters: { rules: [] } },
        //         expect.any(Function)
        //     );
        //     expect(mockWindowsClose).toHaveBeenCalledWith('test-uuid');
        // });

        // it('does nothing when tempFilters are null', () => {
        //     const component = new Filter(defaultProps);
        //     component.setState = jest.fn();
        //     component.state = {
        //         tempFilters: null,
        //         fields: [],
        //         filters: null,
        //         type: 'icon'
        //     };

        //     component.applyFilters('test-uuid');
        //     expect(component.setState).not.toHaveBeenCalled();
        //     expect(mockWindowsClose).not.toHaveBeenCalled();
        // });
    });

    it('shows error when DataManager is not provided', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const propsWithoutDataManager = {
            description: 'Test',
            title: 'Test',
        };

        render(<Filter {...propsWithoutDataManager} />);
        expect(consoleSpy).toHaveBeenCalledWith('Для работы компонента Filter обязателен параметр DataManager!');
        consoleSpy.mockRestore();
    });
});