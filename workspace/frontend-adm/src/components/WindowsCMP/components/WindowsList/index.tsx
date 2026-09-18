import { Component, CSSProperties } from 'react';
import StateManager from 'lite-react-statemanager';
import {
  ISidebarState,
  IWindow,
  IWindowKey,
  IWindowState,
  PanelPosition } from
"components/WindowsCMP/interfaces";
import { WindowCMP } from "components/WindowsCMP/components/WindowCMP";
import { WindowSidebar } from "components/WindowsCMP/components/Sidebar";
import { ActiveWindowPanel } from "components/WindowsCMP/components/ActiveWindowPanel";
import style from '../../windowsCmp.module.css';
import { isEmptySidebar } from "components/WindowsCMP/utils";

type WindowWithTray = IWindow & {trayRestoreAsModal?: boolean;};

interface IProps {}

interface IState {
  windows: Record<string, WindowWithTray>;
  /** Максимальный z-index для корректного отображения модальных окон друг поверх друга */
  maxZIndex: number;
  /** id активного окна в сайдбаре и зоне активного окна */
  activeTabId: string;
  prevActiveWindow: IWindowKey | undefined;
  sidebars: {
    [PanelPosition.left]: ISidebarState;
    [PanelPosition.right]: ISidebarState;
    [PanelPosition.bottom]: ISidebarState;
  };
  fullscreenWindows: {
    [key: string]: {
      originalStyle?: CSSProperties;
      originalPosition?: {x: number;y: number;};
      originalSize?: {width: number;height: number;};
    };
  };
}

const deleteKeyEverywhere = (
sidebars: IState['sidebars'],
key: string)
: IState['sidebars'] => {
  const left = {
    ...sidebars[PanelPosition.left],
    tabs: { ...sidebars[PanelPosition.left].tabs }
  };
  const right = {
    ...sidebars[PanelPosition.right],
    tabs: { ...sidebars[PanelPosition.right].tabs }
  };
  const bottom = {
    ...sidebars[PanelPosition.bottom],
    tabs: { ...sidebars[PanelPosition.bottom].tabs }
  };
  delete left.tabs[key];
  delete right.tabs[key];
  delete bottom.tabs[key];
  return {
    [PanelPosition.left]: left,
    [PanelPosition.right]: right,
    [PanelPosition.bottom]: bottom
  };
};

const sanitizeSidebarActive = (
sidebar: ISidebarState,
windows: IWindowState)
: ISidebarState => {
  if (Object.keys(sidebar.tabs).length === 0 && sidebar.activeTabId) {
    return { ...sidebar, activeTabId: '' };
  }
  const id = sidebar.activeTabId;
  if (id && (!sidebar.tabs[id] || !windows[id])) {
    return { ...sidebar, activeTabId: '' };
  }
  return sidebar;
};

const clearActiveIfKey = (sidebar: ISidebarState, key: string): ISidebarState =>
sidebar.activeTabId === key ? { ...sidebar, activeTabId: '' } : sidebar;

export class WindowsCMP extends Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      windows: {},
      maxZIndex: 1053, // начальное значение z-index для окон
      activeTabId: '',
      prevActiveWindow: undefined,
      sidebars: {
        [PanelPosition.left]: {
          isOpen: false,
          tabs: {},
          activeTabId: ''
        },
        [PanelPosition.right]: {
          isOpen: false,
          tabs: {},
          activeTabId: ''
        },
        [PanelPosition.bottom]: {
          isOpen: false,
          tabs: {},
          activeTabId: ''
        }
      },
      fullscreenWindows: {}
    };
  }

  componentDidMount() {
    StateManager.subscribeState({
      windows: { subscribeWindow: this.openWindow }
    });
  }

  componentWillUnmount() {
    StateManager.unsubscribeState({ windows: ['subscribeWindow'] });
  }

  /**
   * Закрытие окна по ключу
   * @param position {PanelPosition} - положение окна
   * @param key {string} - id окна
   */
  onCloseWindow = (position: PanelPosition | undefined, key: string) => {
    this.setState((prevState) => {
      prevState.windows[key]?.onClose?.();
      const nextWindows = { ...prevState.windows };
      delete nextWindows[key];

      let sidebars = deleteKeyEverywhere(prevState.sidebars, key);
      sidebars = {
        [PanelPosition.left]: clearActiveIfKey(
          sidebars[PanelPosition.left],
          key
        ),
        [PanelPosition.right]: clearActiveIfKey(
          sidebars[PanelPosition.right],
          key
        ),
        [PanelPosition.bottom]: clearActiveIfKey(
          sidebars[PanelPosition.bottom],
          key
        )
      };
      sidebars = {
        [PanelPosition.left]: sanitizeSidebarActive(
          sidebars[PanelPosition.left],
          nextWindows
        ),
        [PanelPosition.right]: sanitizeSidebarActive(
          sidebars[PanelPosition.right],
          nextWindows
        ),
        [PanelPosition.bottom]: sanitizeSidebarActive(
          sidebars[PanelPosition.bottom],
          nextWindows
        )
      };

      return {
        ...prevState,
        windows: nextWindows,
        sidebars
      };
    });
  };

  onToggleFullScreen = (
  key: string,
  measures: {
    position: {x: number;y: number;};
    size: {width: number;height: number;};
  }) =>
  {
    this.setState((prevState) => {
      const isCurrentlyFullscreen = prevState.fullscreenWindows[key];
      const currentWindow = prevState.windows[key];

      if (isCurrentlyFullscreen) {
        // Выход из полноэкранного режима
        const { originalStyle, originalPosition, originalSize } =
        prevState.fullscreenWindows[key];

        // Удаляем из fullscreenWindows
        const newFullscreenWindows = { ...prevState.fullscreenWindows };
        delete newFullscreenWindows[key];

        return {
          ...prevState,
          fullscreenWindows: newFullscreenWindows,
          windows: {
            ...prevState.windows,
            [key]: {
              ...currentWindow,
              style: {
                ...originalStyle,
                width: originalSize?.width,
                height: originalSize?.height,
                transform: `translate(${
                originalPosition?.x || 0
                }px, ${originalPosition?.y || 0}px)`
              }
            }
          }
        };
      }

      return {
        ...prevState,
        fullscreenWindows: {
          ...prevState.fullscreenWindows,
          [key]: {
            originalStyle: currentWindow?.style,
            originalPosition: measures.position,
            originalSize: measures.size
          }
        },
        windows: {
          ...prevState.windows,
          [key]: {
            ...currentWindow,
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: 'calc(100vw - 60px)',
              height: 'calc(100vh - 90px)',
              transform: `translate(${0}px, ${0}px)`,
              zIndex: prevState.maxZIndex + 1
            }
          }
        }
      };
    });
  };

  /**
   * Открытие нового окна
   * @param {IWindow} windows - объект нового окна
   */
  openWindow = ({ windows }: {windows: IWindow;}) => {
    const { key } = windows;

    if (!windows.close) {
      this.setState((prevState) => {
        const sidebars = deleteKeyEverywhere(prevState.sidebars, key);
        const newWindow: WindowWithTray = {
          ...windows,
          trayRestoreAsModal: true,
          style: {
            ...windows?.style,
            zIndex: prevState.maxZIndex + 1
          },
          isMinimized: !!windows.position
        };

        return {
          ...prevState,
          maxZIndex: prevState.maxZIndex + 1,
          windows: {
            ...prevState.windows,
            [key]: newWindow
          },
          sidebars: {
            ...sidebars,
            ...(!windows.position && {
              [PanelPosition.bottom]: {
                ...sidebars[PanelPosition.bottom],
                tabs: {
                  ...sidebars[PanelPosition.bottom].tabs,
                  [key]: { ...newWindow }
                },
                activeTabId:
                sidebars[PanelPosition.bottom].activeTabId
              }
            }),
            ...(windows.position && {
              [windows.position]: {
                ...prevState.sidebars[windows.position],
                activeTabId: key,
                tabs: {
                  ...sidebars[windows.position].tabs,
                  [key]: { ...newWindow }
                }
              }
            })
          },
          activeTabId:
          key === prevState.activeTabId ?
          '' :
          prevState.activeTabId
        };
      });
    } else {
      this.onCloseWindow(undefined, key);
    }
  };

  /**
   * Изменение положения окна
   * @param {string} key - ключ окна
   * @param {MenuPosition} prevPosition - предыдущее положение окна
   * @param {MenuPosition} newPosition - новое положение окна
   * @description Положение окна можно менять, когда оно в виде модального и в садбаре
   */
  setWindowPosition = (
  key: string,
  _prevPosition: PanelPosition | undefined,
  newPosition: PanelPosition) =>
  {
    this.setState((prevState) => {
      const win = prevState.windows[key];
      let sidebars = deleteKeyEverywhere(prevState.sidebars, key);

      const nextWin: WindowWithTray = {
        ...win,
        position: newPosition,
        isMinimized: true,
        trayRestoreAsModal: true
      };

      const nextActiveTabId =
      newPosition === PanelPosition.bottom ?
      key :
      sidebars[newPosition].activeTabId;

      sidebars = {
        ...sidebars,
        [newPosition]: {
          ...sidebars[newPosition],
          tabs: {
            ...sidebars[newPosition].tabs,
            [key]: nextWin
          },
          activeTabId: nextActiveTabId
        }
      };

      return {
        ...prevState,
        windows: {
          ...prevState.windows,
          [key]: nextWin
        },
        sidebars
      };
    });
  };

  /**
   * Активация окна
   * @param key {string} - ключ окна
   */
  setWindowActive = (key: string) => {
    this.setState((prevState) => {
      const newZIndex = prevState.maxZIndex + 1;

      const newState: IState = {
        ...prevState,
        maxZIndex: newZIndex,
        windows: {
          ...prevState.windows,
          [key]: {
            ...prevState.windows[key],
            trayRestoreAsModal: true,
            style: {
              ...prevState.windows[key]?.style,
              zIndex: newZIndex
            },
            isMinimized: false
          }
        },
        prevActiveWindow: key
      };

      return newState;
    });
  };

  /**
   * Активация вкладки в сайдбаре
   * @param {PanelPosition} position
   * @description При активации вкладки обновить position окна в state.windows и обновить activeTabId в сайдбаре
   */
  setTabActive = (position: PanelPosition) => (key: string) => {
    if (position === PanelPosition.bottom) {
      this.setState(
        (prevState) => {
          const sidebars = {
            ...prevState.sidebars,
            [PanelPosition.left]: {
              ...prevState.sidebars[PanelPosition.left],
              tabs: {
                ...prevState.sidebars[PanelPosition.left].tabs
              }
            },
            [PanelPosition.right]: {
              ...prevState.sidebars[PanelPosition.right],
              tabs: {
                ...prevState.sidebars[PanelPosition.right].tabs
              }
            }
          };

          if (sidebars[PanelPosition.left].tabs[key]) {
            delete sidebars[PanelPosition.left].tabs[key];
          }
          if (sidebars[PanelPosition.right].tabs[key]) {
            delete sidebars[PanelPosition.right].tabs[key];
          }

          return {
            ...prevState,
            sidebars
          };
        },
        () => {
          const w = (this.state.windows[key] as
          WindowWithTray |
          undefined);
          if (!w) return;

          if (w.position === PanelPosition.bottom) {
            this.setState((prev) => ({
              ...prev,
              windows: {
                ...prev.windows,
                [key]: {
                  ...prev.windows[key],
                  trayRestoreAsModal: false,
                  isMinimized: true
                }
              },
              sidebars: {
                ...prev.sidebars,
                [PanelPosition.bottom]: {
                  ...prev.sidebars[PanelPosition.bottom],
                  activeTabId: key
                }
              }
            }));
            return;
          }

          this.setWindowActive(key);
        }
      );
      return;
    }

    this.setState((prevState) => ({
      ...prevState,
      windows: {
        ...prevState.windows,
        [key]: {
          ...prevState.windows[key],
          position
        }
      },
      sidebars: {
        ...prevState.sidebars,
        [position]: {
          ...prevState.sidebars[position],
          activeTabId: key
        }
      }
    }));
  };

  /**
   * Деактивация окна (снятие фокуса) у выбранного сайдбара
   * @param position {PanelPosition} - расположение сайдбара
   * @param key {string} - id окна
   */
  setTabInactive = (position: PanelPosition, key: string) => {
    this.setState((prevState) => ({
      ...prevState,
      windows: {
        ...prevState.windows,
        [key]: {
          ...prevState.windows[key],
          isMinimized: true
        }
      },
      sidebars: {
        ...prevState.sidebars,
        [position]: {
          ...prevState.sidebars[position],
          activeTabId: ''
        }
      }
    }));
  };

  /**
   * Сворачивание модального окна в сайдбар
   * @param position {PanelPosition} - положение сайдбара
   * @param key {string} - id окна
   * @description Модальное окно скрывается и появляется в сайдбаре и области активного окна.
   * Если окно было ранее в левом/правом сайдбаре — оно сворачивается обратно в тот же сайдбар.
   * Если position не указан (окно не было в сайдбаре) — по умолчанию в нижний сайдбар.
   */
  onHideWindow = (_position: PanelPosition | undefined, key: string) => {
    const targetPosition = _position ?? PanelPosition.bottom;
    this.setState((prevState) => {
      const prevWin = prevState.windows[key];
      const updated: WindowWithTray = {
        ...prevWin,
        isMinimized: true,
        trayRestoreAsModal: true
      };
      let sidebars = deleteKeyEverywhere(prevState.sidebars, key);
      sidebars = {
        ...sidebars,
        [targetPosition]: {
          ...sidebars[targetPosition],
          tabs: {
            ...sidebars[targetPosition].tabs,
            [key]: updated
          },
          activeTabId: key
        }
      };

      return {
        ...prevState,
        windows: {
          ...prevState.windows,
          [key]: updated
        },
        sidebars
      };
    });
  };

  /**
   * Разворачивание окна из сайдбара
   * @param {PanelPosition} position - положение окна
   * @param {string} key - id окна
   * @description Окно удаляется из сайдбара и открывается модальное окно
   */
  onExpandWindow = (position: PanelPosition, key: string) => {
    this.setState((prevState) => {
      const tabs = { ...prevState.sidebars[position].tabs };
      delete tabs[key];
      const activeTabId =
      prevState.sidebars[position].activeTabId === key ?
      '' :
      prevState.sidebars[position].activeTabId;
      const win = prevState.windows[key];
      const nextWin: WindowWithTray = {
        ...win,
        isMinimized: false,
        trayRestoreAsModal: true
      };

      return {
        ...prevState,
        sidebars: {
          ...prevState.sidebars,
          [position]: {
            ...prevState.sidebars[position],
            tabs,
            activeTabId
          }
        },
        windows: {
          ...prevState.windows,
          [key]: nextWin
        }
      };
    });
  };

  /**
   * Изменение расположения зоны активного окна
   * @param key {string}
   * @param oldPosition {PanelPosition}
   * @param newPosition {PanelPosition}
   */
  onChangePanelPosition = (
  key: string,
  _oldPosition: PanelPosition,
  newPosition: PanelPosition) =>
  {
    this.setState((prevState) => {
      const win = prevState.windows[key];
      let sidebars = deleteKeyEverywhere(prevState.sidebars, key);

      const nextWin: WindowWithTray = {
        ...win,
        position: newPosition,
        isMinimized: true,
        trayRestoreAsModal: true
      };

      const nextActiveTabId =
      newPosition === PanelPosition.bottom ?
      key :
      sidebars[newPosition].activeTabId;

      sidebars = {
        ...sidebars,
        [newPosition]: {
          ...sidebars[newPosition],
          tabs: {
            ...sidebars[newPosition].tabs,
            [key]: nextWin
          },
          activeTabId: nextActiveTabId
        }
      };

      return {
        ...prevState,
        windows: {
          ...prevState.windows,
          [key]: nextWin
        },
        sidebars
      };
    });
  };

  render() {
    if (!Object.keys(this.state.windows).length) return null;
    const isBottomSidebarHasTabs =
    Object.keys(this.state.sidebars[PanelPosition.bottom].tabs).length >
    0;

    return (
      <div className={style.windowSystemContainer}>
                {Object.entries(this.state.sidebars).map(
          ([position, sidebar]) => {
            const panelPos = (position as PanelPosition);
            const activeId = sidebar.activeTabId;
            const activeWin = (this.state.windows[activeId] as
            WindowWithTray |
            undefined);
            const showActivePanel =
            sidebar.tabs[activeId]?.type !== 'setting' &&
            !!sidebar.tabs[activeId] && (
            panelPos !== PanelPosition.bottom ||
            activeWin?.trayRestoreAsModal === false);
            const tabItems = Object.values(sidebar.tabs).filter(
              (tab) => tab.type !== 'setting'
            );
            return (
              <div
                key={position}
                className={style.windowSystemContent}>

                                {!isEmptySidebar(sidebar) &&
                <WindowSidebar
                  windows={Object.values(sidebar.tabs)}
                  activeTabId={sidebar.activeTabId}
                  position={panelPos}
                  onTabClick={this.setTabActive(panelPos)}
                  onCloseWindow={this.onCloseWindow}
                  onExpandWindow={this.onExpandWindow} />}



                                {showActivePanel &&
                <ActiveWindowPanel
                  isBottomSidebarOpen={
                  isBottomSidebarHasTabs}

                  windows={tabItems}
                  activeWindowId={sidebar.activeTabId}
                  panelPosition={panelPos}
                  onExpandWindow={this.onExpandWindow}
                  onCloseWindow={this.onCloseWindow}
                  setTabInactive={this.setTabInactive}
                  onChangePanelPosition={
                  this.onChangePanelPosition} />}



                            </div>);

          }
        )}

                {Object.values(this.state.windows).map(
          (window) =>
          !window.isMinimized &&
          window.type !== 'setting' &&
          <WindowCMP
            {...window}
            index={window.key}
            position={window.position}
            onHideWindow={this.onHideWindow}
            onCloseWindow={this.onCloseWindow}
            setWindowPosition={this.setWindowPosition}
            setWindowActive={this.setWindowActive}
            onToggleFullScreen={this.onToggleFullScreen}
            isFullscreen={
            !!this.state.fullscreenWindows[window.key]}>


                                {window.content}
                            </WindowCMP>

        )}
            </div>);

  }
}