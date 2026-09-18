import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Window as WindowComponent, WindowContext } from 'components/WindowsCMP/components/Window';
import { PanelPosition } from 'components/WindowsCMP/interfaces';

jest.mock('../../windowsCmp.module.css', () => ({
    window: 'window-class',
    contentWindows: 'content-windows-class',
}));

jest.mock('../../ErrorBoundary', () => ({
    ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
}));

jest.mock('../components/WindowHeader', () => ({
    WindowHeader: ({ title }: { title: string }) => (
        <div>WindowHeader: {title}</div>
    ),
}));

describe('Window Component', () => {
    const defaultProps = {
        index: 'window-1',
        title: 'Test Window',
        children: <div>Test Content</div>,
        onWindowsBack: jest.fn(),
        onCloseWindow: jest.fn(),
        setWindowPosition: jest.fn(),
    };

    const mockProps = {
        index: 'window-1',
        title: 'Test Window',
        children: <div>Test Content</div>,
        onWindowsBack: jest.fn(),
        onCloseWindow: jest.fn(),
        onHideWindow: jest.fn(),
        setWindowActive: jest.fn(),
        setWindowPosition: jest.fn(),
        onToggleFullScreen: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        it('should render window with title and content', () => {
            render(<WindowComponent {...defaultProps} />);

            expect(
                screen.getByText('WindowHeader: Test Window')
            ).toBeInTheDocument();
            expect(screen.getByText('Test Content')).toBeInTheDocument();
        });

        it('should apply custom styles', () => {
            const customStyle = { width: '500px', height: '300px' };
            render(<WindowComponent {...defaultProps} style={customStyle} />);

            const windowElement = screen
                .getByText('WindowHeader: Test Window')
                .closest('.window-class');
            expect(windowElement).toHaveStyle(customStyle);
        });
    });

    describe('Interactions', () => {
        it('should call setWindowActive on mouse down', () => {
            render(<WindowComponent {...mockProps} />);

            const windowElement = screen
                .getByText('WindowHeader: Test Window')
                .closest('.window-class');
            fireEvent.mouseDown(windowElement!);

            expect(mockProps.setWindowActive).toHaveBeenCalledWith('window-1');
        });

        it('should not call setWindowActive when prop is not provided', () => {
            const propsWithoutSetActive = {
                ...mockProps,
                setWindowActive: undefined,
            };
            render(<WindowComponent {...propsWithoutSetActive} />);

            const windowElement = screen
                .getByText('WindowHeader: Test Window')
                .closest('.window-class');
            fireEvent.mouseDown(windowElement!);

            expect(mockProps.setWindowActive).not.toHaveBeenCalled();
        });
    });

    describe('Window Context', () => {
        it('should provide ref through context', () => {
            let contextValue: any;

            const TestConsumer = () => {
                contextValue = React.useContext(WindowContext);
                return null;
            };

            render(
                <WindowComponent
                    index='window-1'
                    title='Test Window'
                    children={<TestConsumer />}
                    onWindowsBack={jest.fn()}
                    onCloseWindow={jest.fn()}
                    setWindowPosition={jest.fn()}
                />
            );

            expect(contextValue).toHaveProperty('ref');
            expect(contextValue.ref).toBeDefined();
            expect(contextValue.ref.current).toBeDefined();
        });
    });

    describe('Error Boundary', () => {
        it('should wrap children with ErrorBoundary', () => {
            render(<WindowComponent {...defaultProps} />);

            expect(screen.getByText('Test Content')).toBeInTheDocument();
        });
    });

    describe('Props Handling', () => {
        it('should handle fullscreen prop', () => {
            render(
                <WindowComponent
                    {...defaultProps}
                    isFullscreen
                    onToggleFullScreen={jest.fn()}
                />
            );

            expect(
                screen.getByText('WindowHeader: Test Window')
            ).toBeInTheDocument();
        });

        it('should handle position prop', () => {
            render(
                <WindowComponent
                    {...defaultProps}
                    position={PanelPosition.left}
                />
            );

            expect(
                screen.getByText('WindowHeader: Test Window')
            ).toBeInTheDocument();
        });

        it('should handle all optional props', () => {
            render(
                <WindowComponent
                    {...mockProps}
                    isFullscreen
                    style={{ width: '800px' }}
                    position={PanelPosition.right}
                />
            );

            expect(
                screen.getByText('WindowHeader: Test Window')
            ).toBeInTheDocument();
            expect(screen.getByText('Test Content')).toBeInTheDocument();
        });
    });

    describe('PureComponent Behavior', () => {
        it('should not re-render when props are unchanged', () => {
            const { rerender, container } = render(
                <WindowComponent {...defaultProps} />
            );
            const firstRender = container.innerHTML;

            rerender(<WindowComponent {...defaultProps} />);

            expect(container.innerHTML).toBe(firstRender);
        });
    });
});
