// "УсловиеОтбора" → "Условие отбора"
export function splitCamelCase(str: string) {
    return str
        .replace(/([А-ЯЁ])/g, ' $1') 
        .trim()
        .toLowerCase() 
        .replace(/^[а-яё]/, (match) => match.toUpperCase());
}

// "Условие отбора" → "УсловиеОтбора"
export function toPascalCase(str: string): string {
    return str
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}