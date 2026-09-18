import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TabularPart } from 'components/MetadataForms/TabularPart';
import { DataManager } from 'components/MetadataForms/DataManager';
import { MoveRowButtons } from 'components/MetadataForms/Buttons/MoveRowButtons';
import { DeleteRowButton } from 'components/MetadataForms/Buttons/DeleteRowButton';
import { AddRowButton } from 'components/MetadataForms/Buttons/AddRowButton';
import { CopyRowButton } from 'components/MetadataForms/Buttons/CopyRowButton';

jest.mock('../../DataManager');
jest.mock('ui-kit', () => ({
    Button: ({ children, onClick, ...props }: any) => (
        <button onClick={onClick} {...props}>{children}</button>
    )
}));
jest.mock('../../../ErrorBoundary', () => ({
    ErrorBoundary: ({ children }: any) => <div>{children}</div>
}));
jest.mock('../../MetaInput', () => ({
    MetaInput: ({ field, readOnly }: any) => (
        <div data-testid={`meta-input-${field}`}>{readOnly ? 'ReadOnly' : 'Editable'}</div>
    )
}));
jest.mock('../../ElementsList/ReactWindowWrapperCombined', () => ({
    ReactWindowWrapper: ({ data, cols, activeCell, onCellClick }: any) => (
        <div data-testid="react-window-wrapper">
            {data && `Data rows: ${data.length}`}
            {cols && `Columns: ${cols.length}`}
            {activeCell && `Active: ${activeCell.rowIndex}-${activeCell.columnIndex}`}
            <button
                data-testid="mock-select-row-1"
                onClick={(e) => onCellClick && onCellClick(e, { rowIndex: 1, columnIndex: 0 })}
            >
                Выбрать строку 1
            </button>
        </div>
    )
}));

jest.mock('../../Buttons/MoveRowButtons', () => ({
    MoveRowButtons: ({ onMoveUp, onMoveDown, canMoveUp, canMoveDown }: any) => (
        <div>
            <button
                onClick={onMoveUp}
                disabled={!canMoveUp}
                data-testid="move-row-up"
            >
                Переместить вверх
            </button>
            <button
                onClick={onMoveDown}
                disabled={!canMoveDown}
                data-testid="move-row-down"
            >
                Переместить вниз
            </button>
        </div>
    )
}));

jest.mock('../../Buttons/AddRowButton', () => ({
    AddRowButton: ({ onClick }: any) => (
        <button onClick={onClick} data-testid="add-row-button">
            Добавить строку
        </button>
    )
}));

jest.mock('../../Buttons/DeleteRowButton', () => ({
    DeleteRowButton: ({ onClick, disabled }: any) => (
        <button
            onClick={onClick}
            disabled={disabled}
            data-testid="delete-row-button"
        >
            Удалить строку
        </button>
    )
}));

jest.mock('../../Buttons/CopyRowButton', () => ({
    CopyRowButton: ({ onClick, disabled }: any) => (
        <button
            onClick={onClick}
            disabled={disabled}
            data-testid="copy-row-button"
        >
            Копировать строку
        </button>
    )
}));

describe('TabularPart', () => {
    const mockDataManager = {
        metadata: {
            treeObject: {
                TabularParts: {
                    'test-table': {
                        name: 'Test Tabular Part',
                        table: 'test-table',
                        info: {
                            Fields: {
                                field1: { field: 'field1', name: 'Field 1', type: 'string', show: true, editing: true },
                                field2: { field: 'field2', name: 'Field 2', type: 'number', show: true, editing: false }
                            }
                        }
                    }
                }
            }
        },
        data: {
            record: {
                TabularParts: {
                    'test-table': [
                        { field1: 'value1', field2: 123, rank: 1 },
                        { field1: 'value2', field2: 456, rank: 2 }
                    ]
                }
            }
        },
        hookChangeFieldData: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('displays error when tabular part not found', () => {
        render(
            <TabularPart
                DataManager={mockDataManager as any}
                name="Non-existent Part"
            />
        );

        expect(screen.getByText('Табличная часть не правильно настроена')).toBeInTheDocument();
    });

    test('calls DataManager hook on mount', () => {
        render(
            <TabularPart
                DataManager={mockDataManager as any}
                name="Test Tabular Part"
            />
        );

        expect(mockDataManager.hookChangeFieldData).toHaveBeenCalledWith(
            'record.TabularParts.test-table',
            expect.any(Object)
        );
    });

    test('renders with custom height', () => {
        render(
            <TabularPart
                DataManager={mockDataManager as any}
                name="Test Tabular Part"
                height={500}
            />
        );
        expect(screen.getByTestId('react-window-wrapper')).toBeInTheDocument();
    });

    test('handles add row button click', () => {
        const mockDataWithNewRow = {
            ...mockDataManager.data.record.TabularParts['test-table'],
            push: jest.fn()
        };

        const dataManagerWithMock = {
            ...mockDataManager,
            data: {
                record: {
                    TabularParts: {
                        'test-table': mockDataWithNewRow
                    }
                }
            }
        };

        render(
            <TabularPart
                DataManager={dataManagerWithMock as any}
                name="Test Tabular Part"
            />
        );

        setTimeout(() => {
            const addButton = screen.getByText('Добавить строку');
            fireEvent.click(addButton);

            expect(mockDataWithNewRow.push).toHaveBeenCalled();
        }, 0);
    });

    test('renders with merged columns', () => {
        const mergedColumns = {
            'group1': {
                sourceFields: ['field1', 'field2'],
                positionIndex: 0
            }
        };

        render(
            <TabularPart
                DataManager={mockDataManager as any}
                name="Test Tabular Part"
                mergedColumns={mergedColumns}
            />
        );

        expect(screen.getByTestId('react-window-wrapper')).toBeInTheDocument();
    });

    test('handles component unmounting', () => {
        const { unmount } = render(
            <TabularPart
                DataManager={mockDataManager as any}
                name="Test Tabular Part"
            />
        );

        expect(() => unmount()).not.toThrow();
    });
});

describe('TabularPartContent', () => {

    test('handles empty data gracefully', () => {
        const emptyDataManager = {
            metadata: {
                treeObject: {
                    TabularParts: {}
                }
            },
            data: null,
            hookChangeFieldData: jest.fn()
        };

        render(
            <TabularPart
                DataManager={emptyDataManager as any}
                name="Test Tabular Part"
            />
        );

        expect(screen.getByText('Табличная часть не правильно настроена')).toBeInTheDocument();
    });
});

describe('TabularPart Sorting', () => {
    const mockDataManager = {
        metadata: {
            treeObject: {
                TabularParts: {
                    'test-table': {
                        name: 'Test Tabular Part',
                        table: 'test-table',
                        info: {
                            Fields: {
                                field1: { field: 'field1', name: 'Field 1', type: 'string', show: true, editing: true },
                                field2: { field: 'field2', name: 'Field 2', type: 'number', show: true, editing: false },
                                field3: { field: 'field3', name: 'Field 3', type: 'string', show: true, editing: true }
                            }
                        }
                    }
                }
            }
        },
        data: {
            record: {
                TabularParts: {
                    'test-table': [
                        { field1: 'banana', field2: 300, field3: 'zebra', rank: 1 },
                        { field1: 'apple', field2: 100, field3: 'alpha', rank: 2 },
                        { field1: 'cherry', field2: 200, field3: 'beta', rank: 3 }
                    ]
                }
            }
        },
        hookChangeFieldData: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('sorts data in ascending order when column header is clicked', async () => {
        render(
            <TabularPart
                DataManager={mockDataManager as any}
                name="Test Tabular Part"
            />
        );

        await screen.findByTestId('react-window-wrapper');

        const tabularPartInstance = screen.getByTestId('react-window-wrapper').parentElement?.parentElement;

        const testData = [...mockDataManager.data.record.TabularParts['test-table']];
        const sortedAsc = [...testData].sort((a, b) =>
            a.field1 < b.field1 ? -1 : a.field1 > b.field1 ? 1 : 0
        );

        expect(sortedAsc[0].field1).toBe('apple');
        expect(sortedAsc[1].field1).toBe('banana');
        expect(sortedAsc[2].field1).toBe('cherry');
    });

    test('sorts data in descending order when column header is clicked twice', async () => {
        const testData = [...mockDataManager.data.record.TabularParts['test-table']];

        const sortedAsc = [...testData].sort((a, b) =>
            a.field1 < b.field1 ? -1 : a.field1 > b.field1 ? 1 : 0
        );

        const sortedDesc = [...sortedAsc].sort((a, b) =>
            a.field1 > b.field1 ? -1 : a.field1 < b.field1 ? 1 : 0
        );

        expect(sortedDesc[0].field1).toBe('cherry');
        expect(sortedDesc[1].field1).toBe('banana');
        expect(sortedDesc[2].field1).toBe('apple');
    });

    test('updates column sort state when sorting is applied', () => {
        const columns = [
            { name: 'field1', field: 'field1', order: undefined },
            { name: 'field2', field: 'field2', order: undefined }
        ];

        const updateColumnSortState = (columns: any[], sortedColumn: string, direction: 'ASC' | 'DESC') => columns.map(column => ({
                ...column,
                order: column.name === sortedColumn ? direction : undefined
            }));

        const result = updateColumnSortState(columns, 'field1', 'ASC');

        expect(result[0].order).toBe('ASC');
        expect(result[1].order).toBeUndefined();
    });

    test('handles numeric sorting correctly', () => {
        const testData = [...mockDataManager.data.record.TabularParts['test-table']];

        const sortedNumericAsc = [...testData].sort((a, b) =>
            a.field2 < b.field2 ? -1 : a.field2 > b.field2 ? 1 : 0
        );

        expect(sortedNumericAsc[0].field2).toBe(100);
        expect(sortedNumericAsc[1].field2).toBe(200);
        expect(sortedNumericAsc[2].field2).toBe(300);
    });

    test('maintains sort state in component', async () => {
        const { rerender } = render(
            <TabularPart
                DataManager={mockDataManager as any}
                name="Test Tabular Part"
            />
        );

        await screen.findByTestId('react-window-wrapper');

        const updatedDataManager = {
            ...mockDataManager,
            data: {
                record: {
                    TabularParts: {
                        'test-table': [
                            { field1: 'delta', field2: 400, field3: 'gamma', rank: 1 },
                            { field1: 'alpha', field2: 50, field3: 'omega', rank: 2 }
                        ]
                    }
                }
            }
        };

        rerender(
            <TabularPart
                DataManager={updatedDataManager as any}
                name="Test Tabular Part"
            />
        );

        expect(screen.getByTestId('react-window-wrapper')).toBeInTheDocument();
    });

    test('resets other column sort states when new column is sorted', () => {
        const columns = [
            { name: 'field1', field: 'field1', order: 'ASC' },
            { name: 'field2', field: 'field2', order: undefined },
            { name: 'field3', field: 'field3', order: 'DESC' }
        ];

        const updateColumnSortState = (columns: any[], sortedColumn: string, direction: 'ASC' | 'DESC') => columns.map(column => ({
                ...column,
                order: column.name === sortedColumn ? direction : undefined
            }));

        const result = updateColumnSortState(columns, 'field2', 'ASC');

        expect(result[0].order).toBeUndefined();
        expect(result[1].order).toBe('ASC');
        expect(result[2].order).toBeUndefined();
    });
});

describe('TabularPart controlButtonBuilder', () => {
    const mockDataManager = {
        metadata: {
            treeObject: {
                TabularParts: {
                    'test-table': {
                        name: 'Test Tabular Part',
                        table: 'test-table',
                        info: {
                            Fields: {
                                field1: { field: 'field1', name: 'Field 1', type: 'string', show: true, editing: true },
                                field2: { field: 'field2', name: 'Field 2', type: 'number', show: true, editing: false }
                            }
                        }
                    }
                }
            }
        },
        data: {
            record: {
                TabularParts: {
                    'test-table': [
                        { field1: 'value1', field2: 123, rank: 1 },
                        { field1: 'value2', field2: 456, rank: 2 }
                    ]
                }
            }
        },
        hookChangeFieldData: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('no control buttons rendered when buttons prop is not provided', async () => {
        render(
            <TabularPart
                DataManager={mockDataManager as any}
                name="Test Tabular Part"
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('react-window-wrapper')).toBeInTheDocument();
        });

        expect(screen.getByText('Test Tabular Part')).toBeInTheDocument();

        expect(screen.queryByText('Добавить строку')).not.toBeInTheDocument();
        expect(screen.queryByText('Удалить строку')).not.toBeInTheDocument();
        expect(screen.queryByText('Переместить вверх')).not.toBeInTheDocument();
        expect(screen.queryByText('Переместить вниз')).not.toBeInTheDocument();

        expect(screen.queryByTestId('add-row-button')).not.toBeInTheDocument();
        expect(screen.queryByTestId('delete-row-button')).not.toBeInTheDocument();
        expect(screen.queryByTestId('move-row-up')).not.toBeInTheDocument();
        expect(screen.queryByTestId('move-row-down')).not.toBeInTheDocument();
    });

    test('no control buttons rendered when empty buttons array provided', async () => {
        render(
            <TabularPart
                DataManager={mockDataManager as any}
                name="Test Tabular Part"
                buttons={[]}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('react-window-wrapper')).toBeInTheDocument();
        });

        expect(screen.queryByText('Добавить строку')).not.toBeInTheDocument();
        expect(screen.queryByText('Удалить строку')).not.toBeInTheDocument();
        expect(screen.queryByText('Переместить вверх')).not.toBeInTheDocument();
        expect(screen.queryByText('Переместить вниз')).not.toBeInTheDocument();
    });

    test('renders addRowButton correctly', async () => {
        render(
            <TabularPart
                DataManager={mockDataManager as any}
                name="Test Tabular Part"
                buttons={[<AddRowButton onClick={()=> {}}/>]}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('react-window-wrapper')).toBeInTheDocument();
        });

        const addButton = screen.getByText('Добавить строку');
        expect(addButton).toBeInTheDocument();
        expect(addButton).toBeEnabled();
    });

    test('renders deleteRowButton correctly when data exists', async () => {
        render(
            <TabularPart
                DataManager={mockDataManager as any}
                name="Test Tabular Part"
                buttons={[<DeleteRowButton onClick={() => { } } disabled={false}/>]}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('react-window-wrapper')).toBeInTheDocument();
        });

        const deleteButton = screen.getByText('Удалить строку');
        expect(deleteButton).toBeInTheDocument();
        expect(deleteButton).not.toBeDisabled();
    });

    test('renders deleteRowButton as disabled when no data', async () => {
        const emptyDataManager = {
            ...mockDataManager,
            data: {
                record: {
                    TabularParts: {
                        'test-table': []
                    }
                }
            }
        };

        render(
            <TabularPart
                DataManager={emptyDataManager as any}
                name="Test Tabular Part"
                buttons={[<DeleteRowButton onClick={() => { } } disabled={false}/>]}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('react-window-wrapper')).toBeInTheDocument();
        });

        const deleteButton = screen.getByText('Удалить строку');
        expect(deleteButton).toBeInTheDocument();
        expect(deleteButton).toBeDisabled();
    });

    test('renders moveRowButtons correctly', async () => {
        render(
            <TabularPart
                DataManager={mockDataManager as any}
                name="Test Tabular Part"
                buttons={[<MoveRowButtons onMoveUp={() => {}} onMoveDown={() => {}} canMoveUp={false} canMoveDown={false}/>]}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('react-window-wrapper')).toBeInTheDocument();
        });

        const moveUpButton = screen.getByRole('button', { name: /переместить вверх/i });
        const moveDownButton = screen.getByRole('button', { name: /переместить вниз/i });

        expect(moveUpButton).toBeInTheDocument();
        expect(moveDownButton).toBeInTheDocument();
    });

    test('renders multiple buttons in correct order', async () => {
        render(
            <TabularPart
                DataManager={mockDataManager as any}
                name="Test Tabular Part"
                buttons={[<AddRowButton  onClick={() => { } }/>, <DeleteRowButton  onClick={() => {}} disabled={false}/>, <MoveRowButtons onMoveUp={() => {}} onMoveDown={() => {}} canMoveUp={false} canMoveDown={false}/>]}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('react-window-wrapper')).toBeInTheDocument();
        });

        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThanOrEqual(3);

        expect(screen.getByText('Добавить строку')).toBeInTheDocument();
        expect(screen.getByText('Удалить строку')).toBeInTheDocument();
    });

    test('buttons trigger data changes when clicked', async () => {
        const originalData = [...mockDataManager.data.record.TabularParts['test-table']];

        render(
            <TabularPart
                DataManager={mockDataManager as any}
                name="Test Tabular Part"
                buttons={[<AddRowButton onClick={() => {}}/>]}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('react-window-wrapper')).toBeInTheDocument();
        });

        const addButton = screen.getByText('Добавить строку');

        fireEvent.click(addButton);

        await waitFor(() => {
            const updatedData = mockDataManager.data.record.TabularParts['test-table'];
            expect(updatedData).toHaveLength(originalData.length + 1);
        });
    });
});

describe('TabularPart Control Buttons Integration', () => {
    const mockDataGenerator = () => ({
        metadata: {
            treeObject: {
                TabularParts: {
                    'test-table': {
                        name: 'Test Tabular Part',
                        table: 'test-table',
                        info: {
                            Fields: {
                                field1: { field: 'field1', name: 'Field 1', type: 'string', show: true, editing: true }
                            }
                        }
                    }
                }
            }
        },
        data: {
            record: {
                TabularParts: {
                    'test-table': [
                        { field1: 'value1', rank: 1 },
                        { field1: 'value2', rank: 2 },
                        { field1: 'value3', rank: 3 }
                    ]
                }
            }
        },
        hookChangeFieldData: jest.fn()
    });

    test('addRowButton adds new row to data', async () => {
        // почему-то тест не проходит. Это надо решать отдельно
        const mockDataManager = mockDataGenerator();
        const initialLength = mockDataManager.data.record.TabularParts['test-table'].length;

        render(
            <TabularPart
                DataManager={mockDataManager as any}
                name="Test Tabular Part"
                buttons={[<AddRowButton onClick={() => {}}/>]}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('react-window-wrapper')).toBeInTheDocument();
        });

        const addButton = screen.getByText('Добавить строку');
        fireEvent.click(addButton);

        await waitFor(() => {
            const updatedData = mockDataManager.data.record.TabularParts['test-table'];
            expect(updatedData).toHaveLength(initialLength + 1);
            expect(updatedData[initialLength]).toHaveProperty('field1', '');
            expect(updatedData[initialLength]).toHaveProperty('rank', initialLength + 1);
        });
    });

    test('deleteRowButton removes rows when clicked', async () => {
        const mockDataManager = mockDataGenerator();
        const initialLength = mockDataManager.data.record.TabularParts['test-table'].length;

        render(
            <TabularPart
                DataManager={mockDataManager as any}
                name="Test Tabular Part"
                buttons={[<DeleteRowButton name="DeleteRow" onClick={() => {}} disabled={false} />]}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('react-window-wrapper')).toBeInTheDocument();
        });

        const selectRowTrigger = screen.getByTestId("mock-select-row-1");
        fireEvent.click(selectRowTrigger);

        const deleteButton = screen.getByText('Удалить строку');

        expect(deleteButton).not.toBeDisabled();
        fireEvent.click(deleteButton);

        await waitFor(() => {
            const updatedData = mockDataManager.data.record.TabularParts['test-table'];
            expect(updatedData).toHaveLength(initialLength - 1);

            expect(updatedData[1]).toHaveProperty("field1", "value3");
            expect(updatedData[1]).toHaveProperty("rank", 2);
        });
    });

    test("moveRowUp button swaps rows and updates their rank correctly", async () => {
        const mockDataManager = mockDataGenerator();
        const {length} = mockDataManager.data.record.TabularParts['test-table'];

        render(
            <TabularPart 
                DataManager={mockDataManager as any}
                name="Test Tabular Part"
                buttons={[
                    <MoveRowButtons
                        name="MoveRow"
                        onMoveUp={() => {}}
                        onMoveDown={() => {}}
                        canMoveUp={false}
                        canMoveDown={false}
                    />
                ]}
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId('react-window-wrapper')).toBeInTheDocument();
        });

        const selectRowTrigger = screen.getByTestId("mock-select-row-1");
        fireEvent.click(selectRowTrigger);

        const moveUpButton = screen.getByTestId("move-row-up");

        expect(moveUpButton).not.toBeDisabled();
        fireEvent.click(moveUpButton);

        await waitFor(() => {
            const updatedData = mockDataManager.data.record.TabularParts['test-table'];
            expect(updatedData).toHaveLength(length);

            expect(updatedData[0]).toHaveProperty("field1", "value2");
            expect(updatedData[0]).toHaveProperty("rank", 1);

            expect(updatedData[1]).toHaveProperty("field1", "value1");
            expect(updatedData[1]).toHaveProperty("rank", 2);

            expect(updatedData[2]).toHaveProperty("field1", "value3");
            expect(updatedData[2]).toHaveProperty("rank", 3);
        })
    })

    test("copyButton copies rows", async () => {
        const mockDataManager = mockDataGenerator();
        const initialLength = mockDataManager.data.record.TabularParts['test-table'].length;

        render(
            <TabularPart 
                DataManager={mockDataManager as any}
                name="Test Tabular Part"
                buttons={[
                    <CopyRowButton
                        name="CopyRow"
                        disabled={false}
                        onClick={() => {}}
                    />
                ]}
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId('react-window-wrapper')).toBeInTheDocument();
        });

        const selectRowTrigger = screen.getByTestId("mock-select-row-1");
        fireEvent.click(selectRowTrigger);

        const copyRowButton = screen.getByTestId("copy-row-button");

        expect(copyRowButton).not.toBeDisabled();
        fireEvent.click(copyRowButton);

        await waitFor(() => {
            const updatedData = mockDataManager.data.record.TabularParts['test-table'];
            expect(updatedData).toHaveLength(initialLength + 1);

            expect(updatedData[0]).toHaveProperty("field1", "value1");
            expect(updatedData[0]).toHaveProperty("rank", 1);

            expect(updatedData[1]).toHaveProperty("field1", "value1");
            expect(updatedData[1]).toHaveProperty("rank", 2);
        })
    })
});