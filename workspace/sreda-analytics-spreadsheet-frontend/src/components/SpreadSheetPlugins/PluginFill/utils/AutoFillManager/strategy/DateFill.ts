import { ICell } from '../../../../../AdapterSpreadSheet/types';
import { FillDirection, IAutoFillStrategy } from '../types';

export default class DateFillStrategy implements IAutoFillStrategy {
    private readonly datePattern = /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/;

    canHandle(data: ICell[]): boolean {
        return data.every((cell) => {
            const value = String(cell.data);
            return this.datePattern.test(value) && !Number.isNaN(Date.parse(value));
        });
    }

    fill(data: ICell[], count: number, direction: FillDirection): ICell[] {
        const dates = data.map((cell) => new Date(String(cell.data)));

        let stepDays = 1;
        if (dates.length > 1) {
            const diffs: number[] = [];
            for (let i = 1; i < dates.length; i++) {
                diffs.push(this._diffInDays(dates[i - 1], dates[i]));
            }
            stepDays = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
        }

        // FIX: инвертируем шаг для обратных направлений
        const effectiveStep = direction === 'up' || direction === 'left' ? -stepDays : stepDays;

        const result: ICell[] = [];
        const baseDate = direction === 'up' || direction === 'left' ? dates[0] : dates[dates.length - 1];

        for (let i = 0; i < count; i++) {
            const newDate = this._addDays(baseDate, effectiveStep * (i + 1));
            result.push({
                data: newDate.toLocaleDateString('ru-RU'),
                components: [],
                config: {},
            });
        }

        return result;
    }

    private _diffInDays(from: Date, to: Date): number {
        const utcFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
        const utcTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
        return (utcTo - utcFrom) / 86_400_000;
    }

    private _addDays(date: Date, days: number): Date {
        const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() + days);
        return new Date(utc);
    }
}
