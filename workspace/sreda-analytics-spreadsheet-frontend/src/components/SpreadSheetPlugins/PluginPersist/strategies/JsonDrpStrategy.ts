import { DRP_FORMAT_VERSION } from '../constants';
import { djb2Checksum, fromBase64, gunzip, parseDrpJson } from '../DrpCodec';
import { DrpFileWrapper, DrpPayload } from '../types';
import { IDecodeStrategy } from './IDecodeStrategy';

/**
 * Стратегия для нового JSON-формата DRP (обёртка DrpFileWrapper).
 * Формат: JSON с полем __drp, encoding, data, checksum.
 */
export class JsonDrpStrategy implements IDecodeStrategy {
    readonly isLegacy = false;

    canHandle(content: ArrayBuffer): boolean {
        // Проверяем, начинается ли содержимое с '{' (JSON)
        const view = new Uint8Array(content);
        // Пропускаем возможные BOM и пробелы в начале
        let i = 0;
        while (i < view.length && (view[i] === 0x20 || view[i] === 0x0a || view[i] === 0x0d || view[i] === 0x09)) {
            i++;
        }
        return i < view.length && view[i] === 0x7b; // '{'
    }

    async decode(content: ArrayBuffer): Promise<DrpPayload> {
        const text = new TextDecoder('utf-8').decode(content);
        let wrapper: DrpFileWrapper;

        try {
            wrapper = JSON.parse(text) as DrpFileWrapper;
        } catch {
            throw new Error('Файл повреждён: не является валидным JSON');
        }

        if (!wrapper.__drp) {
            throw new Error(
                'Файл не является DRP-документом: отсутствует идентификатор __drp. ' +
                    'Убедитесь, что выбран корректный файл.',
            );
        }

        const fileMajor = Number(wrapper.__drp.split('.')[0]);
        const currentMajor = Number(DRP_FORMAT_VERSION.split('.')[0]);

        if (fileMajor > currentMajor) {
            throw new Error(
                `Версия формата файла (${wrapper.__drp}) новее текущей (${DRP_FORMAT_VERSION}). Обновите приложение.`,
            );
        }

        // Распаковка
        let rawJson: string;

        if (wrapper.encoding === 'gzip+base64') {
            if (typeof DecompressionStream === 'undefined') {
                throw new Error(
                    'Файл использует сжатие gzip, но браузер не поддерживает DecompressionStream. ' +
                        'Используйте Chrome 80+ или другой современный браузер.',
                );
            }
            try {
                rawJson = await gunzip(fromBase64(wrapper.data));
            } catch {
                throw new Error('Ошибка распаковки: данные повреждены');
            }
        } else if (wrapper.encoding === 'none') {
            rawJson = wrapper.data;
        } else {
            throw new Error(`Неизвестная кодировка: ${(wrapper as any).encoding}`);
        }

        // Контрольная сумма
        const actualChecksum = djb2Checksum(rawJson);
        if (actualChecksum !== wrapper.checksum) {
            throw new Error(
                `Нарушена целостность файла (checksum mismatch: ` +
                    `ожидалось ${wrapper.checksum}, получено ${actualChecksum}). ` +
                    `Файл повреждён или изменён вручную.`,
            );
        }

        try {
            return parseDrpJson(rawJson) as DrpPayload;
        } catch {
            throw new Error('Ошибка разбора данных: содержимое файла повреждено');
        }
    }
}
