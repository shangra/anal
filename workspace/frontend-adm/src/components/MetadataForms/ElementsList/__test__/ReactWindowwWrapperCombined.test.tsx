import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactWindowWrapper } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined';
import { IColumnData } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined/types';
import { ICell } from 'components/MetadataForms/ElementsList/types';

class ResizeObserverMock {
    observe = jest.fn();

    unobserve = jest.fn();

    disconnect = jest.fn();
}

jest.mock('react-window', () => ({
    VariableSizeGrid: jest.fn(() => <div data-testid="variable-size-grid">Mock Grid</div>),
}));

jest.mock('../ReactWindowWrapperCombined/components/Cell', () => ({
    Cell: jest.fn(() => <div data-testid="cell">Cell</div>),
}));

jest.mock('../ReactWindowWrapperCombined/utils', () => ({
    ColumnResizeHelper: {
        generateColumnsMetadata: jest.fn(() => [{ x: 0, width: 100, index: 0 }]),
        resizeTableWidth: jest.fn((metadata) => metadata),
        resizeColumnWidth: jest.fn((metadata) => metadata),
    },
}));

jest.mock('../ReactWindowWrapperCombined/utils/scrollToCell.utils', () => ({
    scrollToCellUtils: {
        calculateScrollPosition: jest.fn(() => ({
            shouldScroll: false,
            scrollTop: 0,
            scrollLeft: 0,
        })),
    },
}));

jest.mock('../ReactWindowWrapperCombined/utils/calculateRowIndexFromMousePosition', () => ({
    calculateRowIndexFromMousePosition: jest.fn(() => 0),
}));

jest.mock('../../../../helpers/timer', () => ({
    Timer: jest.fn(() => ({
        start: jest.fn((callback) => callback()),
        stop: jest.fn(),
    })),
}));

describe('ReactWindowWrapper', () => {
    const mockData: ICell[] = [
        {
            columnIndex: 0,
            // @ts-ignore
            value: { viewedData: 'Cell 1' },
            type: 'text',
        },
    ];

    const mockCols: IColumnData[] = [{ name: 'column1', label: 'Column 1' }];

    const mockLoadNext = jest.fn();
    const mockLoadPrev = jest.fn();

    const defaultProps = {
        data: mockData,
        cols: mockCols,
        isLoadingMore: false,
        loadNext: mockLoadNext,
        loadPrev: mockLoadPrev,
        hasNext: true,
        hasPrev: false,
    };

    beforeAll(() => {
        global.ResizeObserver = ResizeObserverMock as any;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Basic tests
    describe('Basic tests', () => {
        test('component renders without errors', () => {
            expect(() => {
                const { unmount } = render(<ReactWindowWrapper {...defaultProps} />);
                unmount();
            }).not.toThrow();
        });

        test('component creates DOM element', () => {
            const { container, unmount } = render(<ReactWindowWrapper {...defaultProps} />);

            expect(container.firstChild).toBeInTheDocument();
            expect(container.querySelector('.table')).toBeInTheDocument();
            unmount();
        });
    });

    describe('Props validation', () => {
        test('renders with hierarchy', () => {
            expect(() => {
                const { unmount } = render(<ReactWindowWrapper {...defaultProps} hierarchy />);
                unmount();
            }).not.toThrow();
        });

        test('renders with active cell', () => {
            expect(() => {
                const { unmount } = render(
                    <ReactWindowWrapper {...defaultProps} activeCell={{ rowIndex: 0, columnIndex: 0 }} />,
                );
                unmount();
            }).not.toThrow();
        });

        test('renders with selected rows', () => {
            expect(() => {
                const { unmount } = render(<ReactWindowWrapper {...defaultProps} selectedRows={[0, 1]} />);
                unmount();
            }).not.toThrow();
        });
    });

    describe('Edge cases', () => {
        test('renders with empty data', () => {
            expect(() => {
                const { unmount } = render(<ReactWindowWrapper {...defaultProps} data={[]} />);
                unmount();
            }).not.toThrow();
        });

        test('renders with empty columns', () => {
            expect(() => {
                const { unmount } = render(<ReactWindowWrapper {...defaultProps} cols={[]} />);
                unmount();
            }).not.toThrow();
        });

        test('renders without activeCell', () => {
            expect(() => {
                const { unmount } = render(<ReactWindowWrapper {...defaultProps} activeCell={null} />);
                unmount();
            }).not.toThrow();
        });
    });

    describe('Basic functionality', () => {
        test('works with different data types', () => {
            const arrayData: ICell[][] = [
                [
                    // @ts-ignore
                    { columnIndex: 0, value: { viewedData: 'Cell 1-1' }, type: 'text' },
                ],
            ];

            expect(() => {
                const { unmount } = render(<ReactWindowWrapper {...defaultProps} data={arrayData} />);
                unmount();
            }).not.toThrow();
        });

        test('works with grouped columns', () => {
            const groupedCols: IColumnData[][] = [[{ name: 'group1-col1', label: 'Group 1 Col 1' }]];

            expect(() => {
                const { unmount } = render(<ReactWindowWrapper {...defaultProps} cols={groupedCols} />);
                unmount();
            }).not.toThrow();
        });
    });
});

// Simple smoke tests
describe('ReactWindowWrapper smoke tests', () => {
    beforeAll(() => {
        global.ResizeObserver = ResizeObserverMock as any;
    });

    test('renders with minimal props', () => {
        const { unmount } = render(
            <ReactWindowWrapper
                // @ts-ignore
                data={[{ columnIndex: 0, value: { viewedData: 'Test' }, type: 'text' }]}
                cols={[{ name: 'test', label: 'Test' }]}
            />,
        );

        expect(document.body.innerHTML).not.toBe('');
        unmount();
    });

    test('does not crash on unmount', () => {
        const { unmount } = render(
            <ReactWindowWrapper
                // @ts-ignore
                data={[{ columnIndex: 0, value: { viewedData: 'Test' }, type: 'text' }]}
                cols={[{ name: 'test', label: 'Test' }]}
            />,
        );

        expect(() => unmount()).not.toThrow();
    });
});

const mockData: ICell[] = [
    {
        columnIndex: 0,
        // @ts-ignore
        value: { viewedData: 'Cell 1' },
        type: 'text',
    },
];

const mockCols: IColumnData[] = [{ name: 'column1', label: 'Column 1' }];

const mockLoadNext = jest.fn();
const mockLoadPrev = jest.fn();

const defaultProps = {
    data: mockData,
    cols: mockCols,
    isLoadingMore: false,
    loadNext: mockLoadNext,
    loadPrev: mockLoadPrev,
    hasNext: true,
    hasPrev: false,
};

beforeAll(() => {
    global.ResizeObserver = ResizeObserverMock as any;
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Window resize functionality', () => {
    test('adds and removes resize event listener', () => {
        const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
        const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

        const { unmount } = render(<ReactWindowWrapper {...defaultProps} />);

        expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

        addEventListenerSpy.mockRestore();
        removeEventListenerSpy.mockRestore();
    });
});

describe('ResizeObserver functionality', () => {
    test('creates and disconnects ResizeObserver', () => {
        const disconnectMock = jest.fn();
        const resizeObserverMock = jest.fn().mockImplementation(() => ({
            observe: jest.fn(),
            unobserve: jest.fn(),
            disconnect: disconnectMock,
        }));

        global.ResizeObserver = resizeObserverMock;

        const { unmount } = render(<ReactWindowWrapper {...defaultProps} />);

        expect(resizeObserverMock).toHaveBeenCalled();

        unmount();

        expect(disconnectMock).toHaveBeenCalled();
    });
});
