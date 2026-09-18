export function mergeObjects<T extends object>(...objects: T[]): T {
    const result = new Map();
    objects.forEach((obj) => {
        result.set(JSON.stringify(obj), obj);
    });

    const combinedValues = Array.from(result.values()).reduce((acc, obj) => ({ ...acc, ...obj }), {});

    return combinedValues;
}
