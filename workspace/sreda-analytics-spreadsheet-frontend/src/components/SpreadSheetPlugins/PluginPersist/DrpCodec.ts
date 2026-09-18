import { Cell, JoinedCell, Range } from '../../AdapterSpreadSheet/models';
import { IPlugin, PluginStatesMap } from '../../AdapterSpreadSheet/plugin/Plugin';
import { ICell, ObjectIndexes } from '../../AdapterSpreadSheet/types';
import { DRP_FORMAT_VERSION, DRP_GENERATOR } from './constants';
import { migrateFinanceToNumber } from './migrations';
import { FormatDetector } from './strategies/FormatDetector';
import { DrpCellEntry, DrpFileWrapper, DrpMeta, DrpPayload } from './types';
import { extractCellCoords, isPlainCellLike, isPlainJoinedCellLike, isPlainRangeLike } from './utils';

// ─── JSON replacer ────────────────────────────────────────────────────────────
//
// Теги __drpType позволяют ревайверу точно восстановить типизированные объекты.
// Функции удаляются (onClick и т.д. — application-level logic, не данные).

export function drpReplacer(_key: string, value: unknown): unknown {
    if (typeof value === 'function') return undefined;
    if (value === null || typeof value !== 'object') return value;

    const ctorName = (value as any).constructor?.name;

    if (ctorName === 'Range') {
        const r = value as Range;
        return {
            __drpType: 'Range',
            start: r.start,
            end: r.end,
            cursorCoords: r.cursor.coordinates,
        };
    }

    if (ctorName === 'Cell') {
        const c = value as Cell;
        return { __drpType: 'Cell', ...c.coordinates };
    }

    if (ctorName === 'JoinedCell') {
        const jc = value as JoinedCell;
        return {
            __drpType: 'JoinedCell',
            rangeStart: jc.range.start,
            rangeEnd: jc.range.end,
            mainCellCoords: jc.mainCell.coordinates,
        };
    }

    if (value instanceof Map) {
        return {
            __drpType: 'Map',
            entries: Array.from((value as Map<unknown, unknown>).entries()),
        };
    }

    return value;
}

// ─── JSON reviver ─────────────────────────────────────────────────────────────
//
// JSON.parse обходит дерево снизу вверх: к моменту обработки Range
// вложенные start/end уже представлены как plain ObjectIndexes.
//
// ВАЖНО: Для обратной совместимости со старыми DRP-файлами, где Range/Cell/JoinedCell
// сохранены как plain objects без __drpType, добавлен fallback по структуре объекта.

export function drpReviver(_key: string, value: unknown): unknown {
    if (typeof value !== 'object' || value === null) return value;

    const v = value as Record<string, unknown>;

    // Если есть __drpType — восстанавливаем по нему (новый формат)
    if (v.__drpType) {
        switch (v.__drpType) {
            case 'Cell':
                return new Cell({
                    rowIndex: v.rowIndex as number,
                    columnIndex: v.columnIndex as number,
                });

            case 'Range': {
                const start = v.start as ObjectIndexes;
                const end = v.end as ObjectIndexes;
                const cursorCoords = v.cursorCoords as ObjectIndexes | null;
                return new Range(new Cell(start), new Cell(end), cursorCoords ? new Cell(cursorCoords) : null);
            }

            case 'JoinedCell': {
                const rangeStart = v.rangeStart as ObjectIndexes;
                const rangeEnd = v.rangeEnd as ObjectIndexes;
                const mainCellCoords = v.mainCellCoords as ObjectIndexes;
                const range = new Range(new Cell(rangeStart), new Cell(rangeEnd));
                const mainCell = new Cell(mainCellCoords);
                // JoinedCell требует size >= 2; одиночные ячейки игнорируем
                return range.size >= 2 ? new JoinedCell(range, mainCell) : null;
            }

            case 'Map':
                return new Map(v.entries as [unknown, unknown][]);

            default:
                return value;
        }
    }

    // Быстрый выход для большинства узлов
    if (v._start === undefined && v._rowIndex === undefined && v._range === undefined) return value;

    // Fallback для старых DRP-файлов: детекция plain objects по структуре
    if (isPlainRangeLike(v)) {
        const start = v._start as ObjectIndexes;
        const end = v._end as ObjectIndexes;
        const cursorCoords = v._cursor as ObjectIndexes | null;
        return new Range(new Cell(start), new Cell(end), cursorCoords ? new Cell(cursorCoords) : null);
    }

    if (isPlainCellLike(v)) {
        return new Cell({
            rowIndex: v._rowIndex as number,
            columnIndex: v._columnIndex as number,
        });
    }

    if (isPlainJoinedCellLike(v)) {
        const range = v._range as Record<string, unknown>;
        const mainCell = v._mainCell as Record<string, unknown>;
        const rangeStart = (range._start ?? range.start) as ObjectIndexes;
        const rangeEnd = (range._end ?? range.end) as ObjectIndexes;
        const mainCellCoords = extractCellCoords(mainCell);
        const resultRange = new Range(new Cell(rangeStart), new Cell(rangeEnd));
        const resultMainCell = new Cell(mainCellCoords);
        return resultRange.size >= 2 ? new JoinedCell(resultRange, resultMainCell) : null;
    }

    return value;
}

/**
 * Разбирает DRP-документ значительно быстрее, чем `JSON.parse(json, drpReviver)`.
 *
 * Причина разницы: встроенный ревайвер вызывается движком на КАЖДОМ узле дерева
 * и на каждом переопределяет свойство родителя через внутренний DefineProperty.
 * Этот протокол и стоит дорого, а не сама логика восстановления типов.
 * Разбор без ревайвера выполняется быстрым нативным кодом, после чего дерево
 * обходится один раз обычной рекурсией.
 *
 * Результат идентичен: обход идёт снизу вверх (родитель видит уже восстановленных
 * детей), ключи drpReviver не использует, а undefined он не возвращает никогда,
 * поэтому удалять свойства, как это делает встроенный ревайвер, не требуется.
 */
/** Применяет drpReviver ко всему дереву снизу вверх. Изменяет объект на месте. */
function reviveDrpTree(value: unknown): unknown {
    if (value === null || typeof value !== 'object') return value;

    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            value[i] = reviveDrpTree(value[i]);
        }
    } else {
        const obj = value as Record<string, unknown>;
        for (const key in obj) {
            // __proto__ пропускаем: обычное присваивание по этому ключу подменило бы
            // прототип объекта, тогда как встроенный ревайвер создаёт обычное свойство
            if (key !== '__proto__' && Object.prototype.hasOwnProperty.call(obj, key)) {
                obj[key] = reviveDrpTree(obj[key]);
            }
        }
    }

    return drpReviver('', value);
}
export function parseDrpJson(json: string): unknown {
    return reviveDrpTree(JSON.parse(json));
}

// ─── Checksum (djb2) ──────────────────────────────────────────────────────────
//
// Быстрый 32-битный хэш без внешних зависимостей.
// Используется для проверки целостности файла при загрузке.

export function djb2Checksum(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
        hash |= 0; // приводим к int32
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

// ─── Compression (CompressionStream API) ─────────────────────────────────────
//
// Поток читается ОДНОВРЕМЕННО с записью, через pipeThrough.
// Писать всё целиком, ждать writer.close() и только потом читать
// readable нельзя. У TransformStream внутренняя очередь ограничена: на больших
// данных она переполняется, backpressure не даёт close() завершиться, а
// разгребать очередь некому, читатель ещё не запущен. Получается дедлок.

/**
 * Верхняя граница ожидания сжатия. Это страховка от зависания, а не ограничение
 * скорости: схема на 28 МБ сжимается примерно за 0.3 секунды.
 */
const GZIP_TIMEOUT_MS = 15_000;

/**
 * Пытается сжать данные через CompressionStream.
 * Если API нет, ошибка или таймаут — возвращает null, и вызывающий код
 * сохраняет несжатый JSON.
 *
 * Blob кодирует строку в UTF-8 сам, поэтому отдельный TextEncoder не нужен
 * и в памяти не появляется ещё одна полная копия данных.
 */
async function tryGzip(data: string): Promise<Uint8Array | null> {
    if (typeof CompressionStream === 'undefined') return null;

    try {
        const compression = (async () => {
            const compressed = new Blob([data]).stream().pipeThrough(new CompressionStream('gzip'));
            return new Uint8Array(await new Response(compressed).arrayBuffer());
        })();

        const timeout = new Promise<null>((resolve) => {
            setTimeout(() => resolve(null), GZIP_TIMEOUT_MS);
        });

        const result = await Promise.race([compression, timeout]);

        if (result === null) {
            // eslint-disable-next-line no-console
            console.warn(`[DRP] Сжатие не уложилось в ${GZIP_TIMEOUT_MS} мс, файл сохраняется без сжатия`);
        }

        return result;
    } catch (error) {
        // Отказ от сжатия увеличивает файл в 10-15 раз, поэтому он не должен
        // проходить незаметно: раньше пустой catch скрывал причину полностью.
        // eslint-disable-next-line no-console
        console.warn('[DRP] Сжатие не удалось, файл сохраняется без сжатия:', error);
        return null;
    }
}

export async function gunzip(bytes: Uint8Array): Promise<string> {
    const decompressed = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(decompressed).text();
}

// ─── Base64 ───────────────────────────────────────────────────────────────────

export function toBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
}

// ─── Public DrpCodec ──────────────────────────────────────────────────────────

export class DrpCodec {
    // ── Encode ────────────────────────────────────────────────────────────────

    /**
     * Сериализует DrpPayload в строку-содержимое .drp файла.
     *
     * Алгоритм:
     *   1. JSON.stringify(payload, drpReplacer) -> rawJson
     *   2. djb2(rawJson)                        -> checksum
     *   3. gzip(rawJson) -> base64               -> data (если compress=true и API доступен)
     *   4. JSON.stringify(DrpFileWrapper)        -> итоговая строка
     */
    static async encode(payload: DrpPayload, compress = true): Promise<string> {
        const rawJson = JSON.stringify(payload, drpReplacer);
        const checksum = djb2Checksum(rawJson);

        if (compress) {
            const compressed = await tryGzip(rawJson);
            if (compressed) {
                const wrapper: DrpFileWrapper = {
                    __drp: DRP_FORMAT_VERSION,
                    encoding: 'gzip+base64',
                    data: toBase64(compressed),
                    checksum,
                };
                return JSON.stringify(wrapper, null, 2);
            }
        }

        const wrapper: DrpFileWrapper = {
            __drp: DRP_FORMAT_VERSION,
            encoding: 'none',
            data: rawJson,
            checksum,
        };
        return JSON.stringify(wrapper, null, 2);
    }

    // ── Decode ────────────────────────────────────────────────────────────────

    /**
     * Разбирает содержимое .drp файла в DrpPayload.
     * Поддерживает два формата: новый JSON-формат и старый ZIP-формат.
     * Для устаревших форматов применяет миграции.
     *
     * @param content - сырые байты файла (ArrayBuffer)
     * @throws {Error} если файл повреждён, неизвестного формата или несовместимой версии
     */
    static async decode(content: ArrayBuffer): Promise<DrpPayload> {
        const strategy = FormatDetector.detect(content);
        const payload = await strategy.decode(content);

        if (strategy.isLegacy) {
            migrateFinanceToNumber(payload);
        }

        return payload;
    }

    // ── Cells ─────────────────────────────────────────────────────────────────

    static serializeCells(matrix: ReadonlyMap<number, ReadonlyMap<number, ICell>>): DrpCellEntry[] {
        const entries: DrpCellEntry[] = [];
        for (const [row, rowMap] of matrix) {
            for (const [col, cell] of rowMap) {
                entries.push({ row: Number(row), col: Number(col), cell });
            }
        }
        return entries;
    }

    static deserializeCells(entries: DrpCellEntry[]): Map<number, Map<number, ICell>> {
        const matrix = new Map<number, Map<number, ICell>>();
        for (const { row, col, cell } of entries) {
            const r = Number(row);
            const c = Number(col);
            if (!matrix.has(r)) matrix.set(r, new Map<number, ICell>());
            matrix.get(r)!.set(c, cell as ICell);
        }
        return matrix;
    }

    // ── Plugin states ─────────────────────────────────────────────────────────

    /**
     * Собирает состояния плагинов для сохранения.
     *
     * Приоритет:
     *   1. plugin.export() — если плагин реализует собственный экспорт
     *   2. Общая сериализация через drpReplacer (Range/Cell/JoinedCell -> plain objects)
     */
    static async serializePluginStates(
        plugins: readonly IPlugin[],
        getState: (key: string) => unknown,
        keysFilter?: string[],
    ): Promise<Record<string, unknown>> {
        const result: Record<string, unknown> = {};

        for (const plugin of plugins) {
            const key = plugin.key as string;
            if (keysFilter && !keysFilter.includes(key)) continue;

            try {
                // Собственный экспорт плагина имеет приоритет
                if (typeof (plugin as any).export === 'function') {
                    const exported = (await (plugin as any).export()) as { key: string; state: unknown } | undefined;
                    if (exported?.state !== undefined) {
                        result[key] = JSON.parse(JSON.stringify(exported.state, drpReplacer));
                        continue;
                    }
                }

                // Общая сериализация
                const state = getState(key);
                result[key] = JSON.parse(JSON.stringify(state, drpReplacer));
            } catch {
                // Плагин с несериализуемым состоянием пропускаем без ошибки
            }
        }

        return result;
    }

    /**
     * Восстанавливает состояния плагинов из сохранённого снапшота.
     * drpReviver реконструирует Range/Cell/JoinedCell из plain objects.
     */
    static deserializePluginStates(data: Record<string, unknown>): PluginStatesMap {
        const result: PluginStatesMap = {};
        for (const [key, value] of Object.entries(data)) {
            try {
                result[key] = parseDrpJson(JSON.stringify(value)) as PluginStatesMap[string];
            } catch {
                // Пропускаем повреждённые слайсы
            }
        }
        return result;
    }

    // ── Validation ────────────────────────────────────────────────────────────

    static validate(payload: DrpPayload): void {
        // Для legacy-формата пропускаем строгие проверки
        if (payload.meta?.generator === 'legacy') {
            // Убедимся, что обязательные поля хотя бы присутствуют
            if (!payload.styles) payload.styles = { ranges: [] };
            if (!payload.pluginConfigs) payload.pluginConfigs = { ranges: [] };
            if (!Array.isArray(payload.cells)) payload.cells = [];
            return;
        }

        const errors: string[] = [];

        if (!payload.meta?.savedAt) errors.push('отсутствуют метаданные (meta.savedAt)');

        if (!Array.isArray(payload.cells)) errors.push('отсутствует массив ячеек (cells)');

        if (!payload.styles || !Array.isArray(payload.styles.ranges))
            errors.push('некорректная структура стилей (styles.ranges)');

        if (!payload.pluginConfigs || !Array.isArray(payload.pluginConfigs.ranges))
            errors.push('некорректная структура конфигураций (pluginConfigs.ranges)');

        if (errors.length > 0) {
            throw new Error(`Невалидный DRP-файл: ${errors.join('; ')}`);
        }
    }

    // ── Meta factory ──────────────────────────────────────────────────────────

    static buildMeta(comment?: string): DrpMeta {
        return {
            savedAt: Date.now(),
            generator: DRP_GENERATOR,
            version: DRP_FORMAT_VERSION,
            ...(comment ? { comment } : {}),
        };
    }
}
