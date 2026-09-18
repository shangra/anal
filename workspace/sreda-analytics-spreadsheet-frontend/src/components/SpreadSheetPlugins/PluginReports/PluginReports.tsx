import StateManager from 'lite-react-statemanager';
import { createRef, ReactElement, RefObject } from 'react';
import { Loader, NotificationsProvider } from 'ui-kit';

import { Cell } from '../../AdapterSpreadSheet/models';
import { Plugin, PluginContext, SpreadsheetAction, Transaction } from '../../AdapterSpreadSheet/plugin';
import { ICellWithStyles, ObjectIndexes } from '../../AdapterSpreadSheet/types';
import CancelReqButton from '../../PivotMenu/CancelReqButton/cancelReqButton';
import { MenuIcon } from '../../PivotMenu/MenuIcon';
import { CubeLoader } from '../../ui/CubeLoader';
import { Pagination } from '../../UIKit/Pagination';
import { CellFormattingType } from '../PluginCellFormatting/types';
import { TPluginRange } from '../PluginPivot/types';
import { GetTableData } from './classes/getTableData';
import { RenderController } from './classes/RenderController';
import { PLUGIN_REPORTS_KEY, REPORTS_ACTION } from './constants';
import { SettingIcon } from './icons';
import { PluginReportsAdapterFacade } from './PluginReportsAdapterFacade';
import styles from './styles.module.css';
import {
    FeatureFlags,
    IPluginReportsPluginData,
    PluginReportsArg,
    PluginReportsArgFilter,
    PluginReportsArgs,
    PluginReportsOptions,
    PluginReportsResponseData,
    PluginReportsSchemaInfo,
    PluginReportsState,
    PluginReportsTypeEnum,
} from './types';

const PAGE_ROWS_AMOUNT = 20_000;
const SCHEMA_NAME_ROW_INDEX = 3;

export class PluginReports extends Plugin<typeof PLUGIN_REPORTS_KEY, PluginReportsState, PluginReportsOptions> {
    // ─── Идентификатор слайса ─────────────────────────────────────────────────

    readonly key = PLUGIN_REPORTS_KEY;

    readonly initialState: PluginReportsState = {
        data: {
            isLoadingTable: false,
            loadedRows: 0,
            refFields: {},
            refs: {},
            totalRows: 0,
        },
        args: {
            columns: [],
            rows: [],
            values: [],
            filter: [],
            fields: [],
            layers: [],
        },
        schemaInfo: { name: '', isChanged: false },
        pivotParams: {},
        refs: {},
        page: 1,
        pagesAmount: 1,
        isLoading: false,
    };

    // ─── Операционное состояние (вне reducer) ─────────────────────────────────

    /** Фасад адаптера: транслирует вызовы IAdapter -> context operations */
    tableAdapter!: PluginReportsAdapterFacade;

    infoserviceId!: string;

    server!: string;

    pluginRange!: TPluginRange;

    prevPluginRange: TPluginRange | null = null;

    metadataMenuRef: RefObject<any> = createRef();

    history: Array<any> = [];

    downloadMoreRef: boolean = false;

    featureFlags: FeatureFlags = {};

    getTableData!: GetTableData;

    renderController!: RenderController;

    currentAbortController: AbortController | null = null;

    // ─── Инжекция контекста (заменяет constructor) ────────────────────────────

    override _inject(ctx: PluginContext, options: PluginReportsOptions): void {
        super._inject(ctx, options);
        this._initializeInternals(options);
    }

    /**
     * Общая логика инициализации.
     * Вызывается при первом монтировании и при сбросе (_onClear).
     */
    private _initializeInternals(options: PluginReportsOptions): void {
        // @ts-expect-error
        this.tableAdapter = new PluginReportsAdapterFacade(this);
        this.infoserviceId = options.infoserviceId;
        this.server = (options?.server || '').replace(/\/+$/gm, '');
        this.featureFlags = options.featureFlags ?? {};
        this.history = [];
        this.downloadMoreRef = false;

        this.pluginRange = {
            x: options?.pluginRange?.x ?? 0,
            y: options?.pluginRange?.y ?? 1,
            height: 1,
            width: 1,
        };
        this.prevPluginRange = null;

        this.getTableData = new GetTableData(this, options);
        this.renderController = new RenderController(
            this,
            options.defaultMeasureFormat && Object.values(CellFormattingType).includes(options.defaultMeasureFormat)
                ? options.defaultMeasureFormat
                : undefined,
        );
    }

    // ─── Backwards-compat: state getter ──────────────────────────────────────

    /**
     * Геттер для обратной совместимости с RenderController и другими классами,
     * обращающимися к this.pluginReports.state напрямую.
     */
    get state(): PluginReportsState {
        return this.getState();
    }

    // ─── Backwards-compat: setState wrapper ──────────────────────────────────

    /**
     * Обёртка для обратной совместимости — транслирует setState в dispatch.
     * Callback вызывается синхронно после dispatch (dispatch — синхронная операция).
     *
     * Исправляет анти-паттерн прямых мутаций `this.state = { ... }` из старого кода.
     */
    setState(updater: (state: PluginReportsState) => PluginReportsState, callback?: () => void): void {
        const next = updater(this.getState());
        this.context.dispatch({ type: REPORTS_ACTION.STATE_UPDATE, payload: next });
        callback?.();
    }

    // ─── Reducer ─────────────────────────────────────────────────────────────

    override reducer(state: PluginReportsState, tr: Transaction): PluginReportsState {
        switch (tr.action?.type) {
            // Полное обновление стейта (используется через setState-обёртку)
            case REPORTS_ACTION.STATE_UPDATE:
                return tr.action.payload as PluginReportsState;

            default:
                return state;
        }
    }

    // ─── appendTransaction: реакция на события ───────────────────────────────

    /**
     * Заменяет subscribesEvents() из старой архитектуры.
     *
     * ON_SCROLL           -> обработка скролла (требует AdapterSpreadSheet.onScroll
     *                       диспатчить { type: 'ON_SCROLL', payload: scrollData })
     *                       TODO: добавить dispatch в AdapterSpreadSheet.onScroll
     */
    override appendTransaction(
        tr: Transaction,
        _prevState: PluginReportsState,
        _nextState: PluginReportsState,
    ): SpreadsheetAction[] | SpreadsheetAction | null {
        if (!tr.action) return null;

        const { type } = tr.action;

        // TODO: для активации нужно добавить в AdapterSpreadSheet.onScroll:
        //   this.dispatch({ type: 'ON_SCROLL', payload: scrollData });
        // if (type === 'ON_SCROLL') {
        //     this._onScroll(tr.action.payload);
        //     return null;
        // }

        return null;
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    override onMount(): void {
        this.setRootBurger();
    }

    override onUnmount(): void {
        this.cancelCurrentRequest();
    }

    // ─── Event handlers (вместо subscribesEvents) ─────────────────────────────

    /**
     * Отмена текущего запроса
     */
    cancelCurrentRequest = () => {
        if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
        }

        this.getTableData.cancelAllRequests();

        this.setState(
            (s) => ({ ...s, isLoading: false }),
            () => {
                this.setRootBurger();
            },
        );
    };

    private _onClear(): void {
        this.history = [];
        this.getTableData = new GetTableData(this, {});
        this.renderController = new RenderController(this);

        this.prevPluginRange = { ...this.pluginRange };

        this.setState(
            (prev) => ({
                ...this.initialState,
                // Сохраняем args как было в оригинале
                args: { ...prev.args },
            }),
            () => {
                this.tableAdapter.removeData(
                    new Cell({ rowIndex: this.prevPluginRange!.y, columnIndex: this.prevPluginRange!.x }),
                    new Cell({
                        rowIndex: this.prevPluginRange!.y + this.prevPluginRange!.height - 1,
                        columnIndex: this.prevPluginRange!.x + this.prevPluginRange!.width - 1,
                    }),
                );
                this.setRootBurger();
            },
        );
    }

    private _onScroll(data: {
        viewport: { start: ObjectIndexes; end: ObjectIndexes };
        direction: 'left' | 'right' | 'up' | 'down';
    }): void {
        const rowsCount = this.tableAdapter.getRowsCount();

        if (this.downloadMoreRef && data.viewport.end.rowIndex + 1 < rowsCount) {
            this.downloadMoreRef = false;
            this.tableAdapter.forceUpdate();
        } else if (data.viewport.end.rowIndex + 1 === rowsCount) {
            this.downloadMoreRef = true;
            this.tableAdapter.forceUpdate();
        }
    }

    // ─── Export / Import ──────────────────────────────────────────────────────

    override async export(): Promise<IPluginReportsPluginData> {
        const state = this.getState();

        return {
            key: this.key,
            url: '',
            version: '2.0',
            options: this.options,
            state: JSON.parse(
                JSON.stringify({
                    pivotParams: state.pivotParams,
                    args: state.args,
                    history: this.history,
                    infoserviceId: this.infoserviceId,

                    tableParams: {
                        columnsCount: this.tableAdapter.getColumnsCount(),
                        rowsCount: this.tableAdapter.getRowsCount(),
                        columnsMeta: this.tableAdapter.getColumnsMetadata(),
                        rowsMeta: this.tableAdapter.getRowsMetadata(),
                    },
                }),
            ),
        };
    }

    override async import(data: IPluginReportsPluginData): Promise<void> {
        const json = data.state ?? data;

        let history: Array<any> = [];
        let newArgs: PluginReportsArgs | undefined;
        let newPivotParams: Record<string, any> | undefined;

        if (json?.infoserviceId) this.infoserviceId = json.infoserviceId;
        if (json?.history) history = json.history;
        if (json?.schemaSettings || json?.args) newArgs = json.schemaSettings ?? json.args;
        if (json?.pivotParams) newPivotParams = json.pivotParams;

        if (json.tableParams) {
            this.tableAdapter.updateTableParams({
                rowsCount: json.tableParams.rowsCount,
                columnsCount: json.tableParams.columnsCount,
                rowsMeta: json.tableParams.rowsMeta,
                columnsMeta: json.tableParams.columnsMeta,
            });
        }

        if (newArgs) {
            this.setState((prev) => ({
                ...prev,
                pivotParams: newPivotParams ?? prev.pivotParams,
                args: newArgs!,
                pagesAmount: 1,
                page: 1,
            }));

            for (const item of history) {
                for (const funcName in item) {
                    if (!Object.prototype.hasOwnProperty.call(item, funcName)) continue;
                    const params = item[funcName];
                    if (funcName === 'onClickGetData') {
                        // eslint-disable-next-line no-await-in-loop
                        await this.onClickGetData(newArgs, params.data);
                    }
                }
            }
        }
    }

    // ─── Render helpers ───────────────────────────────────────────────────────

    setRootBurger = (): void => {
        this.tableAdapter.setCells(
            new Map([
                [
                    0,
                    new Map([
                        [
                            0,
                            {
                                data: null,
                                components: [
                                    {
                                        positionRelativeToText: 'before',
                                        type: 'button',
                                        icon: SettingIcon,
                                        color: 'primary',
                                        open: false,
                                        disabled: false,
                                        loading: false,
                                        onClick: () => StateManager.setState({ MenuIcon: true }),
                                    },
                                ],
                            },
                        ],
                    ]),
                ],
            ]),
        );
        this.tableAdapter.setCellStyle(new Cell({ rowIndex: 0, columnIndex: 0 }), {
            verticalAlign: 'center',
            horizontalAlign: 'center',
        });
    };

    renderTable = async (data: Required<PluginReportsResponseData>, args: PluginReportsArgs): Promise<void> => {
        this.renderController.renderTable(data, args);
    };

    // ─── Data loading ─────────────────────────────────────────────────────────

    getReportArguments() {
        return { infoserviceId: this.infoserviceId, args: this.getState().args };
    }

    /**
     * Загрузить данные по схеме.
     *
     * Заменяет прямые мутации `this.state = { ... }` + `forceUpdate()` из старого кода
     * на setState-обёртку -> dispatch -> автоматический _triggerUpdate в AdapterSpreadSheet.
     */
    onClickGetData = async (args: PluginReportsArgs, inputData?: any, onLoadEnd?: () => void): Promise<void> => {
        // Сохраняем предыдущую область отчёта для точечной очистки
        this.prevPluginRange = { ...this.pluginRange };
        this.tableAdapter.removeData(
            new Cell({ rowIndex: this.prevPluginRange.y, columnIndex: this.prevPluginRange.x }),
            new Cell({
                rowIndex: this.prevPluginRange.y + this.prevPluginRange.height - 1,
                columnIndex: this.prevPluginRange.x + this.prevPluginRange.width - 1,
            }),
        );
        this.setRootBurger();
        const combinedArgs = this.combinedArgs(args);

        // Сбрасываем предыдущий AbortController перед началом новой загрузки
        this.currentAbortController = null;

        // Раньше: this.state = { ... }; this.tableAdapter.forceUpdate();
        // Теперь: один dispatch вместо прямой мутации + отдельного forceUpdate
        this.setState(() => ({
            ...this.getState(),
            page: 1,
            pagesAmount: 1,
            isLoading: true,
            args: combinedArgs,
        }));
        this.history = [];

        try {
            let data = inputData;
            if (!data) {
                this.currentAbortController = new AbortController();
                const { signal } = this.currentAbortController;

                try {
                    data = (await this.getTableData.main(
                        this.infoserviceId,
                        { ...args, offset: 0 },
                        { signal },
                    )) as unknown as PluginReportsResponseData;
                } finally {
                    this.currentAbortController = null;
                }
            }

            this.removeCurrentFilters();
            this.recordCurrentFilters(args);
            this.recordRefs(data);

            this.history.push({ onClickGetData: { args, data } });

            this.setState((s) => ({
                ...s,
                data,
                pagesAmount: Math.ceil((data?.totalRows ?? 0) / PAGE_ROWS_AMOUNT),
            }));

            await this.renderTable(data as Required<PluginReportsResponseData>, args);
        } catch (e) {
            // Отмена запроса пользователем — не ошибка, модалку не показываем
            if (!this._isAbortError(e)) this._reportError(e);
        } finally {
            // Загрузка снимается всегда: и при успехе, и при ошибке, и при отмене.
            // Иначе спиннер (и заблокированное меню) висят бесконечно.
            this.setState((s) => ({ ...s, isLoading: false }));
            onLoadEnd?.();
        }
    };

    onLoadPage = async (page: number): Promise<void> => {
        const state = this.getState();

        if (state.page > state.pagesAmount || !state.args) return;

        this.cancelCurrentRequest();

        this.setState((s) => ({ ...s, page, isLoading: true }));

        this.currentAbortController = new AbortController();
        const { signal } = this.currentAbortController;

        try {
            const data = (await this.getTableData.main(
                this.infoserviceId,
                { ...state.args, offset: (page - 1) * PAGE_ROWS_AMOUNT },
                { signal },
            )) as unknown as PluginReportsResponseData;

            this.renderController.renderPage(data as Required<PluginReportsResponseData>, this.getState().args!);
        } catch (e) {
            // Отмена запроса пользователем — не ошибка, модалку не показываем
            if (!this._isAbortError(e)) this._reportError(e);
        } finally {
            this.currentAbortController = null;
            this.setState((s) => ({ ...s, page, isLoading: false }));
        }
    };

    private _isAbortError(e: unknown): boolean {
        const err = (e ?? {}) as { name?: unknown; code?: unknown; isAborted?: unknown };
        return err.name === 'AbortError' || err.code === 'ERR_CANCELED' || err.isAborted === true;
    }

    private _reportError(e: unknown): void {
        const err = (e ?? {}) as {
            status?: unknown;
            message?: unknown;
            stack?: unknown;
            errors?: unknown;
            payload?: unknown;
        };

        // Ошибки из getTableData уже эмитят PLUGIN_FETCH_ERROR/EVENT сами (getTableData.js:385),
        // а для отмены статус === -1. Их повторно не показываем, чтобы не было двойной модалки.
        if (typeof err.status === 'number' && err.status !== -100) return;

        this.tableAdapter.emitEvent(REPORTS_ACTION.ON_FETCH_ERROR, {
            title: 'Ошибка формирования отчета',
            status: err.status ?? -100,
            message: err.message != null ? String(err.message) : String(e),
            stack: err.stack ?? '',
            errors: err.errors ?? [],
            payload: err.payload ?? {},
        });
    }

    // ─── State helpers ────────────────────────────────────────────────────────

    recordRefs(data: PluginReportsResponseData): void {
        const refs = data?.refs || {};

        this.setState((state) => ({
            ...state,
            refs: {
                ...state.refs,
                ...Object.keys(refs).reduce((prev, key) => {
                    prev[key] = state.refs[key] ? { ...refs[key], ...state.refs[key] } : refs[key];
                    return prev;
                }, {} as Record<string, Record<string, string>>),
            },
        }));
    }

    computeCurrentFilters(items: PluginReportsArg[], computedFilters: PluginReportsArgFilter[]) {
        for (const item of items) {
            if (item.filter) {
                // Обогащаем информацию о фильтре, чтобы корректно потом отобразить
                const filtersWithParent = item.filter.map((filter) => ({
                    ...filter,
                    name: item.name,
                    field: item.name,
                    parentField: item.name,
                }));
                computedFilters.push(...filtersWithParent);
            }

            if (item.child) {
                this.computeCurrentFilters(item.child, computedFilters);
            }
        }
    }

    removeCurrentFilters(): void {
        this.setState((state) => ({ ...state, computedFilters: undefined }));
    }

    recordCurrentFilters(args: PluginReportsArgs): void {
        const computedFilters = Object.keys(args).reduce((prev, key) => {
            const values = args[key as keyof PluginReportsArgs];
            if (['columns', 'rows', 'values', 'filter'].includes(key)) {
                this.computeCurrentFilters(values, prev);
            }
            return prev;
        }, [] as PluginReportsArgFilter[]);

        this.setState((state) => ({ ...state, computedFilters }));
    }

    getFilterUserValue = (field: string, value: string | number): string | number | undefined => {
        const { computedFilters } = this.getState();
        if (computedFilters) {
            return computedFilters.find((filter) => filter.field === field && filter.value === value)?.label;
        }
        return undefined;
    };

    // TODO Костыль, нужно поправить отображение аргументов, приходят одни, в стейте другие
    combinedArgs = (args: PluginReportsArgs): PluginReportsArgs => {
        const stateArgs = this.state.args;

        if (!args || Object.keys(args).length === 0) {
            return stateArgs;
        }

        const combinedArgs = { ...args };

        if (combinedArgs.fields && stateArgs?.fields) {
            const fieldsMap = new Map<string, PluginReportsArg>();

            args.fields.forEach((field) => {
                // @ts-ignore
                const id = field.id || field.name;
                fieldsMap.set(id, JSON.parse(JSON.stringify(field)));
            });

            stateArgs.fields.forEach((stateField) => {
                // @ts-ignore
                const id = stateField.id || stateField.name;

                if (fieldsMap.has(id)) {
                    const existingField = fieldsMap.get(id)!;
                    const existingChildNames = new Set(existingField.child?.map((c) => c.name) || []);

                    stateField.child?.forEach((stateChild) => {
                        if (!existingChildNames.has(stateChild.name)) {
                            if (!existingField.child) existingField.child = [];
                            existingField.child.push(JSON.parse(JSON.stringify(stateChild)));
                        }
                    });
                } else {
                    fieldsMap.set(id, JSON.parse(JSON.stringify(stateField)));
                }
            });

            combinedArgs.fields = Array.from(fieldsMap.values());
        } else if (!combinedArgs.fields && stateArgs?.fields) {
            combinedArgs.fields = JSON.parse(JSON.stringify(stateArgs.fields));
        }

        return combinedArgs;
    };

    handleSetSchemaSettings = (args: PluginReportsArgs): void => {
        const pivotParamsArr: PluginReportsArg[] = [
            ...(args?.columns || []),
            ...(args?.values || []),
            ...(args?.rows || []),
            ...(args?.filter || []),
        ];

        const pivotParams = pivotParamsArr.reduce((acc, item) => {
            const readable = item.description ?? item.label;
            acc[item.name] = readable;

            if (item.child?.length) {
                item.child.forEach((child) => {
                    const childReadable = child.description ?? child.label;
                    acc[`${item.name}.${child.name}`] = `${readable}.${childReadable}`;
                });
            }
            return acc;
        }, {} as Record<string, string>);

        this.setState(
            (state) => ({ ...state, args, pivotParams }),
            () => this.setRootBurger(),
        );
    };

    handleClickGetData = async (args: PluginReportsArgs, onLoadEnd: () => void): Promise<void> => {
        this.onClickGetData(args, undefined, onLoadEnd);
    };

    handleSchemaInfo = (schemaInfo: PluginReportsSchemaInfo): void => {
        this.setState((state) => ({ ...state, schemaInfo }));

        const schemaName = schemaInfo.isChanged ? `*${schemaInfo.name}` : schemaInfo.name ?? '';
        const schemaNameCell: ICellWithStyles = {
            components: [],
            data: schemaName,
            config: { readonly: true },
            pluginsConfig: {},
        };

        this.tableAdapter.setCellsWithStyle(new Map([[SCHEMA_NAME_ROW_INDEX, new Map([[1, schemaNameCell]])]]));
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    override render(): ReactElement {
        const state = this.getState();
        const countPage = Math.ceil((state.data?.totalRows ?? 0) / PAGE_ROWS_AMOUNT);

        return (
            <NotificationsProvider>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    {state.pagesAmount > 1 && (
                        <div style={{ paddingBottom: 6, marginRight: 20 }}>
                            <Pagination
                                page={state.page}
                                countPage={countPage}
                                onSetPage={this.onLoadPage}
                                disabled={state.isLoading}
                            />
                        </div>
                    )}
                    <MenuIcon
                        isFetching={state.isLoading}
                        classNameButton={styles.menuIcon}
                        infoserviceId={this.infoserviceId}
                        value={state.args}
                        handleClickGetData={this.handleClickGetData}
                        onChange={this.handleSetSchemaSettings}
                        metadataMenuRef={this.metadataMenuRef}
                        features={['layers', 'filter', 'columns', 'values', 'mask']}
                        masterInstance={this}
                        checkFields
                        pivotParams={JSON.stringify(state.args)}
                        handleSchemaInfo={this.handleSchemaInfo}
                        server={this.server}
                    />
                </div>

                {state.isLoading && (
                    <div className={styles['root-loading__all']}>
                        <Loader className={styles.loader} size="small" />
                    </div>
                )}

                {state.isLoading && (
                    <div className={styles['root-loading__container']}>
                        <CubeLoader />
                        <CancelReqButton onClick={this.cancelCurrentRequest} />
                    </div>
                )}
            </NotificationsProvider>
        );
    }
}
