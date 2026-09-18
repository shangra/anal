import React, { RefObject, PureComponent, MouseEvent } from 'react';
import { StickMenu } from 'components/WindowsCMP/components/StickMenu';
import { PanelPosition } from 'components/WindowsCMP/interfaces';
import style from '../../windowsCmp.module.css';
import { CloseIcon, IconButton, Typography } from 'ui-kit';
import { HideWindowIcon } from 'components/WindowsCMP/icons/HideWindowIcon';
import { OpenFullWindowIcon } from 'components/WindowsCMP/icons/OpenFullWindowIcon';
import { CloseFullWindowIcon } from 'components/WindowsCMP/icons/CloseFullWindowIcon';

interface IProps {
    index: string;
    title: string;
    windowRef: RefObject<HTMLDivElement>;
    position?: PanelPosition;
    onWindowsBack: (pressed: boolean) => void;
    onCloseWindow: (position: PanelPosition | undefined, key: string) => void;
    setWindowPosition: (position: PanelPosition) => void;
    onHideWindow?: (position: PanelPosition | undefined, key: string) => void;
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
    pressed: boolean;
    position: {
        x: number;
        y: number;
    };
    mouseDown: {
        x: number;
        y: number;
    };
}

export class WindowHeader extends PureComponent<IProps, IState> {
    constructor(props: IProps) {
        super(props);

        this.state = {
            pressed: false,
            position: {
                x: 0,
                y: 0,
            },
            mouseDown: {
                x: 0,
                y: 0,
            },
        };
    }

    setPosition = ({ x, y }: { x: number; y: number }) => {
        // Если перемещение не заходит за границы шапки не выходит за границы окна
        if (y >= -70 && x >= 0) {
            this.setState((prevState) => ({
                ...prevState,
                position: { x, y },
            }));
            if (this.props.windowRef.current) {
                this.props.windowRef.current.style.transform = `translate(${x}px, ${y}px)`;
            }
        }
    };

    onMouseMove = (event: DocumentEventMap['mousemove']) => {
        // Ограничить перемещение курсора в пределах окна браузера
        if (
            this.state.pressed &&
            event.x > 30 &&
            event.x < window.innerWidth - 30 &&
            event.y > 30 &&
            event.y < window.innerHeight - 30
        ) {
            this.setPosition({
                x: event.x - this.state.mouseDown.x,
                y: event.y - this.state.mouseDown.y,
            });
        }
    };

    setPressed = (event: MouseEvent<HTMLDivElement>, pressed: boolean) => {
        this.setState(
            (prevState) => ({
                ...prevState,
                mouseDown: {
                    x: event.clientX - this.state.position.x,
                    y: event.clientY - this.state.position.y,
                },
            }),
            () => {
                if (pressed) {
                    document.addEventListener('mousemove', this.onMouseMove);
                    document.body.style.userSelect = 'none';
                } else {
                    document.removeEventListener('mousemove', this.onMouseMove);
                }
                this.setState(
                    (prevState) => ({ ...prevState, pressed }),
                    () => {
                        this.props.onWindowsBack(pressed);
                    }
                );
            }
        );
    };

    onMouseAction = (pressed: boolean) => (e: MouseEvent<HTMLDivElement>) => {
        // e.stopPropagation();
        this.setPressed(e, pressed);

        // Добавить обработку mouseup при нажатии мыши для обработки mouseup на header и mousedown на всём окне
        const handleMouseUp = () => {
            this.setPressed(e, false);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mouseup', handleMouseUp);
    };

    onClickCloseButton =
        (index: string) => (e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            this.props.onCloseWindow(this.props.position, index);
        };

    onClickHideButton =
        (index: string) => (e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            this.props.onHideWindow?.(this.props.position, index);
        };

    onToggleFullScreen =
        (index: string) => (e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            let width = 0;
            let height = 0;
            if (this.props.windowRef.current) {
                width = this.props.windowRef.current?.offsetWidth;
                height = this.props.windowRef.current?.offsetHeight;
            }
            this.props.onToggleFullScreen?.(index, {
                position: this.state.position,
                size: {
                    width,
                    height,
                },
            });
        };

    render() {
        const { title, index, setWindowPosition, isFullscreen } = this.props;

        return (
            <div className={style.windowHeaderWrapper}>
                <div
                    className={style.windowHeader}
                    onMouseDown={this.onMouseAction(true)}
                >
                    <div style={{ userSelect: 'none' }}>
                        <Typography className={style.windowHeaderTitle}>
                            {this.state.pressed
                                ? 'Dragging...'
                                : title ?? 'Press to drag'}
                        </Typography>
                    </div>
                </div>

                <div className={style.windowHeaderBtns}>
                    <StickMenu onSelect={setWindowPosition} />
                    <IconButton
                        icon={HideWindowIcon}
                        variant='text'
                        color='controlled'
                        size='small'
                        onClick={this.onClickHideButton(index)}
                    />
                    <IconButton
                        icon={
                            isFullscreen
                                ? CloseFullWindowIcon
                                : OpenFullWindowIcon
                        }
                        color='controlled'
                        variant='text'
                        size='small'
                        onClick={this.onToggleFullScreen(index)}
                    />
                    <IconButton
                        icon={CloseIcon}
                        variant='text'
                        color='controlled'
                        size='small'
                        onClick={this.onClickCloseButton(index)}
                    />
                </div>
            </div>
        );
    }
}
