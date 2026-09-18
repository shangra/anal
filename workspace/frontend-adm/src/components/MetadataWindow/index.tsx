import { Component, ReactNode } from 'react';
import $windows from 'components/WindowsCMP/windows.helper';
import $message from 'components/ui/MyFlash/message.helper';
import { CloseIcon, ControllIcon, DownloadIcon, DropDownIcon, DropUpIcon, Loader, PopConfirm } from 'ui-kit';
import style from './md-window.module.css';
import { SimpleModal } from 'components/MetadataWindow/SimpleModal';
import { MetadataHier } from 'components/MetadataHier';
import { v4 } from 'uuid';
import $api from 'helpers/axios';
import $modal from 'components/ui/MyModal/modal.helper';
import DumpModalContent from 'components/DumpModal/DumpModalContent';
import { PanelPosition } from 'components/WindowsCMP/interfaces';
import { getSavedServers, saveServer, removeServer } from './savedServers.helper';
import { ESB_ENABLED } from 'settings/settings';

interface IResponseServer {
    connectionsCount: number;
    ESB_NAME: string;
    SERVICE_NAME: string;
}

interface IProps {
    serverList: string[];
}

interface IState {
    closeUUID: string;
    restoreDumpUUID: string;
    settingUUID: string;
    openedModal: boolean;
    openedTree: Map<string, string>;
    serverList: string[];
    unavailableServers: string[];
    collapsedUnavailable: boolean;
    isLoaded: boolean;
}

export class MetadataWindow extends Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);
        this.state = {
            closeUUID: '',
            restoreDumpUUID: '',
            settingUUID: '',
            openedModal: false,
            openedTree: new Map(),
            serverList: [],
            unavailableServers: [],
            collapsedUnavailable: true,
            isLoaded: false,
        };
    }

    private loadServers = (): void => {
        this.setState({ isLoaded: false, serverList: [], unavailableServers: [] });

        $api.get<Record<string, IResponseServer>>('/systemsettings/servers/info')
            .then(({ data }) => {
                const entries = Object.values(data);
                const names = entries
                    .map((s) => s.ESB_NAME)
                    .filter((name): name is string => typeof name === 'string' && name.length > 0);
                entries
                    .filter((s) => typeof s.ESB_NAME !== 'string' || s.ESB_NAME.length === 0)
                    .forEach((s) => console.warn(`Сервер "${s.SERVICE_NAME}" пропущен: ESB_NAME не задан`));
                const namesLower = names.map((n) => n.toLowerCase());
                const unavailable = (this.props.serverList ?? []).filter((name) => !namesLower.includes(name.toLowerCase()));
                this.setState({ serverList: names, unavailableServers: unavailable, isLoaded: true });
                this.restoreSavedServers(names);
            })
            .catch(() => {
                this.setState({ serverList: [], unavailableServers: this.props.serverList ?? [], isLoaded: true });
                this.setState({ openedModal: true });
            });
    };

    private restoreDump = (): void => {
        $modal.show('Восстановить дамп', <DumpModalContent />);
    };

    componentDidMount(): void {
        // TODO setTimeout - 0 -- антипаттерн!
        setTimeout(() => {
            const closeUUID = $windows.open(
                <PopConfirm
                    content="Выйти из аккаунта?"
                    rejectLabel="Нет"
                    confirmLabel="Да"
                    onConfirm={() => {
                        $api.get('/auth/logout');
                    }}
                >
                    <CloseIcon color="white" />
                </PopConfirm>,
                null,
                {
                    position: PanelPosition.left,
                    type: 'setting',
                },
            );
            this.setState({ closeUUID });
        }, 0);
        setTimeout(() => {
            const restoreDumpUUID = $windows.open(<DownloadIcon onClick={this.restoreDump} color="white" />, null, {
                position: PanelPosition.left,
                type: 'setting',
            });
            this.setState({ restoreDumpUUID });
        }, 0);

        if (!ESB_ENABLED) {
            const uuid = v4();
            $windows.open(
                'backend',
                <div style={{ height: '100%' }}>
                    <MetadataHier server="" />
                </div>,
                {
                    width: '350px',
                    uuid,
                    position: PanelPosition.left,
                    isMinimized: false,
                    onClose: () => this.handleTreeClose('backend', uuid),
                },
            );
            return;
        }
        const settingUUID = $windows.open(<ControllIcon color="white" onClick={this.openModal} />, null, {
            position: PanelPosition.left,
            type: 'setting',
        });
        this.setState({ settingUUID });

        const savedServers = getSavedServers();

        if (savedServers.length === 0) {
            this.setState({ openedModal: true });
        }

        this.loadServers();
    }

    componentWillUnmount(): void {
        $windows.close(this.state.settingUUID);
        $windows.close(this.state.closeUUID);
        $windows.close(this.state.restoreDumpUUID);
        this.state.openedTree.forEach((uuid) => $windows.close(uuid));
    }

    private restoreSavedServers(availableServers: string[]): void {
        const savedServers = getSavedServers();
        if (savedServers.length === 0) return;

        const available: string[] = [];
        const unavailable: string[] = [];

        for (const name of savedServers) {
            if (availableServers.includes(name)) {
                available.push(name);
            } else {
                unavailable.push(name);
                removeServer(name);
            }
        }

        for (const name of unavailable) {
            $message.show(`Сервер ${name} недоступен`);
        }

        if (unavailable.length > 0) {
            this.setState({ unavailableServers: unavailable });
        }

        for (const name of available) {
            this.openTree(name);
        }
    }

    private openModal = (): void => {
        this.loadServers();
        this.setState({ openedModal: true });
    };

    private closeModal = (): void => this.setState({ openedModal: false });

    private toggleUnavailable = (): void => {
        this.setState((prev) => ({ collapsedUnavailable: !prev.collapsedUnavailable }));
    };

    private handleTreeClose = (name: string, uuid: string) => {
        this.setState((prevState) => {
            const newOpenedTree = new Map(prevState.openedTree);
            newOpenedTree.delete(name);
            return { openedTree: newOpenedTree };
        });
        removeServer(name);
        $windows.removeRegistry(uuid);
    };

    private openTree = (name: string): void => {
        const existingUUID = this.state.openedTree.get(name);
        if (existingUUID) {
            $windows.focus(existingUUID);
            return;
        }
        saveServer(name);
        const server = name.toLowerCase() ?? '';
        const uuid = v4();
        $windows.open(
            name,
            <div style={{ height: '100%' }}>
                <MetadataHier server={server} />
            </div>,
            {
                width: '350px',
                uuid,
                position: PanelPosition.left,
                isMinimized: false,
                onClose: () => this.handleTreeClose(name, uuid),
            },
        );

        this.setState((prevState) => ({
            openedTree: new Map(prevState.openedTree).set(name, uuid),
        }));
        this.closeModal();
    };

    render(): ReactNode {
        if (!ESB_ENABLED) return null;
        const { isLoaded, openedModal, serverList, unavailableServers, openedTree, collapsedUnavailable } = this.state;

        if (!isLoaded) {
            return (
                <SimpleModal opened={openedModal} onClose={this.closeModal} title="Сервера">
                    <div className={style.loaderContainer}>
                        <Loader size="large" />
                    </div>
                </SimpleModal>
            );
        }

        if (serverList.every((name) => openedTree.has(name)) && unavailableServers.length === 0) {
            return (
                <SimpleModal opened={openedModal} onClose={this.closeModal} title="Сервера">
                    <div className={style.loaderContainer}>Нет доступных серверов</div>
                </SimpleModal>
            );
        }

        return (
            <SimpleModal opened={openedModal} onClose={this.closeModal} title="Сервера">
                <>
                    <div className={style.servers}>
                        {serverList
                            ?.filter((name) => !openedTree.has(name))
                            .map((name) => (
                                <button
                                    key={name}
                                    onClick={() => this.openTree(name)}
                                    className={style.servers_item}
                                    type="button"
                                >
                                    {name}
                                </button>
                            ))}
                    </div>
                    {unavailableServers.length > 0 && (
                        <div className={style.unavailableBlock}>
                            <div className={style.unavailableHeader} onClick={this.toggleUnavailable}>
                                <p className={style.unavailableTitle}>Недоступные сервера ({unavailableServers.length})</p>
                                {collapsedUnavailable ? (
                                    <DropDownIcon color="secondary" size="small" />
                                ) : (
                                    <DropUpIcon color="secondary" size="small" />
                                )}
                            </div>
                            {!collapsedUnavailable && (
                                <div className={style.unavailableList}>
                                    {unavailableServers.map((name) => (
                                        <p key={name} className={style.unavailableItem}>
                                            {name}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            </SimpleModal>
        );
    }
}
