import { PluginPivot } from '../PluginPivot';
import { PluginPivotDataSettingsParamsHeader, PluginPivotResponseData, PluginPivotSort } from '../types';
import { getHashChunk, getHashHeader } from '../utils';

export type PluginPivotDataCellMeta = {
    chunkKey: string | 'root';
};

export type PluginPivotDataDataCell = {
    data: number | string;
    meta: PluginPivotDataCellMeta & {
        indexKey: string;
        columnKey: string;
        indexIndex: number;
        indexLevel: number;
        columnIndex: number;
        columnLevel: number;
        isIndexDisabled: boolean;
        isColumnDisabled: boolean;
        value: PluginPivotDataSettingsParamsHeader;
        layer: PluginPivotDataSettingsParamsHeader;
    };
};

export type PluginPivotDataHeaderCellMeta = PluginPivotDataCellMeta & {
    key: string;
    chunkUuid: {
        hierarchy: string;
        open: string;
    };
    handleLoad: {
        hierarchy: (event?: any) => Promise<void>;
        open: (event?: any) => Promise<void>;
    };
    handleRemove: {
        hierarchy: (event?: any) => Promise<void>;
        open: (event?: any) => Promise<void>;
    };
    /**
     * Флаг, который указывает что измерение иерархичное которое можно раскрыть
     */
    hierarchy: boolean;
    /**
     * Флаг, который указывает что есть второе иерархичное измерение которое можно раскрыть
     */
    open: boolean;
    /**
     * Позиция измерения
     */
    index: number;
    /**
     * Уровень в иерархии
     */
    level: number;
    dbColumn: string;
    dimension: string | number;
    child: Record<string, { label: string; value: string | number }>;
    subtotals: boolean;
};

export type PluginPivotDataIndexCell = {
    data: number | string;
    meta: PluginPivotDataHeaderCellMeta;
};

export type PluginPivotDataColumnCell = {
    data: (number | string)[];
    meta: PluginPivotDataHeaderCellMeta & {
        value: PluginPivotDataSettingsParamsHeader;
        layer: PluginPivotDataSettingsParamsHeader;
        aggregationFn: PluginPivotDataSettingsParamsHeader;
    };
};

export type PluginPivotDataState = {
    columns: {
        meta: {
            sortingUuid: string[];
        };
        data: Record<string, PluginPivotDataColumnCell>;
    };
    index: {
        meta: {
            sortingUuid: string[];
        };
        data: Record<string, PluginPivotDataIndexCell>;
    };
    data: Record<string, Record<string, PluginPivotDataDataCell>>;
};

export class PluginPivotData {
    pluginPivot: PluginPivot;

    state: PluginPivotDataState;

    constructor(pluginPivot: PluginPivot) {
        this.pluginPivot = pluginPivot;
        this.state = {
            columns: {
                meta: {
                    sortingUuid: [],
                },
                data: {},
            },
            index: {
                meta: {
                    sortingUuid: [],
                },
                data: {},
            },
            data: {},
        };
    }

    removeState() {
        this.state = {
            columns: {
                meta: {
                    sortingUuid: [],
                },
                data: {},
            },
            index: {
                meta: {
                    sortingUuid: [],
                },
                data: {},
            },
            data: {},
        };
    }

    getHashChunk = (area: 'index' | 'columns', key: string, chunkKey: string | 'root', type: 'hierarchy' | 'open'): string =>
        getHashChunk({ [area]: { type, key, chunkKey } });

    /**
     * Возвращает максимальный уровень иерархии для каждого row-измерения.
     * Используется в режиме repeatHeaders для расчёта ширины колонок шапки строк.
     */
    _calcMaxLevels = (area: 'index' | 'columns'): number[] =>
        this.state[area].meta.sortingUuid.reduce((acc, cur) => {
            const column = this.state[area].data[cur];

            acc[column.meta.index] = Math.max(acc[column.meta.index] ?? 0, column.meta.level);

            return acc;
        }, [] as number[]);

    /**
     * Возвращает цепочку предков элемента строки от корневого до ближайшего родителя.
     * Используется в режиме repeatHeaders для повтора значений предков в каждой колонке уровня.
     */
    getIndexAncestors = (indexKey: string): Array<{ key: string; index: number; level: number; data: string | number }> => {
        const result: Array<{ key: string; index: number; level: number; data: string | number }> = [];

        const cell = this.state.index.data[indexKey];
        if (!cell) return result;

        let { chunkKey } = cell.meta;

        while (chunkKey && chunkKey !== 'root') {
            const chunk = this.pluginPivot.pluginPivotChunks.state.chunks[chunkKey];
            if (!chunk?.parentHeader?.index) break;

            const parentKey = chunk.parentHeader.index.key;
            const parentCell = this.state.index.data[parentKey];
            if (!parentCell) break;

            result.unshift({
                key: parentKey,
                index: parentCell.meta.index,
                level: parentCell.meta.level,
                data: parentCell.data,
            });

            chunkKey = parentCell.meta.chunkKey;
        }

        return result;
    };

    handleLoad =
        (
            type: 'hierarchy' | 'open',
            header: 'columns' | 'index',
            meta: {
                key: string;
                dbColumn: string;
                chunkKey: string;
                index: number;
                level: number;
                dimension: string | number;
                value?: PluginPivotDataSettingsParamsHeader;
                layer?: PluginPivotDataSettingsParamsHeader;
                chunkUuid: {
                    hierarchy: string;
                    open: string;
                };
            },
        ) =>
        async (event?: any) => {
            if (event?.altKey) {
                for (const h of Object.values(this.state[header].data)) {
                    if (h.meta.index !== meta.index || h.meta.level !== meta.level) continue;

                    const hasChunk = this.pluginPivot.pluginPivotChunks.getHasChunk(h.meta.chunkUuid[type]);
                    if (!hasChunk) {
                        h.meta.handleLoad?.[type]?.();
                    }
                }
            } else {
                const parentHeader = this.pluginPivot.getParentHeader({
                    [header]: { type, key: meta.key, chunkKey: meta.chunkKey },
                });
                const _params = this.pluginPivot.pluginPivotChunks.getChunkParams(type, header, meta);
                const { options } = this.pluginPivot.pluginPivotChunks.state.chunks.root;
                this.pluginPivot.loadNewChunk(parentHeader, _params, options);
            }
        };

    handleRemove =
        (
            type: 'hierarchy' | 'open',
            header: 'columns' | 'index',
            meta: {
                key: string;
                dbColumn: string;
                chunkKey: string;
                index: number;
                level: number;
                value?: PluginPivotDataSettingsParamsHeader;
                layer?: PluginPivotDataSettingsParamsHeader;
                chunkUuid: {
                    hierarchy: string;
                    open: string;
                };
            },
        ) =>
        async (event?: any) => {
            if (event?.altKey) {
                for (const h of Object.values(this.state[header].data)) {
                    if (h.meta.index !== meta.index || h.meta.level !== meta.level) continue;

                    const hasChunk = this.pluginPivot.pluginPivotChunks.getHasChunk(h.meta.chunkUuid[type]);
                    if (hasChunk) {
                        // eslint-disable-next-line no-await-in-loop
                        await h.meta.handleRemove?.[type]?.();
                    }
                }
            } else {
                await (() => this.pluginPivot.removeChunk(meta.chunkUuid[type]))();
            }
        };

    buildIndex = (
        indexKey: string,
        indexData: string | number,
        data: Required<PluginPivotResponseData>,
        chunkKey: string | 'root' = 'root',
    ) => {
        const params = data.data.settings.params ?? {};

        const dbColumn = params.rows![0].name;

        const field = this.pluginPivot.state.args.columns.find(
            (f) => f.id === params.columns![0]?.id || f.name === params.columns![0]?.name,
        );

        const index =
            this.pluginPivot.pluginPivotChunks.state.chunks.root?.params.rows?.findIndex((row) => row.name === dbColumn) ?? -1;

        const level = this.pluginPivot.pluginPivotChunks.getNestingLevel(chunkKey, 'index');

        const child =
            params.rows![0]?.child?.reduce((computed, currentChild) => {
                computed[currentChild.name] = {
                    label: currentChild.label || currentChild.name,
                    value: data.refFields?.[dbColumn]?.[indexData]?.[currentChild.name] ?? '',
                };
                return computed;
            }, {} as Record<string, { label: string; value: string | number }>) ?? {};

        const chunkUuidHierarchy = this.getHashChunk('index', indexKey, chunkKey, 'hierarchy');
        const chunkUuidOpen = this.getHashChunk('index', indexKey, chunkKey, 'open');

        const meta = {
            key: indexKey,
            hierarchy: !!data.data.settings.index.hierarchy,
            open: !!data.data.settings.index.open,
            chunkKey,
            chunkUuid: {
                hierarchy: chunkUuidHierarchy,
                open: chunkUuidOpen,
            },
            dimension: indexData,
            index,
            level,
            dbColumn,
            child,
            subtotals: field?.totalsOnoff ?? true,
        };

        const cellData =
            // eslint-disable-next-line no-nested-ternary
            data.refs?.[dbColumn]?.[indexData]
                ? data.refs[dbColumn][indexData]
                : indexData !== null
                ? indexData
                : '[нет данных]';

        this.state.index.data[indexKey] = {
            data: cellData,
            meta: {
                ...meta,
                handleLoad: {
                    hierarchy: this.handleLoad('hierarchy', 'index', meta),
                    open: this.handleLoad('open', 'index', meta),
                },
                handleRemove: {
                    hierarchy: this.handleRemove('hierarchy', 'index', meta),
                    open: this.handleRemove('open', 'index', meta),
                },
            },
        };
    };

    buildColumn = (
        columnKey: string,
        columnData: (string | number)[],
        data: Required<PluginPivotResponseData>,
        chunkKey: string | 'root' = 'root',
    ) => {
        const params = data.data.settings.params ?? {};

        const dbColumn = params.columns![0].name;

        const field = this.pluginPivot.state.args.columns.find(
            (f) => f.id === params.columns![0]?.id || f.name === params.columns![0]?.name,
        );

        const value = params.values?.find(
            (h) => h.label === columnData[0] || h.name === columnData[0],
        ) as PluginPivotDataSettingsParamsHeader;

        // TODO: Обратная совместимость
        const layer = (params.layers ?? value?.child?.[0]?.layers)?.find(
            (h) => h.label === columnData[1] || h.name === columnData[1],
        ) as PluginPivotDataSettingsParamsHeader;

        const aggregationFn = value?.child?.find(
            (h) => h.sqlName === columnData[3] || h.label === columnData[3],
        ) as PluginPivotDataSettingsParamsHeader;

        const index =
            this.pluginPivot.pluginPivotChunks.state.chunks.root?.params?.columns?.findIndex(
                (column) => column.name === dbColumn,
            ) ?? -1;

        const level = this.pluginPivot.pluginPivotChunks.getNestingLevel(chunkKey, 'columns');

        const child =
            params.columns![0].child?.reduce((computed, currentChild) => {
                computed[currentChild.name] = {
                    label: currentChild.label || currentChild.name,
                    value: data.refFields?.[dbColumn]?.[columnData[2]]?.[currentChild.name] ?? '',
                };
                return computed;
            }, {} as Record<string, { label: string; value: string | number }>) ?? {};

        const chunkUuidHierarchy = this.getHashChunk('columns', columnKey, chunkKey, 'hierarchy');
        const chunkUuidOpen = this.getHashChunk('columns', columnKey, chunkKey, 'open');

        const meta = {
            key: columnKey,
            hierarchy: !!data.data.settings.columns.hierarchy,
            open: !!data.data.settings.columns.open,
            // open: index < (data.data.settings.params.columns?.length ?? 0) - 1,
            chunkKey,
            chunkUuid: {
                hierarchy: chunkUuidHierarchy,
                open: chunkUuidOpen,
            },
            dimension: columnData[2],
            index,
            level,
            dbColumn,
            aggregationFn,
            value,
            layer,
            child,
            subtotals: field?.totalsOnoff ?? false,
        };

        this.state.columns.data[columnKey] = {
            data: columnData.map((d, i) => {
                switch (i) {
                    case 2: // Значение измерения
                        return data.refs?.[dbColumn]?.[d] ?? d ?? '[нет данных]';
                    case 3: // Фукнция агрегации
                        return aggregationFn?.label ?? d;
                    default:
                        return d;
                }
            }),
            meta: {
                ...meta,
                handleLoad: {
                    hierarchy: this.handleLoad('hierarchy', 'columns', meta),
                    open: this.handleLoad('open', 'columns', meta),
                },
                handleRemove: {
                    hierarchy: this.handleRemove('hierarchy', 'columns', meta),
                    open: this.handleRemove('open', 'columns', meta),
                },
            },
        };
    };

    buildData = (indexUuid: string, columnUuid: string, data: string | number, chunkKey: string | 'root' = 'root') => {
        const index = this.state.index.data[indexUuid];
        const column = this.state.columns.data[columnUuid];

        this.state.data[indexUuid] ??= {};
        this.state.data[indexUuid][columnUuid] = {
            data,
            meta: {
                chunkKey,
                indexKey: indexUuid,
                columnKey: columnUuid,
                indexIndex: index.meta.index,
                indexLevel: index.meta.level,
                isIndexDisabled: /* index.meta.isDisabled */ false,
                columnIndex: column.meta.index,
                columnLevel: column.meta.level,
                isColumnDisabled: /* column.meta.isDisabled */ true,
                value: column.meta.value,
                layer: column.meta.layer,
            },
        };
    };

    buildChunk(chunkKey: string, data: Required<PluginPivotResponseData>) {
        const chunk = this.pluginPivot.pluginPivotChunks.state.chunks[chunkKey];

        const dbNameColumn = data.data.settings.params.columns![0]?.name;
        const dbNameIndex = data.data.settings.params.rows![0]?.name;

        /** Раскрывают столбцы. Порядковый номер колонки. */
        const parentPositionColumnsSorting =
            !!chunk.parentHeader?.columns && this.state.columns.meta.sortingUuid.indexOf(chunk.parentHeader?.columns?.key);
        /** Раскрывают индексы. Порядковый номер индекса. */
        const parentPositionIndexSorting =
            !!chunk.parentHeader?.index && this.state.index.meta.sortingUuid.indexOf(chunk.parentHeader?.index?.key);

        if (parentPositionColumnsSorting === -1) {
            console.error('buildChunk: parentPositionColumnsSorting is undefined');
            return;
        }
        if (parentPositionIndexSorting === -1) {
            console.error('buildChunk: parentPositionIndexSorting is undefined');
            return;
        }

        let currentPositionColumnsSorting = parentPositionColumnsSorting !== false && parentPositionColumnsSorting + 1;
        let currentPositionIndexSorting = parentPositionIndexSorting !== false && parentPositionIndexSorting + 1;

        const columnKeys: string[] = [];
        const rowKeys: string[] = [];

        for (const indexIndex in data.data.index) {
            const indexData = data.data.index[indexIndex];
            const indexUuid = getHashHeader(dbNameIndex, indexData, chunk.parentHeader?.index?.key);

            if (
                (chunkKey === 'root' || // TODO: Пересмотреть условие
                    (currentPositionIndexSorting !== false && chunk.index.includes(indexUuid))) &&
                !rowKeys.includes(indexUuid)
            ) {
                rowKeys.push(indexUuid);
                this.buildIndex(indexUuid, indexData, data, chunkKey);
            }

            // eslint-disable-next-line guard-for-in
            for (const columnIndex in data.data.columns) {
                const columnData = data.data.columns[columnIndex];
                const columnUuid = getHashHeader(dbNameColumn, columnData.join('::'), chunk.parentHeader?.columns?.key);

                if (
                    (chunkKey === 'root' || // TODO: Пересмотреть условие
                        (currentPositionColumnsSorting !== false && chunk.columns.includes(columnUuid))) &&
                    !columnKeys.includes(columnUuid)
                ) {
                    columnKeys.push(columnUuid);
                    this.buildColumn(columnUuid, columnData, data, chunkKey);
                }

                if (indexUuid in this.state.index.data && columnUuid in this.state.columns.data) {
                    this.buildData(indexUuid, columnUuid, data.data.data[indexIndex][columnIndex] ?? '', chunkKey);
                }
            }
        }

        const addedColumnSorting = this.getColumnSorting(
            columnKeys,
            data.data.settings.params.order!.columns || [],
            dbNameColumn,
        );
        const addedRowSorting = this.getRowSorting(rowKeys, data.data.settings.params.order!.rows || [], dbNameIndex);

        // TODO: Пересмотреть условие
        if (chunkKey === 'root') {
            // TODO Ну что за п...ц, если вы уже используете что-то вроде state, так и устанавливайте его через setState
            this.state.index.meta.sortingUuid.push(...addedRowSorting);
            this.state.columns.meta.sortingUuid.push(...addedColumnSorting);
        } else {
            if (currentPositionIndexSorting) {
                for (const indexKey of addedRowSorting) {
                    this.state.index.meta.sortingUuid.splice(currentPositionIndexSorting, 0, indexKey);
                    currentPositionIndexSorting += 1;
                }
            }

            if (currentPositionColumnsSorting) {
                for (const columnKey of addedColumnSorting) {
                    this.state.columns.meta.sortingUuid.splice(currentPositionColumnsSorting, 0, columnKey);
                    currentPositionColumnsSorting += 1;
                }
            }
        }

        this.state.index.meta.sortingUuid = Array.from(new Set(this.state.index.meta.sortingUuid));
        this.state.columns.meta.sortingUuid = Array.from(new Set(this.state.columns.meta.sortingUuid));
    }

    getColumnSorting(columnKey: string[], sortData: PluginPivotSort[], dbColumnName: string) {
        const sortType = sortData.find((data) => data[0] === dbColumnName)?.[1];

        if (!sortType) return columnKey;

        const sortingColumnKey = columnKey.sort((leftKey, rightKey) => {
            const leftViewedData = String(this.state.columns.data[leftKey].data[2]);
            const rightViewedData = String(this.state.columns.data[rightKey].data[2]);

            return leftViewedData.localeCompare(rightViewedData, undefined, {
                numeric: true,
            });
        });

        return sortType === 'ASC' ? sortingColumnKey : sortingColumnKey.reverse();
    }

    getRowSorting(rowKey: string[], sortData: PluginPivotSort[], dbColumnName: string) {
        const sortType = sortData.find((data) => data[0] === dbColumnName)?.[1];

        if (!sortType) return rowKey;

        const sortingRowKey = rowKey.sort((leftKey, rightKey) => {
            const leftViewedData = String(this.state.index.data[leftKey].data);
            const rightViewedData = String(this.state.index.data[rightKey].data);

            return leftViewedData.localeCompare(rightViewedData, undefined, {
                numeric: true,
            });
        });

        return sortType === 'ASC' ? sortingRowKey : sortingRowKey.reverse();
    }

    removeChunkData(removedHeaders: { index: string[]; columns: string[] }) {
        for (const columnKey of removedHeaders.columns) {
            const sortIndex = this.state.columns.meta.sortingUuid.indexOf(columnKey);
            if (sortIndex !== -1) {
                this.state.columns.meta.sortingUuid.splice(sortIndex, 1);
            }

            delete this.state.columns.data[columnKey];
            for (const indexKey in this.state.data) {
                delete this.state.data[indexKey][columnKey];
            }
        }
        for (const indexKey of removedHeaders.index) {
            const sortIndex = this.state.index.meta.sortingUuid.indexOf(indexKey);
            if (sortIndex !== -1) {
                this.state.index.meta.sortingUuid.splice(sortIndex, 1);
            }

            delete this.state.index.data[indexKey];
            delete this.state.data[indexKey];
        }
    }
}
