import StateManager from 'lite-react-statemanager';

import { Cell } from '../../../AdapterSpreadSheet/models';
import { ColumnIndex, ICellPluginsConfig, ICellStyles, ICellWithStyles, RowIndex } from '../../../AdapterSpreadSheet/types';
import { PLUGIN_CELL_FORMATTING_KEY } from '../../PluginCellFormatting/constants';
import { CellFormattingType, PluginCellFormattingConfig } from '../../PluginCellFormatting/types';
import { PluginPivotArg } from '../../PluginPivot/types';
import { MAX_REPORT_ROW } from '../constants';
import { SettingIcon } from '../icons';
import { PluginReports } from '../PluginReports';
import { isColumnMeasure, Measure, PluginReportsArgs, PluginReportsResponseData, PluginReportsTypeEnum } from '../types';

export type RenderControllerState = {
    currentState: (string | number)[][];
    columnLabelToColumnName: Record<string, string>;
};

/**
 * Класс контроля рендера таблицы
 */
export class RenderController {
    pluginPivot: PluginReports;

    columnsLable: object;

    state: RenderControllerState;

    defaultMeasureFormat: CellFormattingType;

    constructor(pluginPivot: PluginReports, defaultMeasureFormat: CellFormattingType = CellFormattingType.default) {
        this.pluginPivot = pluginPivot;
        this.defaultMeasureFormat = defaultMeasureFormat;

        this.columnsLable = {};
        this.state = {
            currentState: [],
            columnLabelToColumnName: {},
        };
    }

    /**
     * Реализация рендера через снимки
     * - рендерит только измененные ячейки (ReactComponent никогда не будет равен самому себе)
     */
    async removeData() {
        const cells = new Map();
        for (let i: number = 0; i < 300; i++) {
            const row = new Map();
            for (let j: number = 0; j < 300; j++) {
                row.set(j, {
                    components: [],
                    data: null,
                    config: { readonly: true },
                });
            }
            cells.set(i, row);
        }
        this.pluginPivot.tableAdapter.setCells(cells);
    }

    funcToDescription(func: string): string {
        const transcript: Record<string, string> = {
            SUM: 'Сумма',
            COUNT: 'Количество',
            MAX: 'Максимум',
            MIN: 'Минимум',
            AVG: 'Среднее',
            DISTINCT_COUNT: 'Количество уникальных',
            FIRST_VALUE: 'Первый дочерний',
            LAST_VALUE: 'Последний дочерний',
            ACCOUNT: 'Показатели',
        };
        return transcript[func] ?? func;
    }

    newRecord(
        container: Map<RowIndex, Map<ColumnIndex, ICellWithStyles>>,
        rowIndex: number,
        columnIndex: number,
        data: string | number,
        styles?: ICellStyles,
        options?: {
            config?: Object;
            pluginsConfig?: ICellPluginsConfig;
        },
    ) {
        if (!container.has(rowIndex)) {
            container.set(rowIndex, new Map<ColumnIndex, ICellWithStyles>());
        }
        container.get(rowIndex)!.set(columnIndex, {
            components: [],
            data,
            config: options?.config ?? { readonly: true },
            pluginsConfig: options?.pluginsConfig ?? {},
            styles,
        });
    }

    openMenu() {
        StateManager.setState({ MenuIcon: true });
    }

    generateAttributeName(dimension: string, attribute: string) {
        return `${dimension}/${attribute}`;
    }

    generateMeasureWithAggrFnName(measure: string, fn: string) {
        return `${measure} (${fn})`;
    }

    setRootBurger(container: Map<RowIndex, Map<ColumnIndex, ICellWithStyles>>) {
        if (!container.has(0)) {
            container.set(0, new Map<ColumnIndex, ICellWithStyles>());
        }
        const row = container.get(0)!;
        row.set(0, {
            components: [
                {
                    positionRelativeToText: 'before',
                    type: 'button',
                    icon: SettingIcon,
                    color: 'primary',
                    disabled: false,
                    loading: false,
                    onClick: this.openMenu,
                },
            ],
            data: null,
            styles: { horizontalAlign: 'center', verticalAlign: 'center' },
        });
    }

    getFieldLabel(key: string): string {
        return this.pluginPivot?.state?.pivotParams[key];
    }

    /**
     * Группирует фильтры по полю и объединяет несколько значений в одну строку.
     * Возвращает массив, где каждый элемент - [название поля, значения].
     * Если для поля несколько условий, значения объединяются через запятую.
     */
    recursiveGetFilters(where: Record<string, string | Record<string, any> | Array<Object>>): (string | number)[][] {
        const filterMap = new Map<string, string[]>();

        const processFilter = (node: Record<string, string | Record<string, any> | Array<Object>>, logicType?: string) => {
            for (const key of Object.keys(node)) {
                if (key === '__parent__') continue;

                if (['$and', '$or'].includes(key)) {
                    const conditions = node[key] as Array<Object>;
                    conditions.forEach((condition) =>
                        processFilter(condition as Record<string, string | Record<string, any> | Array<Object>>, key),
                    );
                    continue;
                }

                const label = this.getFieldLabel(key);
                if (!label) continue;

                if (!filterMap.has(label)) {
                    filterMap.set(label, []);
                }

                const values = filterMap.get(label)!;

                if (typeof node[key] === 'number' || typeof node[key] === 'string') {
                    const computedValue =
                        this.pluginPivot.getFilterUserValue(key, node[key] as string | number) ||
                        (node[key] as string | number);
                    values.push(String(computedValue));
                } else if (typeof node[key] === 'object' && node[key] !== null) {
                    const actionsPrefSuf: Record<string, { pref?: string; suf?: string }> = {
                        $iLike: { pref: '', suf: '' },
                        $notILike: { pref: 'не ', suf: '' },
                        $eq: { pref: '= ', suf: '' },
                        $ne: { pref: '!= ', suf: '' },
                        $gt: { pref: '> ', suf: '' },
                        $lt: { pref: '< ', suf: '' },
                        $gte: { pref: '>= ', suf: '' },
                        $lte: { pref: '<= ', suf: '' },
                    };

                    const obj = node[key] as Record<string, any>;
                    const whereKeys = Object.keys(obj);

                    if (whereKeys.includes('$gte') && whereKeys.includes('$lte')) {
                        const formatted = `${obj.$gte} / ${obj.$lte}`;
                        values.push(formatted);
                    } else {
                        for (const action of Object.keys(obj)) {
                            if (
                                actionsPrefSuf[action as keyof typeof actionsPrefSuf] !== undefined &&
                                obj[action] !== undefined
                            ) {
                                const computedValue = this.pluginPivot.getFilterUserValue(key, obj[action]) || obj[action];
                                const formatted = `${
                                    actionsPrefSuf[action as keyof typeof actionsPrefSuf]?.pref || ''
                                }${computedValue}${actionsPrefSuf[action as keyof typeof actionsPrefSuf]?.suf || ''}`;
                                values.push(formatted);
                            }
                        }
                    }
                }
            }
        };

        processFilter(where);

        const result: (string | number)[][] = [];
        filterMap.forEach((values, label) => {
            const formattedValues = values.filter((v) => v.trim() !== '');
            const displayValue = formattedValues.length > 1 ? '(несколько элементов)' : formattedValues[0] ?? '';
            result.push([label, displayValue]);
        });

        return result;
    }

    renderTable = async (data: Required<PluginReportsResponseData>, _args: PluginReportsArgs) => {
        // Сохраняем текущие метаданные (размеры колонок/строк)
        // Это защищает от потери размеров при повторном применении схемы
        const savedColumnsMeta = this.pluginPivot.tableAdapter.getColumnsMetadata();
        const savedRowsMeta = this.pluginPivot.tableAdapter.getRowsMetadata();

        const cells = new Map<RowIndex, Map<ColumnIndex, ICellWithStyles>>();

        this.setRootBurger(cells);

        if (data.table) {
            // Формирование шапки
            let rowStart = 1;

            this.newRecord(cells, rowStart, 0, 'Всего строк:');
            this.newRecord(
                cells,
                rowStart,
                1,
                `${data.table.data.length} из ${Math.max(data.table.data.length, data.totalRows)}`,
            );

            rowStart += 2;

            const schemaInfo = this.pluginPivot?.state.schemaInfo;
            const schemaName = schemaInfo.isChanged ? `*${schemaInfo.name}` : schemaInfo.name ?? '';

            this.newRecord(cells, rowStart, 0, 'Название схемы: ');
            this.newRecord(cells, rowStart, 1, schemaName);

            rowStart += 2;

            const filters = this.recursiveGetFilters(
                this.pluginPivot.state.data?.params?.where ||
                    ({} as Record<string, string | Record<string, any> | Array<Object>>),
            );
            // Рендерим фильтры: каждая строка содержит [название поля, значение]
            filters.forEach((filterRow, rowIndex) => {
                const [label, value] = filterRow;
                // Название фильтра - колонка 0
                this.newRecord(cells, rowStart + rowIndex, 0, label);
                // Значение фильтра - колонка 1
                this.newRecord(cells, rowStart + rowIndex, 1, value, {
                    horizontalAlign: 'end',
                });
            });

            rowStart += filters.length + 1;

            const description = (i: PluginPivotArg) => i.description || i.label || i.name;

            const columnsRef = Object.fromEntries([
                ...data.params.columns.map((c) => [c.name, c.description]),
                ...data.params.layers.flatMap((l) =>
                    data.params.values.flatMap((v) =>
                        v.child.map((c) => [
                            `${v.name}:->:${c.sqlName}:->:${l.name}`,
                            `${description(v)} (${description(l)}) / ${description(c)}`,
                        ]),
                    ),
                ),
            ]);

            data.table.columns.forEach((c, i) => {
                const styles: ICellStyles = {
                    backgroundColor: 'var(--primary-bg-color)',
                    horizontalAlign: 'start',
                };

                this.newRecord(cells, rowStart, i, columnsRef[c] ?? c, styles);
            });

            rowStart++;

            // Формирование данных
            const columnsAmount = data.params.columns.length;
            data.table.data.forEach((row, rowIndex) => {
                let resultColumnIndex = 0;

                row.forEach((cell, columnIndex) => {
                    // Обработка значений колонок
                    if (columnIndex < columnsAmount) {
                        const columnName = data.table.columns[columnIndex] as string;
                        const paramsColumn = data.params.columns.find((column) => column.name === columnName)!;

                        const dimensionValue = data.refs?.[columnName as string]?.[cell] ?? cell;

                        this.newRecord(cells, rowStart + rowIndex, resultColumnIndex, dimensionValue, undefined, {
                            config: { readonly: true },
                        });

                        resultColumnIndex++;

                        if (paramsColumn.child?.length) {
                            const attributes = data.refFields[columnName]?.[cell];

                            paramsColumn.child.forEach((child) => {
                                this.newRecord(cells, rowStart + rowIndex, resultColumnIndex, attributes?.[child.name] ?? '');

                                resultColumnIndex++;
                            });
                        }
                    }
                    // Обработка значений мер
                    else {
                        // @ts-ignore
                        const measure = data.table.columns[columnIndex] as Measure;
                        const format =
                            measure.func === 'COUNT'
                                ? PluginReportsTypeEnum.NUMBER
                                : data.treeObject?.Measures?.[measure.field]?.format ?? this.defaultMeasureFormat;

                        this.newRecord(
                            cells,
                            rowStart + rowIndex,
                            resultColumnIndex,
                            cell,
                            {
                                horizontalAlign: 'end',
                            },
                            {
                                config: { readonly: true },
                                pluginsConfig: {
                                    [PLUGIN_CELL_FORMATTING_KEY]: {
                                        format,
                                    } as PluginCellFormattingConfig,
                                },
                            },
                        );
                        resultColumnIndex++;
                    }
                });
            });

            this.pluginPivot.tableAdapter.setRowsCount(MAX_REPORT_ROW + rowStart + 50);

            // Размеры области не должны быть < 1 при пустых данных
            this.pluginPivot.pluginRange.width = Math.max(1, data.table.columns.length);
            this.pluginPivot.pluginRange.height = Math.max(1, rowStart + data.table.data.length);
        } else {
            this.pluginPivot.tableAdapter.setRowsCount(300); // TODO - Что за дичь? Почему если мне нужно вставить мало строк она крашится
        }
        this.pluginPivot.tableAdapter.setCellsWithStyle(cells);

        // Восстанавливаем сохранённые размеры колонок и строк ПОСЛЕ рендера
        // Это гарантирует, что размеры из snapshot применятся корректно даже при повторном применении схемы
        if (Object.keys(savedColumnsMeta).length > 0 || Object.keys(savedRowsMeta).length > 0) {
            this.pluginPivot.tableAdapter.updateTableParams({
                rowsCount: this.pluginPivot.tableAdapter.getRowsCount(),
                columnsCount: this.pluginPivot.tableAdapter.getColumnsCount(),
                rowsMeta: savedRowsMeta,
                columnsMeta: savedColumnsMeta,
            });
        }
    };

    renderPage = (data: Required<PluginReportsResponseData>, args: PluginReportsArgs) => {
        this.pluginPivot.tableAdapter.removeData(
            new Cell({ rowIndex: this.pluginPivot.pluginRange.y, columnIndex: this.pluginPivot.pluginRange.x }),
            new Cell({
                rowIndex: this.pluginPivot.pluginRange.y + this.pluginPivot.pluginRange.height - 1,
                columnIndex: this.pluginPivot.pluginRange.x + this.pluginPivot.pluginRange.width - 1,
            }),
        );
        this.renderTable(data, args);
    };
}
