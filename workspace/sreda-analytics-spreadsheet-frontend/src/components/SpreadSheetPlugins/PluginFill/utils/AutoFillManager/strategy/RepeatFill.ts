import { ICell } from '../../../../../AdapterSpreadSheet/types';
import { FillDirection, IAutoFillStrategy } from '../types';

/**
 * Стратегия для повторяющихся значений
 */
export default class RepeatFillStrategy implements IAutoFillStrategy {
    canHandle(_data: ICell[]): boolean {
        return true;
        // Всегда может быть использована как fallback
    }

    fill(data: ICell[], count: number, _direction: FillDirection): ICell[] {
        const result: ICell[] = [];
        for (let i = 0; i < count; i++) {
            const sourceCell = data[i % data.length];
            result.push({
                data: sourceCell.data,
                components: sourceCell.components ? [...sourceCell.components] : [],
                config: { ...sourceCell.config },
            });
        }
        return result;
    }
}
