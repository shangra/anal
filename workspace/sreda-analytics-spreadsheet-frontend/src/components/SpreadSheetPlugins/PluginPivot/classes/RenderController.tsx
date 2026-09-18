import { Cell } from '../../../AdapterSpreadSheet/models';
import { ColumnIndex, ICell, ICellPluginsConfig, ICellWithStyles, RowIndex } from '../../../AdapterSpreadSheet/types';
import { debounce, DebouncedFunction } from '../../../AdapterSpreadSheet/utils';
import { PLUGIN_CELL_FORMATTING_KEY } from '../../PluginCellFormatting';
import { PIVOT_HEADER_ROWS_COUNT, PLUGIN_PIVOT_KEY } from '../constants';
import { PluginPivot } from '../PluginPivot';
import { applyNumericScale } from '../utils';

export type RenderControllerState = {
    currentState: ICell[][];
};

/**
 * Класс контроля рендера таблицы
 */
export class RenderController {
    pluginPivot: PluginPivot;

    // Debounced render method
    private debouncedRenderTable: DebouncedFunction<typeof this.renderTableImpl>;

    // Track if we're in the middle of a render
    private isRendering: boolean = false;

    constructor(pluginPivot: PluginPivot) {
        this.pluginPivot = pluginPivot;

        // Initialize debounced render with 100ms delay
        this.debouncedRenderTable = debounce(this.renderTableImpl.bind(this), 100);
    }

    /**
     * Метод получения стилей заблокированной ячейки
     * @param styles Базовые стили
     * @returns Подготовленный стили
     * @private
     */
    private static getDisabledStyles(styles: any): any {
        return {
            ...styles,
            color: 'var(--disable-text-color)',
            backgroundColor: 'var(--disable-bg-color)',
        };
    }

    /**
     * Метод получения статуса загрузки
     * @returns Статус загрузки
     * @private
     */
    private static getLoadingStatus(cell?: ICellWithStyles): boolean {
        return cell?.config?.isLoading || cell?.components?.some((component) => component.loading) || false;
    }

    /**
     * Public render method - debounced version
     */
    renderTable = async (resetPluginSize: boolean = false, resetAdapterSize = false) =>
        this.debouncedRenderTable(resetPluginSize, resetAdapterSize);

    /**
     * Force immediate render (bypass debounce)
     */
    forceRenderTable = async (resetPluginSize: boolean = false, resetAdapterSize = false) => {
        this.debouncedRenderTable.cancel();
        return this.renderTableImpl(resetPluginSize, resetAdapterSize);
    };

    /**
     * Flush any pending renders
     */
    flushRenderTable = async (): Promise<void> => {
        await this.debouncedRenderTable.flush();
    };

    /**
     * Cancel any pending renders
     */
    cancelPendingRenders = (): void => {
        this.debouncedRenderTable.cancel();
    };

    /**
     * Возвращает массив непрерывных отрезков [start, end) колонок для автоподбора,
     * исключая колонки с пользовательскими размерами (из columnsOverrides).
     */
    private getAutoFitColumnRanges(dataStartCol: number, dataEndCol: number): Array<[number, number]> {
        const columnsMeta = this.pluginPivot.tableAdapter.getColumnsMetadata();
        const manualColumns = new Set<number>(Object.keys(columnsMeta).map(Number));

        const ranges: Array<[number, number]> = [];
        let rangeStart: number | null = null;

        for (let i = dataStartCol; i < dataEndCol; i++) {
            if (!manualColumns.has(i)) {
                if (rangeStart === null) rangeStart = i;
            } else if (rangeStart !== null) {
                ranges.push([rangeStart, i]);
                rangeStart = null;
            }
        }
        if (rangeStart !== null) ranges.push([rangeStart, dataEndCol]);

        return ranges;
    }

    private _renderTableImpl = async (resetPluginSize: boolean = false, resetAdapterSize = false) => {
        const { pluginRange, prevPluginRange } = this.pluginPivot;

        const removeRange = resetPluginSize && prevPluginRange ? prevPluginRange : { ...pluginRange };

        const data = await this.pluginPivot.createPivotTable.renderTable();

        const countRow = data.length;
        const countColumn =
            data.reduce((acc, row, index) => {
                if (index !== 0 && row.length > acc) {
                    acc = row.length;
                }

                return acc;
            }, 1) ?? 1;

        const removeHeight = Math.max(removeRange.height, countRow);
        const removeWidth = Math.max(removeRange.width, countColumn);

        const removeStartCell = new Cell({ rowIndex: pluginRange.y + PIVOT_HEADER_ROWS_COUNT, columnIndex: pluginRange.x });
        const removeEndCell = new Cell({
            rowIndex: pluginRange.y + PIVOT_HEADER_ROWS_COUNT + removeHeight - 1,
            columnIndex: pluginRange.x + removeWidth - 1,
        });

        // TODO В адапторе должен быть API добавлять range в указанную ячейку
        if (countRow !== pluginRange.height) {
            if (countRow > pluginRange.height) {
                // Количество строк больше выделенных строк для пивота
                await this.pluginPivot.tableAdapter.insertRow(pluginRange.y, 'after', countRow - pluginRange.height);
            }

            if (countRow < pluginRange.height) {
                // Количество строк меньше выделенных строк для пивота
                await this.pluginPivot.tableAdapter.deleteRow(pluginRange.y, 'after', pluginRange.height - countRow);
            }
            this.pluginPivot.pluginRange.height = countRow;
        }

        // TODO Нужно переписать на вставку через Range со сдвигом вправо колонок
        if (countColumn !== pluginRange.width) {
            if (countColumn > pluginRange.width) {
                // Количество колонок больше выделенных строк для пивота
                await this.pluginPivot.tableAdapter.insertColumn(pluginRange.x, 'after', countColumn - pluginRange.width);
            }

            if (countColumn < pluginRange.width) {
                // Количество колонок меньше выделенных строк для пивота
                await this.pluginPivot.tableAdapter.deleteColumn(pluginRange.x, 'before', pluginRange.width - countColumn);
            }

            this.pluginPivot.pluginRange.width = countColumn;
        }

        this.pluginPivot.tableAdapter.removeData(removeStartCell, removeEndCell);
        // Очищаем configStore — pivot-owned defaults пересчитаются ниже.
        // clearPivotPluginConfig больше не нужен: данные не идут в PluginConfigManager.
        this.pluginPivot.configStore.clearAll();

        if (resetPluginSize) {
            this.pluginPivot.prevPluginRange = null;
        }

        const cells = new Map<RowIndex, Map<ColumnIndex, ICellWithStyles>>();

        // Устанавливаем границы пивот-области в configStore перед заполнением.
        if (countRow > 0 && countColumn > 0) {
            this.pluginPivot.configStore.setArea({
                r0: pluginRange.y + PIVOT_HEADER_ROWS_COUNT,
                r1: pluginRange.y + PIVOT_HEADER_ROWS_COUNT + countRow - 1,
                c0: pluginRange.x,
                c1: pluginRange.x + countColumn - 1,
            });
        }

        for (let rowIndex = 0; rowIndex < countRow; rowIndex++) {
            for (let columnIndex = 0; columnIndex < countColumn; columnIndex++) {
                const cell = data?.[rowIndex]?.[columnIndex];
                if (!cell) continue;

                const pluginRowIndex = rowIndex + pluginRange.y + PIVOT_HEADER_ROWS_COUNT;
                const pluginColumnIndex = columnIndex + pluginRange.x;

                let cellData = cell.data ?? '';

                // TODO: Хреновый способ, но можно так понять что это ячейка данных
                if (cell.pluginsConfig?.[PLUGIN_PIVOT_KEY]?.scalable && !Number.isNaN(Number(cellData))) {
                    // Читаем format из pluginsConfig ячейки (поставлен CreatePivotTable).
                    const format = cell.pluginsConfig?.[PLUGIN_CELL_FORMATTING_KEY]?.format;
                    if (format) {
                        cellData = applyNumericScale(
                            Number(cellData),
                            format,
                            this.pluginPivot.state.args.measureUnit ?? 'millions',
                        );
                    }
                }

                // Перекладываем PLUGIN_CELL_FORMATTING_KEY и PLUGIN_PIVOT_KEY
                // из per-cell pluginsConfig в configStore.
                // В PluginConfigManager они больше не попадают → ноль StyledRange от пивота.
                const sourceCfg = cell.pluginsConfig ?? {};
                const formatEntry = sourceCfg[PLUGIN_CELL_FORMATTING_KEY];
                const pivotEntry = sourceCfg[PLUGIN_PIVOT_KEY];

                let format = formatEntry?.format;
                if (!formatEntry && cellData !== '') {
                    format = this.pluginPivot.createPivotTable.defaultDimensionFormat;
                }

                if (format != null || pivotEntry) {
                    this.pluginPivot.configStore.setCellEntry(pluginRowIndex, pluginColumnIndex, {
                        format,
                        pivot: pivotEntry,
                    });
                }

                // pluginsConfig для транзакции не несёт PLUGIN_CELL_FORMATTING_KEY / PLUGIN_PIVOT_KEY —
                // они теперь живут в configStore и отдаются через provideCellPluginConfig.
                const pluginsConfig: ICellPluginsConfig = {};
                for (const k of Object.keys(sourceCfg) as (keyof ICellPluginsConfig)[]) {
                    if (k !== PLUGIN_CELL_FORMATTING_KEY && k !== PLUGIN_PIVOT_KEY) {
                        (pluginsConfig as any)[k] = sourceCfg[k];
                    }
                }

                if (!cells.has(pluginRowIndex)) {
                    cells.set(pluginRowIndex, new Map<ColumnIndex, ICellWithStyles>());
                }
                cells.get(pluginRowIndex)!.set(pluginColumnIndex, {
                    ...cell,
                    data: cellData,
                    config: { ...(cell.config ?? {}), readonly: true },
                    pluginsConfig: Object.keys(pluginsConfig).length > 0 ? pluginsConfig : undefined,
                });
            }
        }
        this.pluginPivot.tableAdapter.setCellsWithStyle(cells);

        this.pluginPivot.pluginRange.width = countColumn;
        this.pluginPivot.pluginRange.height = countRow;

        // Автоматическая подгонка ширины колонок по содержимому.
        // Применяется только к колонкам с данными (числовые значения и суммы).
        // Колонки с пользовательскими размерами (из columnsOverrides) исключаются из автоподбора.
        requestAnimationFrame(() => {
            const { pluginRange } = this.pluginPivot;
            const indexColumnsCount = this.pluginPivot.createPivotTable.index[0]?.length ?? 0;
            const dataStartCol = pluginRange.x + indexColumnsCount;
            const dataEndCol = pluginRange.x + pluginRange.width;
            if (dataStartCol < dataEndCol) {
                const ranges = this.getAutoFitColumnRanges(dataStartCol, dataEndCol);
                for (const [start, end] of ranges) {
                    this.pluginPivot.tableAdapter.autoFitColumns(start, end);
                }
            }
        });
    };

    /**
     * The actual render implementation
     */
    private renderTableImpl = async (resetPluginSize: boolean = false, resetAdapterSize = false) => {
        if (this.isRendering) {
            // If already rendering, wait for current render to complete
            await this.flushRenderTable();
            return;
        }

        this.isRendering = true;
        try {
            await this._renderTableImpl(resetPluginSize, resetAdapterSize);
        } finally {
            this.isRendering = false;
        }
    };
}
