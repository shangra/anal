import { Component, ReactNode, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Window } from 'components/WindowsCMP/components/Window';
import { IWindow, PanelPosition } from 'components/WindowsCMP/interfaces';
import { ErrorBoundary } from 'components/ErrorBoundary';

interface IProps extends IWindow {
    index: string;
    children: ReactNode;
    onCloseWindow: (position: PanelPosition | undefined, key: string) => void;
    onHideWindow?: (position: PanelPosition | undefined, key: string) => void;
    setWindowActive?: (key: string) => void;
    setWindowPosition?: (
        key: string,
        prevPosition: PanelPosition | undefined,
        newPosition: PanelPosition
    ) => void;
    onToggleFullScreen?: (
        key: string,
        measures: {
            position: { x: number; y: number };
            size: { width: number; height: number };
        }
    ) => void;
    isFullscreen?: boolean;
}

interface IState {
    backPressed: boolean;
}

export class WindowCMP extends Component<IProps, IState> {
    public windowsBack: CSSProperties;

    constructor(props: IProps) {
        super(props);

        this.state = {
            backPressed: false,
        };

        this.windowsBack = {
            left: 0,
            top: 0,
            width: 'calc(100vw - 60px)',
            height: 'calc(100vh - 90px)',
            position: 'absolute',
            // zIndex: 'calc( var(--zindex-modal) - 1)',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
        };
    }

    onWindowsBack = (pressed: boolean) => {
        this.setState({
            backPressed: pressed,
        });
    };

    setWindowPosition = (newPosition: PanelPosition) => {
        this.props.setWindowPosition?.(
            this.props.index,
            this.props.position,
            newPosition
        );
    };

    render() {
        const {
            index,
            title,
            setWindowActive,
            onHideWindow,
            onCloseWindow,
            onToggleFullScreen,
            isFullscreen,
            children,
            portal,
            style,
            position,
        } = this.props;

        const windowEl = (
            <div id={`window-${index}`}>
                {this.state.backPressed && (
                    <div
                        id={`window-${index}-back`}
                        style={this.windowsBack!}
                    />
                )}
                <Window
                    index={String(index)}
                    title={title}
                    style={style}
                    position={position}
                    onHideWindow={onHideWindow}
                    onCloseWindow={onCloseWindow}
                    onWindowsBack={this.onWindowsBack}
                    setWindowPosition={this.setWindowPosition}
                    setWindowActive={setWindowActive}
                    onToggleFullScreen={onToggleFullScreen}
                    isFullscreen={isFullscreen}
                >
                    <ErrorBoundary
                        downloadLogs={{
                            logObj: { props: {}, state: {} },
                            fileName: 'WindowsCMP',
                        }}
                    >
                        {children}
                    </ErrorBoundary>
                </Window>
            </div>
        );

        return portal ? createPortal(windowEl, portal) : windowEl;
    }
}
