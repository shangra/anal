import { v4 as uuidv4 } from 'uuid';

const randomIntegerGenerator = (min: number = Number.MIN_SAFE_INTEGER, max: number = Number.MAX_SAFE_INTEGER): number => {
    // случайное число от min до (max+1)
    const rand = min + Math.random() * (max + 1 - min);
    return Math.floor(rand);
};

export const generateUniqueIdentifier = (
    type?: 'number' | 'string',
    options?: { min: number; max: number },
): number | string => {
    switch (type) {
        case 'number':
            return randomIntegerGenerator(options?.min, options?.max);
        case 'string':
        default:
            return uuidv4();
    }
};
