import React, { ChangeEvent, forwardRef, KeyboardEvent, useCallback, useRef, useState } from 'react';
import { MarkdownInput, MarkdownRule } from 'ui-kit';

interface FormulaInputProps {
    initialValue: string;
    disabled: boolean;
    markdownRules?: MarkdownRule[];
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    /** Вызывается при любом изменении позиции каретки (клавиши, мышь, выделение) */
    onCaretChange?: (position: number) => void;
}

export const FormulaInput = forwardRef<any, FormulaInputProps>(
    ({ initialValue, disabled = false, markdownRules, onChange, onKeyDown, onCaretChange }, ref) => {
        const [value, setValue] = useState(initialValue);

        // Предыдущий initialValue — для детектирования внешних изменений
        // без useEffect (избегаем лишний рендер через эффект).
        const prevInitialRef = useRef(initialValue);

        // Если initialValue изменился снаружи (навигация, VALUE_SYNC),
        // синхронизируем state прямо во время render — это допустимо
        // в React как замена getDerivedStateFromProps.
        if (prevInitialRef.current !== initialValue) {
            prevInitialRef.current = initialValue;
            // React перезапустит render с новым value,
            // не вызывая промежуточного коммита с устаревшим значением.
            setValue(initialValue);
        }

        const handleChange = useCallback(
            (event: {
                target: { value: string };
                currentTarget: HTMLDivElement | null;
                selectionStart: number;
                selectionEnd: number;
                selectedText: string;
            }) => {
                setValue(event.target.value);
                onChange(event as any);
                const pos = event.selectionStart ?? 0;
                onCaretChange?.(pos);
            },
            [onChange, onCaretChange],
        );

        const handleSelect = useCallback(
            (event: any): void => {
                const pos = event.selectionStart ?? 0;
                onCaretChange?.(pos);
            },
            [onCaretChange],
        );

        return (
            <div style={{ position: 'relative', width: '100%' }}>
                <div id="AutocomplePluginFormula" style={{ position: 'absolute', top: '100%', left: 25 }} />
                <MarkdownInput
                    markdownRules={markdownRules}
                    ref={ref}
                    variant="outlined"
                    value={value}
                    disabled={disabled}
                    onChange={handleChange}
                    onKeyDown={onKeyDown}
                    onSelect={handleSelect}
                    fullWidth
                />
            </div>
        );
    },
);

FormulaInput.displayName = 'FormulaInput';
