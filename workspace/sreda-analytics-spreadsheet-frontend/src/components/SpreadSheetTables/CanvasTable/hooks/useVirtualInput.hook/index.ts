import { useCallback, useEffect, useRef } from 'react';

import { VirtualInputOptions, VirtualInputState } from './types';
import * as U from './utils';

export function useVirtualInput(options: VirtualInputOptions = {}) {
    const { maxLength, onSubmit, onCancel, onTab } = options;

    // ── Refs ───────────────────────────────────────────────────────────────────
    // Все в refs — не хотим вызывать React ре-рендер на каждое нажатие клавиши.
    // Родитель сам решает, когда читать состояние и перерисовывать canvas.
    const stateRef = useRef<VirtualInputState>({
        value: options.initialValue ?? '',
        selectionStart: 0,
        selectionEnd: options.initialValue?.length ?? 0,
        selectionDirection: options.initialValue ? 'forward' : 'none',
    });

    // ── Желаемая колонка для вертикальной навигации ───────────────────────────
    // null = "не задана, использовать текущую"
    // Сбрасывается при любом горизонтальном движении или вводе текста
    const desiredColRef = useRef<number | null>(null);

    const resetDesiredCol = () => {
        desiredColRef.current = null;
    };

    // ── Метод для hit test (для использования в Canvas mouse handler) ─────────
    const getCharIndexAtPoint = useCallback(
        (relX: number, relY: number, lineHeight: number, measureText: (text: string) => number): number =>
            U.findCharIndexFromPoint(stateRef.current.value, relX, relY, lineHeight, measureText),
        [],
    );

    // Всегда актуальная версия колбека без пересоздания handleKeyDown
    const onChangeRef = useRef(options.onChange);
    useEffect(() => {
        onChangeRef.current = options.onChange;
    }, [options.onChange]);

    // IME: сохраняем состояние на момент начала композиции
    const compositionStateRef = useRef<VirtualInputState | null>(null);
    const isComposingRef = useRef(false);

    // ── Core setState ──────────────────────────────────────────────────────────
    const applyState = useCallback((next: VirtualInputState) => {
        stateRef.current = next;
        onChangeRef.current?.(next);
    }, []);

    // ── Вспомогательная обёртка для Up/Down ───────────────────────────────────
    const applyVertical = useCallback(
        (result: { state: VirtualInputState; newDesiredCol: number }) => {
            desiredColRef.current = result.newDesiredCol; // сохраняем
            applyState(result.state);
        },
        [applyState],
    );

    // ── Public API: инициализация ──────────────────────────────────────────────
    const getState = useCallback((): VirtualInputState => stateRef.current, []);

    /**
     * Инициализировать редактор с новым значением.
     * selectAll=true — выделить всё (как при F2).
     * selectAll=false — поставить cursor в конец (как при начале ввода).
     */
    const init = useCallback(
        (value: string, selectAll = false) => {
            applyState({
                value,
                selectionStart: selectAll ? 0 : value.length,
                selectionEnd: value.length,
                selectionDirection: selectAll && value.length > 0 ? 'forward' : 'none',
            });
        },
        [applyState],
    );

    // ── Public API: программная вставка ───────────────────────────────────────
    const insert = useCallback(
        (text: string) => applyState(U.insertText(stateRef.current, text, maxLength)),
        [applyState, maxLength],
    );

    // ── Public API: mouse-based selection ─────────────────────────────────────
    const setCursorAt = useCallback((pos: number) => applyState(U.setCursor(stateRef.current, pos)), [applyState]);

    const setSelectionRange = useCallback(
        (start: number, end: number, direction: VirtualInputState['selectionDirection'] = 'forward') =>
            applyState(U.setSelection(stateRef.current, start, end, direction)),
        [applyState],
    );

    const selectWordAtPos = useCallback((pos: number) => applyState(U.selectWordAt(stateRef.current, pos)), [applyState]);

    // ── IME Composition ────────────────────────────────────────────────────────
    const handleCompositionStart = useCallback(() => {
        isComposingRef.current = true;
        compositionStateRef.current = { ...stateRef.current };
    }, []);

    const handleCompositionUpdate = useCallback(
        (e: CompositionEvent) => {
            const base = compositionStateRef.current;
            if (!base) return;
            // Отображаем временный текст без фиксации в onChange
            // (можно добавить отдельный onCompositionChange если нужен preview)
            stateRef.current = U.insertText(base, e.data, maxLength);
            onChangeRef.current?.(stateRef.current);
        },
        [maxLength],
    );

    const handleCompositionEnd = useCallback(
        (e: CompositionEvent) => {
            isComposingRef.current = false;
            const base = compositionStateRef.current;
            if (!base) return;
            compositionStateRef.current = null;
            applyState(U.insertText(base, e.data, maxLength));
        },
        [applyState, maxLength],
    );

    // ── Clipboard paste event ──────────────────────────────────────────────────
    const handlePaste = useCallback(
        (text: string) => applyState(U.insertText(stateRef.current, text, maxLength)),
        [applyState, maxLength],
    );

    // ── Main keyboard handler ──────────────────────────────────────────────────
    const handleKeyDown = useCallback(
        (e: KeyboardEvent): boolean => {
            if (isComposingRef.current || e.isComposing) return false;

            const state = stateRef.current;
            const primary = U.IS_MAC ? e.metaKey : e.ctrlKey;
            const word = U.IS_MAC ? e.altKey : e.ctrlKey;
            const shift = e.shiftKey;

            switch (e.key) {
                case 'ArrowLeft': {
                    e.preventDefault();
                    resetDesiredCol();
                    if (U.IS_MAC && e.metaKey) {
                        applyState(shift ? U.selectToLineStart(state) : U.moveToLineStart(state));
                    } else {
                        applyState(shift ? U.selectLeft(state, word) : U.moveLeft(state, word));
                    }
                    return true;
                }

                case 'ArrowRight': {
                    e.preventDefault();
                    resetDesiredCol();
                    if (U.IS_MAC && e.metaKey) {
                        applyState(shift ? U.selectToLineEnd(state) : U.moveToLineEnd(state));
                    } else {
                        applyState(shift ? U.selectRight(state, word) : U.moveRight(state, word));
                    }
                    return true;
                }

                // ── Вертикальная навигация (новое) ─────────────────────────────────
                case 'ArrowUp': {
                    e.preventDefault();
                    if (U.IS_MAC && e.metaKey) {
                        resetDesiredCol();
                        applyState(shift ? U.selectToStart(state) : U.moveToStart(state));
                    } else {
                        applyVertical(U.moveUp(state, shift, desiredColRef.current));
                    }
                    return true;
                }

                case 'ArrowDown': {
                    e.preventDefault();
                    if (U.IS_MAC && e.metaKey) {
                        resetDesiredCol();
                        applyState(shift ? U.selectToEnd(state) : U.moveToEnd(state));
                    } else {
                        applyVertical(U.moveDown(state, shift, desiredColRef.current));
                    }
                    return true;
                }

                // ── Per-line Home / End (обновлено) ───────────────────────────────
                case 'Home': {
                    e.preventDefault();
                    resetDesiredCol();
                    if (primary) {
                        // Ctrl+Home / Cmd+Home -> начало документа
                        applyState(shift ? U.selectToStart(state) : U.moveToStart(state));
                    } else {
                        // Home -> начало текущей строки
                        applyState(shift ? U.selectToLineStart(state) : U.moveToLineStart(state));
                    }
                    return true;
                }

                case 'End': {
                    e.preventDefault();
                    resetDesiredCol();
                    if (primary) {
                        applyState(shift ? U.selectToEnd(state) : U.moveToEnd(state));
                    } else {
                        applyState(shift ? U.selectToLineEnd(state) : U.moveToLineEnd(state));
                    }
                    return true;
                }

                case 'Backspace': {
                    e.preventDefault();
                    resetDesiredCol();
                    applyState(U.deleteBackward(state, word));
                    return true;
                }

                case 'Delete': {
                    e.preventDefault();
                    resetDesiredCol();
                    applyState(U.deleteForward(state, word));
                    return true;
                }

                // ── Alt+Enter -> новая строка (новое) ─────────────────────────────
                case 'Enter': {
                    e.preventDefault();
                    resetDesiredCol();
                    if (e.altKey) {
                        // Alt+Enter — вставить перенос строки
                        applyState(U.insertText(state, '\n', maxLength));
                    } else {
                        // Enter — подтвердить (как в Excel)
                        options.onSubmit?.(state.value, e);
                    }
                    return true;
                }

                case 'Escape': {
                    e.preventDefault();
                    options.onCancel?.(e);
                    return true;
                }

                case 'Tab': {
                    options.onTab?.(e);
                    return false;
                }

                case 'a':
                case 'A': {
                    if (primary) {
                        e.preventDefault();
                        resetDesiredCol();
                        applyState(U.selectAll(state));
                        return true;
                    }
                    break;
                }

                case 'c':
                case 'C': {
                    if (primary && U.hasSelection(state)) {
                        e.preventDefault();
                        const text = state.value.slice(state.selectionStart, state.selectionEnd);
                        navigator.clipboard?.writeText(text).catch(() => {});
                        return true;
                    }
                    break;
                }

                case 'x':
                case 'X': {
                    if (primary && U.hasSelection(state)) {
                        e.preventDefault();
                        resetDesiredCol();
                        const text = state.value.slice(state.selectionStart, state.selectionEnd);
                        navigator.clipboard?.writeText(text).catch(() => {});
                        applyState(U.deleteSelected(state));
                        return true;
                    }
                    break;
                }

                case 'v':
                case 'V': {
                    if (primary) {
                        e.preventDefault();
                        resetDesiredCol();
                        navigator.clipboard
                            ?.readText()
                            .then((text) => applyState(U.insertText(stateRef.current, text, maxLength)))
                            .catch(() => {});
                        return true;
                    }
                    break;
                }

                default: {
                    if (e.key.length === 1 && !((e.ctrlKey || e.metaKey) && !e.altKey)) {
                        e.preventDefault();
                        resetDesiredCol();
                        applyState(U.insertText(state, e.key, maxLength));
                        return true;
                    }
                }
            }

            return false;
        },
        [applyState, applyVertical, maxLength, options],
    );

    return {
        getState,
        init,
        insert,
        handleKeyDown,
        handleCompositionStart,
        handleCompositionUpdate,
        handleCompositionEnd,
        handlePaste,
        // Mouse API
        setCursorAt,
        setSelectionRange,
        selectWordAtPos,
        getCharIndexAtPoint,
    };
}
