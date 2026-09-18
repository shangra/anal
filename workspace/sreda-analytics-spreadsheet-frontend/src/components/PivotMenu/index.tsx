import cn from 'classnames';
/* eslint-disable no-await-in-loop */
import crypto, { BinaryLike } from 'crypto';
import React, { ChangeEvent, Component } from 'react';
import {
    BottomIcon,
    Button,
    Checkbox,
    IconButton,
    Popover,
    Select,
    Typography,
    WindowBottomIcon,
    WindowRightIcon,
} from 'ui-kit';
import { v4 as uuidv4 } from 'uuid';

import $api from '../../helpers/axios';
import { withNotification } from '../HOC/withNotification';
import IndexDbService from '../IndexDb';
import { SCALE_OPTIONS } from '../SpreadSheetPlugins/PluginPivot/constants';
import { NumericScale, PluginPivotArg } from '../SpreadSheetPlugins/PluginPivot/types';
import { SCALE_FORMATTING_TYPES } from '../SpreadSheetPlugins/PluginPivot/utils';
// Контексты
import { Modal } from '../UIKit/Modal';
import { Progress } from '../UIKit/Progress';
import { ArrowRepeatIcon } from '../UiKitIcons/ArrowRepeatIcon';
import { ColumnIcon } from '../UiKitIcons/ColumnIcon';
import { FilterListIcon } from '../UiKitIcons/FilterListIcon';
import { LayerIcon } from '../UiKitIcons/LayerIcon';
import { RowIcon } from '../UiKitIcons/RowIcon';
import { ValueIcon } from '../UiKitIcons/ValueIcon';
import { DEFAULT_PIVOT_PARAMS } from './constants';
import { DndContextWrapper } from './DndComponents/index';
import { FieldsBlock } from './FieldsBlock';
import { loadAllChildren } from './helpers/childLoader';
import { onDragEnd, onDragOver, onDragStart } from './helpers/dnd';
import { getDragSource } from './helpers/dndRules';
import {
    checkIrrelevantData,
    clearSelectedByType,
    findParentType,
    getUsedItemIds,
    selectItemById,
    setTreeParameters,
    transformColumnsAndRows,
    transformLayers,
    updateAllArrayItems,
    updateArrayByItemId,
} from './helpers/params';
import { aggregateNames, TYPES_ITEM_LIST } from './helpers/static';
import { ItemsBlock } from './ItemsBlock';
import styles from './menu.module.css';
// Типы
import type {
    IFeatures,
    IField,
    IFieldResponse,
    IHashData,
    ILayer,
    ILayerResponse,
    IPivotMenuProps,
    IPivotMenuProps as IProps,
    IPivotMenuState as IState,
    IPivotParams,
    ISchemaInfo,
    ISnapshot,
} from './pivot-menu-types';
import { ILayerRls, ISnapshotNew, ISnapshotOld } from './pivot-menu-types/pivot-schema.types';
import { PivotSchema } from './PivotSchema';
import ServerContext from './ServerContext';
import { decompress } from './utils';

/**
 * Компонент меню кубов/отчетов
 */
class PivotMenu extends Component<IProps, IState> {
    /**
     * UUID созданного меню
     */
    public readonly uuid: string;

    static contextType = ServerContext;

    context: string = '';

    containerRef: React.RefObject<HTMLDivElement>;

    fieldsRef: React.RefObject<HTMLDivElement>;

    handleRef: React.RefObject<HTMLDivElement>;

    isResizing: boolean;

    oldHashSchema: string;

    static defaultProps = {
        orientation: 'horizontal',
    };

    /**
     * Инстанс БД для кеширования данных меню
     * @private
     */
    // private static db: IndexDbService<string, unknown>;

    /**
     * Метод актуализации кеша с снапшотом
     * @param cacheService
     * @param cacheFields
     * @private
     */
    private static async actualizeCache(cacheService: IndexDbService<string, any>, cacheFields: any[] = []) {
        if (!cacheService || !cacheFields?.length) {
            return;
        }

        // Дополняем локальный кеш
        for (const field of cacheFields) {
            if (!field.id) {
                continue;
            }

            // eslint-disable-next-line no-await-in-loop
            const node = await cacheService.read(field.id);

            if (!node || node.createdAt < field.createdAt) {
                // eslint-disable-next-line no-await-in-loop
                await cacheService.save(field);
            }
        }
    }

    constructor(props: IProps) {
        super(props);

        this.uuid = uuidv4();

        this.containerRef = React.createRef();
        this.fieldsRef = React.createRef();
        this.handleRef = React.createRef();
        this.isResizing = false;

        const pivotParams = this.getPivotParams();
        const forHash = PivotMenu.generateHashData(pivotParams);
        const hash = PivotMenu.getHash(forHash);
        const features = PivotMenu.getFeaturesList(this.props.features);

        this.oldHashSchema = hash;
        // this.loadQueue = new Set();
        // this.isProcessing = false;

        this.state = {
            isValid: true,
            tableId: this.props.tableId,
            isFetching: this.props.isFetching ?? false,
            hashSchema: hash,
            clearHistory: false,
            pivotParams,
            actualFields: [],
            actualLayers: [],
            schemaId: '',
            schemaInfo: {
                standart: false,
                forAll: false,
                name: '',
                createdUser: '',
            },
            loadingProgress: {
                isActive: false,
                progress: 0,
                step: '',
                error: false,
            },
            ...features,
            activeId: null,
            activeElement: null,
            draggingItem: null,
            preview: null,
            orientation: props.orientation,
        };
    }

    startResizing = (_e: React.MouseEvent<HTMLDivElement>) => {
        this.isResizing = true;
        document.body.style.userSelect = 'none';
    };

    stopResizing = () => {
        if (this.isResizing) {
            this.isResizing = false;
            document.body.style.userSelect = '';
        }
    };

    componentDidMount() {
        // Вешаем глобальные события на document при монтировании
        document.addEventListener('mousemove', this.resize);
        document.addEventListener('mouseup', this.stopResizing);

        this.props.handleSchemaInfo({
            name: this.state.schemaInfo.name,
            isChanged: true,
            values: this.state.pivotParams.values as PluginPivotArg[],
            measureUnit: this.state.pivotParams.measureUnit as NumericScale,
        });
    }

    componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IState>) {
        let changes: Partial<IState> = {};

        // Обновляем список скрытых элементов
        if (prevProps.features !== this.props.features) {
            const features = PivotMenu.getFeaturesList(this.props.features);
            changes = { ...changes, ...features };
        }
        // Обновляем параметры меню
        if (JSON.stringify(prevProps.pivotParams) !== JSON.stringify(this.props.pivotParams)) {
            changes.pivotParams = this.getPivotParams();
        }
        // Обновляем статус активного получения данных
        if (prevProps.isFetching !== this.props.isFetching) {
            changes.isFetching = this.props.isFetching;
        }

        if (prevProps.orientation !== this.props.orientation) {
            changes.orientation = this.props.orientation;
        }

        if ((changes.orientation || prevState.orientation !== this.state.orientation) && this.fieldsRef.current) {
            this.fieldsRef.current.style.height = '';
            this.fieldsRef.current.style.width = '';
            this.fieldsRef.current.style.flexGrow = '';
        }

        if (Object.keys(changes).length > 0) {
            this.setState((prev) => ({ ...prev, ...changes }));
        }

        const isHashChanged = this.state.hashSchema !== prevState.hashSchema;
        const isSchemaNameChanged = prevState.schemaInfo.name !== this.state.schemaInfo.name;
        if (changes.pivotParams || isHashChanged || isSchemaNameChanged) {
            this.props.handleSchemaInfo({
                name: this.state.schemaInfo.name,
                isChanged: isHashChanged,
                values: changes.pivotParams?.values as PluginPivotArg[],
                measureUnit: changes.pivotParams?.measureUnit as NumericScale,
            });
        }
    }

    componentWillUnmount() {
        // Обязательно удаляем слушатели для предотвращения утечек памяти
        document.removeEventListener('mousemove', this.resize);
        document.removeEventListener('mouseup', this.stopResizing);
    }

    // componentDidMount() {
    //     if (!PivotMenu.db) {
    //         PivotMenu.db = new IndexDbService(DB_NAME, STORE_NAME);
    //         PivotMenu.db
    //             .init()
    //             .then(() => console.log('✅ Хранилище кеша было инициализировано'))
    //             .catch(() => console.log('⚠️ Произошла ошибка при инициализации хранилища'));
    //     }
    // }

    // componentWillUnmount() {
    //     PivotMenu.db
    //         .close()
    //         .then(() => console.log('✅ Хранилище успешно отключено'))
    //         .catch(() => console.log('⚠️ Произошла ошибка при отключении хранилища'));
    // }

    handleDragStart = (event: any) => {
        const source = getDragSource(event);
        if (!source) return;

        const { sourceBlock, originalId, element } = source;
        const { pivotParams } = this.state;

        if (sourceBlock === 'fields') {
            this.setPivotParams({
                ...pivotParams,
                fields: updateArrayByItemId(pivotParams.fields, originalId, 'isActiveDropdown', false) || [],
            });
        }

        this.setState({
            activeId: originalId,
            activeElement: element?.description?.length > 0 ? element.description : element?.label,
            draggingItem: element,
        });

        onDragStart(event, pivotParams, this.setPivotParams);
    };

    handleDragEnd = (event: any) => {
        this.setState({
            activeId: null,
            activeElement: null,
            draggingItem: null,
            preview: null,
        });

        const { pivotParams } = this.state;

        onDragEnd(event, pivotParams, this.setPivotParams);
    };

    handleDragOver = (event: any) => {
        const { pivotParams } = this.state;

        const preview = onDragOver(event, pivotParams);
        this.setState({ preview: preview ?? null });
    };

    handleDragCancel = () => {
        this.setState({ activeId: null, draggingItem: null });
    };

    private async setLoadingProgress(loadingProgress: IState['loadingProgress'], timeout: number = 100) {
        await new Promise((resolve) => {
            setTimeout(resolve, timeout);
        });
        this.setState((state) => ({
            loadingProgress: {
                ...state.loadingProgress,
                ...loadingProgress,
            },
        }));
    }

    handleLoadingProgress = (progress: Partial<IState['loadingProgress']>) => {
        this.setState((state) => ({
            loadingProgress: {
                ...state.loadingProgress,
                ...progress,
            },
        }));
    };

    /**
     * Метод преобразования строки скрытых блоков в список
     * @param features Список скрытых блоков через запятую
     * @returns Список скрытых/отображаемых блоков
     */
    private static getFeaturesList(features?: IPivotMenuProps['features']): IFeatures {
        const result = {
            isColumnsShow: false,
            isColumnsTotalShow: false,
            isFiltersShow: false,
            isLayersShow: false,
            isRowsShow: false,
            isRowsTotalShow: false,
            isValuesShow: false,
            isRecalculateShow: false,
            isRepeatHeaders: false,
            isMaskShow: false,
            isClassic: false,
            isStaticLayers: false,
            isStaticValues: false,
            isColumnAllValuesShow: false,
            isRowsAllValuesShow: false,
        };

        if (!features?.length) {
            return result;
        }

        for (const item of features) {
            switch (item.trim()) {
                case 'layers': {
                    result.isLayersShow = true;
                    break;
                }
                case 'filter': {
                    result.isFiltersShow = true;
                    break;
                }
                case 'columns': {
                    result.isColumnsShow = true;
                    break;
                }
                case 'columns.totals': {
                    result.isColumnsTotalShow = true;
                    break;
                }
                case 'rows': {
                    result.isRowsShow = true;
                    break;
                }
                case 'rows.totals': {
                    result.isRowsTotalShow = true;
                    break;
                }
                case 'values': {
                    result.isValuesShow = true;
                    break;
                }
                case 'recalculate': {
                    result.isRecalculateShow = true;
                    break;
                }
                case 'mask': {
                    result.isMaskShow = true;
                    break;
                }
                case 'classic': {
                    result.isClassic = true;
                    break;
                }
                case 'static.layers': {
                    result.isStaticLayers = true;
                    break;
                }
                case 'static.values': {
                    result.isStaticValues = true;
                    break;
                }
                case 'columns.allValues': {
                    result.isColumnAllValuesShow = true;
                    break;
                }
                case 'rows.allValues': {
                    result.isRowsAllValuesShow = true;
                    break;
                }
                default: {
                    break;
                }
            }
        }

        return result;
    }

    /**
     * Метод получения хеша данных
     * @param param Данные для генерации хеша
     * @returns Сгенерированный хеш
     */
    private static getHash(param: IHashData | string): string {
        if (!param) {
            throw new Error('Переданы некорректные данные для генерации хеша');
        }

        const staticParam = typeof param === 'object' ? JSON.stringify(param) : param;
        const bytes = Buffer.from(staticParam, 'utf8') as unknown as BinaryLike;
        return crypto.createHash('md5').update(bytes).digest('hex');
    }

    /**
     * Метод подготовки данных для хеширования
     * @private
     */
    private static generateHashData(data: IPivotParams) {
        return {
            columns: data?.columns || [],
            rows: data?.rows || [],
            filter: data?.filter || [],
            values: data?.values || [],
        };
    }

    /**
     * Метод обновления используемых параметров сводной таблицы
     * @private
     */
    private static async updatePivotParams(
        pivotParams: IPivotParams,
        actualFields: IFieldResponse[] = [],
        actualLayers: ILayerResponse[] = [],
        options: { isStaticLayers: boolean; isStaticValues: boolean } = { isStaticLayers: false, isStaticValues: false },
    ) {
        pivotParams = structuredClone(pivotParams);

        // Подготавливаем строки и колонки
        const { columns = [], rows = [] } = transformColumnsAndRows(pivotParams, options) as {
            columns: IPivotParams['columns'];
            rows: IPivotParams['rows'];
        };
        pivotParams.columns = columns;
        pivotParams.rows = rows;
        // Актуализируем поля
        const usedItems = getUsedItemIds(pivotParams);
        pivotParams.fields = setTreeParameters(actualFields, usedItems) as IField[];
        // Подготавливаем слои
        pivotParams.layers = transformLayers(pivotParams.layers || [], actualLayers);

        // Собираем список актуальных полей меню
        const fieldsList = pivotParams.fields.reduce((acc: Record<string, IField>, field: IField) => {
            if (field.id) {
                acc[field.id] = field;
            }

            if (field.child?.length) {
                for (const child of field.child) {
                    // @ts-ignore
                    acc[child.id] = child;
                }
            }

            return acc;
        }, {});

        const names: (keyof Pick<IPivotParams, 'columns' | 'rows' | 'filter' | 'values'>)[] = [
            'columns',
            'rows',
            'filter',
            'values',
        ];
        const checkList = [];

        // Подготавливаем плоский список полей
        for (const name of names) {
            const arr = pivotParams[name];

            if (!arr?.length) {
                continue;
            }

            const stack = [arr[0]];
            let start = 0;

            while (stack.length) {
                const item = stack.pop() as { child: any[]; categoryId: string };
                checkList.push(item);
                start++;

                if (arr[start]) {
                    stack.push(arr[start]);
                }

                if (item.child?.length) {
                    stack.push(...item.child);
                }
            }
        }

        // Отмечаем удаленные поля и слои, обновляем существующие
        checkIrrelevantData(pivotParams, fieldsList);

        return pivotParams;
    }

    private static getLayerRls = async (infoserviceId: string, context: string = ''): Promise<ILayerRls[]> => {
        let result = [
            {
                name: 'ДоступПо-умолчанию',
                description: 'Доступ по-умолчанию',
                conditions: [
                    {
                        name: 'НеУдалосьПроверитьДоступностьДанных',
                        description: 'Не удалось проверить доступность данных',
                        apply: false,
                    },
                ],
            },
        ] as ILayerRls[];

        try {
            if (infoserviceId === '0' || !infoserviceId) {
                throw new Error(`Не найдена ссылка на инфосервис (infoserviceId: "${infoserviceId}")`);
            }

            ({ data: result } = await $api.get(
                `${context ? `/to/${context}` : ''}/metadata/rls/check/${infoserviceId}`,
                { flashOff: true },
            ));
        } catch (e) {
            console.error(e);
        }

        return result;
    };

    private static validateLayer = async (layer: ILayer, context: string = '') => {
        layer = structuredClone(layer);

        const id = layer.ref;

        if (layer.onoff === true) {
            layer.notices ||= [];
            layer.notices.push({
                icon: 'SettingWrenchIcon' as const,
                color: 'error',
                content: [{ content: layer.reason || 'Слой отключен на время проведения технических работ' }],
            });
        }

        const rlss = await PivotMenu.getLayerRls(id, context);

        layer.isMask = rlss.some((rls) => rls.isMask);

        if (rlss.some((rls) => rls.conditions.some((cond) => !cond.apply))) {
            const color = rlss.some((rls) => rls.conditions.some((cond) => cond.apply)) ? 'warning' : 'error';

            layer.notices ||= [];
            layer.notices.push({
                icon: 'AccessLockIcon' as const,
                color,
                content: rlss.flatMap((item, i) => [
                    {
                        content: item.description || item.name,
                        className: i === 0 ? '' : styles.mt2,
                    },
                    {
                        content: item.conditions.map((cond) => ({
                            className: styles.ms2,
                            icon: cond.apply ? 'SuccessIcon' : 'ErrorIcon',
                            color: cond.apply ? 'success' : 'error',
                            content: cond.description || cond.name,
                        })),
                    },
                ]),
            });
        }

        return layer;
    };

    /**
     * Метод получения параметров меню
     * @returns Подготовленный объект параметров меню
     */
    private getPivotParams = (): IPivotParams => {
        const isValid = this.props.pivotParams && typeof this.props.pivotParams === 'string';

        if (!isValid) {
            console.warn('Передан некорректный "pivotParams"', this.props.pivotParams);
        }

        return isValid ? JSON.parse(this.props.pivotParams) : DEFAULT_PIVOT_PARAMS;
    };

    /**
     * Метод получения данных меню
     */
    private async getMenuParameters(): Promise<{ fields: IFieldResponse[]; layers: ILayerResponse[] }> {
        const context = this.context && typeof this.context === 'string' ? this.context : '';

        const url = `${context ? `/to/${context}` : ''}/pivottables/menu/${this.state.tableId}`;
        const { data = {} } = await $api.get(url);
        let { params: fields = [], layers = [] } = data;

        // Загружаем всех детей
        fields = await loadAllChildren(fields, PivotMenu.handleChildLoad.bind(PivotMenu), context);

        layers = await Promise.all(layers.map((layer: ILayer) => PivotMenu.validateLayer(layer, context)));

        this.setState(() => ({
            actualFields: fields,
            actualLayers: layers,
        }));

        return { fields, layers };
    }

    /**
     * TODO schemaId здесь быть не должно. Этим занимается компонент PivotSchema
     * Метод получения данных о схеме
     * @param ownerId UUID меню
     * @param schemaId UUID схемы
     * @private
     */
    private async getSchemaData(
        ownerId: string,
        schemaId: string,
    ): Promise<{ schema: IPivotParams; snapshot: ISnapshot; schemaInfo: ISchemaInfo }> {
        if (!ownerId) {
            throw new Error('Не передан уникальный идентификатор владельца схемы');
        }

        if (!schemaId) {
            throw new Error('Не передан уникальный идентификатор схемы');
        }

        await this.setLoadingProgress(
            {
                isActive: true,
                progress: 20,
                step: 'Получение данных схемы...',
                error: false,
            },
            300,
        );

        const result = {
            schema: {} as IPivotParams,
            snapshot: {} as ISnapshot,
            schemaInfo: {} as ISchemaInfo,
        };
        const context = this.context && typeof this.context === 'string' ? this.context : '';
        const { data } = await $api.get(`${context ? `/to/${context}` : ''}/metadata/schemas/${ownerId}/${schemaId}`);

        if (data?.rows?.length) {
            const {
                schema: schemaData,
                snapshot: snapshotData,
                forAll = false,
                name = '',
                standart_schema: standart = false,
                createdUser = '',
                updatedUser = '',
                updatedAt = '',
            } = data.rows[0];

            if (typeof schemaData === 'string' && schemaData) {
                result.schema = JSON.parse(schemaData) as IPivotParams;
            } else if (schemaData && typeof schemaData === 'object') {
                result.schema = schemaData as IPivotParams;
            }
            if (snapshotData) {
                result.snapshot = await decompress(snapshotData, async (progress, step, delay = 100) => {
                    await this.setLoadingProgress(
                        {
                            isActive: true,
                            progress: 30 + (60 - 30) * (progress / 100),
                            step,
                            error: false,
                        },
                        delay,
                    );
                });
            }
            result.schemaInfo = {
                forAll,
                name,
                standart,
                createdUser,
                updatedUser,
                updatedAt,
            };
        }

        return result;
    }

    /**
     * Метод очистки хеша данных
     */
    dropHash = () => {
        this.oldHashSchema = this.state.hashSchema;
        this.setState((prevState) => ({
            hashSchema: this.oldHashSchema,
        }));
    };

    /**
     * Метод установки полей параметров куба
     * @param pivotParams Параметры куба
     * @param [clearHistory=false] Флаг очистки истории запросов
     */
    setPivotParams = (pivotParams: IPivotParams = DEFAULT_PIVOT_PARAMS, clearHistory: boolean = false) => {
        pivotParams.isMask = pivotParams.isMask && pivotParams.layers.some((layer) => layer.isMask);

        const forHash = PivotMenu.generateHashData(pivotParams);
        const forOldHash = PivotMenu.generateHashData(this.state.pivotParams);
        const hashSchema = PivotMenu.getHash(forHash);
        this.oldHashSchema = PivotMenu.getHash(forOldHash);
        const checkList = [
            ...(pivotParams.filter || []),
            ...(pivotParams.values || []),
            ...(pivotParams.columns || []),
            ...(pivotParams.rows || []),
        ];
        // @todo При необходимости дополнить валидацию
        const isValid =
            !checkList.some((field: any) => field.isIrrelevant) &&
            !pivotParams.layers.some((layer: any) => layer.isIrrelevant && layer.isSelected);

        this.setState(
            (prevState) => ({
                ...prevState,
                pivotParams,
                hashSchema,
                isValid,
                clearHistory,
            }),
            () => {
                this.props.onChange?.({ ...pivotParams });
            },
        );
    };

    // TODO: костыль
    removeMaskedFilters = (pivotParams: IPivotParams) => {
        const LIST = ['filter', 'values', 'columns', 'rows'];

        const _clear = (items: any[]) =>
            items.forEach((item: any) => {
                if (item.isMasked) item.filter = [];

                _clear(item.child ?? []);
            });

        for (const type of LIST) {
            // @ts-ignore
            _clear(pivotParams[type]);
        }
    };

    /**
     * Событие нажатия на кнопку применения схемы
     */
    handleAcceptButton = () => {
        const { pivotParams, isRowsShow } = this.state;
        const isEmptyValues = pivotParams?.values?.length === 0;
        const isEmptyColumns = pivotParams?.columns?.length === 0;
        const isEmptyRows = pivotParams?.rows?.length === 0;
        const hasSelectedLayers = pivotParams?.layers.some((el) => el.isSelected);
        const hasDimensions = (pivotParams?.fields || []).some((field: any) => field.typeParam === 'Dimension');
        const hasLayersCatalog = (pivotParams?.layers || []).length > 0;

        const missing: string[] = [];
        if (isEmptyValues) missing.push('значения (мера слева → «+» в «Значения»)');
        if (hasDimensions && isEmptyColumns) missing.push('столбцы (вкладка «Измерения» → «+» в «Столбцы»)');
        if (isRowsShow && hasDimensions && isEmptyRows) missing.push('строки (вкладка «Измерения» → «+» в «Строки»)');
        if (hasLayersCatalog && !hasSelectedLayers) missing.push('слой (отметьте слой в блоке «Слои»)');

        if (missing.length) {
            const text = `Чтобы построить срез, не хватает: ${missing.join('; ')}`;

            // TODO гребанный ui-kit
            // @ts-expect-error
            const { open } = this.props.notification;
            open(text, { color: 'warning', timeout: 5000 });
            return;
        }

        if (pivotParams.isMask === true) {
            this.removeMaskedFilters(pivotParams);
        }

        this.setState(() => ({ isFetching: true }));

        this.props.onFetchStart?.();
        this.props.onFetchEnd?.();

        if (this.props.handleClickGetData) {
            this.props.handleClickGetData(pivotParams, () => {
                this.setState(() => ({ isFetching: false }));
            });
        } else {
            this.setState(() => ({ isFetching: false }));
        }
    };

    /**
     * Событие загрузки дочернего элемента меню
     * @param parent Родительский элемент для которого загружаем дочерние элементы
     */
    private static async handleChildLoad(parent: IFieldResponse, context?: string): Promise<void> {
        if (!parent) {
            throw new Error('Передан некорректный родительский элемент');
        }

        const refId = parent.ref?.value ? parent.ref.value : parent.ref;

        if (!refId || typeof refId !== 'string') {
            throw new Error('Передана некорректная ссылка на родительский элемент');
        }

        try {
            if (!refId) {
                throw new Error('Передана некорректная ссылка для получения дочерних элементов');
            }

            const { data: { params = [] } = {} } = await $api.get(
                `${context ? `/to/${context}` : ''}/pivottables/menu/${refId}/children`,
            );
            parent.child = params.map((item: any) => {
                const child =
                    item.child?.filter((el: any) => !aggregateNames.includes(el.name) || item.typeParam === 'Measure') ?? [];
                return { ...item, child, hasChild: !!child?.length };
            });
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * TODO schemaId здесь быть не должно. Этим занимается компонент PivotSchema
     * Событие выбора схемы
     * @param schemaId UUID выбранной схеы
     */
    handleSchemaChange = async (schemaId: string = ''): Promise<void> => {
        try {
            this.setState(() => ({
                isFetching: true,
                schemaId,
                loadingProgress: {
                    isActive: true,
                    progress: 0,
                    step: 'Загрузка данных схемы...',
                    error: false,
                },
            }));
            this.props.onFetchStart?.();

            const { tableId } = this.state;
            let { actualFields = [], actualLayers = [] } = this.state;
            let schema: IPivotParams = {
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
                isClassic: false,
                columnsAllValues: false,
                rowsAllValues: false,
            };
            let snapshotRaw: ISnapshot = {
                infoserviceId: '',
                name: '',
                pivotParams: {},
                args: {} as any,
                tableParams: {} as any,
                url: '',
                version: '',
            };
            let schemaInfo: ISchemaInfo = {
                standart: false,
                forAll: false,
                name: '',
                createdUser: '',
            };

            if (!actualFields.length || !actualLayers.length) {
                await this.setLoadingProgress(
                    {
                        isActive: true,
                        progress: 10,
                        step: 'Получение списка аналитик...',
                        error: false,
                    },
                    200,
                );

                const { fields = [], layers = [] } = await this.getMenuParameters();
                actualFields = fields;
                actualLayers = layers;
            }
            if (tableId && schemaId) {
                const {
                    schema: loadedSchema,
                    snapshot: loadedSnapshot,
                    schemaInfo: loadedInfo,
                } = await this.getSchemaData(tableId, schemaId);
                schema = loadedSchema;
                snapshotRaw = loadedSnapshot;
                schemaInfo = loadedInfo;
            }

            await this.setLoadingProgress(
                {
                    isActive: true,
                    progress: 70,
                    step: 'Подготовка схемы...',
                    error: false,
                },
                300,
            );

            const { isStaticLayers, isStaticValues } = this.state;
            schema = await PivotMenu.updatePivotParams(schema, actualFields, actualLayers, { isStaticLayers, isStaticValues });

            if (snapshotRaw && Object.keys(snapshotRaw).length > 0) {
                await this.setLoadingProgress(
                    {
                        isActive: true,
                        progress: 90,
                        step: 'Применение снапшота...',
                        error: false,
                    },
                    300,
                );

                const isSnapshotOld = !('state' in snapshotRaw);
                const snapshotOld: ISnapshotOld | null = isSnapshotOld ? (snapshotRaw as ISnapshotOld) : null;

                let snapshot: ISnapshotNew | null = null;

                if (isSnapshotOld) {
                    snapshot = {
                        state: {
                            args: structuredClone(schema),
                            history: snapshotOld?.history,
                            historyCache: snapshotOld?.historyCache,
                            infoserviceId: snapshotOld?.infoserviceId,
                            tableParams: snapshotOld?.tableParams,
                        },
                        key: snapshotOld?.name,
                        version: snapshotOld?.version,
                        url: snapshotOld?.url,
                    } as ISnapshotNew;
                } else {
                    snapshot = snapshotRaw as ISnapshotNew;
                    snapshot.state.args = structuredClone(schema);
                }

                await this.props.masterInstance?.import?.(snapshot);
            } else {
                this.setPivotParams(schema);
            }

            this.setState(() => ({ schemaInfo }));

            await this.setLoadingProgress(
                {
                    isActive: true,
                    progress: 100,
                    step: 'Схема загружена!',
                    error: false,
                },
                200,
            );

            this.dropHash();

            await this.setLoadingProgress(
                {
                    isActive: false,
                    progress: 0,
                    step: '',
                    error: false,
                },
                200,
            );
        } catch (e) {
            console.error('Ошибка при загрузке схемы:', e);

            await this.setLoadingProgress(
                {
                    isActive: true,
                    progress: this.state.loadingProgress.progress,
                    step: (e as Error).message,
                    error: true,
                },
                200,
            );
        } finally {
            this.props.onFetchEnd?.();

            this.setState(() => ({ isFetching: false }));
        }
    };

    handleSchemaInfoChange = (schemaInfo: ISchemaInfo): void => {
        this.setState((prevState) => ({
            ...prevState,
            schemaInfo,
        }));
    };

    onLoadingProgressClose() {
        if (!this.state.loadingProgress.error) return;

        this.setState({
            loadingProgress: {
                isActive: false,
                progress: 0,
                step: '',
                error: false,
            },
        });
    }

    /**
     * Событие нажатия на кнопку обновления параметров
     */
    handleRefreshParameters = async () => {
        try {
            this.props.onFetchStart?.();

            this.setState(() => ({
                isFetching: true,
                loadingProgress: {
                    isActive: true,
                    progress: 0,
                    step: 'Получение списка аналитик...',
                    error: false,
                },
            }));

            const { fields = [], layers = [] } = await this.getMenuParameters();

            await this.setLoadingProgress(
                {
                    isActive: true,
                    progress: 100,
                    step: 'Применение изменений...',
                    error: false,
                },
                300,
            );

            const { isStaticLayers, isStaticValues } = this.state;
            const pivotParams = await PivotMenu.updatePivotParams(this.state.pivotParams, fields, layers, {
                isStaticLayers,
                isStaticValues,
            });

            this.setPivotParams(pivotParams);

            this.setState(() => ({
                loadingProgress: {
                    isActive: false,
                    progress: 0,
                    step: '',
                    error: false,
                },
            }));
        } catch (e) {
            console.error('Ошибка при обновлении параметров:', e);

            await this.setLoadingProgress(
                {
                    isActive: true,
                    progress: this.state.loadingProgress.progress,
                    step: (e as Error).message,
                    error: true,
                },
                200,
            );
        } finally {
            this.props.onFetchEnd?.();

            this.setState(() => ({ isFetching: false }));
        }
    };

    handleSelectItem = (
        itemId: string,
        blockType: (typeof TYPES_ITEM_LIST)[number] | 'layers' | 'fields',
        // eslint-disable-next-line default-param-last
        isSelected = false,
        categoryId: string,
    ) => {
        const pivotParams = {
            ...this.state.pivotParams,
        };

        // @ts-expect-error
        if (TYPES_ITEM_LIST.includes(blockType)) {
            for (const type of TYPES_ITEM_LIST) {
                if (!pivotParams[type]) continue;

                pivotParams[type] = updateAllArrayItems(pivotParams[type], 'isSelected', false);

                if (type === blockType && !isSelected) {
                    pivotParams[type] = updateArrayByItemId(pivotParams[type], itemId, 'isSelected', true);
                }
            }
        }

        if (blockType === 'fields') {
            const itemTypeParam = findParentType(pivotParams.fields, itemId);
            pivotParams.fields = clearSelectedByType(pivotParams.fields, itemTypeParam, itemId);
            pivotParams.fields = selectItemById(pivotParams.fields, itemId, categoryId);
        }

        if (blockType === 'layers') {
            pivotParams[blockType] = updateArrayByItemId(pivotParams[blockType], itemId, 'isSelected', !isSelected);
        }

        this.setPivotParams(pivotParams);
    };

    handleEmptyAdd = (blockType: string = '') => {
        const fields = this.state.pivotParams?.fields || [];
        const hasDimensions = fields.some((field: any) => field.typeParam === 'Dimension');
        const wantsDimension = ['filter', 'columns', 'rows'].includes(blockType);
        let text = 'Отметьте поле слева, затем нажмите «+».';
        if (wantsDimension && !hasDimensions) {
            text =
                'Строки, столбцы и фильтр заполняются из вкладки «Измерения». В этом кубе измерений нет — их нужно добавить в админке.';
        } else if (wantsDimension) {
            text = 'Откройте вкладку «Измерения», отметьте поле, затем нажмите «+» в строках, столбцах или фильтре.';
        } else if (fields.length) {
            text = 'Отметьте меру на вкладке «Меры», затем нажмите «+» в блоке «Значения».';
        } else {
            text = 'В кубе нет мер и измерений. Добавьте их в админке.';
        }
        // @ts-expect-error ui-kit notification
        this.props.notification?.open?.(text, { color: 'warning', timeout: 7000 });
    };

    resize = (e: MouseEvent) => {
        if (!this.isResizing || !this.containerRef.current || !this.fieldsRef.current || !this.handleRef.current) return;

        const { orientation } = this.state;
        const containerRect = this.containerRef.current.getBoundingClientRect();
        const fieldsEl = this.fieldsRef.current;

        const gapOffset = 32;

        let minSize = 0;
        let newSize = 0;
        let maxSize = 0;

        if (orientation === 'horizontal') {
            minSize = 150;
            newSize = e.clientY - containerRect.top;
            const handleHeight = this.handleRef.current.offsetHeight;
            maxSize = containerRect.height - minSize - handleHeight - gapOffset;
        } else {
            minSize = 250;
            newSize = e.clientX - containerRect.left;
            const handleWidth = this.handleRef.current.offsetWidth;
            maxSize = containerRect.width - minSize - handleWidth - gapOffset;
        }

        // Применяем лимиты
        if (newSize < minSize) newSize = minSize;
        if (newSize > maxSize) newSize = maxSize;

        fieldsEl.style.flexGrow = '0';

        if (orientation === 'horizontal') {
            fieldsEl.style.height = `${newSize}px`;
            fieldsEl.style.width = '';
        } else {
            fieldsEl.style.width = `${newSize}px`;
            fieldsEl.style.height = '';
        }
    };

    render() {
        const {
            pivotParams,
            hashSchema,
            isLayersShow = true,
            isFiltersShow = true,
            isColumnsShow = true,
            isRowsShow = true,
            isValuesShow = true,
            loadingProgress,
            orientation,
        } = this.state;

        const isChanged = hashSchema !== this.oldHashSchema;
        const isLayerBlockShow = pivotParams.layers && isLayersShow;
        const isFilterBlockShow = pivotParams.filter && isFiltersShow;
        const isColumnsBlockShow = pivotParams.columns && isColumnsShow;
        const isRowsBlockShow = pivotParams.rows && isRowsShow;
        const isValuesBlockShow = pivotParams.values && isValuesShow;
        const isFieldsBlockShow = true; // Отображаем всегда, без него выглядит криво
        const isButtonDisabled = this.state.isFetching;
        const isColumnsTotalShow = isColumnsBlockShow && this.state.isColumnsTotalShow;
        const isRowsTotalShow = isRowsBlockShow && this.state.isRowsTotalShow;
        const isScaleFormat = pivotParams.values?.some(
            (item: any) => item.format && SCALE_FORMATTING_TYPES.includes(item.format),
        );
        const useMeasure = pivotParams.values?.some((item: any) => item.useMeasure);

        const isColumnAllValuesShow = isColumnsBlockShow && this.state.isColumnAllValuesShow;
        const isRowsAllValuesShow = isRowsBlockShow && this.state.isRowsAllValuesShow;

        const isMaskShow = this.state.isMaskShow && pivotParams.layers.some((layer) => layer.isMask);
        const hasDimensions = (pivotParams.fields || []).some((field: any) => field.typeParam === 'Dimension');
        const hasLayersCatalog = (pivotParams.layers || []).length > 0;

        const pivotParamsClassName = cn(
            styles.pivot_params,
            orientation === 'vertical' ? styles.pivot_params__vertical : styles.pivot_params__horizontal,
        );
        const rowClassName = cn(styles.row, orientation === 'vertical' ? styles.row__vertical : styles.row__horizontal);
        const handleClassName = cn(
            styles.handle,
            orientation === 'vertical' ? styles.handle__vertical : styles.handle__horizontal,
        );

        const rowItemClassName = cn(
            styles.row__item,
            orientation === 'vertical' ? styles.row_item__vertical : styles.row_item__horizontal,
        );

        return (
            <div className={styles.pivot_menu}>
                <div className={styles.tableSidebar}>
                    <PivotSchema
                        /** @ts-ignore */
                        schema={pivotParams}
                        schemaInfo={this.state.schemaInfo}
                        isLoading={this.state.isFetching}
                        isChange={isChanged}
                        tableId={this.state.tableId}
                        dropHash={this.dropHash}
                        onChange={this.handleSchemaChange}
                        onEdit={this.handleSchemaInfoChange}
                        masterInstance={this.props.masterInstance}
                        onLoadingProgress={this.handleLoadingProgress}
                    />

                    {(!hasDimensions || !hasLayersCatalog) && (
                        <Typography variant="body" style={{ opacity: 0.8 }}>
                            {!hasDimensions && !hasLayersCatalog
                                ? 'В этом кубе нет измерений и слоёв: строки и столбцы взять неоткуда. Меры кладутся только в «Значения». Измерения и слой-инфосервис добавляются в админке.'
                                : !hasDimensions
                                  ? 'В кубе нет измерений — вкладка «Измерения» пустая. Строки, столбцы и фильтр из мер не заполняются.'
                                  : 'В кубе нет слоёв (инфосервисов). Без слоя данные среза обычно не считаются — слой задаётся в админке.'}
                        </Typography>
                    )}

                    <div className={styles.btnBox}>
                        <div>
                            <Typography
                                variant="heading5"
                                style={{ position: 'relative', fontWeight: 600, paddingRight: 'var(--ui-kit-spacing-4)' }}
                            >
                                Параметры {isChanged && <span className={styles.badge} />}
                            </Typography>
                            <IconButton
                                title="Обновить список параметров"
                                aria-label="Обновить список параметров"
                                disabled={this.state.isFetching}
                                onClick={this.handleRefreshParameters}
                                icon={ArrowRepeatIcon}
                            />
                            <IconButton
                                title={
                                    orientation === 'horizontal'
                                        ? 'Отображение блоков по-горизонтали'
                                        : 'Отображение блоков по-вертикали'
                                }
                                aria-label={
                                    orientation === 'horizontal'
                                        ? 'Отображение блоков по-горизонтали'
                                        : 'Отображение блоков по-вертикали'
                                }
                                onClick={() =>
                                    this.setState((prevState) => ({
                                        orientation: prevState.orientation === 'horizontal' ? 'vertical' : 'horizontal',
                                    }))
                                }
                                icon={orientation === 'horizontal' ? WindowBottomIcon : WindowRightIcon}
                            />
                        </div>

                        <div>
                            <Button
                                color="primary"
                                disabled={isButtonDisabled}
                                loading={this.state.isFetching}
                                onClick={this.handleAcceptButton}
                            >
                                Применить
                            </Button>
                            <Popover
                                content={
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-kit-spacing-4)' }}>
                                        <Checkbox
                                            label="Сохранять раскрытие иерархий"
                                            value="recalculate"
                                            checked={this.state.pivotParams.recalculate}
                                            onChange={() => {
                                                this.setPivotParams({
                                                    ...pivotParams,
                                                    recalculate: !pivotParams.recalculate,
                                                });
                                            }}
                                            style={{ flexDirection: 'row-reverse' }}
                                        />

                                        {isMaskShow && (
                                            <Checkbox
                                                label="Обезличенные данные"
                                                value="isMask"
                                                checked={pivotParams.isMask}
                                                onChange={() => {
                                                    this.setPivotParams({
                                                        ...pivotParams,
                                                        isMask: !pivotParams.isMask,
                                                    });
                                                }}
                                                style={{ flexDirection: 'row-reverse' }}
                                            />
                                        )}
                                    </div>
                                }
                            >
                                <IconButton icon={BottomIcon} title="Параметры" />
                            </Popover>
                        </div>
                    </div>

                    {pivotParams && (
                        <div className={styles.pivot_params__wrapper}>
                            <div className={pivotParamsClassName} ref={this.containerRef}>
                                <DndContextWrapper
                                    onDragStart={this.handleDragStart}
                                    onDragEnd={this.handleDragEnd}
                                    onDragOver={this.handleDragOver}
                                    onDragCancel={this.handleDragCancel}
                                    uuid={this.uuid}
                                    draggingItem={this.state.draggingItem}
                                >
                                    <div ref={this.fieldsRef} className={cn(styles.row__resizable, rowClassName)}>
                                        {isFieldsBlockShow && (
                                            <FieldsBlock
                                                activeId={this.state.activeId}
                                                type="fields"
                                                title="Поля"
                                                uuid={this.uuid}
                                                pivotParams={pivotParams}
                                                setPivotParams={this.setPivotParams}
                                                onSelectItem={this.handleSelectItem}
                                                className={rowItemClassName}
                                            />
                                        )}

                                        {isLayerBlockShow && (
                                            <ItemsBlock
                                                preview={this.state.preview}
                                                uuid={this.uuid}
                                                hasAppend={false}
                                                type="layers"
                                                title="Слои"
                                                hasCheck
                                                icon={<LayerIcon size="medium" />}
                                                pivotParams={pivotParams}
                                                setPivotParams={(params: IPivotParams) => this.setPivotParams(params, true)}
                                                onSelectItem={this.handleSelectItem}
                                                className={rowItemClassName}
                                            />
                                        )}
                                    </div>
                                    <div ref={this.handleRef} className={handleClassName} onMouseDown={this.startResizing} />
                                    <div className={rowClassName}>
                                        {isFilterBlockShow && (
                                            <ItemsBlock
                                                preview={this.state.preview}
                                                uuid={this.uuid}
                                                type="filter"
                                                title="Фильтр"
                                                icon={<FilterListIcon size="medium" />}
                                                pivotParams={pivotParams}
                                                setPivotParams={(params: IPivotParams) => this.setPivotParams(params, true)}
                                                onSelectItem={this.handleSelectItem}
                                                onEmptyAdd={this.handleEmptyAdd}
                                                className={rowItemClassName}
                                            />
                                        )}

                                        {isColumnsBlockShow && (
                                            <ItemsBlock
                                                preview={this.state.preview}
                                                uuid={this.uuid}
                                                type="columns"
                                                title="Столбцы"
                                                icon={<ColumnIcon size="medium" />}
                                                actions={
                                                    (isColumnsTotalShow || isColumnAllValuesShow) && (
                                                        <Popover
                                                            content={
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        gap: 'var(--ui-kit-spacing-4)',
                                                                    }}
                                                                >
                                                                    {isColumnsTotalShow && (
                                                                        <Checkbox
                                                                            label="Итог"
                                                                            checked={pivotParams.columnsTotal}
                                                                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                                                                this.setPivotParams({
                                                                                    ...pivotParams,
                                                                                    columnsTotal: event.target.checked,
                                                                                })
                                                                            }
                                                                            style={{ flexDirection: 'row-reverse' }}
                                                                        />
                                                                    )}
                                                                    {isColumnAllValuesShow && (
                                                                        <Checkbox
                                                                            label="Все значения"
                                                                            checked={pivotParams.columnsAllValues}
                                                                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                                                                this.setPivotParams({
                                                                                    ...pivotParams,
                                                                                    columnsAllValues: event.target.checked,
                                                                                })
                                                                            }
                                                                            style={{ flexDirection: 'row-reverse' }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            }
                                                        >
                                                            <IconButton
                                                                icon={BottomIcon}
                                                                variant="text"
                                                                size="small"
                                                                title="Настроить отображение"
                                                            />
                                                        </Popover>
                                                    )
                                                }
                                                pivotParams={pivotParams}
                                                setPivotParams={this.setPivotParams}
                                                onSelectItem={this.handleSelectItem}
                                                onEmptyAdd={this.handleEmptyAdd}
                                                className={rowItemClassName}
                                            />
                                        )}

                                        {isRowsBlockShow && (
                                            <ItemsBlock
                                                preview={this.state.preview}
                                                uuid={this.uuid}
                                                type="rows"
                                                title="Строки"
                                                icon={<RowIcon size="medium" />}
                                                actions={
                                                    <Popover
                                                        content={
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: 'var(--ui-kit-spacing-4)',
                                                                }}
                                                            >
                                                                {isRowsTotalShow && (
                                                                    <Checkbox
                                                                        label="Итог"
                                                                        checked={pivotParams.rowsTotal}
                                                                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                                                            this.setPivotParams({
                                                                                ...pivotParams,
                                                                                rowsTotal: event.target.checked,
                                                                            })
                                                                        }
                                                                    />
                                                                )}
                                                                {isRowsAllValuesShow && (
                                                                    <Checkbox
                                                                        label="Все значения"
                                                                        checked={pivotParams.rowsAllValues}
                                                                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                                                            this.setPivotParams({
                                                                                ...pivotParams,
                                                                                rowsAllValues: event.target.checked,
                                                                            })
                                                                        }
                                                                    />
                                                                )}
                                                            </div>
                                                        }
                                                    >
                                                        <IconButton
                                                            icon={BottomIcon}
                                                            variant="text"
                                                            size="small"
                                                            title="Настроить отображение"
                                                        />
                                                    </Popover>
                                                }
                                                pivotParams={pivotParams}
                                                setPivotParams={this.setPivotParams}
                                                onSelectItem={this.handleSelectItem}
                                                onEmptyAdd={this.handleEmptyAdd}
                                                className={rowItemClassName}
                                            />
                                        )}

                                        {isValuesBlockShow && (
                                            <ItemsBlock
                                                preview={this.state.preview}
                                                uuid={this.uuid}
                                                type="values"
                                                title="Значения"
                                                // icon="bi-grid"
                                                icon={<ValueIcon size="medium" />}
                                                actions={
                                                    <div
                                                        style={{
                                                            minWidth: '0',
                                                            width: '100%',
                                                            alignSelf: 'stretch',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                        }}
                                                    >
                                                        <Select
                                                            options={SCALE_OPTIONS}
                                                            resettable={false}
                                                            value={pivotParams.measureUnit || SCALE_OPTIONS[0].value}
                                                            onChange={(v) =>
                                                                this.setPivotParams({
                                                                    ...pivotParams,
                                                                    measureUnit: v as string,
                                                                })
                                                            }
                                                            style={{ width: '100%', minWidth: '0' }}
                                                            hasSearch={false}
                                                            disabled={!isScaleFormat || !useMeasure}
                                                        />
                                                    </div>
                                                }
                                                pivotParams={pivotParams}
                                                setPivotParams={this.setPivotParams}
                                                onSelectItem={this.handleSelectItem}
                                                onEmptyAdd={this.handleEmptyAdd}
                                                className={rowItemClassName}
                                            />
                                        )}
                                    </div>
                                </DndContextWrapper>
                            </div>
                        </div>
                    )}
                </div>
                <Modal opened={loadingProgress.isActive} onSetOpen={() => this.onLoadingProgressClose()}>
                    <Typography variant="body" style={{ marginBottom: 5 }}>
                        {loadingProgress.step}
                    </Typography>
                    <Progress
                        value={loadingProgress.progress}
                        size="large"
                        color={loadingProgress.error ? 'error' : 'primary'}
                        variant="line"
                        visiblePercent
                    />
                </Modal>
            </div>
        );
    }
}

export default withNotification(PivotMenu);
