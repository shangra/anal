import { ICell } from '../../../../AdapterSpreadSheet/types';

export type FillDirection = 'up' | 'down' | 'left' | 'right';

export interface IAutoFillStrategy {
    canHandle(data: ICell[]): boolean;
    fill(data: ICell[], count: number, direction: FillDirection, startRow: number, startCol: number): ICell[];
}

export interface StrategyEntry {
    strategy: IAutoFillStrategy;
    priority: number;
}
