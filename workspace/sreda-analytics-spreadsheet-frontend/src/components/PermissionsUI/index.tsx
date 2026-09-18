import StateManager from 'lite-react-statemanager';
import React, { Component } from 'react';
import { PlusIcon, Tab, Tabs } from 'ui-kit';

import $api from '../../helpers/axios';
import $message from '../ui/message.helper';
import AccessContext, { IAccessContext } from './AccessContext';
import { OPERATION_ORDER } from './constants';
import { ItemsList } from './ItemsList';
import { EOperation, ICardInfo } from './types';
import { convert, diff } from './utils';

interface IProps {
    tableName: string;
    tableId: string;
    /** Множество доступных к выбору операций */
    options?: Set<EOperation>;
    owner: 'users' | 'roles' | 'rules' | 'groups';
    createdUser: string;
    server: string;
    disabled: boolean;
    onChange?: (id: string, value: EOperation[]) => Promise<{ result: boolean }>;
    onSearch?: (str: string) => Promise<ICardInfo[]>;
    /** Ф-ция загрузки списка сущностей */
    getList?: () => Promise<ICardInfo[]>;
    /** Ф-ция проверки прав на редактирование */
    canEdit?: () => Promise<boolean>;
}

interface IState {
    tab: number;
    isLoading: number;
    isSearchLoading: number;
    items: ICardInfo[];
    searchResult: ICardInfo[];
    contextValue: IAccessContext;
    canEdit: boolean;
}

export class PermissionsUI extends Component<IProps, IState> {
    private mounted: boolean;

    /**
     * Индекс для поиска сущностей
     */
    private itemsIndex = new Map<ICardInfo['id'], ICardInfo>();

    constructor(props: IProps) {
        super(props);

        this.state = {
            tab: 0,
            isLoading: 1,
            isSearchLoading: 1,
            items: [],
            searchResult: [],
            canEdit: false,
            contextValue: {
                tableName: props.tableName,
                tableId: props.tableId,
                tableIdOwner: null,
                owner: props.owner,
                disabled: props.disabled,
                server: props.server,
                options: props.options ?? new Set(OPERATION_ORDER),
            },
        };

        this.mounted = false;
    }

    componentDidMount(): void {
        this.mounted = true;
        this.getList();
        this.checkCanEdit();
        this.setState((prevState) => ({
            isLoading: prevState.isLoading - 1,
            isSearchLoading: prevState.isSearchLoading - 1,
        }));
    }

    componentDidUpdate(_prevProps: Readonly<IProps>, prevState: Readonly<IState>, _snapshot?: any): void {
        if (prevState.items !== this.state.items) {
            this.itemsIndex = new Map<ICardInfo['id'], ICardInfo>();
            for (const item of this.state.items) {
                this.itemsIndex.set(item.id, item);
            }
        }

        if (_prevProps.canEdit !== this.props.canEdit) {
            this.checkCanEdit();
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    getList = () => {
        const { tableName, tableId, owner, createdUser, server } = this.props;

        if (this.mounted) this.setState((prevState) => ({ isLoading: prevState.isLoading + 1 }));

        let promise;
        // FYI: Говнокод он и в африке говнокод, но деваться некуда...
        if (typeof this.props.getList === 'function') {
            promise = this.props.getList();
        } else {
            promise = $api
                .get(`${server}/rls/meta/${tableName}/${tableId}/${owner}/all`)
                .then((res) => convert(res.data ?? [], owner));
        }

        return promise
            .then((items) => {
                // Вытаскиваем владельца
                let tableIdOwner: ICardInfo | null = null;
                if (createdUser) {
                    const ownerIndex = items.findIndex((u) => u.id === createdUser);
                    // eslint-disable-next-line no-bitwise
                    ~ownerIndex && ([tableIdOwner = null] = items.splice(ownerIndex, 1));
                }

                this.setState((prevState: IState) => ({
                    ...prevState,
                    contextValue: { ...prevState.contextValue, tableIdOwner },
                    items,
                }));
            })
            .catch(console.error)
            .finally(() => {
                if (this.mounted) this.setState((prevState) => ({ isLoading: prevState.isLoading - 1 }));
            });
    };

    handleSearch = async (str: string): Promise<void> => {
        if (str.length < 3) {
            this.setState({ searchResult: [] });
            return;
        }
        if (this.mounted) this.setState((prevState) => ({ isSearchLoading: prevState.isSearchLoading + 1 }));

        let promise: Promise<ICardInfo[]>;
        // FYI: Если есть внешний cb, то используем его, для экзотических ситуаций, типа схем)))))
        // FYI: А может оно тут и не надо, пусть каждый сам решает как ему искать что-то.
        // FYI: Но оставлю как "поведение по-умолчанию". Но мне это не нравится...
        if (typeof this.props.onSearch === 'function') {
            promise = this.props
                .onSearch(str)
                // Указываем доступные операции для известных элементов
                .then((items) => items.map((i) => ({ ...i, value: this.itemsIndex.get(i.id)?.value ?? [] } as ICardInfo)));
        } else {
            const { owner } = this.props;

            const jsonString = JSON.stringify({ where: { search: str } });
            const encodedData = encodeURIComponent(jsonString);

            const query = new URLSearchParams();
            query.append('filter', encodedData);

            // FYI: Этот рест требует особых прав, которых нет у пользаков)))))))
            promise = $api.get(`/usersui/${owner}/?${query.toString()}`).then(({ data }) =>
                (data ?? []).map(
                    ({ id, name, description, details, avatar }: any) =>
                        ({
                            id,
                            avatar,
                            title: description || name,
                            subtitle: details,
                            value: this.itemsIndex.get(id)?.value ?? [],
                        } as ICardInfo),
                ),
            );
        }

        try {
            const searchResult = await promise;

            const { createdUser } = this.props;
            if (createdUser) {
                // Выдергиваем владельца
                const ownerIndex = searchResult.findIndex((u) => u.id === createdUser);
                // eslint-disable-next-line no-bitwise
                ~ownerIndex && searchResult.splice(ownerIndex, 1);
            }

            this.setState({ searchResult });
        } catch (e) {
            console.error(e);
            throw e;
        } finally {
            if (this.mounted) this.setState((prevState) => ({ isSearchLoading: prevState.isSearchLoading - 1 }));
        }
    };

    /**
     * Применяет изменение доступов для `owner`
     *
     * @param id ID измененных доступов `owner`
     * @param value массив новых доступов
     * @returns {void}
     */
    handleOpChange = async (id: string, value: EOperation[]) => {
        // FYI: Если есть внешний cb, то используем его, для экзотических ситуаций, типа схем)))))
        // FYI: А может оно тут и не надо, пусть каждый сам решает как ему применять значение.
        // FYI: Но оставлю как "поведение по-умолчанию". Но мне это не нравится...
        let promise;
        if (typeof this.props.onChange === 'function') {
            promise = this.props.onChange(id, value);
        } else {
            const { server, tableName, tableId, owner } = this.props;

            const old = this.itemsIndex.get(id)?.value ?? [];
            const { added, removed } = diff(old, value);

            // FYI: выглядит отвратительно. Случись что один рест оборвется и считай что пропало...
            // FYI: RLS не умеет в батч.
            const promises = [
                ...added.map((op) => $api.post(`${server}/rls/${tableName}/${tableId}/${owner}/?type=${op}`, { user_id: id })),
                ...removed.map((op) =>
                    // FYI: DELETE с телом... Кто-то шарит за REST.
                    $api.delete(`${server}/rls/${tableName}/${tableId}/${owner}/?type=${op}`, { data: { user_id: id } }),
                ),
            ];

            // Вот бы RLS умел так...

            // promise = $api.put(`${server}/rls/${tableName}/${tableId}/${owner}`, { operations: value, user_id: id });

            // FYI: ^^^ Но это не наш модуль и поправив в пивоте, никто бы не обновил у себя, а потом потерялось бы.
            // FYI: ^^^ Причем при пустом массиве он просто отбирал бы все доступы

            promise = Promise.all(promises).then(
                (results) =>
                    // FYI: т.к. по правилам человеческого REST у DELETE не может быть тела запроса и тела ответа
                    // FYI: типы axios правильные, а вот использование...
                    (results.find((r) => r.data.result === false) ?? results[0]).data,
            );
        }

        await promise
            .then(({ result }) => {
                $message.show(result ? 'Доступ изменен!' : 'Не удалось изменить доступ');
                this.getList();
            })
            .catch((e) => {
                $message.show(e.message);
            });
    };

    checkCanEdit = async () => {
        if (typeof this.props.canEdit === 'function') {
            try {
                const canEdit = await this.props.canEdit();
                if (this.mounted) {
                    this.setState({ canEdit });
                }
            } catch (error) {
                console.error('Error checking edit permission:', error);
                if (this.mounted) {
                    this.setState({ canEdit: false });
                }
            }
        }
    };

    render() {
        const { tab, contextValue, items, searchResult, isLoading, isSearchLoading, canEdit } = this.state;

        return (
            <AccessContext.Provider value={contextValue}>
                <Tabs
                    variant="rounded"
                    collapsible={false}
                    style={{ marginBottom: 'var(--ui-kit-spacing-6)' }}
                    value={tab}
                    onChange={(newTab) => {
                        this.setState({ tab: newTab });
                    }}
                >
                    <Tab label="Выдан доступ" badge={String(this.state.items?.length || 0)}>
                        <ItemsList
                            items={items}
                            isLoading={isLoading}
                            disabled={Boolean(isLoading)}
                            onChange={this.handleOpChange}
                        />
                    </Tab>
                    <Tab label="Добавить" icon={<PlusIcon size="small" />} disabled={!canEdit}>
                        <ItemsList
                            items={searchResult}
                            isLoading={isSearchLoading}
                            disabled={Boolean(isLoading)}
                            onChange={this.handleOpChange}
                            onSearch={this.handleSearch}
                        />
                    </Tab>
                </Tabs>
            </AccessContext.Provider>
        );
    }
}
