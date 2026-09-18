import * as fflate from 'fflate';

import { DrpPayload } from '../types';
import { IDecodeStrategy } from './IDecodeStrategy';

interface LegacySheetFile {
    /** Состояния плагинов в старом формате */
    Plugins?: Record<string, unknown>;
    /** Стили ячеек в старом формате: объект с ключами "row:col" */
    cellsStyles?: Record<string, unknown>;
    /** Метаданные таблицы */
    tableMeta?: unknown;
}

/**
 * Стратегия для старого ZIP-формата DRP
 */
export class LegacyZipStrategy implements IDecodeStrategy {
    readonly isLegacy = true;

    canHandle(content: ArrayBuffer): boolean {
        const view = new Uint8Array(content);
        return view.length >= 2 && view[0] === 0x50 && view[1] === 0x4b;
    }

    async decode(content: ArrayBuffer): Promise<DrpPayload> {
        const bytes = new Uint8Array(content);

        // Распаковка ZIP
        let files: fflate.Unzipped;
        try {
            files = fflate.unzipSync(bytes);
        } catch (error) {
            throw new Error('Ошибка распаковки ZIP: файл повреждён или не является ZIP-архивом');
        }

        const sheetFile = files['sheets/sheet1.json'];
        if (!sheetFile) {
            throw new Error('В архиве отсутствует файл sheets/sheet1.json');
        }

        const raw = new TextDecoder('utf-8').decode(sheetFile);
        let file: LegacySheetFile;
        try {
            file = JSON.parse(raw);
        } catch {
            throw new Error('Файл sheets/sheet1.json повреждён: не является валидным JSON');
        }

        // Преобразование cellsStyles в cellOverrides
        // const cellOverrides: [string, unknown][] = [];
        // if (file.cellsStyles && typeof file.cellsStyles === 'object') {
        //     for (const [key, style] of Object.entries(file.cellsStyles)) {
        //         // Проверяем, что ключ - это строка в формате "row:col"
        //         if (typeof key === 'string' && key.includes(':')) {
        //             cellOverrides.push([key, style]);
        //         }
        //     }
        // }

        // Преобразование Plugins в pluginStates
        const pluginStates: Record<string, unknown> = {};
        if (file.Plugins && typeof file.Plugins === 'object') {
            for (const [pluginName, pluginData] of Object.entries(file.Plugins)) {
                if (typeof pluginName === 'string') {
                    // Для PluginPivot добавляем дефолтный schemaInfo, если его нет
                    if (pluginName === 'PluginPivot' && pluginData && typeof pluginData === 'object') {
                        const pluginPivotData = { ...pluginData } as any;
                        if (!pluginPivotData.schemaInfo || typeof pluginPivotData.schemaInfo !== 'object') {
                            pluginPivotData.schemaInfo = {
                                name: 'default',
                                isChanged: false,
                            };
                        }
                        pluginStates[pluginName] = pluginPivotData;
                    } else {
                        pluginStates[pluginName] = pluginData;
                    }
                }
            }
        }

        return {
            meta: {
                savedAt: Date.now(),
                generator: 'legacy-zip-converter',
                version: '1.0.0',
            },
            cells: [],
            styles: { ranges: [] },
            pluginConfigs: { ranges: [] },
            pluginStates,
        };
    }
}
