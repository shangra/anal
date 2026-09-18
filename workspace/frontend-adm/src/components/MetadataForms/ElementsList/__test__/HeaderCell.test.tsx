import { render, screen, fireEvent } from '@testing-library/react';
import "@testing-library/jest-dom"
import { HeaderCell } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined/components/HeaderCell/HeaderCell';

describe('HeaderCell Component', () => {
    const defaultProps = {
        name: 'Column Name',
        styles: { width: '200px' },
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render column name', () => {
        render(<HeaderCell {...defaultProps} />);
        expect(screen.getByText('Column Name')).toBeInTheDocument();
    });

    it('should render custom content when renderContent is provided', () => {
        const renderContent = () => <div data-testid="custom-content">Custom Header</div>;
        render(<HeaderCell {...defaultProps} renderContent={renderContent} />);
        expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    });

    it('should display title attribute with column name', () => {
        render(<HeaderCell {...defaultProps} />);
        expect(screen.getByTitle('Column Name')).toBeInTheDocument();
    });

    it('should show sort icon when orderValue is ASC', () => {
        render(<HeaderCell {...defaultProps} orderValue="ASC" />);
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should show sort icon when orderValue is DESC', () => {
        render(<HeaderCell {...defaultProps} orderValue="DESC" />);
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should not show sort icon when orderValue is not provided', () => {
        render(<HeaderCell {...defaultProps} />);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should call onSort with ASC when clicked and current order is DESC', () => {
        const onSort = jest.fn();
        render(<HeaderCell {...defaultProps} orderValue="DESC" onSort={onSort} />);

        fireEvent.click(screen.getByText('Column Name'));

        expect(onSort).toHaveBeenCalledWith('ASC');
    });

    it('should call onSort with DESC when clicked and current order is ASC', () => {
        const onSort = jest.fn();
        render(<HeaderCell {...defaultProps} orderValue="ASC" onSort={onSort} />);

        fireEvent.click(screen.getByText('Column Name'));

        expect(onSort).toHaveBeenCalledWith('DESC');
    });

    it('should call onClick when cell is clicked', () => {
        const onClick = jest.fn();
        render(<HeaderCell {...defaultProps} onClick={onClick} />);

        fireEvent.click(screen.getByText('Column Name'));

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should show resize handle when resizable is true', () => {
        render(<HeaderCell {...defaultProps} resizable />);
        const dragger = document.querySelector('.columnDragger');
        expect(dragger).toBeInTheDocument();
    });

    it('should not show resize handle when resizable is false', () => {
        render(<HeaderCell {...defaultProps} resizable={false} />);
        const dragger = document.querySelector('.columnDragger');
        expect(dragger).not.toBeInTheDocument();
    });

    it('should not show resize handle when resizable is not provided', () => {
        render(<HeaderCell {...defaultProps} />);
        const dragger = document.querySelector('.columnDragger');
        expect(dragger).not.toBeInTheDocument();
    });

    it('should start resize on mouse down', () => {
        const handleResizeStart = jest.fn();
        render(<HeaderCell {...defaultProps} resizable handleResizeStart={handleResizeStart} />);

        const dragger = document.querySelector('.columnDragger') as HTMLElement;
        fireEvent.mouseDown(dragger);

        expect(handleResizeStart).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should handle mouse move during resize', () => {
        const handleResize = jest.fn();
        const handleResizeStart = jest.fn();

        render(
            <HeaderCell
                {...defaultProps}
                resizable
                handleResize={handleResize}
                handleResizeStart={handleResizeStart}
            />
        );

        const dragger = document.querySelector('.columnDragger') as HTMLElement;
        fireEvent.mouseDown(dragger, { clientX: 100 });

        expect(handleResizeStart).toHaveBeenCalledWith(100);

        fireEvent.mouseMove(document, { clientX: 200 });

        expect(handleResize).toHaveBeenCalledWith(200);
    });
    it('should end resize on document mouse up', () => {
        const handleResizeEnd = jest.fn();
        render(<HeaderCell {...defaultProps} resizable handleResizeEnd={handleResizeEnd} />);

        const dragger = document.querySelector('.columnDragger') as HTMLElement;
        fireEvent.mouseDown(dragger);

        fireEvent.mouseUp(document);

        expect(handleResizeEnd).toHaveBeenCalledTimes(1);
    });

    it('should ignore clicks on resize handle', () => {
        const onSort = jest.fn();
        const onClick = jest.fn();
        render(<HeaderCell {...defaultProps} resizable onSort={onSort} onClick={onClick} />);

        const dragger = document.querySelector('.columnDragger') as HTMLElement;
        fireEvent.click(dragger);

        expect(onSort).not.toHaveBeenCalled();
        expect(onClick).not.toHaveBeenCalled();
    });

    it('should apply default cell styles', () => {
        const { container } = render(<HeaderCell {...defaultProps} />);
        const headerElement = container.firstChild as HTMLElement;

        expect(headerElement).toHaveStyle('display: flex');
        expect(headerElement).toHaveStyle('justify-content: space-between');
        expect(headerElement).toHaveStyle('align-items: center');
    });

    it('should add event listeners on mount', () => {
        const addEventListener = jest.spyOn(document, 'addEventListener');

        const { unmount } = render(<HeaderCell {...defaultProps} />);

        expect(addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));

        unmount();
    });

    it('should remove event listeners on unmount', () => {
        const removeEventListener = jest.spyOn(document, 'removeEventListener');

        const { unmount } = render(<HeaderCell {...defaultProps} />);

        unmount();

        expect(removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });

    it('should have noselect class', () => {
        const { container } = render(<HeaderCell {...defaultProps} />);
        const rootElement = container.firstChild as HTMLElement;

        expect(rootElement).toHaveClass('noselect');
    });
});