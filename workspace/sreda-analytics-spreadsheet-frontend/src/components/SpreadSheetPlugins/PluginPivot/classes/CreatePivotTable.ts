import { IButton, ICell, ICellStyles, ICellWithStyles } from '../../../AdapterSpreadSheet/types';
import { SortAscIcon, SortDescIcon } from '../../NewPluginPivot/services/PivotTableService/icons';
import { PLUGIN_CELL_FORMATTING_KEY } from '../../PluginCellFormatting/constants';
import { CellFormattingType } from '../../PluginCellFormatting/types';
import { PLUGIN_PIVOT_KEY } from '../constants';
import { FilterIcon } from '../icons';
import { PluginPivot } from '../PluginPivot';
import {
    PluginPivotDataSettingsParamsHeader,
    PluginPivotFilter,
    PluginPivotFilterConfig,
    PluginPivotFilterGroup,
    TotalKey,
} from '../types';
import { getSortInfo } from '../utils/sortUtils';
import { PluginPivotChunks } from './PluginPivotChunks';
import { PluginPivotColumn } from './PluginPivotColumn';
import { PluginPivotIndex } from './PluginPivotIndex';

const COMPARATORS: Record<string, string> = {
    $iLike: '',
    $notILike: 'не',
    $eq: '=',
    $ne: '!=',
    $gt: '>',
    $lt: '<',
    $gte: '>=',
    $lte: '<=',
};

const LOGIC_TYPES = {
    $or: 'ИЛИ',
    $and: 'И',
};

interface ICreatePivotTableOptions {
    defaultMeasureFormat?: CellFormattingType;
    defaultDimensionFormat?: CellFormattingType;
}

interface ICondition extends Record<string, any> {
    logicType: '$or' | '$and';
}

export class CreatePivotTable {
    columns: Array<Array<ICellWithStyles | undefined>>;

    data: Array<Array<ICellWithStyles | undefined>>;

    indexHeader: {
        /** Заголовки для измерений у строк */
        indexes: ICellWithStyles[];
        /** Заголовки для измерений у колонок */
        columns: ICellWithStyles[];
    };

    index: Array<Array<ICellWithStyles | undefined>>;

    pluginPivot: PluginPivot;

    defaultMeasureFormat: CellFormattingType;

    defaultDimensionFormat: CellFormattingType;

    constructor(pluginPivot: PluginPivot, options: ICreatePivotTableOptions = {}) {
        this.columns = [];
        this.data = [];
        this.indexHeader = {
            columns: [],
            indexes: [],
        };
        this.index = [];
        this.pluginPivot = pluginPivot;

        this.defaultMeasureFormat = options.defaultMeasureFormat ?? CellFormattingType.default;
        this.defaultDimensionFormat = options.defaultDimensionFormat ?? CellFormattingType.text;
    }

    /**
     * Метод получения статуса загрузки ячейки
     */
    private static getCellLoading(rowChunkKey: string, columnChunkKey: string, pluginPivotChunks: PluginPivotChunks): boolean {
        return (
            pluginPivotChunks?.state.chunks[rowChunkKey]?.isLoading ||
            pluginPivotChunks?.state.chunks[columnChunkKey]?.isLoading ||
            false
        );
    }

    /**
     * Формирует заголовки столбцов
     */
    buildColumns() {
        for (const columnIndex in this.pluginPivot.pluginPivotData.state.columns.meta.sortingUuid) {
            const columnKey = this.pluginPivot.pluginPivotData.state.columns.meta.sortingUuid[columnIndex];
            const currentColumn = this.pluginPivot.pluginPivotData.state.columns.data[columnKey];

            const hasHierarchyChunk = this.pluginPivot.pluginPivotChunks.getHasChunk(currentColumn.meta.chunkUuid.hierarchy);
            const isHierarchyChunkEmpty = this.pluginPivot.pluginPivotChunks.isChunkEmpty(
                currentColumn.meta.chunkUuid.hierarchy,
            );
            const hasOpenChunk = this.pluginPivot.pluginPivotChunks.getHasChunk(currentColumn.meta.chunkUuid.open);
            const isOpenChunkEmpty = this.pluginPivot.pluginPivotChunks.isChunkEmpty(currentColumn.meta.chunkUuid.open);

            const hasAnyChunkWithData = (hasHierarchyChunk && !isHierarchyChunkEmpty) || (hasOpenChunk && !isOpenChunkEmpty);
            const shouldSkip = !currentColumn.meta.subtotals && hasAnyChunkWithData;
            // Не пропускаем колонку, если чанк пустой (схлопнут после пустой загрузки).
            // Иначе колонка исчезнет, и остальные сдвинутся влево.
            if (shouldSkip) {
                continue;
            }

            // TODO СОЗДАНИЕ ИНСТАНСА В ЦИКЛЕ???!!! Создание инстанса тяжеловесная операция, а в неё передается еще и большой объект
            const columnInstance = new PluginPivotColumn(this.pluginPivot, currentColumn);

            const columnRows = columnInstance.get();

            for (const rowIndex in columnRows) {
                // @ts-ignore
                const value = this.pluginPivot?.state?.pivotParams[columnRows[Number(rowIndex)].data];
                this.columns[Number(rowIndex)] ??= [];
                const originalCell = columnRows[Number(rowIndex)];
                this.columns[Number(rowIndex)].push(
                    value
                        ? {
                              ...originalCell,
                              data: value,
                          }
                        : originalCell,
                );
            }
        }
    }

    buildIndex(): void {
        const isRepeat = this.pluginPivot.state.args.repeatHeaders;
        const indexState = this.pluginPivot.pluginPivotData.state.index;
        const pluginChunks = this.pluginPivot.pluginPivotChunks;

        // Множество ключей parent-ячеек, чьи строки были пропущены (subtotals = false).
        // Ключ — meta.key родителя.
        const skippedParents = new Set<string>();

        // При первом проходе собираем пропущенных родителей.
        // Второй проход строит строки; для первого ребёнка каждого пропущенного
        // родителя передаётся parentMeta.
        const keys: string[] = [];
        for (const indexKey of indexState.meta.sortingUuid) {
            const cell = indexState.data[indexKey];
            const hasHierarchyChunk = pluginChunks.getHasChunk(cell.meta.chunkUuid.hierarchy);
            const isHierarchyChunkEmpty = pluginChunks.isChunkEmpty(cell.meta.chunkUuid.hierarchy);
            const hasOpenChunk = pluginChunks.getHasChunk(cell.meta.chunkUuid.open);
            const isOpenChunkEmpty = pluginChunks.isChunkEmpty(cell.meta.chunkUuid.open);
            const hasAnyChunkWithData = (hasHierarchyChunk && !isHierarchyChunkEmpty) || (hasOpenChunk && !isOpenChunkEmpty);
            const shouldSkip = isRepeat && !cell.meta.subtotals && hasAnyChunkWithData;

            if (shouldSkip) {
                skippedParents.add(cell.meta.key);
            } else {
                keys.push(indexKey);
            }
        }

        // Второй проход — собственно построение.
        // parentKey передаётся только первому не пропущенному потомку
        // самого верхнего пропущенного предка, чтобы кнопки иерархии
        // отображались единожды.
        const handledSkipped = new Set<string>();

        for (const indexKey of keys) {
            const currentIndex = indexState.data[indexKey];
            let parentKey: string | undefined;

            if (isRepeat) {
                // Определяем самого верхнего пропущенного предка (subtotals = false).
                const ancestors = this.pluginPivot.pluginPivotData.getIndexAncestors(indexKey);
                let deepestSkippedKey: string | undefined;
                for (const ancestor of ancestors) {
                    if (skippedParents.has(ancestor.key)) {
                        deepestSkippedKey = ancestor.key;
                    }
                }

                if (deepestSkippedKey && !handledSkipped.has(deepestSkippedKey)) {
                    handledSkipped.add(deepestSkippedKey);
                    parentKey = deepestSkippedKey;
                }
            }

            const index = new PluginPivotIndex(this.pluginPivot, currentIndex);
            const indexRow = index.get(parentKey);
            this.index.push(indexRow);
        }
    }

    /**
     * Метод подготовки данных таблицы
     */
    buildData(): void {
        const { index, columns, data } = this.pluginPivot.pluginPivotData.state;
        const isRepeat = this.pluginPivot.state.args.repeatHeaders;
        const pluginChunks = this.pluginPivot.pluginPivotChunks;

        for (const indexKey of index.meta.sortingUuid) {
            const indexCell = index.data[indexKey];

            // При repeatHeaders строки с subtotals = false пропускаются (строятся в buildIndex).
            if (isRepeat) {
                const hasHierarchyChunk = pluginChunks.getHasChunk(indexCell.meta.chunkUuid.hierarchy);
                const isHierarchyChunkEmpty = pluginChunks.isChunkEmpty(indexCell.meta.chunkUuid.hierarchy);
                const hasOpenChunk = pluginChunks.getHasChunk(indexCell.meta.chunkUuid.open);
                const isOpenChunkEmpty = pluginChunks.isChunkEmpty(indexCell.meta.chunkUuid.open);
                const hasAnyChunkWithData =
                    (hasHierarchyChunk && !isHierarchyChunkEmpty) || (hasOpenChunk && !isOpenChunkEmpty);
                if (!indexCell.meta.subtotals && hasAnyChunkWithData) {
                    continue;
                }
            }

            const row: ICellWithStyles[] = [];

            const hasIndexChunk = pluginChunks.getHasChunk(indexCell.meta.chunkUuid.hierarchy);
            const isIndexChunkEmpty = pluginChunks.isChunkEmpty(indexCell.meta.chunkUuid.hierarchy);

            for (const columnsKey of columns.meta.sortingUuid) {
                const hasHierarchyChunk = this.pluginPivot.pluginPivotChunks.getHasChunk(
                    columns.data[columnsKey].meta.chunkUuid.hierarchy,
                );
                const isHierarchyChunkEmpty = this.pluginPivot.pluginPivotChunks.isChunkEmpty(
                    columns.data[columnsKey].meta.chunkUuid.hierarchy,
                );
                const hasOpenChunk = this.pluginPivot.pluginPivotChunks.getHasChunk(
                    columns.data[columnsKey].meta.chunkUuid.open,
                );
                const isOpenChunkEmpty = this.pluginPivot.pluginPivotChunks.isChunkEmpty(
                    columns.data[columnsKey].meta.chunkUuid.open,
                );

                const hasAnyChunkWithData =
                    (hasHierarchyChunk && !isHierarchyChunkEmpty) || (hasOpenChunk && !isOpenChunkEmpty);
                const shouldSkip = !columns.data[columnsKey].meta.subtotals && hasAnyChunkWithData;

                if (shouldSkip) {
                    continue;
                }

                const el = data[indexKey]?.[columnsKey];

                // Флаг загрузки ячейки
                const isLoading = CreatePivotTable.getCellLoading(
                    index.data[indexKey].meta?.chunkKey,
                    columns.data[columnsKey].meta?.chunkKey,
                    this.pluginPivot.pluginPivotChunks,
                );

                const measure = this.pluginPivot.getParamField(el?.meta?.value ?? {});

                row.push({
                    components: [],
                    // eslint-disable-next-line no-constant-condition
                    data: !index.data[indexKey].meta.subtotals && hasIndexChunk && !isIndexChunkEmpty ? '-' : el?.data,
                    styles: {
                        fontWeight:
                            index.data[indexKey].meta.hierarchy && index.data[indexKey].meta.level % 2 === 0
                                ? 'bold'
                                : undefined,
                    },
                    config: {
                        isLoading,
                    },
                    pluginsConfig: {
                        [PLUGIN_CELL_FORMATTING_KEY]: {
                            format: measure?.format ?? this.defaultMeasureFormat,
                        },
                        [PLUGIN_PIVOT_KEY]: {
                            index: index.data[indexKey].meta,
                            columns: columns.data[columnsKey].meta,
                            data: el?.meta,
                            scalable: measure?.useMeasure ?? false,
                        },
                    },
                });
            }

            this.data.push(row);
        }
    }

    buildSumRow(): ICellWithStyles[] {
        // Ширина индексной части таблицы (количество колонок слева).
        // В обычном режиме совпадает с indexHeader.indexes.length,
        // в режиме repeatHeaders — может быть шире из-за повторения подписей уровней.
        const indexWidth = this.index[0]?.length ?? this.indexHeader.indexes.length;

        const data: ICellWithStyles[] = Array.from(
            { length: indexWidth - 1 },
            () =>
                ({
                    components: [],
                    data: null,
                    styles: {
                        hyphenation: 'transfer',
                        horizontalAlign: 'end',
                        // verticalAlign: 'center',
                        backgroundColor: 'var(--ui-kit-colors-background-highlighted)',
                    },
                } as ICellWithStyles),
        );

        data.push({
            components: [],
            data: 'Общий итог',
            styles: {
                hyphenation: 'transfer',
                horizontalAlign: 'end',
                // verticalAlign: 'center',
                backgroundColor: 'var(--ui-kit-colors-background-highlighted)',
            },
        });

        for (const columnKey of this.pluginPivot.pluginPivotData.state.columns.meta.sortingUuid || []) {
            const columnData = this.pluginPivot.pluginPivotData.state.columns.data[columnKey];

            const hasHierarchyChunk = this.pluginPivot.pluginPivotChunks.getHasChunk(columnData.meta.chunkUuid.hierarchy);
            const isHierarchyChunkEmpty = this.pluginPivot.pluginPivotChunks.isChunkEmpty(columnData.meta.chunkUuid.hierarchy);
            const hasOpenChunk = this.pluginPivot.pluginPivotChunks.getHasChunk(columnData.meta.chunkUuid.open);
            const isOpenChunkEmpty = this.pluginPivot.pluginPivotChunks.isChunkEmpty(columnData.meta.chunkUuid.open);

            const hasAnyChunkWithData = (hasHierarchyChunk && !isHierarchyChunkEmpty) || (hasOpenChunk && !isOpenChunkEmpty);
            const shouldSkip = !columnData.meta.subtotals && hasAnyChunkWithData;
            if (shouldSkip) {
                continue;
            }

            // TODO: Надо наследовать формат и не перетягивать каждый раз из параметров
            const measure = this.pluginPivot.getParamField(columnData.meta.value);

            const totalsKey = [
                measure?.id, // FIY ID меры TODO: ID в параметрах не совпадает с мерой в общем списке
                columnData.meta.layer.id, // FIY ID слоя
                columnData.meta.dimension, // FIY Значение меры
                columnData.meta.aggregationFn.sqlName?.toLowerCase(), // FIY функция агрегации
            ].join(':->:') as TotalKey;

            const chunk = this.pluginPivot.pluginPivotChunks.state.chunks[columnData.meta.chunkKey];

            let val = null;
            if (chunk?.totals?.indexes?.[totalsKey]) {
                val = Number(chunk.totals.indexes[totalsKey]);
            }

            data.push({
                components: [],
                data: val,
                styles: {
                    hyphenation: 'transfer',
                    color: val != null && val < 0 ? '#f33939' : 'var(--ui-kit-colors-text-primary)',
                    // backgroundColor: 'none',
                    horizontalAlign: 'end',
                    // verticalAlign: 'center',
                    // fontSize: 15,
                },
                pluginsConfig: {
                    [PLUGIN_CELL_FORMATTING_KEY]: {
                        format: measure?.format ?? this.defaultMeasureFormat,
                    },
                    [PLUGIN_PIVOT_KEY]: {
                        scalable: measure?.useMeasure ?? false,
                    },
                },
            });
        }

        return data;
    }

    /**
     * Подсчет итогов
     * Должен добавлять ряд колонок (итогов по слоям)
     */
    buildSumColumn(hasRowTotals: boolean): Array<Array<ICellWithStyles | undefined>> {
        const { chunks } = this.pluginPivot.pluginPivotChunks.state;

        const result: Array<Array<ICellWithStyles | undefined>> = [];

        const headerStyles: ICellStyles = {
            hyphenation: 'transfer',
            horizontalAlign: 'start',
            backgroundColor: 'var(--ui-kit-colors-background-highlighted)',
        };

        const makeHeader = (
            measure: PluginPivotDataSettingsParamsHeader,
            layer: PluginPivotDataSettingsParamsHeader,
            aggrfunc: PluginPivotDataSettingsParamsHeader,
        ): ICellWithStyles[] => [
            {
                components: [],
                data: measure.description ?? measure.label,
                styles: headerStyles,
            },
            {
                components: [],
                data: layer.description ?? layer.label,
                styles: headerStyles,
            },
            {
                components: [],
                data: 'Общий итог',
                styles: headerStyles,
            },
            ...Array.from({ length: Math.max(0, this.columns.length - 4) }, () => ({
                components: [],
                data: null,
                styles: headerStyles,
            })),
            {
                components: [],
                data: aggrfunc.description ?? aggrfunc.label,
                styles: headerStyles,
            },
        ];

        const { values = [], layers = [] } = chunks.root.params;
        for (const value of values) {
            for (const layer of layers) {
                const measure = this.pluginPivot.getParamField(value);
                for (const aggrfunc of value.child) {
                    const colAsRow: ICellWithStyles[] = makeHeader(value, layer, aggrfunc);

                    for (const index of this.pluginPivot.pluginPivotData.state.index.meta.sortingUuid || []) {
                        const indexData = this.pluginPivot.pluginPivotData.state.index.data[index];
                        const chunk = this.pluginPivot.pluginPivotChunks.state.chunks[indexData.meta.chunkKey];

                        const totalsKey = [
                            measure?.id,
                            layer.id,
                            indexData.meta?.dimension,
                            aggrfunc.sqlName?.toLowerCase(),
                        ].join(':->:') as TotalKey;

                        let val = null;
                        if (chunk?.totals?.columns?.[totalsKey] != null) {
                            val = Number(chunk.totals.columns[totalsKey]);
                        }

                        const styles: ICellStyles = {
                            hyphenation: 'transfer',
                            // backgroundColor: 'none',
                            horizontalAlign: 'end',
                            color: val != null && val < 0 ? '#f33939' : 'var(--main-active-color)',
                            // fontSize: 12,
                        };
                        if ((indexData.meta.level ?? 1) % 2 === 0) {
                            styles.fontDecoration ??= {};
                            styles.fontWeight = 'bold';
                        }

                        colAsRow.push({
                            components: [],
                            data: val,
                            styles,
                            pluginsConfig: {
                                [PLUGIN_CELL_FORMATTING_KEY]: {
                                    // @ts-ignore
                                    format: measure?.format ?? this.defaultMeasureFormat,
                                },
                                [PLUGIN_PIVOT_KEY]: {
                                    scalable: measure?.useMeasure ?? false,
                                },
                            },
                        });
                    }

                    if (hasRowTotals) {
                        const chunk = chunks.root;
                        const totalsKey = [measure?.id, layer.id, aggrfunc.sqlName?.toLowerCase()].join(':->:') as TotalKey;

                        let val = null;
                        if (chunk?.totals?.totals?.[totalsKey] != null) {
                            val = Number(chunk.totals.totals[totalsKey]);
                        }

                        colAsRow.push({
                            components: [],
                            data: val,
                            styles: {
                                hyphenation: 'transfer',
                                // backgroundColor: 'none',
                                horizontalAlign: 'end',
                                // verticalAlign: 'center',
                                color: val != null && val < 0 ? '#f33939' : 'var(--main-active-color)',
                                // fontSize: 12,
                            },
                            pluginsConfig: {
                                [PLUGIN_CELL_FORMATTING_KEY]: {
                                    format: measure?.format ?? this.defaultMeasureFormat,
                                },
                                [PLUGIN_PIVOT_KEY]: {
                                    scalable: measure?.useMeasure ?? false,
                                },
                            },
                        });
                    }

                    result.push(colAsRow);
                }
            }
        }

        const transpose = (matrix: Array<Array<ICellWithStyles | undefined>>) =>
            matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));

        return transpose(result);
    }

    // метод формирования сумм по колонкам и столбцам
    // вынес в отдельный метод так как на подсчете колонок нужны данные строк
    buildSum(): { row: ICellWithStyles[]; column: Array<Array<ICellWithStyles | undefined>> } {
        const { indexes = false, columns = false } =
            this.pluginPivot.pluginPivotChunks.state.chunks.root?.params?.totals ?? {};

        let row: ICellWithStyles[] = [];
        const column: Array<Array<ICellWithStyles | undefined>> = [];

        if (indexes) {
            row = this.buildSumRow();
        }

        if (columns) {
            const columnSum = this.buildSumColumn(indexes);

            columnSum.forEach((rowColumns) => {
                const rowSum: Array<ICellWithStyles | undefined> = [];
                rowColumns.forEach((cell) => {
                    rowSum.push(cell);
                });
                column.push(rowSum);
            });
        }

        return {
            row,
            column,
        };
    }

    /**
     * Получить информацию о сортировке для элемента измерения
     */
    private getItemSortInfo(
        item: PluginPivotDataSettingsParamsHeader,
        orderType: 'rows' | 'columns',
    ): { isSorted: boolean; order: 'ASC' | 'DESC' | null } {
        const { params } = this.pluginPivot.pluginPivotChunks.state.chunks.root ?? {};

        // Проверяем различные возможные имена поля
        const possibleNames = [item.name, item.id, item.sqlName, item.description, item.label].filter(Boolean) as string[];

        return getSortInfo(possibleNames, orderType, params?.order);
    }

    _recursiveBuildIndexHeader(
        items: PluginPivotDataSettingsParamsHeader[],
        parentPrefix: string | null = null,
        orderType: 'rows' | 'columns' = 'rows',
    ): ICellWithStyles[] {
        const columns: ICellWithStyles[] = [];
        items.forEach((item) => {
            const key = parentPrefix ? `${parentPrefix}.${item.name}` : item.name;
            const cellData = this.pluginPivot?.state?.pivotParams[key] || item.description || item.label;

            // Проверяем сортировку для текущего элемента
            const sortInfo = this.getItemSortInfo(item, orderType);
            const components: IButton[] = [];

            if (sortInfo.isSorted) {
                const sortIcon = sortInfo.order === 'DESC' ? SortDescIcon : SortAscIcon;
                components.push({
                    positionRelativeToText: 'after',
                    type: 'button',
                    icon: sortIcon,
                    disabled: true,
                    loading: false,
                    onClick: () => {},
                });
            }

            columns.push({
                components,
                data: cellData,
            });

            if (item.child) {
                columns.push(...this._recursiveBuildIndexHeader(item.child, item.name, orderType));
            }
        });

        return columns;
    }

    buildColumnIndexHeader(items: PluginPivotDataSettingsParamsHeader[]): ICellWithStyles[] {
        const columns: ICellWithStyles[] = [];

        const columnsMaxLevels = this.pluginPivot.pluginPivotData._calcMaxLevels('columns');

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            const cellData = this.pluginPivot.state.pivotParams[item.name] || item.description || item.label;

            // Проверяем сортировку для текущего элемента
            const sortInfo = this.getItemSortInfo(item, 'columns');
            const components: IButton[] = [];

            if (sortInfo.isSorted) {
                const sortIcon = sortInfo.order === 'DESC' ? SortDescIcon : SortAscIcon;
                components.push({
                    positionRelativeToText: 'after',
                    type: 'button',
                    icon: sortIcon,
                    disabled: true,
                    loading: false,
                    onClick: () => {},
                });
            }

            columns.push({
                components,
                data: cellData,
            });

            const emptyCells = new Array(columnsMaxLevels[i] ?? 0).fill({
                components: [],
                data: null,
            });

            columns.push(...emptyCells);

            if (item.child) {
                columns.push(...this._recursiveBuildIndexHeader(item.child, item.name, 'columns'));
            }
        }
        return columns;
    }

    /**
     * Формирует индексный заголовок для таблицы в режиме repeatHeaders.
     * Каждое row-измерение занимает (maxLevel + 1 + childCount) колонок:
     *   - одна ячейка с именем,
     *   - maxLevel пустых ячеек (по числу уровней иерархии),
     *   - child-колонки.
     */
    buildRepeatIndexHeader(items: PluginPivotDataSettingsParamsHeader[]): ICellWithStyles[] {
        const columns: ICellWithStyles[] = [];
        const maxRowLevels = this.pluginPivot.pluginPivotData._calcMaxLevels('index');

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            const cellData = this.pluginPivot.state.pivotParams[item.name] || item.description || item.label;

            const sortInfo = this.getItemSortInfo(item, 'rows');
            const components: IButton[] = [];

            if (sortInfo.isSorted) {
                const sortIcon = sortInfo.order === 'DESC' ? SortDescIcon : SortAscIcon;
                components.push({
                    positionRelativeToText: 'after',
                    type: 'button',
                    icon: sortIcon,
                    disabled: true,
                    loading: false,
                    onClick: () => {},
                });
            }

            columns.push({
                components,
                data: cellData,
            });

            // Пустые ячейки для уровней иерархии текущего измерения
            const emptyCells = new Array(maxRowLevels[i] ?? 0).fill({
                components: [],
                data: null,
            });
            columns.push(...emptyCells);

            if (item.child) {
                columns.push(...this._recursiveBuildIndexHeader(item.child, item.name, 'rows'));
            }
        }

        return columns;
    }

    /**
     * Формирует индексный заголовок для таблицы (тот, что слева)
     */
    buildIndexHeader() {
        const rows = this.pluginPivot.pluginPivotChunks.state.chunks.root?.params?.rows ?? [];
        const columns = this.pluginPivot.pluginPivotChunks.state.chunks.root?.params?.columns ?? [];

        this.indexHeader.indexes = this.pluginPivot.state.args.repeatHeaders
            ? this.buildRepeatIndexHeader(rows)
            : this._recursiveBuildIndexHeader(rows, null, 'rows');
        this.indexHeader.columns = this.buildColumnIndexHeader(columns);
    }

    flattenFilters(originalFilter: (PluginPivotFilterGroup | PluginPivotFilter)[]) {
        const result: Record<string, PluginPivotFilterGroup> = {};

        const addCondition = (field: string, condition: PluginPivotFilter, logicType: '$and' | '$or') => {
            result[field] ??= {};
            result[field][logicType] ??= [];
            result[field][logicType]!.push(condition);
        };

        const processFilterNode = (node: PluginPivotFilterGroup | PluginPivotFilter, logicType: '$and' | '$or' = '$and') => {
            for (const [field, condition] of Object.entries(node)) {
                if (['$or', '$and'].includes(field)) {
                    for (const cond of condition) {
                        processFilterNode(cond, field as '$and' | '$or');
                    }
                    continue;
                }

                if (typeof condition !== 'object' || condition === null) {
                    addCondition(field, { $eq: condition }, logicType);
                    continue;
                }

                const cleanCondition = { ...condition } as PluginPivotFilter;
                ['__level__', '__type__', '__format__'].forEach((metaField) => delete cleanCondition[metaField]);

                addCondition(field, cleanCondition, logicType);
            }
        };

        for (const filter of originalFilter) {
            processFilterNode(filter);
        }

        return result;
    }

    formatValue(condition: Record<string, string>, field: string): string {
        const conditionTmp = { ...condition };
        delete conditionTmp.logicType;
        const [comparator, value] = Object.entries(conditionTmp)[0] ?? [];
        const userValue = this.pluginPivot.getFilterUserValue(field, value);
        const _value = [COMPARATORS[comparator], userValue ?? value];

        return _value.join(' ');
    }

    getFilterRows(): Array<Array<ICellWithStyles | undefined>> {
        const where = this.pluginPivot.pluginPivotChunks.state.chunks.root?.params?.where || {};
        const flattenFilters = this.flattenFilters((where.$and ?? []) as (PluginPivotFilterGroup | PluginPivotFilter)[]);

        const rows: Array<Array<ICellWithStyles | undefined>> = [[]];
        for (const [field, filter] of Object.entries(flattenFilters)) {
            const label = this.pluginPivot?.state?.pivotParams[field];

            // Собираем все условия для данного поля
            const allConditions: ICondition[] = [];
            for (const [logicType, conditions] of Object.entries(filter)) {
                allConditions.push(
                    ...conditions.map((condition) => ({
                        ...condition,
                        logicType: logicType as ICondition['logicType'],
                    })),
                );
            }

            // Обрабатываем range-условия ($gte + $lte → $iLike)
            for (const condition of allConditions) {
                if ('$gte' in condition && '$lte' in condition) {
                    // Легкий костылек, чтобы не было префикса
                    condition.$iLike = `${condition.$gte} / ${condition.$lte}`;
                    delete condition.$gte;
                    delete condition.$lte;
                }
            }

            let formatedValue: string;
            const filterConfig: PluginPivotFilterConfig = { field };
            if (allConditions.length > 1) {
                formatedValue = '(несколько элементов)';
                const formatedValues = allConditions.map((condition, index) =>
                    index === 0
                        ? this.formatValue(condition, field)
                        : `${LOGIC_TYPES[condition.logicType]} ${this.formatValue(condition, field)}`,
                );
                filterConfig.formatedValues = formatedValues;
            } else {
                formatedValue = this.formatValue(allConditions[0], field);
            }

            const isLoadingTable = this.pluginPivot.pluginPivotChunks.hasLoadingChunk();
            rows.push([
                {
                    components: [],
                    data: label,
                    pluginsConfig: {
                        [PLUGIN_PIVOT_KEY]: {
                            filter: filterConfig,
                        },
                    },
                } as ICell,
                {
                    components: [
                        {
                            positionRelativeToText: 'after',
                            type: 'button',
                            disabled: isLoadingTable,
                            loading: false,
                            icon: FilterIcon,
                            color: 'primary',
                            onClick: (event: any) => {
                                const rect = this.pluginPivot.tableAdapter.tableAPIRef?.current?.getBoundingClientRect();
                                this.pluginPivot.onTableFilterClick(
                                    field,
                                    (rect?.left ?? 0) + (event?.component?.x ?? 0),
                                    (rect?.top ?? 0) + (event?.component?.y ?? 0),
                                    event?.component?.width ?? 0,
                                    event?.component?.height ?? 0,
                                );
                            },
                        },
                    ],
                    data: formatedValue,
                    styles: {
                        horizontalAlign: 'end',
                    },
                } as ICell,
            ]);
        }
        return rows;
    }

    buildTable(): Array<Array<ICellWithStyles | undefined>> {
        const data: Array<Array<ICellWithStyles | undefined>> = [[]];

        const { rowsTotal, columnsTotal } = this.pluginPivot.state.args;

        /** (Название меры, Название слоя) */
        const offsetHeadersRowIndex = 2;
        /** Начальный индекс колонок */
        const startIndexColumnIndex = this.index[0]?.length || 0;
        /** Начальный индекс строк */
        const startIndexRowIndex = this.columns?.length || 0;
        /** Количество колонок */
        const countColumn = startIndexColumnIndex + (this.columns[0]?.length || 0);
        /** Количество строк */
        const countRow = startIndexRowIndex + this.index.length;
        /** Конечный индекс строк */
        const endIndexRowIndex = countRow - 1;
        /** Конечный индекс колонок */
        // const endIndexColumnIndex = countColumn - 1;

        const offsetColumn = Number(columnsTotal);

        const filters = this.getFilterRows();

        for (let indexRow = 0; indexRow < countRow; indexRow++) {
            data[indexRow] = [];

            for (let indexColumn = 0; indexColumn < countColumn; indexColumn++) {
                // Верхний левый пустой квадрат
                if (
                    (indexRow < offsetHeadersRowIndex && indexColumn < startIndexColumnIndex) ||
                    (indexRow < startIndexRowIndex - 1 && indexColumn < startIndexColumnIndex - 1)
                ) {
                    data[indexRow][indexColumn] = {
                        components: [],
                        data: null,
                        styles: {
                            hyphenation: 'transfer',
                            backgroundColor: 'var(--ui-kit-colors-background-highlighted)',
                        },
                    };
                }
                // Измерений по колонкам
                else if (
                    indexRow >= offsetHeadersRowIndex &&
                    indexRow < startIndexRowIndex - 1 &&
                    indexColumn === startIndexColumnIndex - 1
                ) {
                    const { styles, ...cellData } = this.indexHeader.columns[indexRow - offsetHeadersRowIndex] ?? {
                        components: [],
                        data: null,
                    };
                    data[indexRow][indexColumn] = {
                        ...cellData,
                        styles: {
                            hyphenation: 'transfer',
                            backgroundColor: 'var(--ui-kit-colors-background-highlighted)',
                            // fontSize: 15,
                            horizontalAlign: 'end',
                            ...styles,
                        },
                    };
                }
                // Измерений по строкам
                else if (indexRow === startIndexRowIndex - 1 && indexColumn < startIndexColumnIndex) {
                    const { styles, ...cellData } = this.indexHeader.indexes[indexColumn] ?? {
                        components: [],
                        data: null,
                    };
                    data[indexRow][indexColumn] = {
                        ...cellData,
                        styles: {
                            hyphenation: 'transfer',
                            backgroundColor: 'var(--ui-kit-colors-background-highlighted)',
                            // fontSize: 15,
                            ...styles,
                        },
                    };
                }
                // Шапка колонок
                else if (
                    indexRow >= 0 &&
                    indexRow <= startIndexRowIndex - 1 &&
                    indexColumn >= startIndexColumnIndex &&
                    indexColumn <= countColumn - 1
                ) {
                    const { styles, ...cellData } = this.columns[indexRow][indexColumn - startIndexColumnIndex] ?? {
                        components: [],
                        data: null,
                    };
                    data[indexRow][indexColumn] = {
                        ...cellData,
                        position: 'column',
                        styles: {
                            hyphenation: 'transfer',
                            backgroundColor: 'var(--ui-kit-colors-background-highlighted)',
                            horizontalAlign: 'start',
                            // fontSize: 15,
                            ...styles,
                        },
                    };
                }
                // Шапка строк
                else if (
                    indexRow >= startIndexRowIndex &&
                    indexRow <= endIndexRowIndex &&
                    indexColumn >= 0 &&
                    indexColumn <= startIndexColumnIndex - 1
                ) {
                    const { styles, ...indexCell } = this.index[indexRow - startIndexRowIndex][indexColumn] ?? {
                        components: [],
                        data: null,
                    };
                    data[indexRow][indexColumn] = {
                        ...indexCell,
                        position: 'index',
                        styles: {
                            hyphenation: 'transfer',
                            backgroundColor: 'var(--ui-kit-colors-background-highlighted)',
                            horizontalAlign: 'start',
                            // fontSize: 15,
                            ...styles,
                        },
                    };
                }
                // Данные
                else if (
                    indexRow >= startIndexRowIndex &&
                    indexRow <= endIndexRowIndex &&
                    indexColumn > startIndexColumnIndex - 1
                ) {
                    // Выводим данные
                    const { styles, ...value } = this.data[indexRow - startIndexRowIndex][
                        indexColumn - startIndexColumnIndex
                    ] ?? {
                        components: [],
                        data: null,
                    };
                    const isNumber = !Number.isNaN(Number(value.data));
                    data[indexRow][indexColumn] = {
                        ...value,
                        styles: {
                            hyphenation: 'transfer',
                            horizontalAlign: 'end',
                            color: isNumber && Number(value.data) < 0 ? '#f33939' : 'var(--ui-kit-colors-text-primary)',
                            ...styles,
                        },
                    };
                }
            }
        }

        const { row, column } = this.buildSum();

        if (rowsTotal && this.data.length) data.push(row);

        if (column.length) {
            data.forEach((row, index) => {
                if (column[index]) row.push(...column[index]);
            });
        }

        if (filters.length) {
            data.unshift(...filters, new Array(countColumn + offsetColumn));
        }

        // TODO Наверно здесь уже не имеет смысла, но здесь было название схемы
        // data.unshift(new Array(countColumn));

        return data;
    }

    clearBuild = () => {
        this.columns = [];
        this.index = [];
        this.data = [];
    };

    async renderTable(): Promise<Array<Array<ICellWithStyles | undefined>>> {
        if (!this.pluginPivot.state.args) return [[]];

        this.clearBuild();

        this.buildColumns();
        this.buildIndexHeader();
        this.buildIndex();
        this.buildData();

        return this.buildTable();
    }
}
