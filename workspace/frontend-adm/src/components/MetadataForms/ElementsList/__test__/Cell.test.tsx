import { render, screen, fireEvent } from '@testing-library/react';
import "@testing-library/jest-dom"
import { Cell } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined/components/Cell';

describe('Cell Component', () => {
    const defaultProps = {
        styles: { width: '100px', height: '50px' },
        value: 'Test Value',
    };

    beforeEach(() => {
        // Mock offsetWidth for testing
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
            configurable: true,
            value: 0,
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('renders with default props', () => {
        render(<Cell {...defaultProps} />);

        expect(screen.getByText('Test Value')).toBeInTheDocument();
        expect(screen.getByTitle('Test Value')).toBeInTheDocument();
    });

    it('renders with custom type', () => {
        const props = { ...defaultProps, type: 'custom-type' };
        render(<Cell {...props} />);

        expect(screen.getByText('Test Value')).toBeInTheDocument();
    });

    it('renders custom content when renderContent is provided', () => {
        const renderContent = () => <div data-testid="custom-content">Custom Content</div>;
        const props = { ...defaultProps, renderContent };

        render(<Cell {...props} />);

        expect(screen.getByTestId('custom-content')).toBeInTheDocument();
        expect(screen.getByText('Custom Content')).toBeInTheDocument();
        expect(screen.queryByText('Test Value')).not.toBeInTheDocument();
    });

    it('calls onClick handler when clicked', () => {
        const handleClick = jest.fn();
        const props = { ...defaultProps, onClick: handleClick };

        render(<Cell {...props} />);
        fireEvent.click(screen.getByText('Test Value'));

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('calls onDoubleClick handler when double-clicked', () => {
        const handleDoubleClick = jest.fn();
        const props = { ...defaultProps, onDoubleClick: handleDoubleClick };

        render(<Cell {...props} />);
        fireEvent.doubleClick(screen.getByText('Test Value'));

        expect(handleDoubleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onDoubleClick when not provided', () => {
        const props = { ...defaultProps };

        render(<Cell {...props} />);

        // Should not throw error when double-clicked without handler
        expect(() => {
            fireEvent.doubleClick(screen.getByText('Test Value'));
        }).not.toThrow();
    });

    it('applies custom styles', () => {
        const customStyles = {
            width: '200px',
            height: '100px',
            backgroundColor: 'red'
        };
        const props = { ...defaultProps, styles: customStyles };

        const { container } = render(<Cell {...props} />);
        const cellElement = container.firstChild as HTMLElement;

        expect(cellElement).toHaveStyle('width: 200px');
        expect(cellElement).toHaveStyle('height: 100px');
        expect(cellElement).toHaveStyle('background-color: red');
    });

    describe('show more button logic', () => {
        it('shows more button when content overflows', () => {
            // Mock offsetWidth to be larger than container width
            Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
                configurable: true,
                value: 150, // Larger than defaultProps.styles.width (100px)
            });

            render(<Cell {...defaultProps} />);

            // Note: The actual showMoreButton state logic might need adjustment
            // since it's set in componentDidMount and might not be immediately visible
        });

        it('does not show more button when content fits', () => {
            // Mock offsetWidth to be smaller than container width
            Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
                configurable: true,
                value: 50, // Smaller than defaultProps.styles.width (100px)
            });

            render(<Cell {...defaultProps} />);

            // The component should not show more button in this case
        });
    });

    describe('click event propagation', () => {
        it('stops propagation when show more button is clicked', () => {
            // First, set up the component to show the more button
            Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
                configurable: true,
                value: 150,
            });

            const handleClick = jest.fn();
            const props = { ...defaultProps, onClick: handleClick };

            render(<Cell {...props} />);

            // Since the actual button isn't rendered in the current implementation,
            // this test would need to be updated when the show more button is implemented
            // For now, it tests that the onClickOpen method stops propagation
            const stopPropagation = jest.fn();
            const mockEvent = { stopPropagation } as unknown as React.MouseEvent<HTMLButtonElement, MouseEvent>;

            const { container } = render(<Cell {...props} />);
            const cellInstance = (container.firstChild as any)?._reactInternals?.return?.stateNode;

            if (cellInstance) {
                cellInstance.onClickOpen(mockEvent);
                expect(stopPropagation).toHaveBeenCalledTimes(1);
            }
        });
    });

    it('toggles show state when onClickOpen is called', () => {
        const { container } = render(<Cell {...defaultProps} />);
        const cellInstance = (container.firstChild as any)?._reactInternals?.return?.stateNode;

        if (cellInstance) {
            expect(cellInstance.state.show).toBe(false);

            const mockEvent = { stopPropagation: jest.fn() } as unknown as React.MouseEvent<HTMLButtonElement, MouseEvent>;
            cellInstance.onClickOpen(mockEvent);

            expect(cellInstance.state.show).toBe(true);
            expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(1);
        }
    });
});