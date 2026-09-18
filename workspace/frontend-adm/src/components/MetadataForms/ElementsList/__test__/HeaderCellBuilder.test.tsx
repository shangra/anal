import { render, screen } from '@testing-library/react';
import "@testing-library/jest-dom"
import { HeaderCellBuilder } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined/components/HeaderCell/HeaderCellBuilder';
import { DEFAULT_COLUMN_WIDTH, DEFAULT_ROW_HEIGHT } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined/constants';

describe('HeaderCellBuilder', () => {
    let builder: HeaderCellBuilder;

    beforeEach(() => {
        builder = new HeaderCellBuilder();
    });

    describe('constructor', () => {
        it('should initialize with default values', () => {
            expect(builder.resizable).toBe(false);
            expect(builder.columnIndex).toBe(0);
            expect(builder.name).toBe('');
            expect(builder.order).toBeNull();
            expect(builder.styles).toEqual({
                left: 0,
                top: 0,
                width: DEFAULT_COLUMN_WIDTH,
                height: DEFAULT_ROW_HEIGHT
            });
            expect(builder.resizeStartHandler).toBeDefined();
            expect(builder.resizeHandler).toBeDefined();
            expect(builder.resizeEndHandler).toBeDefined();
            expect(builder.sortHandler).toBeDefined();
        });
    });

    describe('withResize', () => {
        it('should enable resizable and set resize handlers', () => {
            const startHandler = jest.fn();
            const resizeHandler = jest.fn();
            const endHandler = jest.fn();

            const result = builder.withResize(startHandler, resizeHandler, endHandler);

            expect(builder.resizable).toBe(true);
            expect(builder.resizeStartHandler).toBe(startHandler);
            expect(builder.resizeHandler).toBe(resizeHandler);
            expect(builder.resizeEndHandler).toBe(endHandler);
            expect(result).toBe(builder);
        });
    });

    describe('withSort', () => {
        it('should set order and sort handler for ASC', () => {
            const sortHandler = jest.fn();

            const result = builder.withSort('ASC', sortHandler);

            expect(builder.order).toBe('ASC');
            expect(builder.sortHandler).toBe(sortHandler);
            expect(result).toBe(builder);
        });

        it('should set order and sort handler for DESC', () => {
            const sortHandler = jest.fn();

            const result = builder.withSort('DESC', sortHandler);

            expect(builder.order).toBe('DESC');
            expect(builder.sortHandler).toBe(sortHandler);
            expect(result).toBe(builder);
        });

        it('should set null order and sort handler', () => {
            const sortHandler = jest.fn();

            const result = builder.withSort(null, sortHandler);

            expect(builder.order).toBeNull();
            expect(builder.sortHandler).toBe(sortHandler);
            expect(result).toBe(builder);
        });
    });

    describe('withName', () => {
        it('should set column name', () => {
            const result = builder.withName('Test Column');

            expect(builder.name).toBe('Test Column');
            expect(result).toBe(builder);
        });
    });

    describe('withMouseEvents', () => {
        it('should set onClick handler', () => {
            const onClick = jest.fn();

            const result = builder.withMouseEvents({ onClick });

            expect(builder.onClick).toBe(onClick);
            expect(result).toBe(builder);
        });

        it('should work without onClick handler', () => {
            const result = builder.withMouseEvents({});

            expect(builder.onClick).toBeUndefined();
            expect(result).toBe(builder);
        });
    });

    describe('withStyles', () => {
        it('should override default styles', () => {
            const customStyles = {
                width: '200px',
                height: '50px',
                backgroundColor: 'blue'
            };

            const result = builder.withStyles(customStyles);

            expect(builder.styles).toBe(customStyles);
            expect(result).toBe(builder);
        });

        it('should completely replace styles object', () => {
            const customStyles = { width: '150px' };

            builder.withStyles(customStyles);

            expect(builder.styles).toEqual({ width: '150px' });
            expect(builder.styles.left).toBeUndefined();
            expect(builder.styles.top).toBeUndefined();
        });
    });

    describe('withRenderContent', () => {
        it('should set renderContent function', () => {
            const renderContent = () => <div>Custom Content</div>;

            const result = builder.withRenderContent(renderContent);

            expect(builder.renderContent).toBe(renderContent);
            expect(result).toBe(builder);
        });
    });

    describe('build', () => {
        it('should build HeaderCell with default values', () => {
            const { container } = render(builder.build());

            expect(container.firstChild).toBeInTheDocument();
        });

        it('should build HeaderCell with all configured properties', () => {
            const startHandler = jest.fn();
            const resizeHandler = jest.fn();
            const endHandler = jest.fn();
            const sortHandler = jest.fn();
            const onClick = jest.fn();
            const renderContent = () => <div data-testid="custom-content">Custom</div>;

            const component = builder
                .withName('Test Column')
                .withResize(startHandler, resizeHandler, endHandler)
                .withSort('ASC', sortHandler)
                .withMouseEvents({ onClick })
                .withStyles({ width: '300px' })
                .withRenderContent(renderContent)
                .build();

            const { container } = render(component);

            expect(container.firstChild).toBeInTheDocument();
            expect(screen.getByTestId('custom-content')).toBeInTheDocument();
        });

        it('should build HeaderCell without optional handlers', () => {
            const component = builder
                .withName('Simple Column')
                .build();

            const { container } = render(component);

            expect(container.firstChild).toBeInTheDocument();
            expect(screen.getByText('Simple Column')).toBeInTheDocument();
        });

        it('should pass correct props to HeaderCell', () => {
            const startHandler = jest.fn();
            const resizeHandler = jest.fn();
            const endHandler = jest.fn();
            const sortHandler = jest.fn();

            const component = builder
                .withName('Test')
                .withResize(startHandler, resizeHandler, endHandler)
                .withSort('DESC', sortHandler)
                .build();

            const { container } = render(component);
            expect(screen.getByText('Test')).toBeInTheDocument();
        });

        it('should use constants for default dimensions', () => {
            expect(builder.styles.width).toBe(DEFAULT_COLUMN_WIDTH);
            expect(builder.styles.height).toBe(DEFAULT_ROW_HEIGHT);
        });
    });

    describe('method chaining', () => {
        it('should allow method chaining', () => {
            const result = builder
                .withName('Test')
                .withSort('ASC', jest.fn())
                .withStyles({ width: '100px' });

            expect(result).toBe(builder);
        });
    });
});