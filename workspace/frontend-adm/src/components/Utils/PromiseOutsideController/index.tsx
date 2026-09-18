export function PromiseOutsideController() {
    let resolve: (value: unknown) => void = () => {};
    let reject: (value: unknown) => void = () => {};

    const pendingPromise = new Promise((resolveFunc, rejectFunc) => {
        resolve = resolveFunc;
        reject = rejectFunc;
    });

    return { pendingPromise, resolve, reject };
}
