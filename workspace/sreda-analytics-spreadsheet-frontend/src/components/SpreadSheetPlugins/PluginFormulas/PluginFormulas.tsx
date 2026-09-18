// @ts-ignore
import FormulaParser, { FormulaError } from 'fast-formula-parser';
import { ReactElement } from 'react';
import { FunctionIcon, IconButton, List, NotificationsProvider, Popover } from 'ui-kit';

import { escapeRegExp } from '../../../helpers/regs';
import { Portal } from '../../AdapterSpreadSheet/components/Portal';
import { Cell, Range } from '../../AdapterSpreadSheet/models';
import {
    DataChange,
    Plugin,
    SpreadsheetAction,
    Transaction,
    TransactionBuilder,
    VetoContext,
} from '../../AdapterSpreadSheet/plugin';
import { TransactionLogger } from '../../AdapterSpreadSheet/plugin/transaction/TransactionLogger';
import {
    CellDataType,
    ColumnIndex,
    ExcelSpreadSheetCoordinate,
    ICell,
    IRangeStyles,
    RowIndex,
} from '../../AdapterSpreadSheet/types';
import { generateExcelSpreadSheetCoordinate, parseExcelSpreadSheetCoordinate } from '../../AdapterSpreadSheet/utils';
import { INotifyConfig, NotificationBridge } from '../../NotificationBridge';
import { CELL_EDIT_ACTION, PLUGIN_CELL_EDIT_KEY } from '../PluginCellEdit/constants';
import { PLUGIN_FILL_KEY } from '../PluginFill';
import { PLUGIN_JOINED_CELLS_KEY } from '../PluginJoinedCells/constants';
import { PERSIST_ACTION } from '../PluginPersist';
import definitions from './classes/definitions';
import PluginFormulasTranslator from './classes/PluginFormulasTranslator';
import FormulasList from './components/FormulasList';
import { PLUGIN_FORMULAS_ACTION, PLUGIN_FORMULAS_KEY } from './constants';
import { IFormulaRange, PluginFormulasOptions, PluginFormulasState } from './types';
import { toggleAnchorInFormula } from './utils/cellRef';
import { getBracketsPos, getWordAtCursor } from './utils/formula';
import { FormulaFillStrategy, shiftFormula } from './utils/FormulaFillStrategy';

const EXCEL_CELL_RANGE_REGEXP = /\$?[A-Z]+\$?[0-9]+(:\$?[A-Z]+\$?[0-9]+)?/g;

const RANGE_COLORS = [
    '#4786FF',
    '#FF6B6B',
    '#4ECDC4',
    '#FFE66D',
    '#A8E6CF',
    '#FF8B94',
    '#95E1D3',
    '#F38181',
    '#AA96DA',
    '#FCBAD3',
];

/**
 * PluginFormulas — поддержка формул.
 *
 * Зависимость: читает PluginCellEditState через getPluginState(PLUGIN_CELL_EDIT_KEY).
 * Однонаправленная: PluginFormulas -> PluginCellEdit.
 */
export class PluginFormulas extends Plugin<typeof PLUGIN_FORMULAS_KEY, PluginFormulasState, PluginFormulasOptions> {
    readonly key = PLUGIN_FORMULAS_KEY;

    readonly initialState: PluginFormulasState = {
        isExpression: false,
        expressionRanges: [],
        focusedRangeIndex: null,
        activeFunctionName: null,
        copiedRange: null,
    };

    get formulaInCaretPos() {
        const editPlugin = this.context.getPlugin(PLUGIN_CELL_EDIT_KEY);
        const editState = this._getEditState();
        const currentValue = editPlugin?.getLiveValue() ?? editState?.currentValue ?? '';

        if (!currentValue.startsWith('=')) {
            return null;
        }

        const caretPos = editPlugin?.getCaretPosition() ?? currentValue.length;

        const { word, start, end } = getWordAtCursor(currentValue, caretPos);
        if (!word || (word.length === 1 && /^\d$/.test(currentValue[start + 1]))) {
            return null;
        }

        return { start, end, word };
    }

    get funcBeforeBrackets() {
        const editPlugin = this.context.getPlugin(PLUGIN_CELL_EDIT_KEY);
        const editState = this._getEditState();
        const currentValue = editPlugin?.getLiveValue() ?? editState?.currentValue ?? '';

        const state = this.getState();
        if (!state.isExpression) {
            return null;
        }

        const caretPos = editPlugin?.getCaretPosition() ?? currentValue.length;
        const bracketsPos = getBracketsPos(currentValue, caretPos);
        if (!bracketsPos) {
            return null;
        }

        const func = getWordAtCursor(currentValue, bracketsPos.start - 1);
        if (!func.word) {
            return null;
        }

        return func.word;
    }

    private readonly _log = new TransactionLogger();

    private parser: any;

    private translator: PluginFormulasTranslator;

    /**
     * Ссылка (сохраняется для корректного removeEventListener).
     */
    private _formulaKeyDownHandler: ((event: KeyboardEvent) => void) | null = null;

    /**
     * Набор ключей формул, находящихся в процессе пересчёта в текущей цепочке.
     * Сбрасывается при каждом новом «корневом» вызове (не в рекурсии).
     */
    private _recalcChain = new Set<string>();

    // ─── Индекс зависимостей ──────────────────────────────────────────────────
    // key: "row:col" формульной ячейки -> Set<"row:col"> ячеек-источников
    private _dependencyIndex = new Map<string, Set<string>>();

    // key: "row:col" источника -> Set<"row:col"> формульных ячеек
    private _reverseDependencyIndex = new Map<string, Set<string>>();

    // Защита от рекурсивного пересчёта
    private _isRecalculating = false;

    constructor() {
        super();
        this.translator = new PluginFormulasTranslator('ru');
    }

    private _showNotification: ((content: React.ReactNode, options?: INotifyConfig) => number) | null = null;

    private _registerNotificationCallback = (notify: (content: React.ReactNode, config?: INotifyConfig) => number): void => {
        this._showNotification = notify;
    };

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    override onMount(): void {
        // ── FormulaParser ─────────────────────────────────────────────────────────
        this.parser = new FormulaParser({
            onCell: ({ row, col, sheet }: { row: number; col: number; sheet?: string }) => {
                const { data: v, expression: e } = this._getCellFromSheet(row - 1, col - 1, sheet);
                if (e) {
                    const sf = this.translator.translate(e.slice(1));
                    return `=${sf}`;
                }
                return v !== null && v !== undefined && !Number.isNaN(Number(v)) ? Number(v) : v ?? 0;
            },
            onRange: (ref: { from: { row: number; col: number }; to: { row: number; col: number }; sheet?: string }) => {
                const arr: any[][] = [];
                for (let r = ref.from.row; r <= ref.to.row; r++) {
                    const inner: any[] = [];
                    for (let c = ref.from.col; c <= ref.to.col; c++) {
                        const { data: v, expression: e } = this._getCellFromSheet(r - 1, c - 1, ref.sheet);
                        if (e) {
                            const sf = this.translator.translate(e.slice(1));
                            inner.push(`=${sf}`);
                            continue;
                        }
                        inner.push(v !== null && v !== undefined && !Number.isNaN(Number(v)) ? Number(v) : v ?? 0);
                    }
                    arr.push(inner);
                }
                return arr;
            },
            functions: definitions,
        });

        // ── Регистрация стратегии в PluginFill ────────────────────────────────────
        // Приоритет 100 > дефолтные стратегии (0) — формулы проверяются первыми.
        // Зависимость односторонняя: PluginFormulas -> PluginFill.
        const fillPlugin = this.context.getPlugin(PLUGIN_FILL_KEY);
        fillPlugin?.registerAutoFillStrategy(new FormulaFillStrategy(this._computeFormula.bind(this)), 100);

        // Строим индекс по уже существующим формулам (загрузка данных)
        this._buildDependencyIndex();
    }

    // ─── Проверка циклических ссылок ────────────────────────────────────────────

    /**
     * Проверяет наличие циклической зависимости (прямой или косвенной).
     *
     * Прямая: K8 → K8 (ячейка ссылается на саму себя)
     * Косвенная: K8 → N8 → N13 → K13 → K8 (замкнутый круг через цепочку)
     *
     * Алгоритм:
     * 1. Берём все зависимости новой формулы (ячейки, на которые она ссылается)
     * 2. Для каждой зависимости запускаем DFS по _reverseDependencyIndex
     * 3. Если в процессе обхода достигаем формульную ячейку — цикл найден
     */
    private _hasCircularDependency(formulaCellKey: string, dependencies: string[]): boolean {
        // Посещённые ячейки чтобы избежать зацикливания в DFS
        const visited = new Set<string>();

        // Запускаем DFS от каждой зависимости
        for (const dep of dependencies) {
            if (this._dfsHasCycle(dep, formulaCellKey, visited)) {
                return true;
            }
        }

        return false;
    }

    /**
     * DFS-обход графа зависимостей.
     *
     * @param currentKey  Текущая проверяемая ячейка
     * @param targetKey   Целевая ячейка (формульная), к которой ищем путь
     * @param visited     Множество уже посещённых ячеек
     * @returns true если найден путь от currentKey до targetKey
     */
    private _dfsHasCycle(currentKey: string, targetKey: string, visited: Set<string>): boolean {
        // Уже посетили — пропускаем
        if (visited.has(currentKey)) {
            return false;
        }

        visited.add(currentKey);

        // Достигли целевой ячейки — цикл найден
        if (currentKey === targetKey) {
            return true;
        }

        const deps = this._dependencyIndex.get(currentKey);

        if (!deps || deps.size === 0) {
            return false;
        }

        for (const depKey of deps) {
            if (this._dfsHasCycle(depKey, targetKey, visited)) {
                return true;
            }
        }

        return false;
    }

    // ─── Индекс зависимостей ──────────────────────────────────────────────────

    /**
     * Полная перестройка индекса зависимостей по всем ячейкам с формулами.
     * Вызывается при монтировании и после записи новой формулы.
     */
    private _buildDependencyIndex(): void {
        this._dependencyIndex.clear();
        this._reverseDependencyIndex.clear();

        // this.context.pluginConfigManager.iterateCellOverrides((key, config) => {
        //     const expression = config?.[PLUGIN_FORMULAS_KEY]?.expression;
        //     if (expression) {
        //         this._indexFormula(key, expression);
        //     }
        // });
    }

    /**
     * Добавляет одну формульную ячейку в индекс.
     * Вызывается инкрементально после записи формулы — без полной перестройки.
     */
    private _indexFormula(formulaCellKey: string, expression: string): void {
        // Удаляем старые зависимости этой ячейки
        const oldDeps = this._dependencyIndex.get(formulaCellKey);
        if (oldDeps) {
            for (const depKey of oldDeps) {
                this._reverseDependencyIndex.get(depKey)?.delete(formulaCellKey);
            }
        }

        const ranges = this._parseFormulaRanges(expression);
        const deps = new Set<string>();

        for (const fr of ranges) {
            for (const cell of fr.range) {
                const depKey = cell.key;
                deps.add(depKey);

                if (!this._reverseDependencyIndex.has(depKey)) {
                    this._reverseDependencyIndex.set(depKey, new Set());
                }
                this._reverseDependencyIndex.get(depKey)!.add(formulaCellKey);
            }
        }

        this._dependencyIndex.set(formulaCellKey, deps);
    }

    /**
     * Удаляет ячейку из индекса (при очистке формулы).
     */
    private _unindexFormula(formulaCellKey: string): void {
        const deps = this._dependencyIndex.get(formulaCellKey);
        if (deps) {
            for (const depKey of deps) {
                this._reverseDependencyIndex.get(depKey)?.delete(formulaCellKey);
            }
        }
        this._dependencyIndex.delete(formulaCellKey);
    }

    /**
     * Пересчитывает все формульные ячейки в топологическом порядке.
     * Гарантирует корректные значения при цепочках зависимостей: A=B1, B1=C1.
     * Поддерживает SPILL: если формула возвращает массив, значения записываются
     * в текущую и соседние ячейки.
     */
    private _recalculateAllFormulas(): TransactionBuilder | null {
        if (!this._dependencyIndex.size) return null;

        const sortedKeys = this._topologicalSortFormulas();
        const cellMap = new Map<number, Map<number, ICell>>();

        // Локальный кэш: "row:col" -> вычисленное значение
        const computedCache = new Map<string, CellDataType | CellDataType[] | CellDataType[][]>();

        for (const key of sortedKeys) {
            const [row, col] = key.split(':').map(Number);
            const expression = this.context.pluginConfigManager.getPluginConfig(row, col, PLUGIN_FORMULAS_KEY)?.expression;
            if (!expression) continue;

            const computedValue = this._computeFormula(expression, row, col, computedCache);
            computedCache.set(key, computedValue);

            // Применяем результат (возможен SPILL вправо)
            this._applyComputedValues(cellMap, computedValue, row, col);
        }

        if (!cellMap.size) return null;

        return this.context.transaction().setCells(cellMap);
    }

    /**
     * Находит все формульные ячейки, зависящие от изменённых,
     * пересчитывает их и возвращает TransactionBuilder.
     * Возвращает null если нет зависимых формул.
     */
    private _recalculateAffectedFormulas(changedCells: Map<number, Map<number, any>>): Map<number, Map<number, ICell>> | null {
        const changedKeys = new Set<string>();
        for (const [r, row] of changedCells) {
            for (const [c] of row) {
                changedKeys.add(`${r}:${c}`);
            }
        }
        return this._recalculateAffectedFormulasByKeys(changedKeys);
    }

    private _recalculateAffectedFormulasByKeys(
        changedKeys: Set<string>,
        isChained = false,
    ): Map<number, Map<number, ICell>> | null {
        if (this._isRecalculating && !isChained) return null;

        if (!isChained) {
            // Корневой вызов: инициализируем цепочку
            this._recalcChain = new Set<string>();
        }

        this._isRecalculating = true;

        try {
            const toRecalculate = new Set<string>();
            const queue: string[] = [...changedKeys];

            while (queue.length) {
                const src = queue.shift()!;
                const dependents = this._reverseDependencyIndex.get(src);
                if (!dependents) continue;

                for (const dep of dependents) {
                    if (toRecalculate.has(dep)) continue;

                    // Обнаружен цикл: dep уже в текущей цепочке пересчёта
                    if (this._recalcChain.has(dep)) {
                        this._log.log('warn', {
                            txId: 'formula',
                            event: 'recalc:circular-dependency',
                            timestamp: Date.now(),
                            payload: { circularKey: dep, chain: [...this._recalcChain] },
                        });
                        // Помечаем ячейку как ошибку вместо зависания
                        const [row, col] = dep.split(':').map(Number);
                        const existing = this.context.getCellAt(new Cell({ rowIndex: row, columnIndex: col }));
                        const cellMap = new Map<number, Map<number, ICell>>();
                        if (!cellMap.has(row)) cellMap.set(row, new Map());
                        cellMap.get(row)!.set(col, { ...(existing ?? {}), data: '#ЦИКЛ!' });

                        // Не добавляем в очередь — останавливаем цикл
                        continue;
                    }

                    toRecalculate.add(dep);
                    this._recalcChain.add(dep);
                    queue.push(dep);
                }
            }

            if (!toRecalculate.size) return null;

            const cellMap = new Map<number, Map<number, ICell>>();

            for (const key of toRecalculate) {
                const [row, col] = key.split(':').map(Number);
                const expression = this.context.pluginConfigManager.getPluginConfig(row, col, PLUGIN_FORMULAS_KEY)?.expression;
                if (!expression) continue;

                const computedValue = this._computeFormula(expression, row, col);
                this._applyComputedValues(cellMap, computedValue, row, col);
            }

            if (!cellMap.size) return null;

            return cellMap;
        } finally {
            if (!isChained) {
                this._isRecalculating = false;
                this._recalcChain.clear();
            }
        }
    }

    private _formulaInputKeyHandler(value: string) {
        switch (value) {
            case 'F4': {
                const editState = this._getEditState();

                if (!editState?.editingCell) return null;
                const editPlugin = this.context.getPlugin(PLUGIN_CELL_EDIT_KEY);

                const currentValue = editPlugin?.getLiveValue() ?? editState.currentValue ?? '';

                if (!currentValue.startsWith('=')) return null;

                const caretPos = editPlugin?.getCaretPosition() ?? currentValue.length;

                const toggleResult = toggleAnchorInFormula(currentValue, caretPos);

                if (!toggleResult || toggleResult.value === currentValue) return null;

                this.context.dispatch({
                    type: CELL_EDIT_ACTION.INPUT,
                    payload: {
                        cell: editState.editingCell,
                        value: toggleResult.value,
                        caretPosition: toggleResult.caretPosition,
                    },
                });
                break;
            }

            default:
                break;
        }

        return null;
    }

    // ─── Стадия 1: Veto ──────────────────────────────────────────────────────

    override collectVeto(tr: Transaction, state: PluginFormulasState): string | null {
        if (!state) return null;
        if (state.isExpression && tr.action?.type === CELL_EDIT_ACTION.END && tr.action.payload.source === 'range_drag') {
            return 'formula:range-selection-active';
        }
        return null;
    }

    override resolveVetoes(_ctx: VetoContext, _state: PluginFormulasState): void {}

    // ─── Стадия 2: reducer ───────────────────────────────────────────────────

    override reducer(state: PluginFormulasState, tr: Transaction): PluginFormulasState {
        const { action } = tr;
        if (!action) return state;

        switch (action?.type) {
            case CELL_EDIT_ACTION.START: {
                const value = String(action.payload.value ?? '');
                const isExpression = value.startsWith('=');
                return {
                    ...state,
                    isExpression,
                    expressionRanges: isExpression ? this._parseFormulaRanges(value) : [],
                    focusedRangeIndex: null,
                    activeFunctionName: null,
                };
            }

            case CELL_EDIT_ACTION.INPUT: {
                const value = String(action.payload.value ?? '');
                const isExpression = value.startsWith('=');
                return {
                    ...state,
                    isExpression,
                    expressionRanges: isExpression ? this._parseFormulaRanges(value) : [],
                };
            }

            case CELL_EDIT_ACTION.ON_COPY: {
                return {
                    ...state,
                    copiedRange: action.payload,
                };
            }

            case CELL_EDIT_ACTION.END:
            case 'CURSOR_SET':
            case 'CURSOR_MOVE': {
                if (
                    !state.isExpression &&
                    state.expressionRanges.length === 0 &&
                    state.focusedRangeIndex === null &&
                    state.activeFunctionName === null
                ) {
                    return state;
                }
                return {
                    ...state,
                    isExpression: false,
                    expressionRanges: [],
                    focusedRangeIndex: null,
                    activeFunctionName: null,
                };
            }

            // Результат чтения pluginConfigManager из appendTransaction приходит сюда
            case PLUGIN_FORMULAS_ACTION.CURSOR_SYNC: {
                const { expression } = action.payload;
                const isExpression = !!expression;
                return {
                    ...state,
                    isExpression,
                    expressionRanges: [],
                    focusedRangeIndex: null,
                    activeFunctionName: null,
                };
            }

            // ── Фокусировка range-тега ────────────────────────────────────────
            case PLUGIN_FORMULAS_ACTION.FOCUS_RANGE: {
                const index = action.payload as number;
                return {
                    ...state,
                    focusedRangeIndex: state.focusedRangeIndex === index ? null : index,
                };
            }

            default:
                return state;
        }
    }

    // ─── Стадия 3: appendTransaction ─────────────────────────────────────────

    override appendTransaction(
        tr: Transaction,
        prevState: PluginFormulasState,
        nextState: PluginFormulasState,
    ):
        | SpreadsheetAction
        | SpreadsheetAction[]
        | TransactionBuilder
        | TransactionBuilder[]
        | (SpreadsheetAction | TransactionBuilder)[]
        | null {
        if (tr.action?.type === PERSIST_ACTION.LOAD_SUCCESS || tr.action?.type === PERSIST_ACTION.LOAD_ERROR) {
            this._buildDependencyIndex();
            return this._recalculateAllFormulas();
        }

        if (tr.action?.type === 'JOINED_CELLS_SET') {
            // Fast-path: если формул нет — пересчитывать нечего.
            if (this._reverseDependencyIndex.size > 0) {
                const dataChanges = tr.getDataChanges();
                if (dataChanges.length > 0) {
                    const changedCells = this._dataChangesToMap(dataChanges);
                    const cellMap = this._recalculateAffectedFormulas(changedCells);
                    if (cellMap) {
                        return this.context.transaction().setCells(cellMap).skipHistory();
                    }
                }
            }
        }

        // ── Старт редактирования ──────────────────────────────────────────────
        if (nextState.isExpression && tr.action?.type === CELL_EDIT_ACTION.START) {
            const { cell } = tr.action.payload;
            const expression = this.context.pluginConfigManager.getPluginConfig(
                cell.coordinates.rowIndex,
                cell.coordinates.columnIndex,
                PLUGIN_FORMULAS_KEY,
            )?.expression;

            const editPlugin = this.context.getPlugin(PLUGIN_CELL_EDIT_KEY) as any;
            const inputRef = editPlugin?.getInputRef?.() as React.RefObject<any> | undefined;

            // START: навешиваем слушатель keydown на inputRef )
            if (inputRef?.current && !this._formulaKeyDownHandler) {
                this._formulaKeyDownHandler = (event: KeyboardEvent) => {
                    this.context.dispatch(
                        {
                            type: CELL_EDIT_ACTION.EDIT_FORMULA_INPUT,
                            payload: {
                                value: event.key,
                            },
                        },
                        { skipHistory: true },
                    );
                };

                inputRef.current.addEventListener('keydown', this._formulaKeyDownHandler);
            }

            const actions: SpreadsheetAction[] = [];

            if (expression) {
                actions.push({ type: CELL_EDIT_ACTION.VALUE_SYNC, payload: { value: expression } });
            }
            if (nextState.expressionRanges.length > 0) {
                actions.push({
                    type: 'RANGES_SET',
                    payload: nextState.expressionRanges.map((fr) => this._resolveToJoinedCellRange(fr.range)),
                });
                actions.push(this._buildRangeStylesAction(nextState));
                actions.push(this._buildMarkdownRulesAction(nextState));
            }
            actions.push(...this._buildActiveFunctionActions(nextState));

            return actions.length ? actions : null;
        }

        // ── Ввод ─────────────────────────────────────────────────────────────
        if (tr.action?.type === CELL_EDIT_ACTION.CARET_MOVE) {
            if (!nextState.isExpression) return null;
            const actions: SpreadsheetAction[] = [];
            if (nextState.expressionRanges.length > 0) {
                actions.push(this._buildRangeStylesAction(nextState));
                actions.push(this._buildMarkdownRulesAction(nextState));
            }
            return [...actions, ...this._buildActiveFunctionActions(nextState)];
        }

        if (tr.action?.type === CELL_EDIT_ACTION.APPLY_FORMULA_INPUT) {
            return this._formulaInputKeyHandler(tr.action.payload.value);
        }

        if (tr.action?.type === CELL_EDIT_ACTION.INPUT) {
            const actions: SpreadsheetAction[] = [];

            if (nextState.isExpression) {
                // Формула активна — обновляем подсветку диапазонов
                if (nextState.expressionRanges.length > 0) {
                    actions.push(this._buildRangeStylesAction(nextState));
                    actions.push(this._buildMarkdownRulesAction(nextState));
                }
                actions.push(...this._buildActiveFunctionActions(nextState));
            } else if (prevState.isExpression) {
                // Пользователь удалил '=' — переход формула->текст.
                // Сбрасываем подсветку диапазонов и активную функцию.
                actions.push({ type: 'RANGES_STYLES_SET', payload: {} });
                actions.push({
                    type: PLUGIN_FORMULAS_ACTION.SET_ACTIVE_FUNCTION,
                    payload: null,
                });
            }

            return actions.length ? actions : null;
        }

        if (tr.action?.type === CELL_EDIT_ACTION.ON_PASTE) {
            return this._handlePaste(nextState, tr.action.payload.data, tr.action.payload.range);
        }

        // ── Завершение редактирования ─────────────────────────────────────────
        if (prevState.isExpression && tr.action?.type === CELL_EDIT_ACTION.END) {
            return this._handleEditEnd(
                tr.action.payload.cell,
                tr.action.payload.value,
                tr.action.payload.apply,
                tr.action.payload.source,
            );
        }

        // ── VALUE_SYNC ────────────────────────────────────────────────────────
        if (tr.action?.type === CELL_EDIT_ACTION.VALUE_SYNC) {
            const actions = this._buildActiveFunctionActions(nextState);
            return actions.length ? actions : null;
        }

        // ── Drag ──────────────────────────────────────────────────────────────
        if (
            (tr.action?.type === 'RANGE_DRAG_START' ||
                tr.action?.type === 'RANGE_DRAG_MOVE' ||
                tr.action?.type === 'RANGE_DRAG_END') &&
            prevState.isExpression &&
            tr.action.payload?.range
        ) {
            return this._insertRangeReference(tr.action.payload.range, prevState);
        }

        if (tr.action?.type === 'RANGE_DRAG_START') {
            const editState = this._getEditState();
            if (!editState?.editingCell) return null;

            // Формула активна — не коммитим, диапазон вставится через RANGE_DRAG_END
            if (prevState.isExpression) return null;

            // Обычное редактирование — коммитим значение, действие при этом не блокируется
            const editPlugin = this.context.getPlugin(PLUGIN_CELL_EDIT_KEY);
            const value = editPlugin?.getLiveValue?.() ?? editState.currentValue;
            return {
                type: CELL_EDIT_ACTION.END,
                payload: {
                    cell: editState.editingCell,
                    value,
                    apply: true,
                    source: 'range_drag',
                },
            };
        }

        // ── Навигация ─────────────────────────────────────────────────────────────────
        if (tr.action?.type === 'CURSOR_SET' || tr.action?.type === 'CURSOR_MOVE') {
            if (!tr.action.payload) return null;

            // Cross-plugin read допустим только в appendTransaction, не в reducer
            const editState = this._getEditState();
            if (editState?.editingCell) return null;

            const { cell } = tr.action.payload;
            const expression =
                this.context.pluginConfigManager.getPluginConfig(
                    cell.coordinates.rowIndex,
                    cell.coordinates.columnIndex,
                    PLUGIN_FORMULAS_KEY,
                )?.expression ?? null;

            const actions: SpreadsheetAction[] = [
                // CURSOR_SYNC обновит reducer с чистым payload — без внешних reads
                { type: PLUGIN_FORMULAS_ACTION.CURSOR_SYNC, payload: { expression } },
            ];

            if (expression) {
                // Показываем оригинальную формулу в строке формул
                actions.push({ type: CELL_EDIT_ACTION.VALUE_SYNC, payload: { value: expression } });
            }

            return actions;
        }

        // ── Фокусировка range-тега ────────────────────────────────────────────
        if (tr.action?.type === PLUGIN_FORMULAS_ACTION.FOCUS_RANGE) {
            if (!nextState.expressionRanges.length) return null;
            return [this._buildMarkdownRulesAction(nextState), this._buildRangeStylesAction(nextState)];
        }

        // ── FILL_END ──────────────────────────────────────────────────────────────
        if (tr.action?.type === 'FILL_END') {
            const { filledData } = tr.action.payload;

            this._handleFillEnd(filledData);
        }

        for (const extra of tr.getExtraActions()) {
            if (extra.type === 'FILL_END') {
                const { filledData } = extra.payload;

                this._handleFillEnd(filledData);
            }
        }

        // ── CELL_EDIT_ACTION.END: снимаем listener + пересчёт ────────────────────
        if (tr.action?.type === CELL_EDIT_ACTION.END) {
            // END: снимаем слушатель keydown на inputRef
            if (this._formulaKeyDownHandler) {
                const editPlugin = this.context.getPlugin(PLUGIN_CELL_EDIT_KEY) as any;
                const inputRef = editPlugin?.getInputRef?.() as React.RefObject<any> | undefined;
                inputRef?.current?.removeEventListener('keydown', this._formulaKeyDownHandler);
                this._formulaKeyDownHandler = null;
            }

            const actions: SpreadsheetAction[] = [
                { type: 'RANGES_STYLES_SET', payload: {} },
                {
                    type: PLUGIN_FORMULAS_ACTION.SET_ACTIVE_FUNCTION,
                    payload: null,
                },
            ];
            const tx = this.context.transaction();

            // Пересчёт имеет смысл только если в документе есть формулы.
            if (this._reverseDependencyIndex.size > 0) {
                const changedCells = this._dataChangesToMap(tr.getDataChanges());
                const cellMap = this._recalculateAffectedFormulas(changedCells);
                if (cellMap) {
                    tx.setCells(cellMap);
                }
            }

            tx.withAction(actions);

            return tx;
        }

        // ── Пересчёт зависимых формул при изменении данных ───────────────────
        // Обрабатывает все источники: bulk-set, delete, fill и другие.
        // CELL_EDIT_ACTION.END обрабатывается отдельно (см. выше).
        {
            // Fast-path: если в документе нет ни одной формулы — пропускаем весь блок.
            // Проверяем ДО вызова tr.getDataChanges() и ДО итерации по N записям.
            //
            // Ключевой сценарий: загрузка большого отчёта (.drp) без формул.
            // Транзакция содержит 30k+ dataChanges (все ячейки пивот-таблицы).
            // Без этого guard'а мы линейно проходили весь массив, вызывая
            // pluginConfigManager.getPluginConfig() на каждую ячейку
            // (spatialIndex.query + merge) — итого ~300-400ms блокировки main thread впустую.
            const hasFormulas = this._dependencyIndex.size > 0 || this._reverseDependencyIndex.size > 0;

            if (hasFormulas) {
                const dataChanges = tr.getDataChanges();
                if (dataChanges.length > 0) {
                    const tx = this.context.transaction();

                    let hasDeletions = false;
                    // Инкрементально обновляем индекс формул для изменённых ячеек
                    for (const { rowIndex, columnIndex, before, after } of dataChanges) {
                        const key = `${rowIndex}:${columnIndex}`;

                        // Micro fast-path: если ячейка никогда не была формульной,
                        // getPluginConfig() не нужен в большинстве операций удаления.
                        // Для bulk-set с 30k ячеек и 5 формулами это исключает 29995 вызовов.
                        const wasFormula = this._dependencyIndex.has(key);

                        // Удаление данных: before != null && after == null
                        if (before != null && after == null) {
                            if (wasFormula) {
                                // Только для формульных ячеек читаем конфиг и удаляем из индекса
                                const config = this.context.pluginConfigManager.getPluginConfig(
                                    rowIndex,
                                    columnIndex,
                                    PLUGIN_FORMULAS_KEY,
                                );
                                if (config?.expression) {
                                    hasDeletions = true;
                                    tx.removePluginConfigCell(rowIndex, columnIndex, PLUGIN_FORMULAS_KEY);
                                    this._unindexFormula(key);
                                }
                            }
                            continue;
                        }

                        // Для не-формульных ячеек (wasFormula=false): если нет config.expression,
                        // delete из _dependencyIndex — это Map.delete(key), которого нет → no-op.
                        // Но вызов getPluginConfig() (spatialIndex.query) можно пропустить.
                        if (!wasFormula) {
                            // Ячейка не была формульной → не могла приобрести формулу
                            // через bulk-set (формулы пишутся только через CELL_EDIT_ACTION.END).
                            // Однако после undo/redo состояние восстанавливается через
                            // HISTORY_RESTORED + _buildDependencyIndex → индекс корректен.
                            continue;
                        }

                        // Ячейка была формульной — проверяем актуальный конфиг
                        const config = this.context.pluginConfigManager.getPluginConfig(
                            rowIndex,
                            columnIndex,
                            PLUGIN_FORMULAS_KEY,
                        );
                        if (config?.expression) {
                            this._indexFormula(key, config.expression);
                        } else {
                            // Формула удалена — убираем из индекса
                            this._dependencyIndex.delete(key);
                        }
                    }

                    const changedCells = this._dataChangesToMap(dataChanges);
                    const cellMap = this._recalculateAffectedFormulas(changedCells);
                    if (cellMap) {
                        tx.setCells(cellMap);
                    }

                    if (hasDeletions || cellMap) {
                        return tx.skipHistory();
                    }
                }
            }
        }

        return null;
    }

    // ─── Обработчики appendTransaction ───────────────────────────────────────

    /**
     * Топологическая сортировка формульных ячеек через DFS с трёхцветной маркировкой.
     * WHITE (не в visited и не в visiting) — не посещена
     * GRAY  (в visiting) — в процессе обработки (обнаружение цикла)
     * BLACK (в visited) — завершена
     */
    private _topologicalSortFormulas(): string[] {
        const visited = new Set<string>(); // BLACK
        const visiting = new Set<string>(); // GRAY
        const result: string[] = [];
        const circularKeys = new Set<string>();

        const dfs = (key: string): void => {
            if (visited.has(key)) return;

            if (visiting.has(key)) {
                // Цикл обнаружен
                circularKeys.add(key);
                this._log.log('warn', {
                    txId: 'formula',
                    event: 'toposort:circular-dependency',
                    timestamp: Date.now(),
                    payload: { circularKey: key, currentPath: [...visiting] },
                });
                return;
            }

            visiting.add(key);

            const deps = this._dependencyIndex.get(key);
            if (deps) {
                for (const dep of deps) {
                    if (this._dependencyIndex.has(dep)) {
                        dfs(dep);
                    }
                }
            }

            visiting.delete(key);
            visited.add(key);
            result.push(key);
        };

        for (const key of this._dependencyIndex.keys()) {
            dfs(key);
        }

        // Для циклических ячеек — помечаем как ошибку
        if (circularKeys.size > 0) {
            for (const key of circularKeys) {
                const [row, col] = key.split(':').map(Number);
                const existing = this.context.getCellAt(new Cell({ rowIndex: row, columnIndex: col }));
                if (existing) {
                    alert(`${new Cell({ rowIndex: row, columnIndex: col })}: #ЦИКЛ!`);
                    // TODO
                    // Пометим в матрице, чтобы getCellDisplay показал ошибку
                    // const dataMatrix = this.context.getData() as Map<number, Map<number, ICell>>;
                    // SparseMatrixHelper.setCell(dataMatrix, row, col, { ...existing, data: '#ЦИКЛ!' });
                }
            }
        }

        return result;
    }

    /**
     * Конвертирует DataChange[] в Map для _recalculateAffectedFormulas.
     * DataChange содержит координаты изменённых ячеек — именно они нужны
     * для поиска зависимых формул.
     */
    private _dataChangesToMap(changes: DataChange[]): Map<number, Map<number, null>> {
        const result = new Map<number, Map<number, null>>();
        for (const { rowIndex, columnIndex } of changes) {
            if (!result.has(rowIndex)) result.set(rowIndex, new Map());
            result.get(rowIndex)!.set(columnIndex, null);
        }
        return result;
    }

    override afterTransaction(tr: Transaction, _prevState: PluginFormulasState, _nextState: PluginFormulasState): void {
        if (tr.action?.type === CELL_EDIT_ACTION.INPUT && _nextState.isExpression) {
            const editState = this._getEditState();
            if (editState?.editingCell && editState.currentValue && _nextState.focusedRangeIndex === null) {
                const value = editState.currentValue;
                const circularRef = this.getCircularReference(
                    value,
                    editState.editingCell.coordinates.columnIndex,
                    editState.editingCell.coordinates.rowIndex,
                );

                if (circularRef) {
                    requestAnimationFrame(() =>
                        this._showNotification?.(`Циклическая ссылка: ${circularRef}`, { color: 'error', timeout: 3000 }),
                    );
                }
            }
        }
    }

    private _handleEditEnd(
        cell: Cell,
        value: string | number,
        apply: boolean,
        source: string = 'keyboard',
    ): (SpreadsheetAction | TransactionBuilder)[] | null {
        const strValue = String(value);
        const result: SpreadsheetAction[] = [{ type: 'RANGES_STYLES_SET', payload: {} }];
        const formulaCellKey = `${cell.coordinates.rowIndex}:${cell.coordinates.columnIndex}`;

        const tx = this.context.transaction();

        if (source === 'escape') {
            tx.withAction(result);
            return [tx];
        }

        if (!apply || value == null || !strValue.startsWith('=')) {
            this._unindexFormula(formulaCellKey);
            tx.removePluginConfigCell(cell.coordinates.rowIndex, cell.coordinates.columnIndex, PLUGIN_FORMULAS_KEY);
            tx.withAction(result);
            return [tx];
        }

        const existingCell = this.context.getCellAt(cell);
        const computedValue = this._computeFormula(strValue, cell.coordinates.rowIndex, cell.coordinates.columnIndex);

        // SPILL: применяем вычисленные значения (включая массивы)
        const cellRow = new Map<number, any>();
        const cellMap = new Map<number, typeof cellRow>();
        cellMap.set(cell.coordinates.rowIndex, cellRow);

        this._applyComputedValues(
            cellMap,
            computedValue,
            cell.coordinates.rowIndex,
            cell.coordinates.columnIndex,
            existingCell,
        );

        this._indexFormula(formulaCellKey, strValue);

        tx.withAction(result).setCells(cellMap);
        tx.setPluginConfigCell(cell.coordinates.rowIndex, cell.coordinates.columnIndex, this.key, {
            expression: strValue,
        });

        return [tx];
    }

    private _insertRangeReference(range: Range, prevState: PluginFormulasState): SpreadsheetAction[] | null {
        const editState = this._getEditState();
        if (!editState?.editingCell) return null;

        const editPlugin = this.context.getPlugin(PLUGIN_CELL_EDIT_KEY);
        const currentValue = (editPlugin?.getLiveValue() ?? editState.currentValue) as string;
        const caretPos = (editPlugin?.getCaretPosition() ?? currentValue.length) as number;

        const resolvedRange = this._resolveToFormulaRange(range);
        const rangeText = resolvedRange.text;

        // Ищем существующий match под кареткой для замены
        const matches = Array.from(currentValue.matchAll(EXCEL_CELL_RANGE_REGEXP));
        const charBeforeCaret = currentValue[caretPos - 1];
        const isAfterOperator = /[+\-*/,(=]/.test(charBeforeCaret ?? '');

        const matchUnderCaret = isAfterOperator
            ? undefined
            : matches.find((m) => {
                  const start = m.index!;
                  const end = start + m[0].length;
                  return caretPos >= start && caretPos <= end;
              });

        let newValue: string;
        let newCaretPos: number;

        if (matchUnderCaret) {
            const start = matchUnderCaret.index!;
            const end = start + matchUnderCaret[0].length;
            newValue = currentValue.substring(0, start) + rangeText + currentValue.substring(end);
            // Каретка сразу после вставленного диапазона (на месте старого конца match)
            newCaretPos = start + rangeText.length;
        } else {
            newValue = currentValue.substring(0, caretPos) + rangeText + currentValue.substring(caretPos);
            // Каретка сразу после вставленного текста
            newCaretPos = caretPos + rangeText.length;
        }

        // Пересчитываем expressionRanges для нового значения вручную,
        // так как reducer ещё не обработал INPUT на этом этапе.
        const newFormulaRanges = this._parseFormulaRanges(newValue);

        // Находим индекс только что вставленного диапазона для подсветки
        const insertedRangeIndex = newFormulaRanges.findIndex((fr) => fr.text === rangeText);

        const syntheticNextState: PluginFormulasState = {
            isExpression: true,
            expressionRanges: newFormulaRanges,
            // Фокусируем только что вставленный диапазон
            focusedRangeIndex: insertedRangeIndex >= 0 ? insertedRangeIndex : null,
            activeFunctionName: prevState.activeFunctionName,
            copiedRange: prevState.copiedRange,
        };

        // Возвращаем фокус в инпут после выбора диапазона мышью
        editPlugin?.focusInput(newCaretPos);

        return [
            {
                type: CELL_EDIT_ACTION.INPUT,
                payload: {
                    cell: editState.editingCell,
                    value: newValue,
                    caretPosition: newCaretPos,
                },
            },
            { type: 'RANGES_SET', payload: newFormulaRanges.map((fr) => this._resolveToJoinedCellRange(fr.range)) },
            this._buildMarkdownRulesAction(syntheticNextState),
            this._buildRangeStylesAction(syntheticNextState),
        ];
    }

    /**
     * Если диапазон - объединенная область - возвращает Range главной ячейки
     * То есть вместо диапазона получаем 1 координату
     * Иначе возвращает диапазон без изменений.
     */
    private _resolveToFormulaRange(range: Range): Range {
        const joinedCells = this.context?.getPluginState(PLUGIN_JOINED_CELLS_KEY)?.joinedCells ?? [];
        for (const jc of joinedCells) {
            if (jc.range.contains(range.topLeft) && jc.range.contains(range.bottomRight)) {
                return new Range(jc.mainCell);
            }
        }
        return range;
    }

    // ─── Вспомогательные методы ───────────────────────────────────────────────

    /**
     * Читает cross-plugin state.
     * Вызывается ТОЛЬКО из appendTransaction и render — не из reducer.
     */
    private _getEditState() {
        return this.context.getPluginState(PLUGIN_CELL_EDIT_KEY) ?? null;
    }

    private _getCellFromSheet(
        rowIndex: number,
        colIndex: number,
        sheetName?: string,
    ): { data: CellDataType; expression?: string } {
        // Безопасное обращение через getPlugin — PluginPages может быть не зарегистрирован
        const pagesPlugin = this.context.getPlugin('PluginPages');

        if (!sheetName || !pagesPlugin) {
            const data = this.context.getCellAt(new Cell({ rowIndex, columnIndex: colIndex }))?.data;
            const pluginConfig = this.context.getCellPluginConfig(
                new Cell({ rowIndex, columnIndex: colIndex }),
                PLUGIN_FORMULAS_KEY,
            );
            const expression = pluginConfig?.expression;
            return {
                data,
                expression,
            };
        }

        // Duck-typing вместо прямой зависимости от класса PluginPages
        const getPageMatrix = (pagesPlugin as any).getPageMatrix as
            | ((name: string) => Map<number, Map<number, ICell>> | null)
            | undefined;

        if (!getPageMatrix) return { data: null };

        const matrix = getPageMatrix.call(pagesPlugin, sheetName);
        return { data: matrix?.get(rowIndex)?.get(colIndex)?.data };
    }

    /**
     * Применяет вычисленное значение в cellMap.
     * Если computedValue — массив, заполняет текущую и соседние ячейки.
     * 2D-массивы SPILL'ятся вниз и вправо, 1D — только вправо.
     * @param baseCell Опциональная базовая ячейка для копирования config.
     */
    private _applyComputedValues(
        cellMap: Map<number, Map<number, ICell>>,
        computedValue: string | CellDataType[] | CellDataType[][],
        row: number,
        col: number,
        baseCell?: ICell | null,
    ): void {
        // Скаляр
        if (typeof computedValue === 'string') {
            if (!cellMap.has(row)) cellMap.set(row, new Map());
            cellMap.get(row)!.set(col, { ...(baseCell ?? {}), data: computedValue });
            return;
        }

        // Нормализуем через unknown для корректного сужения типов
        const arr = computedValue as unknown[];

        // 2D-массив: SPILL вниз и вправо
        if (arr.length > 0 && Array.isArray(arr[0])) {
            const twoD = computedValue as CellDataType[][];
            for (let r = 0; r < twoD.length; r++) {
                const targetRow = row + r;
                if (!cellMap.has(targetRow)) cellMap.set(targetRow, new Map());
                const rowMap = cellMap.get(targetRow)!;
                for (let c = 0; c < twoD[r].length; c++) {
                    rowMap.set(col + c, { ...(baseCell ?? {}), data: twoD[r][c] });
                }
            }
            return;
        }

        // 1D-массив: SPILL вправо по одной строке
        if (!cellMap.has(row)) cellMap.set(row, new Map());
        const rowMap = cellMap.get(row)!;
        const oneD = computedValue as CellDataType[];
        for (let i = 0; i < oneD.length; i++) {
            rowMap.set(col + i, { ...(baseCell ?? {}), data: oneD[i] });
        }
    }

    private _parseFormulaRanges(formula: string): IFormulaRange[] {
        const ranges: IFormulaRange[] = [];
        let colorIdx = 0;
        for (const match of Array.from(formula.matchAll(EXCEL_CELL_RANGE_REGEXP))) {
            const text = match[0];
            const parts = text.split(':') as [ExcelSpreadSheetCoordinate, ExcelSpreadSheetCoordinate];
            try {
                const start = parseExcelSpreadSheetCoordinate(parts[0]);
                const end = parts[1] ? parseExcelSpreadSheetCoordinate(parts[1]) : start;
                if (start && end) {
                    ranges.push({
                        range: new Range(new Cell(start), new Cell(end)),
                        text,
                        color: RANGE_COLORS[colorIdx++ % RANGE_COLORS.length],
                    });
                }
            } catch {
                /* некорректные координаты игнорируем */
            }
        }
        return ranges;
    }

    /** Форматирование результата парсера */
    private _formatResult(result: any): string {
        if (result == null) return '#Н/Д!';
        if (typeof result === 'boolean') return result ? 'ИСТИНА' : 'ЛОЖЬ';
        if (typeof result === 'object' && result?.error) return result.error;
        return String(result);
    }

    /**
     * @param formula  Выражение вида "=SUM(A1:A3)"
     * @param cellRow  0-based row формульной ячейки (для ROW(), INDIRECT() и т.д.)
     * @param cellCol  0-based col формульной ячейки
     * @param computedCache - значения ячеек, вычисленных ранее в этой же волне.
     *   Имеют приоритет над реальной матрицей. Позволяет строить цепочки
     *   зависимостей (A1=B1+C1, D1=A1*2) без записи в матрицу.
     * @returns Результат вычисления формулы. Может быть:
     *   - скаляр (string) для обычных формул
     *   - одномерный массив (CellDataType[]) для однострочных SPILL
     *   - двумерный массив (CellDataType[][]) для range-результатов (SPILL вниз и вправо)
     */

    private getCircularReference(formula: string, columnIndex: number, rowIndex: number): Cell | undefined {
        const cell = new Cell({ rowIndex, columnIndex });

        const range = this._parseFormulaRanges(formula);
        const dependencies = range.flatMap((fr) => Array.from(fr.range).map((item) => item.key));

        // 1. Прямая циклическая ссылка: проверяем, есть ли зависимость на саму себя
        if (dependencies.includes(cell.key)) {
            return cell;
        }

        // 2. Косвенная циклическая ссылка (цепочка)
        if (this._hasCircularDependency(cell.key, dependencies)) {
            return cell;
        }

        return undefined;
    }

    private _computeFormula(
        formula: string,
        // eslint-disable-next-line default-param-last
        cellRow = 0,
        // eslint-disable-next-line default-param-last
        cellCol = 0,
        computedCache?: Map<string, CellDataType | CellDataType[] | CellDataType[][]>,
    ): string | CellDataType[] | CellDataType[][] {
        if (!this.parser) return formula;

        try {
            const translated = this.translator.translate(formula.slice(1));
            const pagesPlugin = this.context.getPlugin('PluginPages');
            const sheetName = (pagesPlugin as any)?.getActivePageName?.() ?? 'Sheet1';
            const context = { row: cellRow + 1, col: cellCol + 1, sheet: sheetName };

            if (computedCache?.size) {
                const originalHandlers = this.parser._handlers;
                try {
                    this.parser._handlers = {
                        ...originalHandlers,
                        onCell: ({ row, col, sheet }: { row: number; col: number; sheet?: string }) => {
                            const { data: v, expression: e } = this._getCellFromSheet(row - 1, col - 1, sheet);
                            if (e) {
                                const sf = this.translator.translate(e.slice(1));
                                return `=${sf}`;
                            }
                            return v != null && !Number.isNaN(Number(v)) ? Number(v) : v ?? 0;
                        },
                    };
                    const result = this.parser.parse(translated, context, true);
                    return this._normalizeFormulaResult(result);
                } finally {
                    // Гарантируем восстановление оригинальных handlers даже при ошибке
                    this.parser._handlers = originalHandlers;
                }
            }

            const circularReferance = this.getCircularReference(formula, cellCol, cellRow);
            if (circularReferance) {
                return this._normalizeFormulaResult('#ЦИКЛ');
            }
            const result = this.parser.parse(translated, context, true);
            return this._normalizeFormulaResult(result);
        } catch (e) {
            this._log.log('debug', {
                txId: 'formula',
                event: 'compute:error',
                timestamp: Date.now(),
                payload: { formula, error: e instanceof Error ? e.message : String(e) },
            });
            return '#ОШИБКА!';
        }
    }

    /**
     * Нормализует результат парсера:
     * - скаляры форматируются через _formatResult
     * - массивы (1D и 2D) возвращаются как есть для SPILL
     */
    private _normalizeFormulaResult(result: any): string | CellDataType[] | CellDataType[][] {
        if (result == null) return '#Н/Д';
        if (typeof result === 'object' && result?.error) return result.error;
        if (typeof result === 'object' && !Array.isArray(result)) return String(result);

        if (result === 'TRUE') return 'ИСТИНА';
        if (result === 'FALSE') return 'ЛОЖЬ';

        // Скаляр
        if (!Array.isArray(result)) return this._formatResult(result);

        // Если это не двумерный массив (первый элемент не массив) — возвращаем как 1D
        if (!Array.isArray(result[0])) return result as CellDataType[];

        // Двумерный массив: оставляем как есть для SPILL вниз и вправо
        return result as CellDataType[][];
    }

    private _buildRangeStylesAction(state: PluginFormulasState): SpreadsheetAction {
        const styledRanges: Record<string, IRangeStyles> = {};
        state.expressionRanges.forEach((fr, index) => {
            const resolvedRange = this._resolveToJoinedCellRange(fr.range);
            styledRanges[resolvedRange.toString()] = {
                borderColor: fr.color,
                borderWidth: 2,
                borderStyle: index === state.focusedRangeIndex ? 'dashed' : 'solid',
                backgroundColor: fr.color,
                backgroundOpacity: 0.1,
                animated: index === state.focusedRangeIndex,
            };
        });
        return { type: 'RANGES_STYLES_SET', payload: styledRanges };
    }

    /**
     * Если  range совпадает с главной ячейкой joined cell, возвращает range объединенной ячейки.
     * Для подсветки всей области объединенной ячейки
     * Иначе возвращает range без изменений.
     */
    private _resolveToJoinedCellRange(range: Range): Range {
        const joinedCells = this.context?.getPluginState(PLUGIN_JOINED_CELLS_KEY)?.joinedCells ?? [];
        for (const jc of joinedCells) {
            if (
                jc.mainCell.coordinates.rowIndex === range.topLeft.coordinates.rowIndex &&
                jc.mainCell.coordinates.columnIndex === range.topLeft.coordinates.columnIndex &&
                range.size === 1
            ) {
                return jc.range;
            }
        }
        return range;
    }

    private _buildMarkdownRulesAction(state: PluginFormulasState): SpreadsheetAction {
        const expressionRanges = state.expressionRanges ?? [];
        const markdownRules = expressionRanges
            .map((item) => {
                const searchText = escapeRegExp(item.text);
                const pattern = `(?<=^| |\\+|\\-|\\=||,|\\t)${searchText}(?!\\d)`;
                return {
                    pattern: new RegExp(pattern),
                    style: { color: item.color },
                };
            })
            .reverse();
        return { type: CELL_EDIT_ACTION.SET_MARKDOWN_RULES, payload: { markdownRules } };
    }

    private _getRangeIndexAtCaret(formula: string, caretPos: number, expressionRanges: IFormulaRange[]): number {
        for (let i = 0; i < expressionRanges.length; i++) {
            const range = expressionRanges[i];
            const startPos = formula.indexOf(range.text);
            if (startPos === -1) continue;
            const endPos = startPos + range.text.length;
            // Каретка внутри диапазона (включая границы)
            if (caretPos >= startPos && caretPos <= endPos) {
                return i;
            }
        }
        return -1;
    }

    private _handlePaste(
        state: PluginFormulasState,
        cellsToWrite: Map<RowIndex, Map<ColumnIndex, ICell>>,
        range: Range,
    ): TransactionBuilder[] {
        const { copiedRange } = state;

        const x = copiedRange?.range.topLeft.coordinates.columnIndex ?? 0;
        const y = copiedRange?.range.topLeft.coordinates.rowIndex ?? 0;

        const tx = this.context.transaction();

        // Смещение для сдвига ссылок в формулах относительно скопированного левого:
        // sourceRange -> pasteTarget, все ячейки сдвигаются одинаково

        const colShift = range.topLeft.columnIndex - x;
        const rowShift = range.topLeft.rowIndex - y;

        // Сдвиг формул при вставке (paste)
        for (const [rowIndex, row] of cellsToWrite) {
            for (const [colIndex] of row) {
                const expressionFromSource = this.context.pluginConfigManager.getPluginConfig(
                    rowIndex - rowShift,
                    colIndex - colShift,
                    PLUGIN_FORMULAS_KEY,
                )?.expression;

                if (!expressionFromSource) continue;

                const shifted = shiftFormula(expressionFromSource, colShift, rowShift);

                this._indexFormula(`${rowIndex}:${colIndex}`, shifted);

                const computedValue = this._computeFormula(shifted, rowIndex, colIndex);

                const existing = this.context.getCellAt(new Cell({ rowIndex, columnIndex: colIndex }));

                // SPILL: если computedValue — массив, записываем в текущую и соседние ячейки
                if (Array.isArray(computedValue)) {
                    const arr = computedValue as unknown[];
                    // 2D-массив: SPILL вниз и вправо
                    if (arr.length > 0 && Array.isArray(arr[0])) {
                        const twoD = computedValue as CellDataType[][];
                        for (let r = 0; r < twoD.length; r++) {
                            const targetRow = rowIndex + r;
                            for (let c = 0; c < twoD[r].length; c++) {
                                const targetCol = colIndex + c;
                                const targetRowMap = cellsToWrite.get(targetRow);
                                if (targetRowMap) {
                                    targetRowMap.set(targetCol, {
                                        ...(existing ?? {}),
                                        data: twoD[r][c],
                                    });
                                }
                            }
                        }
                    } else {
                        // 1D-массив: SPILL вправо
                        const oneD = computedValue as CellDataType[];
                        for (let i = 0; i < oneD.length; i++) {
                            cellsToWrite.get(rowIndex)!.set(colIndex + i, {
                                ...(existing ?? {}),
                                data: oneD[i],
                            });
                        }
                    }
                } else {
                    cellsToWrite.get(rowIndex)!.set(colIndex, { ...(existing ?? {}), data: computedValue });
                }

                tx.setPluginConfigCell(rowIndex, colIndex, this.key, {
                    expression: shifted,
                });
            }
        }

        // formulasInputDisplay — значение/формула левой верхней вставляемой ячейки, для отображения в стркое формул
        const sourceFormula = this.context.pluginConfigManager.getPluginConfig(
            range.topLeft.rowIndex,
            range.topLeft.columnIndex,
            PLUGIN_FORMULAS_KEY,
        )?.expression;

        const formulasInputDisplay =
            (sourceFormula || String(cellsToWrite.get(range.topLeft.rowIndex)?.get(range.topLeft.columnIndex)?.data)) ?? '';

        tx.withAction({ type: CELL_EDIT_ACTION.VALUE_SYNC, payload: { value: formulasInputDisplay ?? '' } })
            .setCells(cellsToWrite)
            .skipHistory();

        return [tx];
    }

    private _buildActiveFunctionActions(state: PluginFormulasState): SpreadsheetAction[] {
        if (!state.isExpression) {
            return [{ type: PLUGIN_FORMULAS_ACTION.SET_ACTIVE_FUNCTION, payload: null }];
        }

        const editPlugin = this.context.getPlugin(PLUGIN_CELL_EDIT_KEY);
        const formula = editPlugin?.getLiveValue() ?? '';
        const caretPos = editPlugin?.getCaretPosition() ?? formula.length;

        const activeName = this._getFunctionAtCaret(formula, caretPos);
        const rangeIndex = this._getRangeIndexAtCaret(formula, caretPos, state.expressionRanges);

        const actions: SpreadsheetAction[] = [];

        if (activeName !== state.activeFunctionName) {
            actions.push({ type: PLUGIN_FORMULAS_ACTION.SET_ACTIVE_FUNCTION, payload: activeName });
        }

        if (rangeIndex !== state.focusedRangeIndex) {
            actions.push({ type: PLUGIN_FORMULAS_ACTION.FOCUS_RANGE, payload: rangeIndex });
        }

        return actions;
    }

    /**
     * Возвращает имя функции под кареткой, используя список известных функций
     * из translator.list(). Работает с любыми символами (кириллица, латиница).
     *
     * Алгоритм:
     *   1. Получаем все известные имена функций, сортируем длиннее->короче
     *      (чтобы "СРЗНАЧЕСЛИ" матчился раньше "СРЗНАЧ")
     *   2. Для каждой функции ищем все вхождения NAME( в формуле
     *   3. Проверяем, что каретка находится между "(" и соответствующей ")"
     */
    private _getFunctionAtCaret(formula: string, caretPos: number): string | null {
        const knownFunctions = Object.keys(this.translator.list()).sort((a, b) => b.length - a.length);

        // Собираем все кандидаты: { name, openParen, closeParen }
        // openParen — позиция "(", closeParen — позиция парной ")" (или конец строки)
        const candidates: Array<{ name: string; openParen: number; closeParen: number }> = [];

        for (const name of knownFunctions) {
            const searchLower = name.toLowerCase();
            const formulaLower = formula.toLowerCase();
            let pos = 0;

            while (pos < formula.length) {
                const idx = formulaLower.indexOf(`${searchLower}(`, pos);
                if (idx === -1) break;

                const openParen = idx + name.length; // позиция "("

                // Ищем парную закрывающую скобку с учётом вложенности
                let depth = 1;
                let closeParen = openParen + 1;

                while (closeParen < formula.length && depth > 0) {
                    if (formula[closeParen] === '(') depth++;
                    else if (formula[closeParen] === ')') depth--;
                    if (depth > 0) closeParen++;
                }
                // closeParen теперь указывает на ")" или выход за пределы строки

                candidates.push({ name, openParen, closeParen });
                pos = idx + 1;
            }
        }

        if (!candidates.length) return null;

        // Фильтруем: каретка должна быть строго внутри скобок (после "(" до ")" включительно)
        const matching = candidates.filter((c) => caretPos > c.openParen && caretPos <= c.closeParen);

        if (!matching.length) return null;

        // Из всех подходящих берём самую внутреннюю (у которой openParen максимальный)
        matching.sort((a, b) => b.openParen - a.openParen);
        return matching[0].name;
    }

    // ─── Handler ──────────────────────────────────────────────────────────────

    private _handleFillEnd = (filledData: Map<number, Map<number, ICell>>) => {
        for (const [rowIndex, row] of filledData) {
            for (const [colIndex, cell] of row) {
                const key = `${rowIndex}:${colIndex}`;
                const expression = (cell as ICell)?.pluginsConfig?.[PLUGIN_FORMULAS_KEY]?.expression;
                if (expression) this._indexFormula(key, expression);
                else this._unindexFormula(key);
            }
        }

        const cellMap = this._recalculateAffectedFormulas(filledData);
        if (cellMap) {
            return [this.context.transaction().setCells(cellMap).skipHistory()];
        }
        return null;
    };

    private _onFormulaClick = (formulaName: string[]): void => {
        const editState = this._getEditState();
        if (!editState?.editingCell) return;

        const editPlugin = this.context.getPlugin(PLUGIN_CELL_EDIT_KEY);
        const currentValue = editPlugin?.getLiveValue() ?? editState.currentValue ?? '';
        const caretPos = editPlugin?.getCaretPosition() ?? currentValue.length;
        const name = formulaName[0];

        let newValue: string;
        let newCaretPos: number;

        if (!currentValue.startsWith('=')) {
            // Нет формулы — начинаем с нуля
            newValue = `=${name}()`;
            newCaretPos = newValue.length - 1; // перед ")"
        } else {
            // Ищем имя функции под кареткой для замены
            // (каретка внутри имени: "=СУМ|М(A1)" -> заменяем "СУММ" на новое имя)
            const knownFunctions = Object.keys(this.translator.list()).sort((a, b) => b.length - a.length);

            const currentValueLower = currentValue.toLowerCase();
            const funcUnderCaret = knownFunctions.reduce<{ name: string; start: number; end: number } | null>((found, fn) => {
                if (found) return found;
                const searchLower = fn.toLowerCase();
                const search = `${searchLower}(`;
                let pos = 0;
                while (pos < currentValue.length) {
                    const idx = currentValueLower.indexOf(search, pos);
                    if (idx === -1) break;
                    const nameStart = idx;
                    const nameEnd = idx + fn.length; // позиция "(" не включена
                    // Каретка на имени функции (не в скобках, а на самом тексте)
                    if (caretPos >= nameStart && caretPos <= nameEnd) {
                        return { name: fn, start: nameStart, end: nameEnd };
                    }
                    pos = idx + 1;
                }
                return null;
            }, null);

            if (funcUnderCaret) {
                // Заменяем имя функции под кареткой, скобки и аргументы оставляем
                newValue = currentValue.substring(0, funcUnderCaret.start) + name + currentValue.substring(funcUnderCaret.end);
                newCaretPos = funcUnderCaret.start + name.length; // после нового имени
            } else {
                // Вставляем функцию в позицию каретки
                const insertion = `${name}()`;
                newValue = currentValue.substring(0, caretPos) + insertion + currentValue.substring(caretPos);
                newCaretPos = caretPos + insertion.length - 1; // перед ")"
            }
        }

        this.context.dispatch({
            type: CELL_EDIT_ACTION.INPUT,
            payload: { cell: editState.editingCell, value: newValue, caretPosition: newCaretPos },
        });
    };

    private _onAutoCompleteFormulaClick = (formulaName: string[]): void => {
        const { formulaInCaretPos } = this;
        if (!formulaInCaretPos) {
            return;
        }
        const editState = this._getEditState();
        if (!editState?.editingCell) return;

        const editPlugin = this.context.getPlugin(PLUGIN_CELL_EDIT_KEY);
        const currentValue = editPlugin?.getLiveValue() ?? editState.currentValue ?? '';
        const name = formulaName[0];

        let newValue: string;
        let newCaretPos: number;

        if (currentValue[formulaInCaretPos.end] === '(') {
            newValue = `${currentValue.substring(0, formulaInCaretPos.start)}${name}${currentValue.substring(
                formulaInCaretPos.end,
            )}`;
            newCaretPos = formulaInCaretPos.start + name.length;
        } else {
            newValue = `${currentValue.substring(0, formulaInCaretPos.start)}${name}()${currentValue.substring(
                formulaInCaretPos.end,
            )}`;
            newCaretPos = formulaInCaretPos.start + name.length + 1;
        }

        this.context.dispatch({
            type: CELL_EDIT_ACTION.INPUT,
            payload: { cell: editState.editingCell, value: newValue, caretPosition: newCaretPos },
        });
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    override render(): ReactElement {
        const editState = this._getEditState();
        const { activeFunctionName } = this.getState();
        const { formulaInCaretPos, funcBeforeBrackets } = this;
        const isActive = !!editState?.editingCell;

        const editPlugin = this.context.getPlugin(PLUGIN_CELL_EDIT_KEY);
        const liveValue = editPlugin?.getLiveValue() ?? editState?.currentValue ?? '';
        const isExpression = liveValue.startsWith('=');

        const funcs = this.translator.list();
        const listValue = activeFunctionName ? [activeFunctionName] : [];
        const funcsList = Object.entries(funcs).map(([func, description]) => ({
            label: func,
            value: func,
            title: description,
            hint: description,
        }));

        const searchLower = formulaInCaretPos ? formulaInCaretPos.word.toLowerCase() : '';
        const autocompleteList = funcsList
            .filter((item) => item.value.toLowerCase().includes(searchLower))
            .map(({ value, label }) => ({ value, label }))
            .sort(({ value: value1 }, { value: value2 }) => {
                if (value1.toLowerCase().startsWith(searchLower)) {
                    if (!value2.toLowerCase().startsWith(searchLower)) {
                        return -1;
                    }
                    return value1.length - value2.length;
                }

                return 1;
            });

        return (
            <NotificationsProvider>
                <NotificationBridge onNotify={this._registerNotificationCallback} />
                <Portal rootId="AutocomplePluginFormula">
                    <Popover
                        offset={2}
                        content={this.translator.getArguments(funcBeforeBrackets || '')}
                        widthMode="content"
                        closeOnContentClick
                        opened={Boolean(funcBeforeBrackets)}
                    />
                    <Popover
                        offset={2}
                        content={
                            <List
                                type="single"
                                options={autocompleteList}
                                onChange={(value) => this._onAutoCompleteFormulaClick(value)}
                            />
                        }
                        widthMode="content"
                        closeOnContentClick
                        opened={isActive && Boolean(formulaInCaretPos?.word) && autocompleteList.length > 0}
                    />
                </Portal>
                <Popover
                    content={
                        <FormulasList
                            value={listValue}
                            options={funcsList}
                            onChange={(value) => this._onFormulaClick(value)}
                        />
                    }
                    autoWidth={false}
                    style={{ width: 620 }}
                    closeOnContentClick
                >
                    <IconButton
                        icon={FunctionIcon}
                        title="Больше функций"
                        variant="text"
                        disabled={!isActive || !isExpression}
                    />
                </Popover>
            </NotificationsProvider>
        );
    }
}
