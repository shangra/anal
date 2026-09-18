import { ICell, ICellWithStyles } from '../../../AdapterSpreadSheet/types';
import { SortAscIcon, SortDescIcon } from '../../NewPluginPivot/services/PivotTableService/icons';
import { PLUGIN_PIVOT_KEY } from '../constants';
import { PluginPivot } from '../PluginPivot';
import { PluginPivotDataSettingsParams } from '../types';
import { buildMainCell, type BuildMainCellMeta, type ChunkStates } from '../utils/cellUtils';
import { getSortInfo } from '../utils/sortUtils';
import { PluginPivotDataColumnCell } from './PluginPivotData';

export type THierarchyCb = {
    handleLoad?: (type: 'hierarchy' | 'open', params: PluginPivotDataSettingsParams) => (event?: any) => void;
    handleRemove?: (type: 'hierarchy' | 'open') => (event?: any) => void;
};

export class PluginPivotColumn {
    pluginPivot;

    data;

    constructor(pluginPivot: PluginPivot, data: PluginPivotDataColumnCell) {
        this.pluginPivot = pluginPivot;
        this.data = data;

        if (this.data.meta.index === -1) {
            console.error('buildColumns: level is undefined');
        }
    }

    getLayerDescription = (): string => this.data.meta.layer?.description ?? this.data.meta.layer.name;

    /**
     * Получить информацию о сортировке для текущего значения (меры)
     */
    private getValueSortInfo = (
        value: string,
        orderName: keyof NonNullable<PluginPivotDataSettingsParams['order']> = 'values',
    ): { isSorted: boolean; order: 'ASC' | 'DESC' | null } => {
        const { params } = this.pluginPivot.pluginPivotChunks.state.chunks.root ?? {};

        return getSortInfo([value], orderName, params?.order);
    };

    // ─── хелперы для chunkStates ─────────────────────────────────────────────

    /**
     * Собирает ChunkStates для meta колонки (с isLoadingIndexChunk).
     */
    private _collectChunkStates = (): ChunkStates => {
        const isLoadingHierarchy = this.pluginPivot.pluginPivotChunks.isChunkLoading(this.data.meta.chunkUuid.hierarchy);
        const isLoadingOpen = this.pluginPivot.pluginPivotChunks.isChunkLoading(this.data.meta.chunkUuid.open);
        const isOppositeAxisLoading = this.pluginPivot.pluginPivotChunks.hasLoadingIndexChunk();

        return {
            isLoadingHierarchy,
            isChunkExpandedHierarchy: this.pluginPivot.pluginPivotChunks.isChunkExpanded(this.data.meta.chunkUuid.hierarchy),
            isLoadingOpen,
            isChunkExpandedOpen: this.pluginPivot.pluginPivotChunks.isChunkExpanded(this.data.meta.chunkUuid.open),
            isChunkEmptyHierarchy: this.pluginPivot.pluginPivotChunks.isChunkEmpty(this.data.meta.chunkUuid.hierarchy),
            isChunkEmptyOpen: this.pluginPivot.pluginPivotChunks.isChunkEmpty(this.data.meta.chunkUuid.open),
            isDisabledHierarchy: isOppositeAxisLoading,
            isDisabledOpen: isOppositeAxisLoading,
        };
    };

    // ─── единая фабрика ячеек колонки ─────────────────────────────────────────

    /**
     * Единая фабрика ячейки колонки. Всегда вызывает buildMainCell,
     * который сам решает, добавлять ли кнопки hierarchy/open.
     * Если meta.hierarchy/open — false, кнопок не будет.
     */
    private _buildColumnCell = (cellData: any, metaOverride?: Partial<BuildMainCellMeta>): ICellWithStyles =>
        buildMainCell({
            cellData,
            chunkStates: this._collectChunkStates(),
            meta: {
                open: metaOverride?.open ?? this.data.meta.open,
                hierarchy: metaOverride?.hierarchy ?? this.data.meta.hierarchy,
                level: metaOverride?.level ?? this.data.meta.level,
                handleLoad: metaOverride?.handleLoad ?? this.data.meta.handleLoad,
                handleRemove: metaOverride?.handleRemove ?? this.data.meta.handleRemove,
            },
            pluginsConfig: {
                [PLUGIN_PIVOT_KEY]: {
                    columns: this.data.meta,
                },
            },
        });

    /**
     * Пустая ячейка
     * @param {number} length
     */
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

    /** @deprecated используйте _buildColumnCell */
    getComputedMainCell = (): ICellWithStyles => this._buildColumnCell(this.data.data[2]);

    /**
     * Ячейка данных колонки (без кнопок hierarchy/open).
     * @deprecated используйте _buildColumnCell(data, { hierarchy: false, open: false })
     */
    getComputedCell = (index: number): ICellWithStyles =>
        this._buildColumnCell(this.data.data[index] ?? '', { hierarchy: false, open: false });

    /**
     * Ячейка меры
     */
    getMeasureCell = (): ICellWithStyles => {
        const cellName = this.data.meta.value?.description ?? this.data.meta.value?.name;
        const sortInfo = this.getValueSortInfo(cellName, 'values');

        const cell: ICellWithStyles = {
            components: [],
            data: this.data.meta.value?.description ?? this.data.meta.value?.name ?? '',
            pluginsConfig: {
                [PLUGIN_PIVOT_KEY]: {
                    columns: this.data.meta,
                },
            },
        };

        if (sortInfo.isSorted) {
            const sortIcon = sortInfo.order === 'DESC' ? SortDescIcon : SortAscIcon;
            cell.components?.push({
                positionRelativeToText: 'after',
                type: 'button',
                icon: sortIcon,
                disabled: true,
                loading: false,
                onClick: () => {},
            });
        }
        return cell;
    };

    /**
     * Ячейка слоя
     */
    getLayerCell = (): ICellWithStyles => ({
        components: [],
        data: this.data.meta.layer.description ?? this.data.meta.layer.name ?? '',
    });

    /**
     * Генерация шапки подполей
     */
    getChildCells = (): ICellWithStyles[] =>
        Object.values(this.data.meta.child).map((child) => ({
            components: [],
            data: child.value,
        }));

    /**
     * Получить массив строк колонки
     * @param data данные с колонки
     */
    get = (): ICellWithStyles[] => {
        const { params } = this.pluginPivot.pluginPivotChunks.state.chunks.root ?? {};

        /** Массив уровней раскрытия иерархий всех используемых измерений */
        const maxLevels = this.pluginPivot.pluginPivotData._calcMaxLevels('columns');
        /** Сумма уровней раскрытия иерархий предыдущих используемых измерений */
        const prevTotalLevel = maxLevels.slice(0, this.data.meta.index).reduce((acc, cur) => acc + cur, 0);
        /** Сумма уровней раскрытия иерархий следующих используемых измерений */
        const nextTotalLevel = maxLevels.slice(this.data.meta.index + 1).reduce((acc, cur) => acc + cur, 0);

        /** Уроверь раскрытия иерархии текущего измерения */
        const currentTotalLevel = maxLevels[this.data.meta.index];

        /** Массив количеств подполей всех используемых измерений */
        const childCount = params?.columns?.map((column) => column.child?.length ?? 0) ?? [];
        /** Сумма количеств подполей всех предыдущих используемых измерений */
        const prevChildCount = childCount.slice(0, this.data.meta.index).reduce((acc, cur) => acc + cur, 0);
        /** Сумма количеств подполей всех следущих используемых измерений */
        const nextChildCount = childCount.slice(this.data.meta.index + 1).reduce((acc, cur) => acc + cur, 0);

        /** Количество измерений после текущего */
        const nextDimensionsCount = (params?.columns?.length ?? 0) - (this.data.meta.index + 1);

        /** Количество пустых ячеек сверху */
        const emptyLength = prevTotalLevel + prevChildCount + this.data.meta.index + this.data.meta.level;

        /** Количество статичных измерений (мера, слой) */
        const staticDimLength = 2;

        let parent = this.getEmptyCells(emptyLength);
        const { parentHeader, columns } = this.pluginPivot.pluginPivotChunks.state.chunks[this.data.meta.chunkKey] ?? {};
        if (parentHeader?.columns) {
            const _parentColumnData = this.pluginPivot.pluginPivotData.state.columns.data[parentHeader.columns.key];
            if (!_parentColumnData.meta.subtotals) {
                // Вычисляем индекс текущей колонки внутри чанка
                const index = columns.findIndex((c) => c === this.data.meta.key);
                if (index === 0) {
                    const parentColumn = new PluginPivotColumn(this.pluginPivot, _parentColumnData);
                    const parentColumnCells = parentColumn.get();
                    parent = parentColumnCells.slice(staticDimLength, staticDimLength + emptyLength);
                }
            }
        }

        return [
            this.getMeasureCell(),
            this.getLayerCell(),
            ...parent,
            this.data.meta.hierarchy || this.data.meta.open ? this.getComputedMainCell() : this.getComputedCell(2),
            ...this.getEmptyCells(currentTotalLevel - this.data.meta.level),
            ...this.getChildCells(),
            ...this.getEmptyCells(nextTotalLevel + nextChildCount + nextDimensionsCount),
            this.getComputedCell(3),
        ];
    };
}
