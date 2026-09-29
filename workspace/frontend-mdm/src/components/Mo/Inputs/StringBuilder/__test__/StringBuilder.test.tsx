import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { StringBuilder } from '../index';

jest.mock('../../../../MetadataForms/DataManager', () => ({
    DataManager: jest.fn(() => ({
        metadata: {
            treeObject: {
                Fields: {
                    field1: { name: 'field1', field: 'f1', description: 'Поле 1' },
                },
                TabularParts: {
                    table1: {
                        info: {
                            Fields: {
                                tabField1: { name: 'tabField1', field: 'tf1', description: 'Табличное поле 1' },
                            },
                        },
                    },
                },
            },
        },
        MasterData: {
            record: {
                f1: 'value_from',
                tf1: 'value_to',
            },
            TabularParts: {
                table1: [{ tf1: 'value_to_row0' }],
            },
        },
        hookChangeFieldData: jest.fn().mockReturnValue((data: string) => {}),
    })),
}));

// Моки для api
const mockApi = {
    type: {
        getFieldsById: jest.fn().mockResolvedValue({
            registryFields: [{ name: 'fieldA' }],
            registryTableFields: [{ name: 'tableFieldA' }],
            registryMetadata: { data: { treeObject: { Refs: [] } } },
        }),
    },
};

const mockOnChange = jest.fn();
const mockOnClear = jest.fn();

const defaultProps = {
    fromName: 'record.f1',
    name: 'field1',
    DataManager: {
        metadata: {
            treeObject: {
                Fields: {
                    field1: { name: 'field1', field: 'f1', description: 'Поле 1' },
                },
                TabularParts: {
                    table1: {
                        info: {
                            Fields: {
                                tabField1: { name: 'tabField1', field: 'tf1', description: 'Табличное поле 1' },
                            },
                        },
                    },
                },
            },
        },
        MasterData: {
            record: {
                f1: 'value_from',
                tf1: 'value_to',
            },
            TabularParts: {
                table1: [{ tf1: 'value_to_row0' }],
            },
        },
        hookChangeFieldData: jest.fn().mockReturnValue((data: string) => {}),
        name: 'Test List',
    },
    api: mockApi,
    onChange: mockOnChange,
    onClear: mockOnClear,
    rowIndex: 0,
} as any;

describe('StringBuilder', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('должен отрендерить компонент с label и input', () => {
        render(<StringBuilder {...defaultProps} />);

        expect(screen.getByText('Поле 1')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Выберите условие')).toBeInTheDocument();
        expect(screen.getByDisplayValue('value_from')).toBeInTheDocument();
    });

    it('должен отрендерить две кнопки с иконками', () => {
        render(<StringBuilder {...defaultProps} />);

        // находим кнопки открытия условий и очистки инпута
        const buttons = screen.getAllByRole('button');

        expect(buttons[0]).toBeInTheDocument();
        expect(buttons[1]).toBeInTheDocument();

        // кнопки без видимого текста,
        expect(buttons[0]).toHaveTextContent('');
        expect(buttons[1]).toHaveTextContent('');
    });

    it('вызывает DataManager hook', () => {
        render(<StringBuilder {...defaultProps} />);
        expect(defaultProps.DataManager.hookChangeFieldData).toHaveBeenCalledWith('record.f1', expect.any(Object));
    });

    it('если не указан куб выбрасывает ошибку', async () => {
        render(<StringBuilder {...defaultProps} />);
        const buttons = screen.getAllByRole('button');
        await userEvent.click(buttons[0]);
        expect(screen.getByText('Не указан куб')).toBeInTheDocument();
    });
});
