export class AutoFillReadonlyError extends Error {
    constructor(public readonly row: number, public readonly col: number) {
        super(`Автозаполнение заблокировано: ячейка [${row}, ${col}] только для чтения`);
        this.name = 'AutoFillReadonlyError';
    }
}
