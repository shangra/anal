import { IconButton, RedoIcon, UndoIcon } from 'ui-kit';

import { Plugin, Transaction, txMeta } from '../../AdapterSpreadSheet/plugin';
import { PluginStatesMap } from '../../AdapterSpreadSheet/plugin/Plugin';
import { ICell } from '../../AdapterSpreadSheet/types';
import { SparseMatrixHelper } from '../../AdapterSpreadSheet/utils/SparseMatrixHelper/SparseMatrixHelper';
import { HISTORY_ACTION, PLUGIN_HISTORY_KEY } from './constants';
import { HistoryEntry, PluginHistoryOptions, PluginHistoryState } from './types';

const DEFAULT_MAX_HISTORY_SIZE = 100;

export class PluginHistory extends Plugin<typeof PLUGIN_HISTORY_KEY, PluginHistoryState, PluginHistoryOptions> {
    readonly key = PLUGIN_HISTORY_KEY;

    readonly initialState: PluginHistoryState = {
        hasPast: false,
        hasFuture: false,
    };

    // ── Мутабельный стек истории (вне immutable-reducer) ─────────────────────

    private _past: HistoryEntry[] = [];

    private _future: HistoryEntry[] = [];

    /** Состояние ВСЕХ плагинов до текущей транзакции (снято перед reducer) */
    private _prevAllStates: PluginStatesMap | null = null;

    // ─────────────────────────────────────────────────────────────────────────

    private get _maxSize(): number {
        return this.options.maxHistorySize ?? DEFAULT_MAX_HISTORY_SIZE;
    }

    // ── Публичный API (используется AdapterSpreadSheet) ──────────────────────

    get hasPast(): boolean {
        return this._past.length > 0;
    }

    get hasFuture(): boolean {
        return this._future.length > 0;
    }

    undo(): void {
        if (!this._past.length) return;

        const entry = this._past.pop()!;
        const { groupId } = entry;

        // Собираем все записи из той же группы (append-транзакции)
        const groupEntries = [entry];
        while (this._past.length > 0 && groupId && this._past[this._past.length - 1].groupId === groupId) {
            groupEntries.push(this._past.pop()!);
        }

        // Сохраняем текущее состояние для redo
        const { styleManager, pluginConfigManager, metadataManager } = this.context;
        const currentAllStates = this.context.snapshotPluginStates();

        for (const ge of groupEntries) {
            this._future.push({
                fullPluginState: currentAllStates,
                dataChanges: ge.dataChanges.map((dc) => ({
                    rowIndex: dc.rowIndex,
                    columnIndex: dc.columnIndex,
                    before: this._getCurrentCell(dc.rowIndex, dc.columnIndex),
                    after: dc.before,
                })),
                stylesSnapshot: ge.stylesSnapshot ? styleManager.export() : null,
                pluginConfigSnapshot: ge.pluginConfigSnapshot ? pluginConfigManager.export() : null,
                metadataSnapshot: ge.metadataSnapshot ? metadataManager.export() : null,
                groupId,
            });
        }

        // Восстанавливаем самое раннее состояние группы
        const oldest = groupEntries[groupEntries.length - 1];
        this.context.restorePluginStates(oldest.fullPluginState);

        // Восстанавливаем данные в обратном порядке
        for (const ge of [...groupEntries].reverse()) {
            this._restoreEntry(ge);
        }

        // Уведомляем плагины с мутабельным side-state (аналог Adapter.onHistoryRestore)
        this._notifyHistoryRestore();

        // Сигнал другим плагинам через обычный dispatch
        this.context.dispatch({ type: HISTORY_ACTION.RESTORED }, { skipHistory: true });
    }

    redo(): void {
        if (!this._future.length) return;

        const entry = this._future.pop()!;
        const { groupId } = entry;

        const groupEntries = [entry];
        while (this._future.length > 0 && groupId && this._future[this._future.length - 1].groupId === groupId) {
            groupEntries.push(this._future.pop()!);
        }

        const { styleManager, pluginConfigManager, metadataManager } = this.context;
        const currentAllStates = this.context.snapshotPluginStates();

        for (const ge of groupEntries) {
            this._past.push({
                fullPluginState: currentAllStates,
                dataChanges: ge.dataChanges.map((dc) => ({
                    rowIndex: dc.rowIndex,
                    columnIndex: dc.columnIndex,
                    before: this._getCurrentCell(dc.rowIndex, dc.columnIndex),
                    after: dc.before,
                })),
                stylesSnapshot: ge.stylesSnapshot ? styleManager.export() : null,
                pluginConfigSnapshot: ge.pluginConfigSnapshot ? pluginConfigManager.export() : null,
                metadataSnapshot: ge.metadataSnapshot ? metadataManager.export() : null,
                groupId,
            });
        }

        const oldest = groupEntries[groupEntries.length - 1];
        this.context.restorePluginStates(oldest.fullPluginState);

        for (const ge of [...groupEntries].reverse()) {
            this._restoreEntry(ge);
        }

        this._notifyHistoryRestore();
        this.context.dispatch({ type: HISTORY_ACTION.RESTORED }, { skipHistory: true });
    }

    clearHistory(): void {
        this._past = [];
        this._future = [];
    }

    // ── reducer ───────────────────────────────────────────────────────────────

    override reducer(state: PluginHistoryState, tr: Transaction): PluginHistoryState {
        // HISTORY_CLEAR: очищаем стек прямо в reducer чтобы state обновился в той же транзакции
        if (tr.action?.type === HISTORY_ACTION.CLEAR) {
            this._past = [];
            this._future = [];
            return { hasPast: false, hasFuture: false };
        }

        // Снимаем снапшот ВСЕХ состояний плагинов до применения этой транзакции.
        // context.snapshotPluginStates() здесь корректен: reducers выполняются последовательно,
        // и для PluginHistory снапшот берётся до мутации его слайса.
        if (!txMeta.isSkipHistory(tr)) {
            this._prevAllStates = this.context.snapshotPluginStates();
        }

        const hasPast = this._past.length > 0;
        const hasFuture = this._future.length > 0;

        if (hasPast !== state.hasPast || hasFuture !== state.hasFuture) {
            return { hasPast, hasFuture };
        }
        return state;
    }

    // ── afterTransaction ──────────────────────────────────────────────────────

    override afterTransaction(tr: Transaction, _prevState: PluginHistoryState, _nextState: PluginHistoryState): void {
        if (txMeta.isSkipHistory(tr)) {
            this._prevAllStates = null;
            return;
        }

        const prevAllStates = this._prevAllStates;
        this._prevAllStates = null;

        if (!prevAllStates) return;

        // Группировка: appended транзакции (parentId != null) делят groupId с root
        const groupId = tr.parentId ?? tr.id;

        this._past.push({
            fullPluginState: prevAllStates,
            dataChanges: tr.getDataChanges(),
            stylesSnapshot: tr.getStylesSnapshot(),
            pluginConfigSnapshot: tr.getPluginConfigSnapshot(),
            metadataSnapshot: tr.getMetadataSnapshot(),
            groupId,
        });

        if (this._past.length > this._maxSize) {
            this._past.shift();
        }

        this._future = [];
    }

    // ── onHistoryRestore ──────────────────────────────────────────────────────

    override onHistoryRestore(_state: PluginHistoryState): void {
        // При внешнем undo/redo (например через snapshotState/restoreState)
        // сбрасываем стек
    }

    // ── Вспомогательные ──────────────────────────────────────────────────────

    /**
     * Уведомляет все плагины с мутабельным side-state об undo/redo,
     * аналог старого Adapter.undo()/redo() → plugin.onHistoryRestore().
     */
    private _notifyHistoryRestore(): void {
        const currentStates = this.context.snapshotPluginStates();
        for (const plugin of this.context.getPlugins()) {
            try {
                // IPlugin не содержит onHistoryRestore — кастим к Plugin
                (plugin as Plugin<any, any, any>).onHistoryRestore?.(currentStates[plugin.key as string]);
            } catch {
                /* не ломаем остальных */
            }
        }
    }

    private _getCurrentCell(rowIndex: number, columnIndex: number): ICell | null {
        const data = this.context.getData() as Map<number, Map<number, ICell>>;
        const cell = SparseMatrixHelper.getCell(data, rowIndex, columnIndex);
        return cell ? { ...cell } : null;
    }

    private _restoreEntry(entry: HistoryEntry): void {
        const { styleManager, pluginConfigManager, metadataManager } = this.context;
        const dataMatrix = this.context.getData() as Map<number, Map<number, ICell>>;

        for (const { rowIndex, columnIndex, before } of entry.dataChanges) {
            if (before === null) {
                SparseMatrixHelper.deleteCell(dataMatrix, rowIndex, columnIndex);
            } else {
                SparseMatrixHelper.setCell(dataMatrix, rowIndex, columnIndex, before);
            }
        }

        if (entry.stylesSnapshot) styleManager.import(entry.stylesSnapshot);
        if (entry.pluginConfigSnapshot) pluginConfigManager.import(entry.pluginConfigSnapshot);
        if (entry.metadataSnapshot) metadataManager.import(entry.metadataSnapshot);
    }

    public render(): React.ReactElement | null | undefined {
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 'var(--ui-kit-button-gap)',
                    justifyContent: 'space-around',
                    alignContent: 'space-between',
                    flexWrap: 'nowrap',
                    width: '100%',
                }}
            >
                <IconButton
                    color="primary"
                    variant="outlined"
                    icon={UndoIcon}
                    onClick={() => this.undo()}
                    disabled={!this.hasPast}
                    title="Отменить"
                />
                <IconButton
                    color="primary"
                    variant="outlined"
                    icon={RedoIcon}
                    onClick={() => this.redo()}
                    disabled={!this.hasFuture}
                    title="Вернуть"
                />
            </div>
        );
    }
}
