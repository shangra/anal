import { Cell, Range } from '../../models';
import { CellRange, StyledRange } from '../../types';
import { SpatialIndex } from '../SpatialIndex';
import { IMergeStrategy } from './types';

export class RangeBasedManager<T> {
    protected ranges: StyledRange<T>[] = [];

    protected spatialIndex: SpatialIndex;

    protected idCounter = 0;

    private _optimizeScheduled = false;

    /**
     * Счётчик ranges на момент последнего запуска optimize().
     * Используется для защиты от feedback-loop: если после optimize()
     * количество ranges не уменьшилось, повторное планирование
     * откладывается до тех пор, пока не накопится OPTIMIZATION_THRESHOLD
     * новых ranges поверх этого значения.
     */
    private _lastOptimizeInputCount = 0;

    protected needsOptimization = false;

    /**
     * Порог, после которого ленивая оптимизация планируется через requestIdleCallback.
     * Поднят до 10 000, т.к. setCellsBatch выполняет RLE-сжатие до вставки
     * и в нормальных условиях количество ranges не превышает нескольких сотен.
     */
    protected readonly OPTIMIZATION_THRESHOLD = 10_000;

    /**
     * Порог для предупреждения в режиме разработки.
     * Сигнализирует о паттерне «пер-ячейка → 1×1 range» без использования setCellsBatch.
     */
    private readonly SOFT_LIMIT = 5_000;

    constructor(protected readonly strategy: IMergeStrategy<T>, maxRows = 1_000_000, maxCols = 100_000) {
        this.spatialIndex = new SpatialIndex(maxRows, maxCols);
    }

    // ==========================================================================
    // ПУБЛИЧНЫЕ МЕТОДЫ
    // ==========================================================================

    setRange(range: Range, data: T, merge = false): string {
        this.validateRange(range);

        const id = `range_${++this.idCounter}`;
        const timestamp = Date.now() + this.idCounter / 1_000_000;

        const tl = range.topLeft.coordinates;
        const br = range.bottomRight.coordinates;

        let finalData = data;
        if (merge) {
            const existing = this.getCell(tl.rowIndex, tl.columnIndex);
            finalData = this.strategy.merge(existing, data);
        }

        const entry: StyledRange<T> = {
            startRow: tl.rowIndex,
            endRow: br.rowIndex,
            startCol: tl.columnIndex,
            endCol: br.columnIndex,
            data: finalData,
            id,
            timestamp,
        };

        // O(1) append — порядок вставки соответствует порядку timestamp-ов,
        // т.к. idCounter монотонно возрастает и timestamp рассчитывается от него.
        // Ранее здесь был _insertSorted() с O(N) splice; для N=84k это давало O(N²).
        this.ranges.push(entry);
        this.spatialIndex.insert(entry);

        this.needsOptimization = true;

        if (process.env.NODE_ENV !== 'production' && this.ranges.length === this.SOFT_LIMIT) {
            console.warn(
                `[RangeBasedManager] Накоплено ${this.SOFT_LIMIT} ranges. ` +
                    'Рассмотрите замену per-cell вызовов setCell/setRange на setCellsBatch() ' +
                    'для автоматического RLE-сжатия и O(N log N) вставки.',
            );
        }

        // Оптимизируем лениво через requestIdleCallback
        // вместо синхронного вызова на каждую операцию
        if (this.ranges.length > this.OPTIMIZATION_THRESHOLD) {
            this._scheduleOptimize();
        }

        return id;
    }

    setCell(row: number, col: number, data: T, merge = false): void {
        this.setRange(new Range(new Cell({ rowIndex: row, columnIndex: col })), data, merge);
    }

    /**
     * Batch-установка данных для массива ячеек без слияния (merge=false).
     *
     * Перед вставкой выполняется двухпроходное RLE-сжатие:
     *   H-pass: соседние ячейки в одной строке с равными данными → горизонтальная полоса.
     *   V-pass: смежные строки с одинаковым горизонтальным диапазоном и равными данными → прямоугольник.
     *
     * Сложность: O(N log N) вместо O(N²) при N последовательных вызовах setCell().
     * Для 84 000 ячеек пивот-таблицы с единым форматом результат — 1–3 диапазона.
     *
     * Ограничение: merge=false. Для merge=true используйте setCell() per-cell.
     */
    setCellsBatch(cells: Array<{ row: number; col: number; data: T }>): void {
        if (cells.length === 0) return;

        // ── Шаг 1: сортировка по (row, col) для RLE-прохода ──────────────────────
        const sorted = cells.slice().sort((a, b) => (a.row !== b.row ? a.row - b.row : a.col - b.col));

        type RLEEntry = { startRow: number; endRow: number; startCol: number; endCol: number; data: T };

        // ── Шаг 2: H-pass — горизонтальное слияние смежных ячеек одной строки ───
        const hMerged: RLEEntry[] = [];

        for (const { row, col, data } of sorted) {
            const last = hMerged[hMerged.length - 1];
            if (
                last &&
                last.startRow === row &&
                last.endRow === row &&
                last.endCol + 1 === col &&
                this.strategy.equal(last.data, data)
            ) {
                last.endCol = col;
            } else {
                hMerged.push({ startRow: row, endRow: row, startCol: col, endCol: col, data });
            }
        }

        // ── Шаг 3: V-pass — вертикальное слияние смежных строк с одинаковыми колонками ──
        const sortedByCol = hMerged
            .slice()
            .sort((a, b) => (a.startCol !== b.startCol ? a.startCol - b.startCol : a.startRow - b.startRow));
        const rleRanges: RLEEntry[] = [];

        for (const r of sortedByCol) {
            const last = rleRanges[rleRanges.length - 1];
            if (
                last &&
                last.startCol === r.startCol &&
                last.endCol === r.endCol &&
                last.endRow + 1 === r.startRow &&
                this.strategy.equal(last.data, r.data)
            ) {
                last.endRow = r.endRow;
            } else {
                rleRanges.push({ ...r });
            }
        }

        // ── Шаг 4: вставка сжатых диапазонов ────────────────────────────────────
        // Все ranges батча получают строго возрастающие timestamp-ы,
        // что сохраняет инвариант «порядок вставки = порядок timestamp-ов».
        const batchBaseTs = Date.now();

        for (const r of rleRanges) {
            const id = `range_${++this.idCounter}`;
            const timestamp = batchBaseTs + this.idCounter / 1_000_000;
            const entry: StyledRange<T> = {
                startRow: r.startRow,
                endRow: r.endRow,
                startCol: r.startCol,
                endCol: r.endCol,
                data: r.data,
                id,
                timestamp,
            };
            this.ranges.push(entry);
            this.spatialIndex.insert(entry);
        }

        this.needsOptimization = true;

        if (this.ranges.length > this.OPTIMIZATION_THRESHOLD) {
            this._scheduleOptimize();
        }
    }

    // ─── Чтение ───────────────────────────────────────────────────────────────

    getCell(row: number, col: number): T {
        // spatialIndex.query возвращает кандидатов в порядке вставки,
        // которая соответствует порядку timestamp (инвариант: idCounter монотонно
        // возрастает, insert вызывается сразу после push в setRange/setCellsBatch).
        const applicable = this.spatialIndex.query(row, col) as StyledRange<T>[];

        let result = this.strategy.empty();
        for (const r of applicable) {
            result = this.strategy.merge(result, r.data);
        }

        return result;
    }

    getCellsForViewport(minRow: number, maxRow: number, minCol: number, maxCol: number): Map<string, T> {
        const result = new Map<string, T>();

        const affected = (this.spatialIndex.queryRange(minRow, maxRow, minCol, maxCol) as StyledRange<T>[]).sort(
            (a, b) => a.timestamp - b.timestamp,
        );

        for (const sr of affected) {
            const r1 = Math.max(sr.startRow, minRow);
            const r2 = Math.min(sr.endRow, maxRow);
            const c1 = Math.max(sr.startCol, minCol);
            const c2 = Math.min(sr.endCol, maxCol);

            for (let r = r1; r <= r2; r++) {
                for (let c = c1; c <= c2; c++) {
                    const key = this.cellKey(r, c);
                    result.set(key, this.strategy.merge(result.get(key) ?? this.strategy.empty(), sr.data));
                }
            }
        }

        return result;
    }

    // ─── Удаление ─────────────────────────────────────────────────────────────

    removeRange(rangeId: string): boolean {
        const index = this.ranges.findIndex((r) => r.id === rangeId);
        if (index === -1) return false;
        const [removed] = this.ranges.splice(index, 1);
        this.spatialIndex.remove(removed);
        return true;
    }

    clearRange(range: Range): void {
        this.validateRange(range);
        const { rowIndex: startRow, columnIndex: startCol } = range.topLeft.coordinates;
        const { rowIndex: endRow, columnIndex: endCol } = range.bottomRight.coordinates;

        const affected = this.spatialIndex.queryRange(startRow, endRow, startCol, endCol) as StyledRange<T>[];

        for (const sr of affected) {
            this.removeRange(sr.id);
            const fragments = this.subtractRange(sr, startRow, endRow, startCol, endCol);

            for (const frag of fragments) {
                const fragRange = new Range(
                    { rowIndex: frag.startRow, columnIndex: frag.startCol },
                    { rowIndex: frag.endRow, columnIndex: frag.endCol },
                );
                const newId = this.setRange(fragRange, sr.data);
                const newEntry = this.ranges.find((r) => r.id === newId);
                if (newEntry) newEntry.timestamp = sr.timestamp; // сохраняем порядок
            }
        }
    }

    // ─── Структурные операции ─────────────────────────────────────────────────

    shiftRows(fromRow: number, delta: number): void {
        this.ranges = this.ranges.map((e) => {
            if (e.endRow < fromRow) return e;
            if (e.startRow >= fromRow) return { ...e, startRow: e.startRow + delta, endRow: e.endRow + delta };
            return { ...e, endRow: e.endRow + delta };
        });
        this.spatialIndex.rebuild(this.ranges);
    }

    shiftColumns(fromCol: number, delta: number): void {
        this.ranges = this.ranges.map((e) => {
            if (e.endCol < fromCol) return e;
            if (e.startCol >= fromCol) return { ...e, startCol: e.startCol + delta, endCol: e.endCol + delta };
            return { ...e, endCol: e.endCol + delta };
        });
        this.spatialIndex.rebuild(this.ranges);
    }

    deleteRows(fromRow: number, count: number): void {
        const toRow = fromRow + count - 1;
        this.ranges = this.ranges
            .map((e) => {
                if (e.endRow < fromRow) return e;
                if (e.startRow > toRow) return { ...e, startRow: e.startRow - count, endRow: e.endRow - count };
                const newStart = Math.max(e.startRow, fromRow);
                const newEnd = e.endRow > toRow ? e.endRow - count : fromRow - 1;
                if (newEnd < newStart) return null;
                return { ...e, startRow: newStart, endRow: newEnd };
            })
            .filter(Boolean) as StyledRange<T>[];
        this.spatialIndex.rebuild(this.ranges);
    }

    deleteColumns(fromCol: number, count: number): void {
        const toCol = fromCol + count - 1;
        this.ranges = this.ranges
            .map((e) => {
                if (e.endCol < fromCol) return e;
                if (e.startCol > toCol) return { ...e, startCol: e.startCol - count, endCol: e.endCol - count };
                const newStart = Math.max(e.startCol, fromCol);
                const newEnd = e.endCol > toCol ? e.endCol - count : fromCol - 1;
                if (newEnd < newStart) return null;
                return { ...e, startCol: newStart, endCol: newEnd };
            })
            .filter(Boolean) as StyledRange<T>[];
        this.spatialIndex.rebuild(this.ranges);
    }

    // ─── Оптимизация ──────────────────────────────────────────────────────────

    optimize(): void {
        if (!this.needsOptimization) return;

        const countBefore = this.ranges.length;
        this._lastOptimizeInputCount = countBefore;

        this.removeOverlappedRanges();
        this.mergeAdjacentRanges();
        // Восстанавливаем инвариант после слияний (они могут менять порядок)
        this.ranges.sort((a, b) => a.timestamp - b.timestamp);
        this.spatialIndex.rebuild(this.ranges);
        this.needsOptimization = false;

        if (process.env.NODE_ENV !== 'production' && this.ranges.length >= countBefore && countBefore > 1_000) {
            console.warn(
                `[RangeBasedManager] optimize() не уменьшил количество ranges: ${countBefore} → ${this.ranges.length}. ` +
                    'Возможно, данные принципиально неоднородны или слишком много перекрывающихся несмежных ranges.',
            );
        }
    }

    clear(): void {
        this.ranges = [];
        this._lastOptimizeInputCount = 0;
        this.spatialIndex.rebuild([]);
    }

    // ─── Импорт / Экспорт ─────────────────────────────────────────────────────

    export(): { ranges: StyledRange<T>[] } {
        return { ranges: [...this.ranges] };
    }

    import(data: { ranges: StyledRange<T>[] }): void {
        this.ranges = data.ranges;
        this.spatialIndex.rebuild(this.ranges);
        this.idCounter = Math.max(0, ...this.ranges.map((r) => parseInt(r.id.replace('range_', ''), 10)));
        // Импортируемые данные считаются уже оптимизированными
        this.needsOptimization = false;
        this._lastOptimizeInputCount = this.ranges.length;
    }

    getRanges(): StyledRange<T>[] {
        return [...this.ranges];
    }

    getRangeCount(): number {
        return this.ranges.length;
    }

    /**
     * Диагностика для DevTools: возвращает метрики текущего состояния менеджера.
     */
    getStats(): { count: number; needsOptimization: boolean; lastOptimizeInputCount: number } {
        return {
            count: this.ranges.length,
            needsOptimization: this.needsOptimization,
            lastOptimizeInputCount: this._lastOptimizeInputCount,
        };
    }

    // ==========================================================================
    // ПРИВАТНЫЕ МЕТОДЫ
    // ==========================================================================

    private _scheduleOptimize(): void {
        if (this._optimizeScheduled) return;

        // Защита от feedback-loop: не планируем повторную оптимизацию,
        // если с момента последнего запуска добавилось менее OPTIMIZATION_THRESHOLD новых ranges.
        // Это предотвращает ситуацию, когда optimize() не уменьшает количество ranges
        // (неоднородные данные), а новые setRange-вызовы постоянно перепланируют оптимизацию.
        if (
            this._lastOptimizeInputCount > 0 &&
            this.ranges.length < this._lastOptimizeInputCount + this.OPTIMIZATION_THRESHOLD
        ) {
            return;
        }

        this._optimizeScheduled = true;

        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(
                () => {
                    this._optimizeScheduled = false;
                    if (this.needsOptimization) this.optimize();
                },
                { timeout: 2000 }, // принудительно через 2 секунды
            );
        } else {
            // Fallback для окружений без requestIdleCallback (SSR, тесты)
            setTimeout(() => {
                this._optimizeScheduled = false;
                if (this.needsOptimization) this.optimize();
            }, 200);
        }
    }

    private _insertSorted(_entry: StyledRange<T>): void {
        // Метод оставлен для обратной совместимости, но больше не вызывается.
        // setRange/setCellsBatch используют this.ranges.push() для O(1) вставки.
        // Порядок гарантируется монотонным idCounter и расчётом timestamp от него.
    }

    protected cellKey(row: number, col: number): string {
        return `${row}:${col}`;
    }

    protected validateRange(range: Range): void {
        const tl = range.topLeft.coordinates;
        const br = range.bottomRight.coordinates;
        if (tl.rowIndex > br.rowIndex || tl.columnIndex > br.columnIndex)
            throw new Error('Invalid range: start must be <= end');
        if (tl.rowIndex < 0 || tl.columnIndex < 0) throw new Error('Invalid range: negative coordinates');
    }

    /** Переиспользуемый сдвиг ключей Map — возвращает null для удаляемых ячеек */
    protected shiftOverrideKeys(
        overrides: Map<string, T>,
        transform: (row: number, col: number) => [number, number] | null,
    ): Map<string, T> {
        const result = new Map<string, T>();
        for (const [key, data] of overrides) {
            const [r, c] = key.split(':').map(Number);
            const next = transform(r, c);
            if (next) result.set(this.cellKey(next[0], next[1]), data);
        }
        return result;
    }

    protected subtractRange(
        source: CellRange,
        cutStartRow: number,
        cutEndRow: number,
        cutStartCol: number,
        cutEndCol: number,
    ): CellRange[] {
        if (
            cutEndRow < source.startRow ||
            cutStartRow > source.endRow ||
            cutEndCol < source.startCol ||
            cutStartCol > source.endCol
        )
            return [source];

        const fragments: CellRange[] = [];
        if (source.startRow < cutStartRow)
            fragments.push({
                startRow: source.startRow,
                endRow: cutStartRow - 1,
                startCol: source.startCol,
                endCol: source.endCol,
            });
        if (source.endRow > cutEndRow)
            fragments.push({
                startRow: cutEndRow + 1,
                endRow: source.endRow,
                startCol: source.startCol,
                endCol: source.endCol,
            });

        const midR1 = Math.max(source.startRow, cutStartRow);
        const midR2 = Math.min(source.endRow, cutEndRow);
        if (source.startCol < cutStartCol)
            fragments.push({ startRow: midR1, endRow: midR2, startCol: source.startCol, endCol: cutStartCol - 1 });
        if (source.endCol > cutEndCol)
            fragments.push({ startRow: midR1, endRow: midR2, startCol: cutEndCol + 1, endCol: source.endCol });

        return fragments;
    }

    /**
     * Удаляет диапазоны, полностью перекрытые более новыми диапазонами.
     *
     * Оригинальный алгоритм: O(N²) двойной цикл — при N=84k это ~7×10⁹ пар.
     * Новый алгоритм: O(N × k) через SpatialIndex.queryRange, где k — среднее число
     * пересекающихся ranges (обычно 1–3 для типичных pivot-таблиц).
     */
    private removeOverlappedRanges(): void {
        // Сортируем по timestamp: более старые ranges первыми.
        this.ranges.sort((a, b) => a.timestamp - b.timestamp);

        const toRemove = new Set<string>();

        for (const inner of this.ranges) {
            if (toRemove.has(inner.id)) continue;

            // SpatialIndex.queryRange возвращает только ranges, пересекающиеся с inner.
            // Из них фильтруем те, что полностью ПОКРЫВАЮТ inner и строго новее его.
            // Это заменяет внутренний цикл O(N) на O(k) с k << N.
            const candidates = this.spatialIndex.queryRange(
                inner.startRow,
                inner.endRow,
                inner.startCol,
                inner.endCol,
            ) as StyledRange<T>[];

            for (const outer of candidates) {
                if (outer.id === inner.id) continue;
                if (toRemove.has(outer.id)) continue;
                // outer должен быть строго новее inner, чтобы перекрыть его
                if (outer.timestamp <= inner.timestamp) continue;
                if (this.fullyCovers(outer, inner) && this._subsumes(outer.data, inner.data)) {
                    toRemove.add(inner.id);
                    break;
                }
            }
        }

        if (toRemove.size > 0) {
            this.ranges = this.ranges.filter((r) => !toRemove.has(r.id));
        }
    }

    /**
     * Проверяет, замещает ли outer данные inner по смыслу (через стратегию).
     * Если стратегия не определяет subsumes — считаем что замещает (старое поведение).
     */
    private _subsumes(outer: T, inner: T): boolean {
        if (this.strategy.subsumes) {
            return this.strategy.subsumes(outer, inner);
        }
        return true;
    }

    private mergeAdjacentRanges(): void {
        // O(N log N) с сортировкой: за один проход объединяем все горизонтальные смежные
        // диапазоны, потом все вертикальные.

        // Шаг 1: сортируем для детерминированного порядка
        const sorted = [...this.ranges].sort((a, b) =>
            a.startRow !== b.startRow ? a.startRow - b.startRow : a.startCol - b.startCol,
        );

        const merged: StyledRange<T>[] = [];

        // Шаг 2: горизонтальное слияние (одна строка, смежные колонки)
        for (const range of sorted) {
            const last = merged[merged.length - 1];
            if (
                last &&
                last.startRow === range.startRow &&
                last.endRow === range.endRow &&
                last.endCol + 1 === range.startCol &&
                this.strategy.equal(last.data, range.data)
            ) {
                merged[merged.length - 1] = {
                    ...last,
                    endCol: range.endCol,
                    timestamp: Math.max(last.timestamp, range.timestamp),
                };
            } else {
                merged.push({ ...range });
            }
        }

        // Шаг 3: вертикальное слияние (смежные строки, одни и те же колонки)
        const vertMerged: StyledRange<T>[] = [];
        const sortedByCol = [...merged].sort((a, b) =>
            a.startCol !== b.startCol ? a.startCol - b.startCol : a.startRow - b.startRow,
        );

        for (const range of sortedByCol) {
            const last = vertMerged[vertMerged.length - 1];
            if (
                last &&
                last.startCol === range.startCol &&
                last.endCol === range.endCol &&
                last.endRow + 1 === range.startRow &&
                this.strategy.equal(last.data, range.data)
            ) {
                vertMerged[vertMerged.length - 1] = {
                    ...last,
                    endRow: range.endRow,
                    timestamp: Math.max(last.timestamp, range.timestamp),
                };
            } else {
                vertMerged.push({ ...range });
            }
        }

        this.ranges = vertMerged;
    }

    private fullyCovers(outer: CellRange, inner: CellRange): boolean {
        return (
            outer.startRow <= inner.startRow &&
            outer.endRow >= inner.endRow &&
            outer.startCol <= inner.startCol &&
            outer.endCol >= inner.endCol
        );
    }

    private tryMerge(r1: StyledRange<T>, r2: StyledRange<T>): StyledRange<T> | null {
        const ts = Math.max(r1.timestamp, r2.timestamp);
        // Горизонтальное слияние
        if (
            r1.startRow === r2.startRow &&
            r1.endRow === r2.endRow &&
            (r1.endCol + 1 === r2.startCol || r2.endCol + 1 === r1.startCol)
        ) {
            return {
                ...r1,
                startCol: Math.min(r1.startCol, r2.startCol),
                endCol: Math.max(r1.endCol, r2.endCol),
                timestamp: ts,
            };
        }
        // Вертикальное слияние
        if (
            r1.startCol === r2.startCol &&
            r1.endCol === r2.endCol &&
            (r1.endRow + 1 === r2.startRow || r2.endRow + 1 === r1.startRow)
        ) {
            return {
                ...r1,
                startRow: Math.min(r1.startRow, r2.startRow),
                endRow: Math.max(r1.endRow, r2.endRow),
                timestamp: ts,
            };
        }
        return null;
    }
}
