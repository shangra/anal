import type React from 'react';

// ---- Токены токенизатора ----
export interface Token {
    type: 'openTag' | 'closeTag' | 'endTag' | 'word' | 'equals' | 'code' | 'number' | 'boolean' | 'text';
    value?: string | number | boolean;
}

// ---- AST-узел после парсинга ----
export interface ASTNode {
    component?: string;
    properties?: Record<string, unknown>;
    children?: (ASTNode | string)[];
}

// ---- Опции jsx2json ----
export interface Jsx2JsonOptions {
    useEval?: boolean;
}

// ---- Опции json2jsx ----
export interface Json2JsxOptions {
    tabStep?: number;
}

// ---- Пропсы CodeEditorCMP ----
export interface CodeEditorCMPProps {
    value?: string;
    subKey?: string;
    modeType?: string;
    showToolbar?: boolean;
    onChange?: (value: string) => void;
    onSave?: (value: string) => void;
    style?: React.CSSProperties;
}

// ---- Состояние CodeEditorCMP ----
export interface CodeEditorCMPState {
    value: string;
    modeType: string;
    jsxStatus: boolean;
    theme: string;
    showToolbar: boolean;
}

// ---- Тема редактора ----
export interface CodeEditorTheme {
    id: string;
    label: string;
    value: string;
}
