export interface VirtualInputState {
    value: string;
    selectionStart: number; // левая граница выделения (всегда <= selectionEnd)
    selectionEnd: number; // правая граница выделения
    selectionDirection: 'forward' | 'backward' | 'none';
    // 'forward'  -> anchor = selectionStart, focus = selectionEnd
    // 'backward' -> anchor = selectionEnd,   focus = selectionStart
    // 'none'     -> нет выделения, cursor = selectionStart = selectionEnd
}

export interface VirtualInputOptions {
    initialValue?: string;
    maxLength?: number;
    onChange?: (state: VirtualInputState) => void;
    onSubmit?: (value: string, e: KeyboardEvent) => void;
    onCancel?: (e: KeyboardEvent) => void;
    // Tab управляется снаружи (навигация по ячейкам)
    onTab?: (e: KeyboardEvent) => void;
}
