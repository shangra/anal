import { EOperation } from './types';

export const OPERATION_ORDER: readonly EOperation[] = [
    EOperation.VIEW,
    EOperation.READ,
    EOperation.WRITE,
    EOperation.DELETE,
] as const;

export const OperationLabels: Record<EOperation, string> = {
    [EOperation.VIEW]: 'Просмотр',
    [EOperation.READ]: 'Чтение',
    [EOperation.WRITE]: 'Запись',
    [EOperation.DELETE]: 'Удаление',
};
