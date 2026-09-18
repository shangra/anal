export function flattenToNested(flatObj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(flatObj)) {
        const keys = key.split('.');
        let current = result;

        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];

            if (i === keys.length - 1) {
                current[k] = value;
            } else {
                if (!current[k]) {
                    current[k] = {};
                }
                current = current[k];
            }
        }
    }

    return result;
}