import type { Token } from 'components/CodeEditorCMP/types';

const WHITESPACE = /(\s|\t|\n|\r)/g;
const NUMBERS = /[0-9]/;
const NAME = /[0-9a-zA-Z\-_.]/;

function getToken(input: string, current: number, regex: RegExp): { value: string; current: number } {
    let value = '';
    let char = input[current];
    while (regex.test(char) && current < input.length) {
        value += char;
        char = input[++current];
    }
    return { value, current };
}

function getCode(input: string, current: number): { code: string; current: number } {
    let code = '';
    let braceCount = 1;
    let char: string;
    while (braceCount > 0 && current < input.length) {
        char = input[++current];
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        code += char;
    }
    return { code: code.slice(0, -1).trim(), current };
}

export default function tokenizer(input: string): Token[] {
    const normalizedInput = input.replaceAll('&nbsp;', ' ').replaceAll('<br>', '<br/>');
    const tokens: Token[] = [];
    let current = 0;
    let inTag = false;

    while (current < normalizedInput.length) {
        let char = normalizedInput[current];

        if (inTag) {
            if (char === '>') {
                inTag = false;
                tokens.push({ type: 'closeTag' });
            } else if (char === '/' && normalizedInput[current + 1] === '>') {
                inTag = false;
                tokens.push({ type: 'endTag' });
                current++;
            } else if (char === '=') {
                tokens.push({ type: 'equals' });
            } else if (char === '{') {
                const { code, current: newCurrent } = getCode(normalizedInput, current);
                current = newCurrent;
                tokens.push({
                    type: 'code',
                    value: code,
                });
            } else if (WHITESPACE.test(char)) {
                // skip whitespace
            } else if (NUMBERS.test(char)) {
                const { value, current: newCurrent } = getToken(normalizedInput, current, NUMBERS);
                current = newCurrent - 1;
                tokens.push({
                    type: 'number',
                    value: Number(value),
                });
            } else if (NAME.test(char)) {
                const { value, current: newCurrent } = getToken(normalizedInput, current, NAME);
                current = newCurrent - 1;
                if (value === 'true' || value === 'false') {
                    tokens.push({
                        type: 'boolean',
                        value: value === 'true',
                    });
                } else {
                    tokens.push({
                        type: 'word',
                        value,
                    });
                }
            } else if (char === "'") {
                current++;
                const { value, current: newCurrent } = getToken(normalizedInput, current, /[^']/);
                current = newCurrent;
                tokens.push({
                    type: 'text',
                    value,
                });
            } else if (char === '"') {
                current++;
                const { value, current: newCurrent } = getToken(normalizedInput, current, /[^"]/);
                current = newCurrent;
                tokens.push({
                    type: 'text',
                    value,
                });
            }
        } else {
            // Not tokenizing a tag definition
            // End tag
            if (char === '<' && normalizedInput[current + 1] === '/') {
                current += 2;
                const { value, current: newCurrent } = getToken(normalizedInput, current, NAME);
                current = newCurrent;
                tokens.push({
                    type: 'endTag',
                    value,
                });
            } else if (char === '<') {
                inTag = true;
                current++;
                const { value, current: newCurrent } = getToken(normalizedInput, current, NAME);
                current = newCurrent - 1;
                tokens.push({
                    type: 'openTag',
                    value,
                });
            } else {
                // Handle slush text
                let value = '';
                while (char !== '<' && current < normalizedInput.length) {
                    value += char;
                    char = normalizedInput[++current];
                }

                if (value.trim() === '') value = value.trim();
                if (value) {
                    tokens.push({
                        type: 'text',
                        value,
                    });
                }
                current--;
            }
        }
        current++;
    }

    return tokens;
}
