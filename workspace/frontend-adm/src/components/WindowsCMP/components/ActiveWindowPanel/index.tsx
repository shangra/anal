import React, { RefObject, createRef } from 'react';
import { IconButton } from 'ui-kit';
import cn from 'classnames';
import { IWindow, PanelPosition } from 'components/WindowsCMP/interfaces';
import { CloseIcon } from 'components/WindowsCMP/icons/CloseIcon';
import { HideWindowIcon } from 'components/WindowsCMP/icons/HideWindowIcon';
import { OpenFullWindowIcon } from 'components/WindowsCMP/icons/OpenFullWindowIcon';
import { ResizableBlock } from 'components/WindowsCMP/components/ResizableBlock';
import style from './style.module.css';
import sidebarStyle from '../Sidebar/style.module.css';
import { StickMenu } from 'components/WindowsCMP/components/StickMenu';
import { PinIcon } from 'components/WindowsCMP/icons/PinIcon';
import { isTrueStorageValue } from 'components/WindowsCMP/components/ActiveWindowPanel/utils';
import { capitalizeFirstLetter } from 'components/WindowsCMP/utils';

interface IActiveWindowPanelProps {
    windows: IWindow[];
    activeWindowId: string;
    panelPosition: PanelPosition;
    /** Флаг, указывающий, открыт ли нижний сайдбар/панель */
    isBottomSidebarOpen?: boolean;
    onCloseWindow: (position: PanelPosition | undefined, key: string) => void;
    onExpandWindow: (position: PanelPosition, key: string) => void;
    setTabInactive: (position: PanelPosition, key: string) => void;
    onChangePanelPosition: (
        key: string,
        oldPosition: PanelPosition,
        newPosition: PanelPosition
    ) => void;
}

interface IActiveWindowPanelState {
    isHidden: boolean;
    isPinned: boolean;
}

const ACTIVE_WINDOW_PANEL_PREFIX = 'activeWindowPanel';
const STORAGE_KEY_PREFIX_IS_PINNED = 'is-pinned-active-window-panel';
const BOTTOM_PANEL_HEIGHT = 60; // Высота нижней панели

/**
 * Панель с содержимым активной вкладки в сайдбаре
 */
export class ActiveWindowPanel extends React.Component<
    IActiveWindowPanelProps,
    IActiveWindowPanelState
> {
    private blockRef: RefObject<HTMLDivElement> = createRef();

    constructor(props: IActiveWindowPanelProps) {
        super(props);

        const isPinnedFromStorage = isTrueStorageValue(
            localStorage.getItem(
                `${STORAGE_KEY_PREFIX_IS_PINNED}_${this.props.panelPosition}`
            )
        );

        this.state = {
            isHidden: false,
            isPinned: isPinnedFromStorage,
        };
    }

    componentDidMount() {
        this.setPadding();

        // Отслеживание перемещения курсора для смещения рабочей области
        document.addEventListener('mousemove', this.handleMouseMove);
    }

    componentWillUnmount() {
        const body = document.querySelector('body');
        // Убрать смещение у body при размонтировании компонента
        if (body) body.style.padding = '0';

        document.removeEventListener('mousemove', this.handleMouseMove);
    }

    componentDidUpdate(
        prevProps: Readonly<IActiveWindowPanelProps>,
        prevState: Readonly<IActiveWindowPanelState>
    ) {
        // Если обновились props - значит поменялась ссылка на активное окно => отобразить зону активного окна
        if (prevState.isHidden) {
            this.setState({ isHidden: false });
        }
        if (prevProps !== this.props || prevState !== this.state) {
            this.setPadding();
        }
    }

    /**
     * Закрытие окна по кнопке крестика
     * @description Скрывается зона активного окна и удаляется окно из сайдбара
     */
    onClickClose = () => {
        const { activeWindowId, onCloseWindow, panelPosition } = this.props;

        onCloseWindow(panelPosition, activeWindowId);
        this.setState({ isHidden: true });
    };

    /**
     * Сворачивание окна по кнопке нижней черты
     * @description Скрывается зона активного окна, но окно не удаляется из сайдбара
     */
    onClickHide = () => {
        const { activeWindowId, setTabInactive, panelPosition } = this.props;

        // При скрытии зоны активного окна деактивировать окно
        setTabInactive(panelPosition, activeWindowId);
        this.setState({ isHidden: true });
    };

    /**
     * Разворачивание окна по кнопке
     * @description Скрывается зона активного окна, окно удаляется из сайдбара и открывается модальное окно
     */
    onClickExpand = () => {
        const { activeWindowId, onExpandWindow, panelPosition } = this.props;

        onExpandWindow(panelPosition, activeWindowId);
        this.setState({ isHidden: true });
    };

    /**
     * Закрепление/открепление окна
     * @description При закреплении окна у рабочей области появляется смещение.
     * При откреплённом окне смещения нет и окно отображается поверх контента по типу Drawer.
     * Значение isPinned сохраняется в localStorage, чтобы при новом рендере не терять состояние.
     */
    onClickPin = () => {
        this.setState((prevState) => {
            const newValue = !prevState.isPinned;
            localStorage.setItem(
                `${STORAGE_KEY_PREFIX_IS_PINNED}_${this.props.panelPosition}`,
                String(newValue)
            );
            return { ...prevState, isPinned: newValue };
        });
    };

    handleMouseMove = () => {
        this.setPadding();
    };

    /**
     * Метод установки паддинга для смещения контента рабочей области
     */
    setPadding = () => {
        const body = document.querySelector('body');

        if (!body) return;

        // Если сайдбар закреплён
        if (this.state.isPinned) {
            const sidebarSelector =
                sidebarStyle[
                    `modalSidebar${capitalizeFirstLetter(
                        this.props.panelPosition
                    )}`
                ];

            const sideBar = document.querySelector(
                `.${sidebarSelector}`
            ) as HTMLElement;
            const activeWindowPanel = document.querySelector(
                `#${ACTIVE_WINDOW_PANEL_PREFIX}_${this.props.panelPosition}`
            ) as HTMLElement;

            const sideBarWidth = sideBar?.offsetWidth ?? 0;
            const activeWindowPanelWidth = activeWindowPanel?.offsetWidth ?? 0;
            const activeWindowPanelHeight =
                activeWindowPanel?.offsetHeight ?? 0;

            if (sideBarWidth && activeWindowPanelWidth) {
                if (this.props.panelPosition === PanelPosition.left) {
                    body.style.paddingLeft = `${
                        sideBarWidth + activeWindowPanelWidth
                    }px`;
                    // Если открыт нижний сайдбар — добавляем отступ снизу
                    body.style.paddingBottom = this.props.isBottomSidebarOpen
                        ? `${BOTTOM_PANEL_HEIGHT}px`
                        : '0';
                }
                if (this.props.panelPosition === PanelPosition.right) {
                    body.style.paddingRight = `${activeWindowPanelWidth}px`;
                    // Если открыт нижний сайдбар — добавляем отступ снизу
                    body.style.paddingBottom = this.props.isBottomSidebarOpen
                        ? `${BOTTOM_PANEL_HEIGHT}px`
                        : '0';
                }
                if (this.props.panelPosition === PanelPosition.bottom) {
                    body.style.paddingBottom = `${activeWindowPanelHeight}px`;

                    const contentElement =
                        document.querySelector<HTMLDivElement>('.head + div');
                    const navigationWrap =
                        document.querySelector<HTMLDivElement>(
                            '.navigation-wrap'
                        );
                    contentElement!.style.overflowY = 'auto';
                    contentElement!.style.height = `calc(100vh - ${navigationWrap?.offsetHeight}px - ${activeWindowPanelHeight}px - 60px)`;
                }
            }
        } else if (body) {
            if (this.props.panelPosition === PanelPosition.left) {
                body.style.paddingLeft = '0';
                body.style.paddingBottom = '0';
            }
            if (this.props.panelPosition === PanelPosition.right) {
                body.style.paddingRight = '0';
                body.style.paddingBottom = '0';
            }
            if (this.props.panelPosition === PanelPosition.bottom) {
                body.style.paddingBottom = '0';
            }
        }
    };

    onChangePanelPosition = (newPosition: PanelPosition) => {
        const { activeWindowId, panelPosition } = this.props;

        this.props.onChangePanelPosition(
            activeWindowId,
            panelPosition,
            newPosition
        );
    };

    render() {
        const panelStyle: React.CSSProperties = {};
        if (
            this.props.isBottomSidebarOpen &&
            (this.props.panelPosition === PanelPosition.left ||
                this.props.panelPosition === PanelPosition.right)
        ) {
            panelStyle.paddingBottom = `${BOTTOM_PANEL_HEIGHT}px`;
        }
        const windowObj = this.props.windows.find(
            (obj) => obj.key === this.props.activeWindowId
        );
        const widthRaw = windowObj?.style?.width ?? 0;
        const width = parseInt(String(widthRaw), 10);
        return (
            <div
                ref={this.blockRef}
                className={cn(style.activeWindowPanelWrapper, {
                    [style.activeWindowPanelWrapperLeft]:
                        this.props.panelPosition === PanelPosition.left,
                    [style.activeWindowPanelWrapperRight]:
                        this.props.panelPosition === PanelPosition.right,
                    [style.activeWindowPanelWrapperBottom]:
                        this.props.panelPosition === PanelPosition.bottom,
                })}
            >
                <ResizableBlock
                    id={`${ACTIVE_WINDOW_PANEL_PREFIX}_${this.props.panelPosition}`}
                    isHidden={this.state.isHidden}
                    position={this.props.panelPosition}
                    initialSize={width !== 0 ? width : undefined}
                >
                    {this.props.windows.map((window) => (
                        <div
                            key={window?.key}
                            className={cn(style.activeWindowPanel, {
                                [style.activeWindowPanelHidden]:
                                    window.key !== this.props.activeWindowId,
                            })}
                        >
                            <div className={style.activeWindowPanelHeader}>
                                <StickMenu
                                    onSelect={this.onChangePanelPosition}
                                />
                                <IconButton
                                    variant={
                                        this.state.isPinned
                                            ? 'contained'
                                            : 'text'
                                    }
                                    size='small'
                                    icon={PinIcon}
                                    color='controlled'
                                    onClick={this.onClickPin}
                                />
                                <IconButton
                                    variant='text'
                                    size='small'
                                    icon={HideWindowIcon}
                                    onClick={this.onClickHide}
                                />
                                <IconButton
                                    icon={OpenFullWindowIcon}
                                    variant='text'
                                    size='small'
                                    onClick={this.onClickExpand}
                                />
                                <IconButton
                                    variant='text'
                                    size='small'
                                    icon={CloseIcon}
                                    onClick={this.onClickClose}
                                />
                            </div>

                            <div
                                className={style.activeWindowPanelBody}
                                style={panelStyle}
                            >
                                {window?.content}
                            </div>
                        </div>
                    ))}
                </ResizableBlock>
            </div>
        );
    }
}
