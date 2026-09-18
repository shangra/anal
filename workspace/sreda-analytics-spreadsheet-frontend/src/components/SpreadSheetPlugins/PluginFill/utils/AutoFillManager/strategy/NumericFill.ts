import { ICell } from '../../../../../AdapterSpreadSheet/types';
import { FillDirection, IAutoFillStrategy } from '../types';

export default class NumericFillStrategy implements IAutoFillStrategy {
    canHandle(data: ICell[]): boolean {
        return data.every((cell) => {
            const value = cell.data;
            return typeof value === 'number' || (value !== '' && !Number.isNaN(Number(value)));
        });
    }

    fill(data: ICell[], count: number, direction: FillDirection): ICell[] {
        const numbers = data.map((cell) => Number(cell.data));

        let step = 0;
        if (numbers.length > 1) {
            const diffs: number[] = [];
            for (let i = 1; i < numbers.length; i++) {
                diffs.push(numbers[i] - numbers[i - 1]);
            }
            step = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        }

        // FIX: инвертируем шаг для обратных направлений
        const effectiveStep = direction === 'up' || direction === 'left' ? -step : step;

        const result: ICell[] = [];
        const lastValue =
            direction === 'up' || direction === 'left'
                ? numbers[0] // для обратных — начинаем с первого
                : numbers[numbers.length - 1]; // для прямых — с последнего

        for (let i = 0; i < count; i++) {
            const newValue = lastValue + effectiveStep * (i + 1);
            // Округляем для борьбы с floating-point drift
            const rounded = Math.round(newValue * 1e10) / 1e10;
            result.push({ data: rounded, components: [], config: {} });
        }

        return result;
    }
}
