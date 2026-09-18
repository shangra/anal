import { ICell, ICellPluginsConfig, ICellStyles, ICellWithStyles } from '../../../AdapterSpreadSheet/types';
import { PLUGIN_PIVOT_KEY } from '../constants';
import { PluginPivot } from '../PluginPivot';
import { PluginPivotDataSettingsParams, PluginPivotDataSettingsParamsHeader } from '../types';
import { buildMainCell, type BuildMainCellMeta, type ChunkStates } from '../utils/cellUtils';
import { PluginPivotDataHeaderCellMeta, PluginPivotDataIndexCell } from './PluginPivotData';

export type THierarchyCb = {
    handleLoad?: (type: 'hierarchy' | 'open', params: PluginPivotDataSettingsParams) => (event?: any) => void;
    handleRemove?: (type: 'hierarchy' | 'open') => (event?: any) => void;
};

export class PluginPivotIndex {
    pluginPivot;

    data;

    constructor(pluginPivot: PluginPivot, data: PluginPivotDataIndexCell) {
        this.pluginPivot = pluginPivot;
        this.data = data;

        if (this.data.meta.index === -1) {
            console.error('buildIndex: indexParentIndex is undefined');
        }
    }

    // ─── хелперы для chunkStates ─────────────────────────────────────────────

    /**
     * Собирает ChunkStates для произвольной meta (текущей или родительской).
     */
    private _collectChunkStates = (meta: PluginPivotDataHeaderCellMeta): ChunkStates => {
        const isLoadingHierarchy = this.pluginPivot.pluginPivotChunks.isChunkLoading(meta.chunkUuid.hierarchy);
        const isLoadingOpen = this.pluginPivot.pluginPivotChunks.isChunkLoading(meta.chunkUuid.open);
        const isOppositeAxisLoading = this.pluginPivot.pluginPivotChunks.hasLoadingColumnChunk();

        return {
            isLoadingHierarchy,
            isChunkExpandedHierarchy: this.pluginPivot.pluginPivotChunks.isChunkExpanded(meta.chunkUuid.hierarchy),
            isLoadingOpen,
            isChunkExpandedOpen: this.pluginPivot.pluginPivotChunks.isChunkExpanded(meta.chunkUuid.open),
            isChunkEmptyHierarchy: this.pluginPivot.pluginPivotChunks.isChunkEmpty(meta.chunkUuid.hierarchy),
            isChunkEmptyOpen: this.pluginPivot.pluginPivotChunks.isChunkEmpty(meta.chunkUuid.open),
            isDisabledHierarchy: isOppositeAxisLoading,
            isDisabledOpen: isOppositeAxisLoading,
        };
    };

    // ─── единая фабрика ячеек индекса ─────────────────────────────────────────

    /**
     * Единая фабрика ячейки строки индекса. Всегда вызывает buildMainCell,
     * который сам решает, добавлять ли кнопки hierarchy/open (проверяет cellData и meta).
     *
     * @param cellData  Данные ячейки. По умолчанию this.data.data.
     * @param styles    Дополнительные стили (будут смержены с базовыми verticalAlign/bold).
     * @param pluginsConfig  Плагины. По умолчанию { [PLUGIN_PIVOT_KEY]: { index: this.data.meta } }.
     * @param meta      Meta для buildMainCell (влияет на кнопки hierarchy/open).
     *                  По умолчанию — this.data.meta (кнопки по состоянию).
     *                  Чтобы гарантированно убрать кнопки — передать { hierarchy: false, open: false, ... }.
     * @param chunkStates  ChunkStates. По умолчанию собирается из meta.
     */
    _buildIndexCell = (params?: {
        cellData?: any;
        styles?: ICellStyles;
        pluginsConfig?: ICellPluginsConfig;
        meta?: BuildMainCellMeta;
        chunkStates?: ChunkStates;
    }): ICellWithStyles => {
        const { cellData = this.data.data, styles, pluginsConfig, meta, chunkStates } = params ?? {};

        const resolvedMeta = meta ?? {
            open: this.data.meta.open,
            hierarchy: this.data.meta.hierarchy,
            level: this.data.meta.level,
            handleLoad: this.data.meta.handleLoad,
            handleRemove: this.data.meta.handleRemove,
        };

        const resolvedChunkStates = chunkStates ?? this._collectChunkStates(this.data.meta);

        return buildMainCell({
            cellData,
            styles: {
                verticalAlign: 'center',
                ...(resolvedMeta.hierarchy && resolvedMeta.level % 2 === 0 ? { fontWeight: 'bold' } : undefined),
                ...styles,
            },
            pluginsConfig: pluginsConfig ?? {
                [PLUGIN_PIVOT_KEY]: {
                    index: this.data.meta,
                },
            },
            chunkStates: resolvedChunkStates,
            meta: resolvedMeta,
        });
    };

    getEmptyCells = (length: number): ICellWithStyles[] => {
        const dist: ICell[] = [];

        for (let i = 0; i < length; i++) {
            dist.push({
                components: [],
                data: null,
            });
        }

        return dist;
    };

    _computePrevColumns(rows: PluginPivotDataSettingsParamsHeader[], finishIndex?: number): number {
        let countPrevColumns = 0;

        for (const index in rows) {
            if (Object.prototype.hasOwnProperty.call(rows, index)) {
                if (typeof finishIndex === 'number' && Number(index) === finishIndex) break;
                const row = rows[parseInt(index, 10)];
                countPrevColumns++;

                if (row?.child) {
                    countPrevColumns += this._computePrevColumns(row.child);
                }
            }
        }

        return countPrevColumns;
    }

    getChildCells = (): ICellWithStyles[] =>
        Object.values(this.data.meta.child).map((child) => ({
            components: [],
            data: child.value,
            styles: {
                fontWeight: this.data.meta.hierarchy && this.data.meta.level % 2 === 0 ? 'bold' : undefined,
            },
        }));

    // ─── repeatHeaders helpers ────────────────────────────────────────────────

    /**
     * Вычисляет смещение первой колонки для row-измерения k в режиме repeatHeaders.
     * Каждое измерение занимает (maxLevel+1 + childCount) колонок.
     */
    _computeRepeatOffset = (dimIdx: number, maxRowLevels: number[], rows: PluginPivotDataSettingsParamsHeader[]): number => {
        let offset = 0;
        for (let k = 0; k < dimIdx; k++) {
            const ml = maxRowLevels[k] ?? 0;
            const childCount = rows[k]?.child?.length ?? 0;
            offset += ml + 1 + childCount;
        }
        return offset;
    };

    /**
     * Полная ширина шапки строк в режиме repeatHeaders.
     */
    _computeTotalRepeatWidth = (maxRowLevels: number[], rows: PluginPivotDataSettingsParamsHeader[]): number =>
        rows.reduce((sum, row, k) => {
            const ml = maxRowLevels[k] ?? 0;
            const childCount = row?.child?.length ?? 0;
            return sum + ml + 1 + childCount;
        }, 0);

    /**
     * Формирует строку индекса в режиме repeatHeaders:
     * каждый уровень иерархии row-измерения занимает отдельную колонку,
     * значения всех предков повторяются в колонках их уровней.
     *
     * @param parentKey — если передан, строка текущего элемента замещает
     *   пропущенную (subtotals = false) строку родителя. Основная ячейка
     *   (с кнопками иерархии) строится от данных родителя.
     */
    _getRepeatHeaders = (parentKey?: string): ICellWithStyles[] => {
        const rows = this.pluginPivot.pluginPivotChunks.state.chunks.root?.params?.rows || [];
        const maxRowLevels = this.pluginPivot.pluginPivotData._calcMaxLevels('index');

        const totalWidth = this._computeTotalRepeatWidth(maxRowLevels, rows);
        const currentDim = this.data.meta.index;
        const currentLevel = this.data.meta.level;
        const currentOffset = this._computeRepeatOffset(currentDim, maxRowLevels, rows);

        // Заполняем всю строку пустыми ячейками
        const cells: ICellWithStyles[] = this.getEmptyCells(totalWidth);

        // Заполняем значениями предков (для предыдущих измерений и предыдущих уровней текущего)
        const ancestors = this.pluginPivot.pluginPivotData.getIndexAncestors(this.data.meta.key);
        for (const ancestor of ancestors) {
            const ancestorOffset = this._computeRepeatOffset(ancestor.index, maxRowLevels, rows);

            // Вычисляем paddingLeft для повторённого предка: если у него есть кнопки
            // hierarchy/open, они отображаются в его колонке только один раз (на первой
            // дочерней строке). На остальных строках кнопок нет — нужен отступ.
            const ancestorCellData = this.pluginPivot.pluginPivotData.state.index.data[ancestor.key];
            const ancestorMeta = ancestorCellData?.meta;
            let paddingLeft;
            if (ancestorMeta) {
                if (ancestorMeta.hierarchy && ancestorMeta.open) {
                    paddingLeft = 34;
                } else if (ancestorMeta.hierarchy || ancestorMeta.open) {
                    paddingLeft = 17;
                }
            }

            cells[ancestorOffset + ancestor.level] = {
                components: [],
                data: ancestor.data,
                styles: {
                    verticalAlign: 'center',
                    ...(paddingLeft ? { paddingLeft } : {}),
                    ...(ancestorMeta.hierarchy && ancestor.level % 2 === 0 ? { fontWeight: 'bold' } : {}),
                },
            };
        }

        // Если строка замещает родителя (subtotals = false), вставляем
        // ячейку родителя (с кнопками иерархии) в колонку его уровня,
        // а child-поля родителя — после его уровневой зоны.
        const parentCellData = parentKey ? this.pluginPivot.pluginPivotData.state.index.data[parentKey] : undefined;
        const parentMeta = parentCellData?.meta;

        if (parentMeta) {
            const parentDim = parentMeta.index;
            const parentLevel = parentMeta.level;
            const parentOffset = this._computeRepeatOffset(parentDim, maxRowLevels, rows);

            // Ячейка родителя — через buildMainCell (buildMainCell сам решит,
            // добавлять ли кнопки на основе parentMeta.hierarchy / .open)
            const parentData = parentCellData!.data ?? parentMeta.dimension;
            cells[parentOffset + parentLevel] = this._buildIndexCell({
                cellData: parentData,
                meta: {
                    open: parentMeta.open,
                    hierarchy: parentMeta.hierarchy,
                    level: parentMeta.level,
                    handleLoad: parentMeta.handleLoad,
                    handleRemove: parentMeta.handleRemove,
                },
                chunkStates: this._collectChunkStates(parentMeta),
                pluginsConfig: {
                    [PLUGIN_PIVOT_KEY]: {
                        index: parentMeta,
                    },
                },
            });

            // Child-поля родителя — после его уровневой зоны
            const maxLevelForParentDim = maxRowLevels[parentDim] ?? 0;
            const parentChildCells = Object.values(parentMeta.child).map((child) => ({
                components: [],
                data: child.value,
                styles: {
                    fontWeight: (parentLevel % 2 === 0 ? 'bold' : undefined) as 'bold' | undefined,
                },
            }));
            parentChildCells.forEach((childCell, i) => {
                cells[parentOffset + maxLevelForParentDim + 1 + i] = childCell;
            });

            // Ячейка текущего элемента в его колонке
            cells[currentOffset + currentLevel] = this._buildIndexCell();
        } else {
            // Основная ячейка текущего элемента в колонке его уровня
            cells[currentOffset + currentLevel] = this._buildIndexCell();
        }

        // Child-поля текущего элемента — после его уровневой зоны
        const maxLevelForCurrentDim = maxRowLevels[currentDim] ?? 0;
        const childCells = this.getChildCells();
        childCells.forEach((childCell, i) => {
            cells[currentOffset + maxLevelForCurrentDim + 1 + i] = childCell;
        });

        return cells;
    };

    // ─── основной метод ───────────────────────────────────────────────────────

    /**
     * Получить строку индекса.
     * @param parentKey — ключ родительской index-ячейки, если строка замещает
     *   пропущенного родителя (subtotals = false).
     */
    get = (parentKey?: string): ICellWithStyles[] => {
        if (this.pluginPivot.state.args.repeatHeaders) {
            return this._getRepeatHeaders(parentKey);
        }

        const allColumns = this._computePrevColumns(this.pluginPivot.pluginPivotChunks.state.chunks.root?.params?.rows || []);
        const emptyPrevColumns = this._computePrevColumns(
            this.pluginPivot.pluginPivotChunks.state.chunks.root?.params?.rows || [],
            this.data.meta.index,
        );
        const countUsedColumns = emptyPrevColumns + Object.keys(this.data.meta.child || {}).length + 1;

        return [
            // пустые поля вложенности, с учетом вложенности колонок
            ...this.getEmptyCells(emptyPrevColumns),
            // Значение поля
            this._buildIndexCell({
                styles: {
                    paddingLeft: this.data.meta.level * 20,
                },
            }),
            // вложенные значения
            ...this.getChildCells(),
            ...this.getEmptyCells(allColumns - countUsedColumns),
        ];
    };
}
