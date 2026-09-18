import StateManager from 'lite-react-statemanager';
import React from 'react';
import { Button, IconButton, PlusIcon, SettingIcon, Typography } from 'ui-kit';

import $api from '../../../helpers/axios';
import { withRouter } from '../../HOC/withRouter';
import $message from '../../ui/message.helper';
import $modal from '../../ui/modal.helper';
import { Modal } from '../../UIKit/Modal';
import { Progress } from '../../UIKit/Progress';
import ServerContext from '../ServerContext';
import { compress } from '../utils';
import { SchemaSelect } from './components/SchemaSelect/SchemaSelect';
import { CreateNewSchema } from './Modals/CreateNewSchema';
import { EditSchema } from './Modals/EditSchema';
import { PopConfirmSaveSchema } from './Modals/PopConfirmSaveSchema';
import { WarningUnsaveSchema } from './Modals/WarningUnsaveSchema';
import styles from './styles.module.css';
import { isAdministratorUser } from './utils';

const SEARCH_PARAM_NAME = 'schemaId';

/**
 * @param {string} tableId Идентификатор куба/отчета
 */

/**
 * Компонент выбора сохраненных схем кубов
 */
class PivotSchemaCMP extends React.Component {
    static contextType = ServerContext;

    constructor(props) {
        super(props);
        this.state = {
            schemasList: [],
            selectSchema: null, // null - единожды для инициализации, '' - схема не выбрана, string - текущая схема
            tempSchemaUUID: '',
            isSaving: false,
            openModalNewSchema: false,
            openModalEditSchema: false,
            openModalUnsaveSchema: false,
            // Compression state
            compression: {
                isActive: false,
                progress: 0,
                step: '',
                operation: 'none', // 'compress' | 'decompress' | 'none'
                error: false,
            },
        };
    }

    componentDidMount() {
        if (this.props.tableId) {
            this.getSchemaList();
        }
    }

    componentDidUpdate(_prevProps, prevState) {
        if (prevState.selectSchema !== this.state.selectSchema) {
            const url = new URL(document.location.href);

            if (this.state.selectSchema) {
                url.searchParams.set(SEARCH_PARAM_NAME, this.state.selectSchema);
            } else if (url.searchParams.has(SEARCH_PARAM_NAME)) {
                url.searchParams.delete(SEARCH_PARAM_NAME);
            }

            window.history.pushState({}, '', url);

            this.props.onChange?.(this.state.selectSchema);
        }
    }

    /**
     * Метод получения всех доступных схем
     */
    getSchemaList = (showProgress = true) => {
        const { tableId, onLoadingProgress } = this.props;
        if (showProgress) {
            onLoadingProgress?.({
                isActive: true,
                progress: 0,
                step: 'Загрузка списка схем...',
                error: false,
            });
        }

        return $api
            .get(`${this.context ? `/to/${this.context}` : ''}/metadata/schemas/${tableId}/available`)
            .then((res) => {
                const schemasList = this.sortSchemasList(
                    (res.data?.rows || []).map((schema) => ({
                        id: schema.id,
                        name: schema.name,
                        standart: schema.standart_schema,
                        forAll: schema.forAll,
                        createdUser: schema.createdUser,
                        givenPermissions: schema.givenPermissions,
                    })),
                );

                this.setState({ schemasList }, () => {
                    const searchParams = new URLSearchParams(document.location.search);

                    let selectSchema = '';
                    if (Array.isArray(schemasList) && schemasList.length > 0) {
                        const schemaId = searchParams.get(SEARCH_PARAM_NAME);
                        if (schemaId) {
                            const selectedSchema = schemasList.find((schema) => schema.id === schemaId);
                            if (selectedSchema) {
                                selectSchema = selectedSchema.id;
                            } else {
                                $modal.show(
                                    'Упс...',
                                    <Typography>Отсутствует доступ к запрашиваемой схеме или схема не существует</Typography>,
                                    {
                                        portal: document.fullscreenElement
                                            ? document.getElementById('fullscreen-portals')
                                            : document.body,
                                    },
                                );
                            }
                        }
                    }

                    if (this.state.selectSchema !== selectSchema) {
                        this.setState(() => ({ selectSchema }));
                    }
                });
            })
            .catch(() => {
                this.setState({ schemasList: [], selectSchema: '' });
            })
            .finally(() => {
                this.props.onLoadingProgress?.({
                    isActive: false,
                    progress: 0,
                    step: '',
                    error: false,
                });
            });
    };

    categorizeSchemas = (schemaList) => {
        const { id } = StateManager.state.user;
        const result = [
            {
                label: 'Мои схемы',
                value: 'personal',
                children: [],
            },
            {
                label: 'Доступные схемы',
                value: 'access',
                children: [],
            },
            {
                label: 'Общие схемы',
                value: 'shared',
                children: [],
            },
        ];

        schemaList.forEach((schema) => {
            if (id === schema.createdUser) {
                result[0].children.push(schema);
            } else if (id !== schema.createdUser && schema.forAll === false) {
                result[1].children.push(schema);
            } else if (id !== schema.createdUser && schema.forAll === true) {
                result[2].children.push(schema);
            }
        });

        return result;
    };

    /**
     * Метод сохранения выбранной схемы
     * @param schemaInfo Сохраняемые данные схемы
     * @param callback Callback окончания сохранения
     */
    saveSchemaData = async (schemaInfo, callback = undefined) => {
        const { tableId } = this.props;
        const { selectSchema: schemaId } = this.state;

        if (!tableId) {
            throw new Error('Отсутствует уникальный идентификатор владельца схемы');
        }

        if (!schemaId) {
            throw new Error('Отсутствует уникальный идентификатор выбранной схемы');
        }

        const schema = structuredClone(this.props.schema || {});
        schema.layers = schema.layers?.filter((layer) => layer && !(layer.isIrrelevant && !layer.isSelected)) || [];
        delete schema.fields;

        this.props.masterInstance.clearHistory?.();
        let snapshot = await this.props.masterInstance.export();
        // Удаляем неактуальные слои
        if (!snapshot.args) {
            snapshot.args = {};
        }
        snapshot.args.layers = schema.layers;

        // Если передан сервис кеширования, то сохраняем данные в снапшот
        if (this.props.cacheService?.readAll) {
            snapshot.cacheFields = (await this.props.cacheService.readAll()) || [];
        }

        try {
            this.setState({
                isSaving: true,
                compression: {
                    isActive: true,
                    progress: 0,
                    step: 'Подготовка схемы и снапшота к сохранению...',
                    operation: 'compress',
                    error: false,
                },
            });

            snapshot = await compress(snapshot, (progress, step) => {
                this.setState({
                    compression: {
                        isActive: true,
                        progress,
                        step,
                        operation: 'compress',
                        error: false,
                    },
                });
            });

            this.setState({
                isSaving: false,
                compression: {
                    isActive: false,
                    progress: 0,
                    step: '',
                    operation: 'none',
                    error: false,
                },
            });
        } catch (e) {
            this.setState((state) => ({
                isSaving: false,
                compression: {
                    isActive: true,
                    progress: state.compression.progress,
                    step: e.message,
                    operation: 'none',
                    error: true,
                },
            }));
        }

        const body = {
            shemaInfo: schemaInfo,
            schema,
            snapshot,
        };

        const response = await $api.put(
            `${this.context ? `/to/${this.context}` : ''}/metadata/schemas/${tableId}/${schemaId}`,
            body,
        );

        if (response.data?.result === true) {
            this.props.dropHash(schemaInfo);
            this.props.onEdit?.(schemaInfo);
            $message.show('Схема сохранена!');
            callback?.();
        } else if (response.data.error) {
            $message.show(response.data.error.message);
        } else {
            $message.show('Недостаточно прав для сохранения схемы!');
        }
    };

    /**
     * Событие переключения схемы
     * @param schemaId UUID выбранной схемы
     */
    onChange = (schemaId = '') => {
        // Проверяем, является ли schemaId массивом, для компонента TreeSelect
        let value = schemaId;
        if (Array.isArray(schemaId)) {
            // eslint-disable-next-line prefer-destructuring
            value = schemaId.length > 0 ? schemaId[0] : '';
        }

        if (this.props.isChange) {
            this.setState(() => ({ tempSchemaUUID: value, openModalUnsaveSchema: true }));
        } else {
            this.setState({ selectSchema: value });
        }
    };

    onShowModalUnsaveSchema = (open) => {
        this.setState({
            openModalUnsaveSchema: open,
        });
    };

    saveAndChangeSchema = () => {
        this.saveSchemaData(this.props.schemaInfo);
        this.setState((state) => ({
            selectSchema: state.tempSchemaUUID ?? '',
        }));
        this.onShowModalUnsaveSchema(false);
    };

    dontSaveAndChangeSchema = () => {
        const { tempSchemaUUID = '' } = this.state;
        this.props.onChange?.(tempSchemaUUID);
        this.setState({
            selectSchema: tempSchemaUUID,
        });
        this.onShowModalUnsaveSchema(false);
    };

    onShowModalNewSchema = (open) => {
        this.setState({
            openModalNewSchema: open,
        });
    };

    /**
     * Метод создания новой схемы
     * @param info
     */
    createInfo = async (info, inheritOptions) => {
        const { tableId } = this.props;

        if (!tableId) {
            throw new Error('Не передан уникальный идентификатор владельца схемы');
        }

        let schema;
        let snapshot;

        if (inheritOptions === false) {
            schema = {
                layers: [],
                values: [],
                rows: [],
                filter: [],
                columns: [],
                fields: [],
                rowsTotal: true,
                columnsTotal: false,
                recalculate: true,
                isMask: false,
            };

            snapshot = {
                type: 'pivot',
                args: {
                    layers: [],
                    filter: [],
                    sorting: [],
                    fields: {},
                    columns: [],
                    rows: [],
                    values: [],
                },
            };
        } else {
            const { schema: propsSchema = {} } = this.props;

            if (!propsSchema) {
                throw new Error('Не передана схема для сохранения');
            }

            schema = structuredClone(propsSchema);

            schema.layers = schema.layers?.filter((layer) => layer && !(layer.isIrrelevant && !layer.isSelected)) || [];
            delete schema.fields;

            snapshot = await this.props.masterInstance.export();

            if (!snapshot.args) {
                snapshot.args = {};
            }
            snapshot.args.layers = schema.layers;
        }

        try {
            this.setState({
                isSaving: true,
                compression: {
                    isActive: true,
                    progress: 0,
                    step: 'Подготовка схемы и снапшота к сохранению...',
                    operation: 'compress',
                    error: false,
                },
            });

            snapshot = await compress(snapshot, (progress, step) => {
                this.setState({
                    compression: {
                        isActive: true,
                        progress,
                        step,
                        operation: 'compress',
                        error: false,
                    },
                });
            });

            this.setState({
                isSaving: false,
                compression: {
                    isActive: false,
                    progress: 0,
                    step: '',
                    operation: 'none',
                    error: false,
                },
            });
        } catch (e) {
            this.setState((state) => ({
                isSaving: false,
                compression: {
                    isActive: true,
                    progress: state.compression.progress,
                    step: e.message,
                    operation: 'none',
                    error: true,
                },
            }));
        }

        const body = {
            shemaInfo: info,
            schema,
            snapshot,
        };

        const url = `${this.context ? `/to/${this.context}` : ''}/metadata/schemas/${tableId}`;
        const response = await $api.post(url, body);
        const payload = response.data || {};
        const createdId = payload?.data?.id || payload?.id;
        const createdOk = payload?.result === true || Boolean(createdId);

        if (createdOk && createdId) {
            this.props.dropHash();
            $message.show('Схема сохранена!');
            this.setState(() => ({ selectSchema: createdId }));
            this.getSchemaList();
            this.onShowModalNewSchema(false);
        } else if (payload?.error?.message) {
            $message.show(payload.error.message);
        } else {
            $message.show('Не удалось сохранить схему');
        }
    };

    /**
     * Метод сохранения схемы
     * @param info Сохраняемая схема
     */
    saveInfo = (info) =>
        this.saveSchemaData(info, () => {
            this.getSchemaList(false).then(() => {
                this.props.onSchemaInfoUpdate?.(info);
            });
        });

    onShowModalEditSchema = (open) => {
        this.setState({
            openModalEditSchema: open,
        });
    };

    /**
     * Событие удаления схемы
     *
     * @returns {boolean}
     */
    deleteInfo = () => {
        const { tableId } = this.props;
        const { selectSchema: schemaId } = this.state;

        if (tableId && schemaId) {
            return $api
                .delete(`${this.context ? `/to/${this.context}` : ''}/metadata/schemas/${tableId}/${schemaId}`)
                .then((response) => {
                    if (response.data?.result === true) {
                        this.props.dropHash();
                        $message.show('Схема удалена!');

                        // Очищаем URL перед обновлением списка
                        const url = new URL(document.location.href);
                        url.searchParams.delete(SEARCH_PARAM_NAME);
                        window.history.pushState({}, '', url);

                        // Сбрасываем выбранную схему в state
                        this.setState({ selectSchema: '' }, () => {
                            this.getSchemaList();
                        });

                        this.onShowModalEditSchema(false);
                    } else {
                        $message.show('Недостаточно прав для удаления схемы!');
                    }
                });
        }

        return false;
    };

    onClickEdit = () => {
        if (this.state.selectSchema) {
            this.onShowModalEditSchema(true);
        } else {
            $message.show('Схема не выбрана');
        }
    };

    onClickSave = async (_event) => {
        if (this.state.selectSchema) {
            this.saveSchemaData(this.props.schemaInfo);
        } else {
            $message.show('Схема не выбрана');
        }
    };

    // Сортировка списка схем по алфавиту (стандартные ставятся вперёд)
    sortSchemasList = (list) => {
        if (!list) return [];

        return list.sort((a, b) => {
            if (a.standart !== b.standart) {
                if (a.standart === b.standart) return 0;
                return a.standart ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    };

    onCompressionModalClose() {
        this.setState({
            compression: {
                isActive: false,
                progress: 0,
                step: '',
                operation: 'none',
                error: false,
            },
        });
    }

    render() {
        const isDisabled = this.state.isSaving;
        const { compression } = this.state;
        const treeSchemas = this.categorizeSchemas(this.state.schemasList);

        const isOwnerEdit = this.props.schemaInfo.createdUser === StateManager.state.user.id;
        const isAdmin = isAdministratorUser();

        const { schemaInfo: schema } = this.props;
        const canRevokeRight = /* StateManager.state.user.id === schema.createdUser || */ schema.forAll !== true;

        return (
            <div className={styles.container}>
                <Button
                    size="medium"
                    variant="outlined"
                    disabled={isDisabled}
                    onClick={() => this.onShowModalNewSchema(true)}
                    leftIcon={PlusIcon}
                    color="success"
                >
                    Схема
                </Button>
                <CreateNewSchema
                    open={this.state.openModalNewSchema}
                    onSetOpen={this.onShowModalNewSchema}
                    server={this.context}
                    schemaInfo={{
                        ...this.props.schemaInfo,
                        id: this.state.selectSchema,
                        tableId: this.props.tableId,
                        name: '',
                        description: '',
                        forAll: false,
                    }}
                    writePermission
                    showForAll={isAdmin}
                    onSave={this.createInfo}
                />
                <div
                    style={{
                        flexBasis: 0,
                        flexGrow: 1,
                        minWidth: 0,
                        position: 'relative',
                        width: '100%',
                    }}
                >
                    <SchemaSelect
                        treeSchemas={treeSchemas}
                        schemasList={this.state.schemasList}
                        selectedValue={this.state.selectSchema}
                        onChange={this.onChange}
                        disabled={isDisabled}
                        placeholder="Выберите схему"
                        getSchemaList={this.getSchemaList}
                    />
                </div>
                <IconButton
                    icon={SettingIcon}
                    size="medium"
                    variant="outlined"
                    disabled={isDisabled || !this.state.selectSchema}
                    onClick={this.onClickEdit}
                    title="Редактировать схему"
                />

                <EditSchema
                    open={this.state.openModalEditSchema}
                    onSetOpen={this.onShowModalEditSchema}
                    server={this.context}
                    schemaInfo={{
                        ...this.props.schemaInfo,
                        id: this.state.selectSchema,
                        tableId: this.props.tableId,
                    }}
                    writePermission
                    onSave={this.saveInfo}
                    onDelete={this.deleteInfo}
                    isOwnerEdit={isOwnerEdit}
                    canRevokeRight={canRevokeRight}
                />
                <PopConfirmSaveSchema onSave={this.onClickSave} isOwnerEdit={isOwnerEdit}>
                    <Button
                        size="medium"
                        variant="outlined"
                        color="primary"
                        disabled={isDisabled || !this.state.selectSchema}
                        loading={this.state.isSaving}
                    >
                        Сохранить
                    </Button>
                </PopConfirmSaveSchema>
                <WarningUnsaveSchema
                    open={this.state.openModalUnsaveSchema}
                    onSetOpen={this.onShowModalUnsaveSchema}
                    ifYes={() => this.saveAndChangeSchema()}
                    ifNo={() => this.dontSaveAndChangeSchema()}
                />
                <Modal classNames={styles.modal} opened={compression.isActive} onClose={() => this.onCompressionModalClose()}>
                    <Typography variant="body" style={{ marginBottom: 5 }}>
                        {compression.step}
                    </Typography>
                    <Progress
                        value={compression.progress}
                        size="large"
                        color={compression.error ? 'error' : 'primary'}
                        variant="line"
                        visiblePercent
                    />
                </Modal>
            </div>
        );
    }
}

export const PivotSchema = withRouter(PivotSchemaCMP);
