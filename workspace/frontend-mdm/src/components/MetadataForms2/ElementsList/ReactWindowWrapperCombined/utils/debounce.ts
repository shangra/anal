export function debounce<TArgs extends unknown[]>(
    func: (...args: TArgs) => void,
    delay: number,
    thisArg?: unknown,
): (...args: TArgs) => void {
    let timeoutId: ReturnType<typeof setTimeout>
    return (...args: TArgs) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
            func.apply(thisArg, args)
        }, delay)
    }
}