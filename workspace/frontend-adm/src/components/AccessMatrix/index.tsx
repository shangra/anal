import React, { Component } from 'react';
import { Tabs, Tab, Loader, Alert, UsersIcon, FolderIcon, LabelsIcon, AccessGiveIcon } from 'ui-kit';
import {
    getAllUsers,
    getAllRoles,
    getAllGroups,
    getAllRules,
    getMetadataAccess,
    getRolesWithAccess,
    getRulesWithAccess,
    getUsersWithAccess,
    getGroupsWithAccess,
} from './network';
import type { AccessType, AccessGroup, AccessMatrixProps, Role, Rule, Group, User } from 'components/AccessMatrix/network';
import { AccessList } from 'components/AccessMatrix/components/AccessList';
import { PermissionBlock } from 'components/AccessMatrix/components/PermissionBlock';
import { ErrorBoundary } from 'components/ErrorBoundary';
import { generateLogsFileName } from 'components/MetadataForms/Inputs/utils';
import styles from './AccessMatrix.module.css';
import { typeOptions, groupTabs, editTabs } from 'components/AccessMatrix/constants';
import $api from 'helpers/axios';
import $modal from 'components/ui/MyModal/modal.helper';
import type { AxiosResponse } from 'axios';

// Состояние компонента
// Полная матрица манипулирует только группами субъектов (без 'permissions').
type MatrixGroup = 'users' | 'roles' | 'rules' | 'groups';

interface AccessMatrixState {
    currentGroup: AccessGroup;
    currentType: AccessType;
    accessData: Record<AccessGroup, any>;
    allItemsData: Record<AccessGroup, any>;
    loading: boolean;
    error: string | null;
    collapsedBlocks: Record<string, boolean>;
    isEditing: boolean;
    currentEditTab: number;
    pagination: Record<AccessGroup, { offset: number; limit: number }>;
    isListLoading: boolean;
    saving: boolean;
    saveError: string | null;
    // Полная матрица доступа записи (все типы, все субъекты) + version — контракт единого
    // сохранения POST /rls/matrix/:table/:id (R4) с защитой от конкурентной записи (D4).
    fullMatrix: Record<MatrixGroup, Array<Record<string, any>>>;
    version: string | null;
}

const EMPTY_ACCESS_DATA = {
    permissions: [],
    users: [],
    roles: [],
    rules: [],
    groups: [],
};

const EMPTY_FULL_MATRIX: Record<MatrixGroup, Array<Record<string, any>>> = {
    users: [],
    roles: [],
    rules: [],
    groups: [],
};

// Область видимости прав на объекты дерева метаданных (rls-ext-metadata.setMapping).
const METADATA_TABLE_NAME = 'Metadata';

export class AccessMatrix extends Component<AccessMatrixProps, AccessMatrixState> {
    constructor(props: AccessMatrixProps) {
        super(props);

        this.state = {
            currentGroup: 'permissions',
            currentType: 'read',
            accessData: EMPTY_ACCESS_DATA,
            allItemsData: {
                ...EMPTY_ACCESS_DATA,
                users: { items: [], total: 0 },
            },
            loading: false,
            error: null,
            collapsedBlocks: {},
            isEditing: false,
            currentEditTab: 0,
            pagination: {
                permissions: { offset: 0, limit: 20 },
                users: { offset: 0, limit: 20 },
                roles: { offset: 0, limit: 50 },
                rules: { offset: 0, limit: 50 },
                groups: { offset: 0, limit: 50 },
            },
            isListLoading: false,
            saving: false,
            saveError: null,
            fullMatrix: EMPTY_FULL_MATRIX,
            version: null,
        };
    }

    componentDidMount() {
        this.fetchAccessData(this.props.id, this.state.currentGroup, this.state.currentType);
        this.fetchFullMatrix();
    }

    // Применяет изменение одной ячейки через классический RLS API
    // POST/DELETE /rls/:table/:id/:group?type=... (полный /rls/matrix в этой сборке pivot отсутствует).
    applyMatrixChange = async (group: MatrixGroup, itemId: string, isSelected: boolean, _item: any) => {
        const { id, server, tableName } = this.props;
        const { currentType } = this.state;
        const srv = server || '';
        const basePath = `${srv && srv !== '__default__' ? `/${srv}` : ''}`;
        const table = tableName || METADATA_TABLE_NAME;
        const idKey =
            group === 'users' ? 'user_id' : group === 'roles' ? 'role_id' : group === 'rules' ? 'rule_id' : 'group_id';
        const url = `${basePath}/rls/${encodeURIComponent(table)}/${encodeURIComponent(id)}/${group}?type=${currentType}`;
        const body = { [idKey]: itemId };

        this.setState({ saving: true, saveError: null });
        try {
            if (isSelected) {
                await $api.post(url, body);
            } else {
                await $api.delete(url, { data: body });
            }
            this.setState({ saving: false });
        } catch (error: any) {
            console.error('Error saving permission:', error);
            this.setState({ saving: false, saveError: 'Ошибка при сохранении права' });
            throw error;
        }
    };

    // Полная матрица в этой сборке недоступна (/rls/matrix валится на чужой маршрут) — no-op.
    fetchFullMatrix = async () => {
        /* optional in current pivot build */
    };

    // Загрузка данных доступа
    fetchAccessData = async (id: string, group: AccessGroup, type: AccessType) => {
        this.setState({ loading: true, error: null });
        const { server, tableName, separate } = this.props;
        const srv = server || '';
        const table = tableName || METADATA_TABLE_NAME;
        const sep = separate ?? false;

        try {
            // В зависимости от группы, используем разные API
            let data: AxiosResponse<User[] | Role[] | Rule[] | Group[]>;

            if (group === 'permissions') {
                // Для permissions используем /rls/Metadata/:id/:group/?type=:type
                const result = await getMetadataAccess(id, group, type, srv, table, sep);
                this.setState((prevState) => ({ accessData: { ...prevState.accessData, [group]: result?.data } }));
            } else {
                // Для остальных групп используем /rls/meta/Metadata/:id/:group/?type=:type
                if (group === 'users') {
                    data = await getUsersWithAccess(id, type, srv, table, sep);
                } else if (group === 'roles') {
                    data = await getRolesWithAccess(id, type, srv, table, sep);
                } else if (group === 'rules') {
                    data = await getRulesWithAccess(id, type, srv, table, sep);
                } else if (group === 'groups') {
                    data = await getGroupsWithAccess(id, type, srv, table, sep);
                }

                // если изменился тип, что мы должны стереть ранее написанные объекты и вставить только то, что пришло с сервера
                this.setState((prevState) => ({ accessData: { ...prevState.accessData, [group]: data?.data } }));
            }

            this.setState({ loading: false, error: null });
        } catch (error) {
            console.error('Error fetching access data:', error);
            this.setState({
                loading: false,
                error: 'Ошибка при загрузке данных доступа',
            });
        }
    };

    // Получение всех элементов для выбранной группы
    fetchAllItems = async (group: AccessGroup) => {
        this.setState({ isListLoading: true });
        try {
            const { offset, limit } = this.state.pagination[group];
            const filterObj = {
                offset,
                limit,
                order: group === 'users' ? [['login']] : [['name']],
                where: { search: '' },
            };
            const filter = JSON.stringify(filterObj);

            let data;
            switch (group) {
                case 'users':
                    data = await getAllUsers(filter);
                    break;
                case 'roles':
                    data = await getAllRoles(filter);
                    break;
                case 'rules':
                    data = await getAllRules(filter);
                    break;
                case 'groups':
                    data = await getAllGroups(filter);
                    break;
                default:
                    return;
            }
            // Добавляем filter в данные для последующего использования при пагинации
            if (group === 'users' && 'items' in data.data) {
                data.data.filter = filter;
            }
            this.setState((prevState) => ({ allItemsData: { ...prevState.allItemsData, [group]: data.data } }));
        } catch (error) {
            console.error('Error fetching all items:', error);
        } finally {
            this.setState({ isListLoading: false });
        }
    };

    // Обработка изменения табов редактирования
    handleEditTabChange = (index: number) => {
        this.setState({ currentEditTab: index, isEditing: index === 1 });
    };

    // Преобразование группы в тип
    getGroupType = (group: AccessGroup): 'user' | 'role' | 'rule' | 'group' | null => {
        switch (group) {
            case 'users':
                return 'user';
            case 'roles':
                return 'role';
            case 'rules':
                return 'rule';
            case 'groups':
                return 'group';
            default:
                return null;
        }
    };

    // Обработка переключения элемента при редактировании. isSelected приходит из AccessListItem.handleChange
    // (true — добавление права, false — снятие), т.к. пересчитывать его из accessData нельзя: на момент клика
    // accessData ещё не обновлён, и снятие прочитывалось бы как добавление (пустой diff на бэке => added:0, removed:0).
    handleToggleItem = async (group: AccessGroup, id: string, isSelected = false) => {
        const type = this.getGroupType(group);

        if (!type || group === 'permissions') {
            $modal.show('Произошла ошибка при изменении права');
            return;
        }

        try {
            let getFromAllItems;
            if (this.state.currentGroup === 'users') {
                getFromAllItems = this.state.allItemsData[group].items.find((item: any) => item.id === id);
            } else {
                getFromAllItems = this.state.allItemsData[group].find((item: any) => item.id === id);
            }
            if (!getFromAllItems) {
                $modal.show('Произошла ошибка 2');
            }
            await this.applyMatrixChange(group as MatrixGroup, id, isSelected, getFromAllItems);
            if (isSelected) {
                this.setState((prevState) => ({
                    accessData: { ...prevState.accessData, [group]: [...prevState.accessData[group], getFromAllItems] },
                }));
            } else {
                this.setState((prevState) => ({
                    accessData: {
                        ...prevState.accessData,
                        [group]: prevState.accessData[group].filter((item: any) => item.id !== id),
                    },
                }));
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Обработка изменения группы
    handleGroupChange = (index: number) => {
        const group = groupTabs[index].value as AccessGroup;
        this.setState({ currentGroup: group, currentEditTab: 0, isEditing: false }, () => {
            this.fetchAccessData(this.props.id, group, this.state.currentType);
            if (this.state.currentGroup !== 'permissions') {
                this.fetchAllItems(this.state.currentGroup);
            }
        });
    };

    // Обработка изменения страницы пагинации
    handlePageChange = (group: AccessGroup, page: number) => {
        const { pagination } = this.state;
        const newOffset = (page - 1) * 20;
        this.setState(
            {
                pagination: { ...pagination, [group]: { ...pagination[group], offset: newOffset } },
            },
            () => {
                this.fetchAllItems(group);
            },
        );
    };

    // Обработка изменения типа прав. Очистка данных перед загрузкой нового типа
    handleTypeChange = (index: number) => {
        const type = typeOptions[index].value as AccessType;
        this.setState({ currentType: type, currentEditTab: 0, isEditing: false, accessData: EMPTY_ACCESS_DATA }, () => {
            this.fetchAccessData(this.props.id, this.state.currentGroup, type);
            if (this.state.currentGroup !== 'permissions') {
                this.fetchAllItems(this.state.currentGroup);
            }
        });
    };

    // Обработка сворачивания/разворачивания блока
    handleBlockToggle = (blockKey: string, count: number) => {
        if (count === 0) return;
        this.setState((prevState) => ({
            collapsedBlocks: {
                ...prevState.collapsedBlocks,
                [blockKey]: !prevState.collapsedBlocks[blockKey],
            },
        }));
    };

    isEmptyArray = (arr: any[] | undefined) => (arr?.length === 0 || !arr ? undefined : arr);

    render() {
        const { currentGroup, currentType, accessData, allItemsData, loading, error, currentEditTab, isEditing, saving, saveError } =
            this.state;

        // Данные для текущей группы и типа
        const currentData = currentGroup === 'permissions' ? accessData.permissions : accessData;

        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: this.state },
                    fileName: generateLogsFileName('AccessMatrix'),
                }}
            >
                <div className={styles.accessMatrix}>
                    <Tabs
                        value={typeOptions.findIndex((t) => t.value === currentType)}
                        onChange={(index) => this.handleTypeChange(index)}
                        variant="rounded"
                        className={styles.tabGroup}
                    >
                        {typeOptions.map((option) => (
                            <Tab key={option.value} label={option.label} disabled={loading} />
                        ))}
                    </Tabs>

                    <Tabs
                        value={groupTabs.findIndex((t) => t.value === currentGroup)}
                        onChange={this.handleGroupChange}
                        className={styles.tabGroup}
                    >
                        {groupTabs.map((tab) => (
                            <Tab
                                key={tab.value}
                                label={tab.label}
                                // @ts-ignore - кривые типы
                                badge={
                                    tab.value !== 'permissions'
                                        ? (
                                              this.isEmptyArray(currentData[tab.value]) ||
                                              this.isEmptyArray(currentData.permissions?.[tab.value])
                                          )?.length || undefined
                                        : undefined
                                }
                            />
                        ))}
                    </Tabs>

                    {/* Табы редактирования (только для групп, не для permissions) */}
                    {currentGroup !== 'permissions' && (
                        <Tabs
                            value={currentEditTab}
                            onChange={this.handleEditTabChange}
                            className={styles.tabGroup}
                            variant="rounded"
                        >
                            {editTabs.map((tab) => (
                                <Tab
                                    key={tab.value}
                                    label={tab.label}
                                    badge={
                                        tab.value === 'edit'
                                            ? allItemsData[currentGroup].total ??
                                              allItemsData[currentGroup].length ??
                                              undefined
                                            : undefined
                                    }
                                />
                            ))}
                        </Tabs>
                    )}

                    {/* Content */}
                    {loading && (
                        <div className={styles.loading}>
                            <Loader />
                            <div>Загрузка данных доступа...</div>
                        </div>
                    )}

                    {error && (
                        <Alert color="error" fullWidth>
                            {error}
                        </Alert>
                    )}

                    {saveError && (
                        <Alert color="error" fullWidth>
                            {saveError}
                        </Alert>
                    )}

                    {saving && (
                        <div className={styles.loading}>
                            <Loader />
                            <div>Сохранение...</div>
                        </div>
                    )}

                    {!loading && !error && currentGroup === 'permissions' && (
                        <>
                            <PermissionBlock
                                title="Пользователи"
                                icon={<UsersIcon size="small" color="text" />}
                                items={currentData.users || []}
                                collapsed={!!this.state.collapsedBlocks.users}
                                onToggle={(count) => this.handleBlockToggle('users', count)}
                                listOptions={(currentData.users || []).map((user: User) => ({ label: user.login }))}
                            />

                            <PermissionBlock
                                title="Роли"
                                icon={<LabelsIcon size="small" color="text" />}
                                items={currentData.roles || []}
                                collapsed={!!this.state.collapsedBlocks.roles}
                                onToggle={(count) => this.handleBlockToggle('roles', count)}
                                listOptions={(currentData.roles || []).map((role: Role) => ({
                                    label: role.name,
                                    hint: role.details,
                                }))}
                            />

                            <PermissionBlock
                                title="Группы"
                                icon={<FolderIcon size="small" color="text" />}
                                items={currentData.groups || []}
                                collapsed={!!this.state.collapsedBlocks.groups}
                                onToggle={(count) => this.handleBlockToggle('groups', count)}
                                listOptions={(currentData.groups || []).map((group: Group) => ({
                                    label: group.name,
                                    hint: group.info,
                                }))}
                            />

                            <PermissionBlock
                                title="Права"
                                icon={<AccessGiveIcon size="small" color="text" />}
                                items={currentData.rules || []}
                                collapsed={!!this.state.collapsedBlocks.rules}
                                onToggle={(count) => this.handleBlockToggle('rules', count)}
                                listOptions={(currentData.rules || []).map((rule: Rule) => ({
                                    label: rule.name,
                                    hint: rule.details,
                                }))}
                            />

                            {((currentData.users ?? []).length === 0) &&
                                (currentData.roles ?? []).length === 0 &&
                                (currentData.groups ?? []).length === 0 &&
                                (currentData.rules ?? []).length === 0 && (
                                    <div className={styles.emptyMatrix}>
                                        Права не выданы. Выдайте первое право во вкладке «Редактировать».
                                    </div>
                                )}
                        </>
                    )}

                    {!loading && !error && currentGroup !== 'permissions' && (
                        <AccessList
                            data={currentData as any}
                            showUsers={currentGroup === 'users'}
                            showRoles={currentGroup === 'roles'}
                            showRules={currentGroup === 'rules'}
                            showGroups={currentGroup === 'groups'}
                            isEditing={isEditing}
                            onToggleItem={this.handleToggleItem}
                            currentGroup={currentGroup}
                            allItemsData={allItemsData}
                            onPageChange={this.handlePageChange}
                            isListLoading={this.state.isListLoading}
                        />
                    )}
                </div>
            </ErrorBoundary>
        );
    }
}
