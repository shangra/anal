import { IDecodeStrategy } from './IDecodeStrategy';
import { JsonDrpStrategy } from './JsonDrpStrategy';
import { LegacyZipStrategy } from './LegacyZipStrategy';

const strategies: IDecodeStrategy[] = [new JsonDrpStrategy(), new LegacyZipStrategy()];

/**
 * Определяет формат DRP-файла по первым байтам и возвращает подходящую стратегию.
 */
export class FormatDetector {
    static detect(content: ArrayBuffer): IDecodeStrategy {
        const strategy = strategies.find((s) => s.canHandle(content));
        if (!strategy) {
            throw new Error('Неизвестный формат файла. Поддерживаются: DRP (JSON) и DRP (ZIP/legacy).');
        }
        return strategy;
    }
}
