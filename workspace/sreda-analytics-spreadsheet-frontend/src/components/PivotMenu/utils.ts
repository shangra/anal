import LZString from 'lz-string';

// Compression utilities
/**
 * Compress schema for saving
 */
export const compress = async (
    schema: object,
    onProgress: (progress: number, step: string, delay?: number) => Promise<void>,
) => {
    await onProgress?.(0, 'Подготовка данных к сжатию...');

    await onProgress?.(40, 'Сериализация JSON...', 200);

    const jsonString = JSON.stringify(schema);

    await onProgress?.(70, 'Сжатие данных...', 300);

    const compressed = LZString.compressToUTF16(jsonString);

    await onProgress?.(100, 'Сжатие выполнено!', 100);

    return `lz16:${compressed}`;
};

/**
 * Decompress schema for loading
 */
export const decompress = async (
    data: string,
    onProgress: (progress: number, step: string, delay?: number) => Promise<void>,
) => {
    await onProgress?.(0, 'Анализ сжатых данных...');

    await onProgress?.(20, 'Распаковка данных...');

    if (data == null || data === '') {
        await onProgress?.(100, 'Данные распакованы!');
        return {};
    }

    if (typeof data === 'object') {
        await onProgress?.(100, 'Данные распакованы!');
        return data;
    }

    let decompressed;
    if (String(data).startsWith('lz16:')) {
        decompressed = LZString.decompressFromUTF16(data.substring(5));
        if (!decompressed) {
            throw new Error('Ошибка при распаковке данных');
        }
    } else {
        // If not compressed, use as-is
        decompressed = data;
    }

    await onProgress?.(60, 'Разбор JSON...', 200);

    const result = JSON.parse(decompressed);

    await onProgress?.(80, 'Проверка структуры данных...');

    if (!result || typeof result !== 'object') {
        throw new Error('Неверная структура данных после распаковки');
    }

    await onProgress?.(100, 'Данные распакованы!');

    return result;
};
