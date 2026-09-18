import { OPERATION_ORDER } from '../constants';
import { EOperation } from '../types';

export function getHighestOperation(permissions: EOperation[]): EOperation | undefined {
    if (permissions.length === 0) return undefined;

    let maxIndex = -1;
    for (const perm of permissions) {
        const index = OPERATION_ORDER.indexOf(perm);
        if (index > maxIndex) maxIndex = index;
    }

    return OPERATION_ORDER[maxIndex];
}

export function getOperationUpTo(highest: EOperation): EOperation[] {
    const index = OPERATION_ORDER.indexOf(highest);
    if (index === -1) {
        throw new Error(`Неизвестное право: ${highest}`);
    }
    return OPERATION_ORDER.slice(0, index + 1);
}
