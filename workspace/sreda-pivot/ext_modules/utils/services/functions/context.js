function decorateFn(fn, ctx, cbFn) {
    const original = fn.bind(ctx);

    return async (...args) => {
        const result = await original(...args);

        return cbFn(result);
    };
}

module.exports = {
    decorateFn,
};
