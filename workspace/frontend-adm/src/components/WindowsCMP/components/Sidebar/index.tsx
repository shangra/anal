import React, { SyntheticEvent } from 'react';
import cn from 'classnames';
import { IWindow, PanelPosition } from 'components/WindowsCMP/interfaces';
import style from './style.module.css';
import { Tab } from 'components/WindowsCMP/components/Tab';
import { CloseIcon, WindowFrameIcon } from 'ui-kit';

interface IModalSidebarProps {
    /** Список окон в сайдбаре */
    windows: IWindow[];
    /** id активного окна в сайдбаре */
    activeTabId: string;
    /** Позиционирование сайдбара left, right или bottom */
    position: PanelPosition;
    /** Обработчики клика по вкладке сайдбара */
    onTabClick: (key: string) => void;

    onCloseWindow: (position: PanelPosition | undefined, key: string) => void;

    onExpandWindow: (position: PanelPosition, key: string) => void;
}

interface IModalSidebarState {}

/**
 * Компонент сайдбара с вкладками свёрнутых окон.
 * Может располагаться слева, справа или снизу в зависимости от параметра props.position.
 */
export class WindowSidebar extends React.Component<
    IModalSidebarProps,
    IModalSidebarState
> {
    onTabClick = (key: string) => () => {
        this.props.onTabClick(key);
    };

    onCloseWindow = (e: SyntheticEvent, windowKey: string) => {
        e.stopPropagation();
        this.props.onCloseWindow(this.props.position, windowKey);
    };

    onExpandWindow = (e: SyntheticEvent, windowKey: string) => {
        e.stopPropagation();
        this.props.onExpandWindow(this.props.position, windowKey);
    };

    render() {
        const { windows, activeTabId, position } = this.props;

        return (
            <div
                className={cn(style.modalSidebar, {
                    [style.modalSidebarLeft]: position === PanelPosition.left,
                    [style.modalSidebarRight]: position === PanelPosition.right,
                    [style.modalSidebarBottom]:
                        position === PanelPosition.bottom,
                })}
            >
                <div
                    className={cn(style.sidebarTabs, {
                        [style.sidebarTabsBottom]:
                            position === PanelPosition.bottom,
                    })}
                >
                    {windows.map(({ key, title, type }) => {
                        if (type === 'setting') {
                            return (
                                <div key={key}>
                                    <div className={style.settingButton}>
                                        {title}
                                    </div>
                                    <hr style={{ margin: '8px -8px 0' }} />
                                </div>
                            );
                        } return (
                                <Tab
                                    title={title}
                                    position={position}
                                    key={key}
                                    onClick={this.onTabClick(key)}
                                    isActive={activeTabId === key}
                                    afterIcons={[
                                        <WindowFrameIcon
                                            onClick={(e) =>
                                                this.onExpandWindow(e, key)
                                            }
                                        />,
                                        <CloseIcon
                                            onClick={(e) =>
                                                this.onCloseWindow(e, key)
                                            }
                                        />,
                                    ]}
                                />
                            );
                    })}
                </div>
            </div>
        );
    }
}
