import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConfigurableNestedTable } from '../../ConfigurableNestedTable';
import type { IColumnData } from '../../ConfigurableNestedTable';
import type { ICell } from '../types';

jest.mock('../../../../helpers/listSettings', () => ({
    getConditionalFormattingSettingsState: () => ({ conditionalFormattingRules: [] }),
    subscribeListSettingsRevision: jest.fn(),
    unsubscribeListSettingsRevision: jest.fn(),
    getListSettingsRevision: () => 0,
    getSortSettingsState: () => ({ sortRules: [] }),
}));

jest.mock('../../../../helpers/listSettings/facets/conditionalFormatting/apply', () => ({
    resolveConditionalCellDecoration: () => undefined,
    resolveSubstringAppearance: () => ({}),
    ruleMatchesCondition: () => false,
}));

class ResizeObserverMock {
    observe = jest.fn();

    unobserve = jest.fn();

    disconnect = jest.fn();
}

const createCell = (columnName: string, value: string, rowIndex: number): ICell => ({
    columnIndex: 0,
    rowIndex,
    columnName,
    type: 'string',
    value: { originalData: value, viewedData: value },
    hierarchy: null,
    editable: null,
});

const columnData: IColumnData[] = [
    { name: 'name', label: 'Наименование' },
    { name: 'code', label: 'Код' },
];

const columns = columnData;

const data: ICell[][] = [
    [createCell('name', 'First', 0), createCell('code', 'A-1', 0)],
    [createCell('name', 'Second', 1), createCell('code', 'A-2', 1)],
];

function cellAt(container: HTMLElement, rowId: string, field: string): HTMLElement {
    const cell = container.querySelector<HTMLElement>(`.data-table__cell[data-row-id="${rowId}"][data-field="${field}"]`);
    if (!cell) {
        throw new Error(`cell ${rowId}/${field} is not rendered`);
    }
    return cell;
}

function scrollerOf(container: HTMLElement): HTMLElement {
    return container.querySelector<HTMLElement>('.data-table__scroll') as HTMLElement;
}

describe('ConfigurableNestedTable inline editing', () => {
    beforeEach(() => {
        global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
    });

    test('does not open the editor without onCellChange', () => {
        const { container, unmount } = render(<ConfigurableNestedTable data={data} columns={columns} />);

        fireEvent.doubleClick(cellAt(container, '0', 'name'));

        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        unmount();
    });

    test('opens the editor with the current value on double click', () => {
        const onCellChange = jest.fn();
        const { container, unmount } = render(<ConfigurableNestedTable data={data} columns={columns} onCellChange={onCellChange} />);

        fireEvent.doubleClick(cellAt(container, '0', 'name'));

        expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('First');
        expect(onCellChange).not.toHaveBeenCalled();
        unmount();
    });

    test('commits the new value on Enter and closes the editor', () => {
        const onCellChange = jest.fn();
        const { container, unmount } = render(<ConfigurableNestedTable data={data} columns={columns} onCellChange={onCellChange} />);

        fireEvent.doubleClick(cellAt(container, '0', 'name'));
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Rewritten' } });
        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

        expect(onCellChange).toHaveBeenCalledWith('0', 'name', 'Rewritten');
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        unmount();
    });

    test('does not keep the value locally: it appears only when parent passes new data', () => {
        const onCellChange = jest.fn();
        const view = render(<ConfigurableNestedTable data={data} columns={columns} onCellChange={onCellChange} />);

        fireEvent.doubleClick(cellAt(view.container, '0', 'name'));
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Rewritten' } });
        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

        expect(cellAt(view.container, '0', 'name').textContent).toBe('First');

        const nextData = data.map((row, index) =>
            index === 0
                ? row.map((cell) =>
                      cell.columnName === 'name'
                          ? { ...cell, value: { originalData: 'Rewritten', viewedData: 'Rewritten' } }
                          : cell
                  )
                : row
        );
        view.rerender(<ConfigurableNestedTable data={nextData} columns={columns} onCellChange={onCellChange} />);

        expect(cellAt(view.container, '0', 'name').textContent).toBe('Rewritten');
        view.unmount();
    });

    test('commits on blur and discards the draft on Escape', () => {
        const onCellChange = jest.fn();
        const { container, unmount } = render(<ConfigurableNestedTable data={data} columns={columns} onCellChange={onCellChange} />);

        fireEvent.doubleClick(cellAt(container, '0', 'code'));
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Z-1' } });
        fireEvent.blur(screen.getByRole('textbox'));
        expect(onCellChange).toHaveBeenLastCalledWith('0', 'code', 'Z-1');

        fireEvent.doubleClick(cellAt(container, '0', 'name'));
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'discarded' } });
        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

        expect(onCellChange).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(cellAt(container, '0', 'name').textContent).toBe('First');
        unmount();
    });

    test('respects canEditCell', () => {
        const onCellChange = jest.fn();
        const canEditCell = (_rowId: string, field: string) => field !== 'code';
        const { container, unmount } = render(
            <ConfigurableNestedTable data={data} columns={columns} onCellChange={onCellChange} canEditCell={canEditCell} />
        );

        fireEvent.doubleClick(cellAt(container, '0', 'code'));
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

        fireEvent.doubleClick(cellAt(container, '0', 'name'));
        expect(screen.getByRole('textbox')).toBeInTheDocument();
        unmount();
    });

    test('starts editing from keyboard and clears the cell with Delete', () => {
        const onCellChange = jest.fn();
        const { container, unmount } = render(<ConfigurableNestedTable data={data} columns={columns} onCellChange={onCellChange} />);
        const scroller = scrollerOf(container);

        fireEvent.click(cellAt(container, '0', 'name'));
        fireEvent.keyDown(scroller, { key: 'F2' });
        expect(screen.getByRole('textbox')).toBeInTheDocument();
        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

        fireEvent.keyDown(scroller, { key: 'ArrowRight' });
        fireEvent.keyDown(scroller, { key: 'Delete' });
        expect(onCellChange).toHaveBeenCalledWith('0', 'code', '');

        fireEvent.keyDown(scroller, { key: 'ArrowDown' });
        fireEvent.keyDown(scroller, { key: 'ArrowLeft' });
        fireEvent.keyDown(scroller, { key: 'Enter' });
        expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Second');
        unmount();
    });
});
