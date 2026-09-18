import React from 'react';
import {
    render,
    screen,
    fireEvent,
    cleanup,
    act,
} from '@testing-library/react';
import '@testing-library/jest-dom';

import { PanelPosition } from 'components/WindowsCMP/interfaces';
import { WindowHeader } from 'components/WindowsCMP/components/WindowHeader';

jest.mock('ui-kit', () => ({
    CloseIcon: () => <span data-testid='close-icon'>CloseIcon</span>,
    IconButton: ({ icon: Icon, onClick, variant, color, size }: any) => (
        <button data-testid='icon-button' onClick={onClick}>
            {Icon ? <Icon /> : 'IconButton'}
        </button>
    ),
    Typography: ({ children, className }: any) => (
        <span className={className} data-testid='typography'>
            {children}
        </span>
    ),
}));

jest.mock('../components/StickMenu', () => ({
    StickMenu: ({ onSelect }: any) => (
        <div data-testid='stick-menu' onClick={() => onSelect('top')}>
            StickMenu
        </div>
    ),
}));

jest.mock('../icons/HideWindowIcon', () => ({
    HideWindowIcon: () => <span data-testid='hide-icon'>HideWindowIcon</span>,
}));

jest.mock('../icons/OpenFullWindowIcon', () => ({
    OpenFullWindowIcon: () => (
        <span data-testid='open-full-icon'>OpenFullWindowIcon</span>
    ),
}));

jest.mock('../icons/CloseFullWindowIcon', () => ({
    CloseFullWindowIcon: () => (
        <span data-testid='close-full-icon'>CloseFullWindowIcon</span>
    ),
}));

jest.mock('../../windowsCmp.module.css', () => ({
    windowHeaderWrapper: 'windowHeaderWrapper',
    windowHeader: 'windowHeader',
    windowHeaderTitle: 'windowHeaderTitle',
    windowHeaderBtns: 'windowHeaderBtns',
}));

beforeAll(() => {
    Object.defineProperties(window, {
        innerWidth: { value: 1024, writable: true },
        innerHeight: { value: 768, writable: true },
    });

    Object.defineProperty(document.body, 'style', {
        value: {
            userSelect: '',
        },
        writable: true,
    });
});

describe('WindowHeader', () => {
    const defaultProps = {
        index: 'window-1',
        title: 'Test Window',
        windowRef: { current: document.createElement('div') },
        position: 'center' as PanelPosition,
        onWindowsBack: jest.fn(),
        onCloseWindow: jest.fn(),
        setWindowPosition: jest.fn(),
        onHideWindow: jest.fn(),
        onToggleFullScreen: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        if (defaultProps.windowRef.current) {
            defaultProps.windowRef.current.style.transform = '';
        }
    });

    afterEach(() => {
        cleanup();
    });

    describe('Rendering', () => {
        it('should render title correctly', () => {
            render(<WindowHeader {...defaultProps} />);
            expect(screen.getByTestId('typography')).toHaveTextContent(
                'Test Window'
            );
        });

        it('should render all control buttons', () => {
            render(<WindowHeader {...defaultProps} />);
            expect(screen.getAllByTestId('icon-button')).toHaveLength(3);
            expect(screen.getByTestId('stick-menu')).toBeInTheDocument();
        });
    });

    describe('Drag and Drop functionality', () => {
        it('should set pressed state on mousedown and reset on mouseup', () => {
            render(<WindowHeader {...defaultProps} />);
            const header = screen
                .getByText('Test Window')
                .closest('.windowHeader');

            fireEvent.mouseDown(header!);
            expect(defaultProps.onWindowsBack).toHaveBeenCalledWith(true);
            expect(screen.getByTestId('typography')).toHaveTextContent(
                'Dragging...'
            );

            fireEvent.mouseUp(document);
            expect(defaultProps.onWindowsBack).toHaveBeenCalledWith(false);
        });

        it('should not move window beyond browser boundaries', () => {
            const windowRef = { current: document.createElement('div') };
            render(<WindowHeader {...defaultProps} windowRef={windowRef} />);
            const header = screen
                .getByText('Test Window')
                .closest('.windowHeader');

            fireEvent.mouseDown(header!, { clientX: 10, clientY: 10 });
            fireEvent.mouseMove(document, { clientX: 5, clientY: 5 });

            expect(windowRef.current?.style.transform).toBe('');
        });
    });

    describe('Button handlers', () => {
        it('should call onCloseWindow when close button is clicked', () => {
            render(<WindowHeader {...defaultProps} />);
            const buttons = screen.getAllByTestId('icon-button');

            fireEvent.click(buttons[2]); // Close button is last

            expect(defaultProps.onCloseWindow).toHaveBeenCalledWith(
                'center',
                'window-1'
            );
        });

        it('should call onHideWindow when hide button is clicked', () => {
            render(<WindowHeader {...defaultProps} />);
            const buttons = screen.getAllByTestId('icon-button');

            fireEvent.click(buttons[0]); // Hide button is first

            expect(defaultProps.onHideWindow).toHaveBeenCalledWith(
                'center',
                'window-1'
            );
        });

        it('should call onToggleFullScreen when fullscreen button is clicked', () => {
            const windowRef = {
                current: {
                    offsetWidth: 400,
                    offsetHeight: 300,
                } as HTMLDivElement,
            };
            render(<WindowHeader {...defaultProps} windowRef={windowRef} />);
            const buttons = screen.getAllByTestId('icon-button');

            fireEvent.click(buttons[1]); // Fullscreen button is second

            expect(defaultProps.onToggleFullScreen).toHaveBeenCalledWith(
                'window-1',
                {
                    position: { x: 0, y: 0 },
                    size: { width: 400, height: 300 },
                }
            );
        });

        it('should call setWindowPosition when StickMenu is selected', () => {
            render(<WindowHeader {...defaultProps} />);
            const stickMenu = screen.getByTestId('stick-menu');

            fireEvent.click(stickMenu);

            expect(defaultProps.setWindowPosition).toHaveBeenCalledWith('top');
        });
    });

    describe('Fullscreen functionality', () => {
        it('should show close fullscreen icon when isFullscreen is true', () => {
            render(<WindowHeader {...defaultProps} isFullscreen />);
            expect(screen.getByTestId('close-full-icon')).toBeInTheDocument();
        });

        it('should show open fullscreen icon when isFullscreen is false', () => {
            render(<WindowHeader {...defaultProps} isFullscreen={false} />);
            expect(screen.getByTestId('open-full-icon')).toBeInTheDocument();
        });
    });

    describe('Edge cases', () => {
        it('should work without optional onHideWindow', () => {
            const { onHideWindow, ...props } = defaultProps;
            expect(() => {
                render(<WindowHeader {...props} />);
            }).not.toThrow();
        });

        it('should work without position', () => {
            const props = { ...defaultProps, position: undefined };
            render(<WindowHeader {...props} />);

            const buttons = screen.getAllByTestId('icon-button');
            fireEvent.click(buttons[2]); // Close button

            expect(defaultProps.onCloseWindow).toHaveBeenCalledWith(
                undefined,
                'window-1'
            );
        });

        it('should handle null windowRef', () => {
            const props = { ...defaultProps, windowRef: { current: null } };

            expect(() => {
                render(<WindowHeader {...props} />);
                const header = screen
                    .getByText('Test Window')
                    .closest('.windowHeader');
                fireEvent.mouseDown(header!);
                fireEvent.mouseMove(document, { clientX: 150, clientY: 120 });
            }).not.toThrow();
        });
    });
});
