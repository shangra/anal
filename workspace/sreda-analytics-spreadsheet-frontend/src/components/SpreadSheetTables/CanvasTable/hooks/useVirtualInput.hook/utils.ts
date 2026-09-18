import { VirtualInputState } from './types';

// ─── Platform ──────────────────────────────────────────────────────────────────
export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

// ─── Word boundaries ───────────────────────────────────────────────────────────

/** Совпадает с \w браузера: буквы, цифры, underscore */
export function isWordChar(ch: string | undefined): boolean {
    return ch !== undefined && /\w/.test(ch);
}

// ─── Selection helpers ─────────────────────────────────────────────────────────

/** Focus — подвижный конец выделения (тот, который двигается при Shift+Arrow) */
export function getFocus(state: VirtualInputState): number {
    return state.selectionDirection === 'backward' ? state.selectionStart : state.selectionEnd;
}

/** Anchor — фиксированный конец выделения */
export function getAnchor(state: VirtualInputState): number {
    return state.selectionDirection === 'backward' ? state.selectionEnd : state.selectionStart;
}

export function hasSelection(state: VirtualInputState): boolean {
    return state.selectionStart !== state.selectionEnd;
}

function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
}

// ─── Cursor / selection setters ────────────────────────────────────────────────

/** Поставить cursor (без выделения) */
export function setCursor(state: VirtualInputState, pos: number): VirtualInputState {
    const p = clamp(pos, 0, state.value.length);
    return { ...state, selectionStart: p, selectionEnd: p, selectionDirection: 'none' };
}

/**
 * Переместить focus, сохраняя anchor на месте.
 * Именно так работают все Shift+Arrow комбинации.
 */
export function moveFocus(state: VirtualInputState, newFocus: number): VirtualInputState {
    const anchor = getAnchor(state);
    const focus = clamp(newFocus, 0, state.value.length);

    if (focus === anchor) {
        return { ...state, selectionStart: anchor, selectionEnd: anchor, selectionDirection: 'none' };
    }
    if (focus > anchor) {
        return { ...state, selectionStart: anchor, selectionEnd: focus, selectionDirection: 'forward' };
    }
    return { ...state, selectionStart: focus, selectionEnd: anchor, selectionDirection: 'backward' };
}

/** Установить произвольное выделение (для mouse selection) */
export function setSelection(
    state: VirtualInputState,
    start: number,
    end: number,
    direction: VirtualInputState['selectionDirection'] = 'forward',
): VirtualInputState {
    const len = state.value.length;
    return {
        ...state,
        selectionStart: clamp(Math.min(start, end), 0, len),
        selectionEnd: clamp(Math.max(start, end), 0, len),
        selectionDirection: direction,
    };
}

/** Выделить слово под позицией pos (для double-click) */
export function selectWordAt(state: VirtualInputState, pos: number): VirtualInputState {
    const { value } = state;
    const p = clamp(pos, 0, value.length);

    // Если позиция не на word-символе — просто поставить cursor
    if (!isWordChar(value[p]) && !isWordChar(value[p - 1])) {
        return setCursor(state, p);
    }

    let start = p;
    let end = p;
    while (start > 0 && isWordChar(value[start - 1])) start--;
    while (end < value.length && isWordChar(value[end])) end++;

    return { ...state, selectionStart: start, selectionEnd: end, selectionDirection: 'forward' };
}

// ─── Обновление findWordStartBefore / findWordEndAfter ─────────────────────────

/**
 * Находит начало слова левее позиции pos (как Ctrl/Option+Left в браузере).
 * Алгоритм: сначала пропускаем не-word символы влево, затем word-символы влево.
 */
export function findWordStartBefore(value: string, pos: number): number {
    let p = pos;
    // Не переходим на предыдущую строку
    const lineStart = value.lastIndexOf('\n', p - 1) + 1;
    while (p > lineStart && !isWordChar(value[p - 1])) p--;
    while (p > lineStart && isWordChar(value[p - 1])) p--;
    return p;
}

/**
 * Находит конец слова правее позиции pos (как Ctrl/Option+Right в браузере).
 * Алгоритм: пропускаем не-word символы вправо, затем word-символы вправо.
 */
export function findWordEndAfter(value: string, pos: number): number {
    let p = pos;
    const nextNewline = value.indexOf('\n', p);
    const lineEnd = nextNewline === -1 ? value.length : nextNewline;
    while (p < lineEnd && !isWordChar(value[p])) p++;
    while (p < lineEnd && isWordChar(value[p])) p++;
    return p;
}

// ─── Navigation (без Shift) ────────────────────────────────────────────────────

export function moveLeft(state: VirtualInputState, word = false): VirtualInputState {
    // Без word-мода при наличии выделения — схлопываем к левому краю
    if (!word && hasSelection(state)) return setCursor(state, state.selectionStart);

    const focus = getFocus(state);
    const newPos = word ? findWordStartBefore(state.value, focus) : Math.max(0, focus - 1);
    return setCursor(state, newPos);
}

export function moveRight(state: VirtualInputState, word = false): VirtualInputState {
    // Без word-мода при наличии выделения — схлопываем к правому краю
    if (!word && hasSelection(state)) return setCursor(state, state.selectionEnd);

    const focus = getFocus(state);
    const newPos = word ? findWordEndAfter(state.value, focus) : Math.min(state.value.length, focus + 1);
    return setCursor(state, newPos);
}

export function moveToStart(state: VirtualInputState): VirtualInputState {
    return setCursor(state, 0);
}

export function moveToEnd(state: VirtualInputState): VirtualInputState {
    return setCursor(state, state.value.length);
}

// ─── Selection extension (с Shift) ────────────────────────────────────────────

export function selectLeft(state: VirtualInputState, word = false): VirtualInputState {
    const focus = getFocus(state);
    const newFocus = word ? findWordStartBefore(state.value, focus) : Math.max(0, focus - 1);
    return moveFocus(state, newFocus);
}

export function selectRight(state: VirtualInputState, word = false): VirtualInputState {
    const focus = getFocus(state);
    const newFocus = word ? findWordEndAfter(state.value, focus) : Math.min(state.value.length, focus + 1);
    return moveFocus(state, newFocus);
}

export function selectToStart(state: VirtualInputState): VirtualInputState {
    return moveFocus(state, 0);
}

export function selectToEnd(state: VirtualInputState): VirtualInputState {
    return moveFocus(state, state.value.length);
}

export function selectAll(state: VirtualInputState): VirtualInputState {
    return {
        ...state,
        selectionStart: 0,
        selectionEnd: state.value.length,
        selectionDirection: 'forward',
    };
}

// ─── Text mutation ─────────────────────────────────────────────────────────────

/** Удалить выделенный фрагмент, вернуть cursor в selectionStart */
export function deleteSelected(state: VirtualInputState): VirtualInputState {
    if (!hasSelection(state)) return state;
    const { value, selectionStart, selectionEnd } = state;
    return {
        value: value.slice(0, selectionStart) + value.slice(selectionEnd),
        selectionStart,
        selectionEnd: selectionStart,
        selectionDirection: 'none',
    };
}

/**
 * Вставить текст в текущую позицию курсора.
 * Если есть выделение — сначала удаляет его (поведение браузера).
 */
export function insertText(state: VirtualInputState, text: string, maxLength?: number): VirtualInputState {
    const base = hasSelection(state) ? deleteSelected(state) : state;
    const { value, selectionStart } = base;

    let chunk = text;
    if (maxLength !== undefined) {
        const remaining = maxLength - value.length;
        if (remaining <= 0) return base;
        chunk = text.slice(0, remaining);
    }

    const newValue = value.slice(0, selectionStart) + chunk + value.slice(selectionStart);
    const newPos = selectionStart + chunk.length;

    return { value: newValue, selectionStart: newPos, selectionEnd: newPos, selectionDirection: 'none' };
}

/** Backspace: удаляет выделение или символ/слово слева от cursor */
export function deleteBackward(state: VirtualInputState, word = false): VirtualInputState {
    if (hasSelection(state)) return deleteSelected(state);

    const { value, selectionStart: pos } = state;
    if (pos === 0) return state;

    const deleteFrom = word ? findWordStartBefore(value, pos) : pos - 1;
    const newValue = value.slice(0, deleteFrom) + value.slice(pos);

    return { value: newValue, selectionStart: deleteFrom, selectionEnd: deleteFrom, selectionDirection: 'none' };
}

/** Delete: удаляет выделение или символ/слово справа от cursor */
export function deleteForward(state: VirtualInputState, word = false): VirtualInputState {
    if (hasSelection(state)) return deleteSelected(state);

    const { value, selectionStart: pos } = state;
    if (pos === value.length) return state;

    const deleteTo = word ? findWordEndAfter(value, pos) : pos + 1;
    const newValue = value.slice(0, pos) + value.slice(deleteTo);

    return { value: newValue, selectionStart: pos, selectionEnd: pos, selectionDirection: 'none' };
}

// ─── Line utilities ────────────────────────────────────────────────────────────

export interface LineInfo {
    lines: string[];
    lineIndex: number; // индекс строки, на которой находится pos
    lineStart: number; // абсолютный индекс начала этой строки в value
    lineEnd: number; // абсолютный индекс конца строки (без \n)
    colOffset: number; // позиция внутри строки
}

export function getLines(value: string): string[] {
    return value.split('\n');
}

export function getLineStart(lines: string[], lineIndex: number): number {
    let start = 0;
    for (let i = 0; i < lineIndex; i++) {
        start += lines[i].length + 1; // +1 за \n
    }
    return start;
}

export function getLineInfo(value: string, pos: number): LineInfo {
    const lines = value.split('\n');
    let lineStart = 0;

    for (let i = 0; i < lines.length; i++) {
        const lineEnd = lineStart + lines[i].length;
        if (pos <= lineEnd || i === lines.length - 1) {
            return {
                lines,
                lineIndex: i,
                lineStart,
                lineEnd,
                colOffset: pos - lineStart,
            };
        }
        lineStart = lineEnd + 1;
    }

    // fallback (никогда не достигается)
    return { lines, lineIndex: 0, lineStart: 0, lineEnd: lines[0].length, colOffset: 0 };
}

// ─── Per-line Home / End ───────────────────────────────────────────────────────

export function moveToLineStart(state: VirtualInputState): VirtualInputState {
    const info = getLineInfo(state.value, getFocus(state));
    return setCursor(state, info.lineStart);
}

export function moveToLineEnd(state: VirtualInputState): VirtualInputState {
    const info = getLineInfo(state.value, getFocus(state));
    return setCursor(state, info.lineEnd);
}

export function selectToLineStart(state: VirtualInputState): VirtualInputState {
    const info = getLineInfo(state.value, getFocus(state));
    return moveFocus(state, info.lineStart);
}

export function selectToLineEnd(state: VirtualInputState): VirtualInputState {
    const info = getLineInfo(state.value, getFocus(state));
    return moveFocus(state, info.lineEnd);
}

// ─── Vertical navigation ───────────────────────────────────────────────────────

/**
 * desiredCol: колонка, которую хотим сохранить при движении вверх/вниз.
 * null означает "использовать текущую колонку".
 * Возвращает { state, newDesiredCol } — хук сам управляет desiredColRef.
 */
export function moveUp(
    state: VirtualInputState,
    shift: boolean,
    desiredCol: number | null,
): { state: VirtualInputState; newDesiredCol: number } {
    const focus = getFocus(state);
    const info = getLineInfo(state.value, focus);
    const col = desiredCol ?? info.colOffset;

    if (info.lineIndex === 0) {
        // Уже на первой строке — идём в начало документа
        const next = shift ? moveFocus(state, 0) : setCursor(state, 0);
        return { state: next, newDesiredCol: col };
    }

    const prevIdx = info.lineIndex - 1;
    const prevStart = getLineStart(info.lines, prevIdx);
    const prevLine = info.lines[prevIdx];
    const newPos = prevStart + Math.min(col, prevLine.length);

    const next = shift ? moveFocus(state, newPos) : setCursor(state, newPos);
    return { state: next, newDesiredCol: col }; // сохраняем желаемую колонку
}

export function moveDown(
    state: VirtualInputState,
    shift: boolean,
    desiredCol: number | null,
): { state: VirtualInputState; newDesiredCol: number } {
    const focus = getFocus(state);
    const info = getLineInfo(state.value, focus);
    const col = desiredCol ?? info.colOffset;

    if (info.lineIndex === info.lines.length - 1) {
        // Последняя строка — идём в конец документа
        const end = state.value.length;
        const next = shift ? moveFocus(state, end) : setCursor(state, end);
        return { state: next, newDesiredCol: col };
    }

    const nextIdx = info.lineIndex + 1;
    const nextStart = getLineStart(info.lines, nextIdx);
    const nextLine = info.lines[nextIdx];
    const newPos = nextStart + Math.min(col, nextLine.length);

    const next = shift ? moveFocus(state, newPos) : setCursor(state, newPos);
    return { state: next, newDesiredCol: col };
}

// ─── Mouse hit test ────────────────────────────────────────────────────────────

/**
 * Преобразует (relX, relY) относительно начала текста в индекс символа.
 *
 * @param value        - полное значение (с \n)
 * @param relX         - X относительно textX ячейки (в world-пикселях)
 * @param relY         - Y относительно textY ячейки (в world-пикселях)
 * @param lineHeight   - высота строки в world-пикселях
 * @param measureText  - функция замера ширины строки (ctx.measureText или mock)
 */
export function findCharIndexFromPoint(
    value: string,
    relX: number,
    relY: number,
    lineHeight: number,
    measureText: (text: string) => number,
): number {
    const lines = value.split('\n');

    // Определяем строку по Y
    const lineIndex = Math.min(Math.max(0, Math.floor(relY / lineHeight)), lines.length - 1);

    const lineStart = getLineStart(lines, lineIndex);
    const line = lines[lineIndex];

    // Клик левее начала строки
    if (relX <= 0) return lineStart;

    // Клик правее конца строки
    const totalWidth = measureText(line);
    if (relX >= totalWidth) return lineStart + line.length;

    // Бинарный поиск: находим наибольший i, при котором ширина prefix ≤ relX
    let lo = 0;
    let hi = line.length;

    while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (measureText(line.slice(0, mid)) <= relX) {
            lo = mid;
        } else {
            hi = mid - 1;
        }
    }

    // Привязка к ближайшему краю символа (snap)
    const leftEdge = measureText(line.slice(0, lo));
    const rightEdge = lo < line.length ? measureText(line.slice(0, lo + 1)) : leftEdge;
    const snapRight = relX - leftEdge > (rightEdge - leftEdge) / 2;

    return lineStart + Math.min(snapRight ? lo + 1 : lo, line.length);
}
