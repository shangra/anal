export const getBooleanLabel = (value: boolean | null): string => {
    if (value === null) return 'Не определено';

    return value ? 'Да' : 'Нет';
}