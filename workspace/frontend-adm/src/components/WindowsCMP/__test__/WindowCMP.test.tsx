import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WindowCMP } from 'components/WindowsCMP/components/WindowCMP';
import { PanelPosition } from 'components/WindowsCMP/interfaces';

jest.mock('../components/Window', () => ({
    Window: ({
        children,
        title,
        onCloseWindow,
        onHideWindow,
        setWindowActive,
        setWindowPosition,
        onToggleFullScreen,
        onWindowsBack,
    }: any) => (
        <div data-testid='window-mock'>
            <div>Window: {title}</div>
            <button onClick={() => onCloseWindow?.('left', 'test-window')}>
                Close
            </button>
            <button onClick={() => onHideWindow?.('left', 'test-window')}>
                Hide
            </button>
            <button onClick={() => setWindowActive?.('test-window')}>
                Set Active
            </button>
            <button onClick={() => setWindowPosition?.('right')}>
                Set Position
            </button>
            <button onClick={() => onToggleFullScreen?.('test-window')}>
                Toggle Fullscreen
            </button>
            <button onClick={() => onWindowsBack?.(true)}>Windows Back</button>
            {children}
        </div>
    ),
}));

jest.mock('../../ErrorBoundary', () => ({
    ErrorBoundary: ({ children, downloadLogs }: any) => (
        <div data-testid='error-boundary-mock'>
            <div>Download logs: {downloadLogs?.fileName || 'WindowsCMP'}</div>
            {children}
        </div>
    ),
}));

const createPortalElement = () => {
    const portalElement = document.createElement('div');
    portalElement.id = 'portal-root';
    document.body.appendChild(portalElement);
    return portalElement;
};

const removePortalElement = (element: HTMLElement) => {
    document.body.removeChild(element);
};

describe('WindowCMP', () => {
    const defaultProps = {
        key: 'test-window-key',
        index: 'test-window',
        title: 'Test Window',
        content: <div>Test Content</div>,
        children: <div>Test Content</div>,
        onCloseWindow: jest.fn(),
        portal: undefined,
    };

    const mockProps = {
        key: 'test-window-key',
        index: 'test-window',
        title: 'Test Window',
        content: <div>Test Content</div>,
        children: <div>Test Content</div>,
        onCloseWindow: jest.fn(),
        onHideWindow: jest.fn(),
        setWindowActive: jest.fn(),
        setWindowPosition: jest.fn(),
        onToggleFullScreen: jest.fn(),
        isFullscreen: false,
        portal: undefined,
        style: { width: '500px' },
        position: PanelPosition.left,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        it('should render window with title and content', () => {
            render(<WindowCMP {...defaultProps} />);

            expect(screen.getByText('Window: Test Window')).toBeInTheDocument();
            expect(screen.getByText('Test Content')).toBeInTheDocument();
            expect(
                screen.getByTestId('error-boundary-mock')
            ).toBeInTheDocument();
        });

        it('should apply custom styles through Window component', () => {
            const customStyle = { width: '800px', height: '600px' };
            render(<WindowCMP {...defaultProps} style={customStyle} />);

            expect(screen.getByText('Window: Test Window')).toBeInTheDocument();
        });
    });

    describe('Portal Rendering', () => {
        it('should render in portal when portal prop is provided', () => {
            const portalElement = createPortalElement();

            render(<WindowCMP {...defaultProps} portal={portalElement} />);

            const portalContent = portalElement.querySelector(
                '[id="window-test-window"]'
            );
            expect(portalContent).toBeInTheDocument();
            expect(screen.getByText('Window: Test Window')).toBeInTheDocument();

            removePortalElement(portalElement);
        });

        it('should render normally when portal prop is not provided', () => {
            render(<WindowCMP {...defaultProps} />);

            const windowElement = screen.getByText('Window: Test Window');
            expect(windowElement).toBeInTheDocument();
        });
    });

    describe('Back Pressed State', () => {
        it('should not show back element initially', () => {
            render(<WindowCMP {...defaultProps} />);

            expect(
                document.getElementById('window-test-window-back')
            ).not.toBeInTheDocument();
        });

        it('should show back element when backPressed is true', () => {
            render(<WindowCMP {...defaultProps} />);

            fireEvent.click(screen.getByText('Windows Back'));

            const backElement = document.getElementById(
                'window-test-window-back'
            );
            expect(backElement).toBeInTheDocument();
            expect(backElement).toHaveStyle({
                left: '0px',
                top: '0px',
                width: 'calc(100vw - 60px)',
                height: 'calc(100vh - 90px)',
                position: 'absolute',
            });
        });
    });

    describe('Event Handlers', () => {
        it('should call onCloseWindow when close button is clicked', () => {
            render(<WindowCMP {...mockProps} />);

            fireEvent.click(screen.getByText('Close'));

            expect(mockProps.onCloseWindow).toHaveBeenCalledWith(
                'left',
                'test-window'
            );
        });

        it('should call onHideWindow when hide button is clicked', () => {
            render(<WindowCMP {...mockProps} />);

            fireEvent.click(screen.getByText('Hide'));

            expect(mockProps.onHideWindow).toHaveBeenCalledWith(
                'left',
                'test-window'
            );
        });

        it('should call setWindowActive when set active button is clicked', () => {
            render(<WindowCMP {...mockProps} />);

            fireEvent.click(screen.getByText('Set Active'));

            expect(mockProps.setWindowActive).toHaveBeenCalledWith(
                'test-window'
            );
        });

        it('should call setWindowPosition with correct parameters', () => {
            render(<WindowCMP {...mockProps} />);

            fireEvent.click(screen.getByText('Set Position'));

            expect(mockProps.setWindowPosition).toHaveBeenCalledWith(
                'test-window',
                PanelPosition.left,
                'right'
            );
        });

        it('should call onToggleFullScreen when toggle button is clicked', () => {
            render(<WindowCMP {...mockProps} />);

            fireEvent.click(screen.getByText('Toggle Fullscreen'));

            expect(mockProps.onToggleFullScreen).toHaveBeenCalledWith(
                'test-window'
            );
        });
    });

    describe('Optional Props Handling', () => {
        it('should handle missing optional props without errors', () => {
            render(<WindowCMP {...defaultProps} />);

            expect(screen.getByText('Window: Test Window')).toBeInTheDocument();
            expect(screen.getByText('Test Content')).toBeInTheDocument();
        });

        it('should handle fullscreen prop', () => {
            render(<WindowCMP {...mockProps} isFullscreen />);

            expect(screen.getByText('Window: Test Window')).toBeInTheDocument();
        });

        it('should handle different position props', () => {
            render(
                <WindowCMP {...mockProps} position={PanelPosition.bottom} />
            );

            expect(screen.getByText('Window: Test Window')).toBeInTheDocument();
        });

        it('should not call optional functions when they are not provided', () => {
            const {
                onHideWindow,
                setWindowActive,
                setWindowPosition,
                onToggleFullScreen,
            } = mockProps;

            render(<WindowCMP {...defaultProps} />);

            fireEvent.click(screen.getByText('Hide'));
            fireEvent.click(screen.getByText('Set Active'));
            fireEvent.click(screen.getByText('Set Position'));
            fireEvent.click(screen.getByText('Toggle Fullscreen'));

            expect(onHideWindow).not.toHaveBeenCalled();
            expect(setWindowActive).not.toHaveBeenCalled();
            expect(setWindowPosition).not.toHaveBeenCalled();
            expect(onToggleFullScreen).not.toHaveBeenCalled();
        });
    });

    describe('Error Boundary', () => {
        it('should wrap children with ErrorBoundary', () => {
            render(<WindowCMP {...defaultProps} />);

            const errorBoundary = screen.getByTestId('error-boundary-mock');
            expect(errorBoundary).toBeInTheDocument();
            expect(errorBoundary).toHaveTextContent(
                'Download logs: WindowsCMP'
            );
            expect(errorBoundary).toHaveTextContent('Test Content');
        });
    });

    describe('Component Methods', () => {
        it('should update backPressed state when onWindowsBack is called', () => {
            render(<WindowCMP {...defaultProps} />);

            expect(
                document.getElementById('window-test-window-back')
            ).not.toBeInTheDocument();

            fireEvent.click(screen.getByText('Windows Back'));

            expect(
                document.getElementById('window-test-window-back')
            ).toBeInTheDocument();
        });

        it('should call setWindowPosition with correct parameters from component method', () => {
            const setWindowPositionMock = jest.fn();
            const propsWithSetPosition = {
                ...defaultProps,
                setWindowPosition: setWindowPositionMock,
                position: PanelPosition.left,
            };

            render(<WindowCMP {...propsWithSetPosition} />);

            fireEvent.click(screen.getByText('Set Position'));

            expect(setWindowPositionMock).toHaveBeenCalledWith(
                'test-window',
                PanelPosition.left,
                'right'
            );
        });
    });

    describe('Constructor Initialization', () => {
        it('should initialize windowsBack style correctly', () => {
            render(<WindowCMP {...defaultProps} />);

            fireEvent.click(screen.getByText('Windows Back'));

            const backElement = document.getElementById(
                'window-test-window-back'
            );
            expect(backElement).toHaveStyle({
                left: '0px',
                top: '0px',
                width: 'calc(100vw - 60px)',
                height: 'calc(100vh - 90px)',
                position: 'absolute',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
            });
        });
    });
});
