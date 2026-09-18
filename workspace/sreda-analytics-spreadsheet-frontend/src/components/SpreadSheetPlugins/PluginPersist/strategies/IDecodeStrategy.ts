import { DrpPayload } from '../types';

/**
 * Стратегия декодирования DRP-файла.
 * Каждая стратегия умеет определять, может ли она обработать входные данные,
 * и декодировать их в унифицированный DrpPayload.
 */
export interface IDecodeStrategy {
    /**
     * Признак устаревшего формата файла.
     * На его основе после декодирования применяются миграции (см. migrations.ts).
     */
    readonly isLegacy: boolean;

    /**
     * Проверяет, может ли стратегия обработать данный ArrayBuffer.
     * @param content - сырые байты файла
     */
    canHandle(content: ArrayBuffer): boolean;

    /**
     * Декодирует ArrayBuffer в DrpPayload.
     * @param content - сырые байты файла
     * @throws {Error} если данные повреждены или не соответствуют ожидаемому формату
     */
    decode(content: ArrayBuffer): Promise<DrpPayload>;
}
