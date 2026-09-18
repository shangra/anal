const regFormulaSymbol = /[a-zA-Zа-яА-Я.]/;

export function getWordAtCursor(str: string, cursorIndex: number): { word: string; end: number; start: number } {
    const safeIndex = Math.min(cursorIndex, str.length);
    let start = safeIndex;
    let end = safeIndex;

    if ((str && cursorIndex !== undefined) || cursorIndex >= 0) {
        for (let i = safeIndex - 1; i > -1; i--) {
            const char = str[i];

            const isLetter = regFormulaSymbol.test(char);

            if (isLetter) {
                start = i;
            } else {
                break;
            }
        }

        for (let i = safeIndex; i < str.length; i++) {
            const char = str[i];

            const isLetter = regFormulaSymbol.test(char);

            if (isLetter) {
                end = i + 1;
            } else {
                break;
            }
        }
    }

    return { word: str.slice(start, end), start, end };
}

export function getBracketsPos(value: string, cursorPos: number, openChar = '(', closeChar = ')') {
    const openCharIndex = value.lastIndexOf(openChar, cursorPos - 1);
    const closeCharIndex = value.lastIndexOf(closeChar, cursorPos - 1);
    if (openCharIndex === -1 || closeCharIndex > openCharIndex) {
        return null;
    }

    const nextCloseIndex = value.indexOf(closeChar, cursorPos);

    return {
        start: openCharIndex,
        end: nextCloseIndex,
    };
}
