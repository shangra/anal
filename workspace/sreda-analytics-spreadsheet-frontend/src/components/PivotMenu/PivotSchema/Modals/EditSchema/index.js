import StateManager from 'lite-react-statemanager';
import React, { Component } from 'react';
import { Button, DeleteIcon, Input, Modal, Switch, Typography } from 'ui-kit';

import $api from '../../../../../helpers/axios';
import { PermissionsUI } from '../../../../PermissionsUI';
import { convert } from '../../../../PermissionsUI/utils';
import { isAdministratorUser, normalizeSpaces } from '../../utils';
import { PopDeleteSchema } from '../PopDeleteSchema';
import style from './styles.module.css';
/**
 * Операции, доступные для управления правами на схему.
 * Используется и в рендере <PermissionsUI />, и при вычислении disabled.
 */
const SCHEMA_PERMISSION_OPTIONS = ['read', 'write'];

/**
 * Вычисляет значение `disabled` для карточки пользователя в списке прав схемы.
 *
 * @param {{ id: string, value: string[] }} item  карточка пользователя
 * @param {boolean} isOwner  является ли текущий пользователь владельцем схемы
 * @param {string} currentUserId  ID текущего пользователя
 * @param {boolean} isAdmin  является ли текущий пользователь администратором
 * @returns {boolean | string[]}
 *   - `false`     — владелец или админ, можно всё
 *   - `true`      — чужая карточка, ничего нельзя
 *   - `string[]`  — свои права, которых ещё нет (нельзя добавить, но можно снять)
 */
function computeItemDisabled(item, isOwner, currentUserId, isAdmin) {
    if (isOwner || isAdmin) return false;
    if (item.id !== currentUserId) return true;
    // Текущий пользователь (не владелец): разрешаем только снятие уже выданных прав
    const currentValue = new Set(item.value ?? []);
    return SCHEMA_PERMISSION_OPTIONS.filter((op) => !currentValue.has(op));
}
export class EditSchema extends Component {
    server;

    constructor(props) {
        super(props);

        this.server = (props.server || '').replace(/\/+$/gm, '');

        const { standart = false, name = '', createdUser = '', tableId = '', forAll = false } = this.props?.schemaInfo ?? {};

        this.state = {
            standart,
            name,
            createdUser,
            tableId,
            forAll,
            isLoading: false,
            updatedUserName: '',
            userLoading: false,
            lastUpdatedUser: null,
        };
    }

    componentDidMount() {
        this.fetchUpdatedUserData();
    }

    componentDidUpdate(prevProps) {
        const prevUpdatedUser = prevProps.schemaInfo?.updatedUser;
        const currentUpdatedUser = this.props.schemaInfo?.updatedUser;

        if (currentUpdatedUser !== prevUpdatedUser) {
            this.fetchUpdatedUserData();
        }

        if (JSON.stringify(this.props) !== JSON.stringify(prevProps)) {
            const {
                standart = false,
                name = '',
                createdUser = '',
                tableId = '',
                forAll = false,
            } = this.props?.schemaInfo ?? {};

            this.setState(
                {
                    standart,
                    name,
                    createdUser,
                    tableId,
                    forAll,
                },
                () => {
                    this.fetchUpdatedUserData();
                },
            );
        }
    }

    fetchUpdatedUserData = async () => {
        const updatedUser = this.props.schemaInfo?.updatedUser;

        if (!updatedUser || this.state.lastUpdatedUser === updatedUser) {
            return;
        }

        this.setState({
            userLoading: true,
            lastUpdatedUser: updatedUser,
        });

        try {
            const userResponse = await $api.get(`public/auth/users/${updatedUser}`);
            const userName = userResponse.data.name || '';
            this.setState({ updatedUserName: userName });
        } catch (error) {
            console.error('Ошибка при получении данных пользователя:', error);
            this.setState({ updatedUserName: '' });
        } finally {
            this.setState({ userLoading: false });
        }
    };

    handleChangeforAll = (e) => {
        const targetValue = e.target.checked;
        this.setState({ forAll: targetValue });
    };

    handleChangeName = (e) => {
        const value = normalizeSpaces(e.target.value);
        this.setState({ name: value });
    };

    saveSchema = () => {
        this.setState({ isLoading: true });
        const { standart, name, createdUser, tableId, forAll } = this.state;
        const cleanedName = normalizeSpaces(name).trim();
        this.props?.onSave?.({ standart, name: cleanedName, createdUser, tableId, forAll })?.finally(() => {
            this.setState({ isLoading: false });
        });
    };

    deleteSchema = () => {
        this.setState({ isLoading: true });
        this.props?.onDelete?.()?.finally(() => {
            this.setState({ isLoading: false });
        });
    };

    formatDate = (dateString) => {
        const date = new Date(dateString);

        return new Intl.DateTimeFormat('ru-RU', {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
        }).format(date);
    };

    closeModal = () => {
        this.props.onSetOpen(false);
    };

    getSchemaUsersList = async () => {
        const { id: currentUserId } = StateManager.state.user;
        const isOwner = this.isOwner();
        const isAdmin = isAdministratorUser();

        return $api
            .get(`${this.server ? `/to/${this.server}` : ''}/rls/meta/PivotSchemas/${this.props.schemaInfo?.id}/users/all`)
            .then((res) => convert(res.data ?? [], 'users'))
            .then((items) =>
                items.map((i) => {
                    const disabled = computeItemDisabled(i, isOwner, currentUserId, isAdmin);
                    return { ...i, confirm: disabled !== false, disabled };
                }),
            );
    };

    /**
     * Что-то ищет и возвращает
     * @param {string} str искомая подстрока
     * @returns {import('../../../../PermissionsUI/types').ICardInfo}
     */
    handleSearchUsers = (str) => {
        const { id: currentUserId } = StateManager.state.user;
        const isOwner = this.isOwner();
        const isAdmin = isAdministratorUser();

        const query = new URLSearchParams();
        query.append('search', `%${str}%`);

        // TODO: Хреновый хардкод урла
        return $api.get(`/public/auth/users?${query.toString()}`).then(({ data }) =>
            (data ?? []).map(({ id, name, position, avatarId }) => {
                const item = { id, value: [] };
                const disabled = computeItemDisabled(item, isOwner, currentUserId, isAdmin);

                return {
                    id,
                    avatar: avatarId,
                    title: name,
                    subtitle: position,
                    value: [],
                    confirm: disabled !== false,
                    disabled,
                };
            }),
        );
    };

    /**
     * Событие изменения пользовательского доступа
     * @param {string} id
     * @param {EOperation[]} value
     */
    handleSchemaUserOpChange = async (id, value) => {
        const { schemaInfo } = this.props;
        const { tableId } = this.state;

        if (value.length > 0) {
            // FYI: В UI можно менять только "чтение"/"запись", но у бэка еще есть "просмотр".
            value = [...new Set(['view', ...value])];
        }

        // TODO: Роут должен быть как и во всем RLS, но что-то пошло не так
        return $api
            .put(`${this.server ? `/to/${this.server}` : ''}/metadata/schemas/permissions/${tableId}/${schemaInfo?.id}`, {
                user_id: id,
                operations: value,
            })
            .then((res) => ({ result: res.data?.result ?? false }));
    };

    isOwner = () => {
        const { id: currentUserId } = StateManager.state.user;

        return this.state.createdUser === currentUserId;
    };

    canEditSchemaPermissions = () => {
        const isAdmin = isAdministratorUser();
        const isOwner = this.isOwner();

        return isOwner || isAdmin;
    };

    render() {
        // ts comming soon :)
        // eslint-disable-next-line no-unsafe-optional-chaining
        // const { schemaOwner } = this.props.schemaInfo;
        // const rlsObject = {
        //     id: schemaOwner,
        //     tableId: this.state.tableId,
        //     entity: 'PivotSchemas',
        //     owner: 'users',
        //     server: `${this.server ? `/to/${this.server}` : ''}`,
        //     createdUser: this.state.createdUser,
        //     isOwnerEdit: this.props.isOwnerEdit,
        //     canRevokeRight: this.props.canRevokeRight,
        // };

        const updatedAt = this.props.schemaInfo.updatedAt ? this.formatDate(this.props.schemaInfo.updatedAt) : '';

        const { updatedUserName, userLoading } = this.state;
        const userInfoText = updatedUserName ? `пользователем: ${updatedUserName}` : '';

        const isWritable = this.props.writePermission ?? false;
        const isAdmin = isAdministratorUser();
        const disabledDeleteBtn = this.state.isLoading || (!this.props.isOwnerEdit && !isAdmin);

        return (
            <Modal
                classNames={style.modal}
                title="Редактировать схему"
                opened={this.props.open}
                onSetOpen={(open) => this.props.onSetOpen(open)}
            >
                <div>
                    <div className={style.group}>
                        <Typography variant="subtitle1" style={{ marginBottom: 'var(--ui-kit-spacing-4)' }}>
                            Название
                        </Typography>
                        <Input
                            title="Название"
                            value={this.state.name}
                            onChange={this.handleChangeName}
                            style={{ width: '100%' }}
                            disabled={this.state.isLoading}
                        />
                    </div>
                    {isAdmin && (
                        <div className={style.group}>
                            <Switch
                                label="Общедоступная схема"
                                checked={this.state.forAll}
                                value={this.state.forAll}
                                type="checkbox"
                                name="forAll"
                                onChange={this.handleChangeforAll}
                                disabled={this.state.isLoading}
                            />
                        </div>
                    )}
                    <div className={style.group}>
                        <Typography variant="subtitle1">
                            {`Изменено: ${updatedAt}`}
                            {userInfoText && (
                                <span>
                                    {updatedAt ? ' ' : ''}
                                    {userInfoText}
                                    {userLoading && ' (загрузка...)'}
                                </span>
                            )}
                        </Typography>
                    </div>
                    <div className={style.group}>
                        <PermissionsUI
                            tableName="PivotSchemas"
                            tableId={this.props.schemaInfo?.id}
                            createdUser={this.state.createdUser}
                            owner="users"
                            options={new Set(['read', 'write'])}
                            disabled={this.state.isLoading}
                            server={`${this.server ? `/to/${this.server}` : ''}`}
                            onChange={this.handleSchemaUserOpChange}
                            onSearch={this.handleSearchUsers}
                            getList={this.getSchemaUsersList}
                            canEdit={this.canEditSchemaPermissions}
                        />
                    </div>
                </div>
                {isWritable && (
                    <PopDeleteSchema onDelete={this.deleteSchema}>
                        <Button
                            icon={DeleteIcon}
                            size="small"
                            fullWidth={false}
                            leftIcon={DeleteIcon}
                            variant="text"
                            color="error"
                            disabled={disabledDeleteBtn}
                            loading={this.state.isLoading}
                        >
                            Удалить схему
                        </Button>
                    </PopDeleteSchema>
                )}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        marginTop: 'var(--ui-kit-spacing-8)',
                    }}
                >
                    <Button size="medium" variant="outlined" onClick={this.closeModal} disabled={this.state.isLoading}>
                        Отменить
                    </Button>
                    {isWritable && (
                        <Button
                            size="medium"
                            variant="contained"
                            color="primary"
                            onClick={this.saveSchema}
                            disabled={this.state.isLoading || !normalizeSpaces(this.state.name).trim()}
                            loading={this.state.isLoading}
                        >
                            Сохранить
                        </Button>
                    )}
                </div>
            </Modal>
        );
    }
}
