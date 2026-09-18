import {
    type CSSProperties,
    createContext,
    createRef,
    PureComponent,
    type ReactNode,
    type RefObject,
} from 'react';
import { ErrorBoundary } from 'components/ErrorBoundary';
import type { PanelPosition } from 'components/WindowsCMP/interfaces';
import style from '../../windowsCmp.module.css';
import { WindowHeader } from 'components/WindowsCMP/components/WindowHeader';

interface IProps {
    index: string;
    title: string;
    children: ReactNode;
    style?: CSSProperties;
    position?: PanelPosition;
    onWindowsBack: (pressed: boolean) => void;
    onCloseWindow: (position: PanelPosition | undefined, key: string) => void;
    onHideWindow?: (position: PanelPosition | undefined, key: string) => void;
    setWindowActive?: (key: string) => void;
    setWindowPosition: (position: PanelPosition) => void;
    onToggleFullScreen?: (
        key: string,
        measures: {
            position: { x: number; y: number };
            size: { width: number; height: number };
        }
    ) => void;
    isFullscreen?: boolean;
}

export const WindowContext = createContext<
    Partial<IProps> & { ref: RefObject<HTMLDivElement> | null }
>({ ref: null });

export class Window extends PureComponent<IProps> {
    private readonly ref: RefObject<HTMLDivElement>;

    constructor(props: IProps) {
        super(props);

        this.ref = createRef<HTMLDivElement>();
    }

    onMouseDown = (key: string) => () => {
        const { setWindowActive } = this.props;

        setWindowActive?.(key);
    };

    render() {
        const {
            onWindowsBack,
            onHideWindow,
            onCloseWindow,
            onToggleFullScreen,
            index,
            title,
            children,
            setWindowPosition,
            position,
            isFullscreen,
        } = this.props;

        return (
            <div
                ref={this.ref}
                style={this.props.style ?? {}}
                className={style.window}
                onMouseDown={this.onMouseDown(index)}
            >
                <WindowContext.Provider value={{ ref: this.ref }}>
                    <WindowHeader
                        onWindowsBack={onWindowsBack}
                        onHideWindow={onHideWindow}
                        onCloseWindow={onCloseWindow}
                        index={index}
                        windowRef={this.ref}
                        title={title}
                        position={position}
                        setWindowPosition={setWindowPosition}
                        onToggleFullScreen={onToggleFullScreen}
                        isFullscreen={isFullscreen}
                    />
                    <div className={style.contentWindows}>
                        <ErrorBoundary>{children}</ErrorBoundary>
                    </div>
                </WindowContext.Provider>
            </div>
        );
    }
}
