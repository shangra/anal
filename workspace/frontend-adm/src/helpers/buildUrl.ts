/**
 * Собирает массив строковых частей в нормализованный URL-путь.
 *
 * - Удаляет все `falsy` значения (undefined, null, пустые строки).
 * - Объединяет оставшиеся части через слеш `/`.
 * - Схлопывает множественные слеши в один (`//` → `/`).
 * - Удаляет ведущие слеши в начале результирующей строки.
 *
 * @param parts - Массив строк или undefined, представляющих сегменты URL.
 * @returns Нормализованная строка URL-пути без лишних слешей.
 *
 * @example
 * // Базовое использование
 * buildUrl(['/server/', 'api', 'component//', '?type=test'])
 * // → 'server/api/component?type=test'
 *
 * @example
 * // Удаление пустых/undefined частей
 * buildUrl(['api', undefined, 'test', null, ''])
 * // → 'api/test'
 *
 * @example
 * // Схлопывание множественных слешей
 * buildUrl(['///', 'api', '///'])
 * // → 'api'
 *
 * @example
 * // Пустой массив
 * buildUrl([])
 * // → ''
 *
 * @example
 * // Только слеши
 * buildUrl(['/', '//', '/'])
 * // → '' (все слеши удаляются)
 */
export const buildUrl = (...parts: Array<string | undefined | null>): string => {
    return parts
        .filter(Boolean)
        .join('/')
        .replace(/\/+/g, '/')   // множественные слеши → один
        .replace(/^\/+/, '')    // удалить ведущие
};