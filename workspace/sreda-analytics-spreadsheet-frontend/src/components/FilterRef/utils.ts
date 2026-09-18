/**
 * Приводит бизнес-идентификатор к типу, соответствующему типу поля.
 *
 * - integer / float / number -> number (при NaN возвращает исходное значение)
 * - все остальные типы (uuid, string, text, date, datetime, boolean, ref и др.) -> string
 * - null / undefined -> возвращается без изменений
 */
export const castIdByType = (id: string | number | null | undefined, type?: string): string | number | null | undefined => {
    if (id === null || id === undefined) return id;
    if (type === 'integer' || type === 'float' || type === 'number') {
        if (typeof id === 'string') {
            const isBigIntString =
                id.includes('n') ||
                BigInt(id) > BigInt(Number.MAX_SAFE_INTEGER) ||
                BigInt(id) < BigInt(Number.MIN_SAFE_INTEGER);

            if (isBigIntString) {
                return id.replace('n', '');
            }
        }

        const n = Number(id);
        return Number.isNaN(n) ? id : n;
    }
    return String(id);
};
