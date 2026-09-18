import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ElementsList } from 'components/MetadataForms/ElementsList';


jest.mock('../../DataManager', () => ({
    DataManager: jest.fn(() => ({
        metadata: {
            manifest: {
                settings: {}
            }
        },
        hookChangeFieldData: jest.fn(),
        options: {},
        formId: 'test-form',
        modalUUID: 'test-modal'
    }))
}));


jest.mock('../../../ErrorBoundary', () => ({
    ErrorBoundary: ({ children }: any) => <div>{children}</div>
}));

jest.mock('../ReactWindowWrapperCombined/index', () => ({
    ReactWindowWrapper: () => <div data-testid="table">Table Content</div>
}));

jest.mock('../../MetaInput', () => ({
    MetaInput: () => <div>MetaInput</div>
}));

jest.mock('../../Buttons/Edit/edit.helper', () => ({
    createEditForm: jest.fn()
}));

jest.mock('components/WindowsCMP/windows.helper', () => ({
    open: jest.fn()
}));

describe('ElementsList', () => {
    const mockProps = {
        DataManager: {
            metadata: {
                manifest: {
                    settings: {}
                }
            },
            hookChangeFieldData: jest.fn(),
            options: {},
            formId: 'test-form',
            modalUUID: 'test-modal'
        },
        data: {
            cols: [
                { field: 'id', name: 'ID', show: true },
                { field: 'name', name: 'Name', show: true }
            ],
            rows: [
                { id: '1', name: 'Item 1' },
                { id: '2', name: 'Item 2' }
            ],
            refs: {},
            count: 2
        },
        tableId: 'test-table',
        width: 800,
        height: 400,
        name: 'Test List'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('handles empty data', () => {
        const propsWithEmptyData = {
            ...mockProps,
            data: null
        };
        // @ts-ignore
        render(<ElementsList {...propsWithEmptyData} />);

        expect(screen.queryByTestId('table')).not.toBeInTheDocument();
    });

    test('calls DataManager hook', () => {
        // @ts-ignore
        render(<ElementsList {...mockProps} />);

        expect(mockProps.DataManager.hookChangeFieldData).toHaveBeenCalledWith(
            'Test List',
            expect.any(Object)
        );
    });
});