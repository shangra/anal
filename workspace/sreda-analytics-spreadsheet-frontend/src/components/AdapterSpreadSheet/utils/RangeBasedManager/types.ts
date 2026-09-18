export interface LookupResult<T> {
    data: T;
    rangeId: string;
}

// Стратегия слияния значений
export interface IMergeStrategy<T> {
    merge(base: T, override: T): T;
    empty(): T;
    equal(a: T, b: T): boolean;
    /**
     * Возвращает true, если outer полностью замещает inner по смыслу:
     * т.е. все ключи/данные, присутствующие в inner, также присутствуют в outer
     * и эквивалентны, поэтому inner можно безопасно удалить.
     * Если не определено, по умолчанию считается что замещение происходит (старое поведение).
     */
    subsumes?(outer: T, inner: T): boolean;
}
