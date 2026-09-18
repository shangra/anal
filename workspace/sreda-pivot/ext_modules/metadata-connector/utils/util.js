//TODO!!! - нормальные типы

const OutOfBoundRequestError = require('../../metadata-connector/errors/OutOfBoundRequest.error');

const count_ast = (ast) =>
    b.select({
        projections: [b.proj(b.fn('COUNT', [b.star()]), 'c')],
        from: b.from(b.subsrc(ast, 'q')),
    });

/**
 * @param {any} connector
 * @param {*} ast
 * @param {*} options
 */
const count = async (connector, ast, options) => {
    const cAst = this.count_ast(ast);
    const [{ c: count }] = await this.query(cAst);
    return +count || 0;
};

/**
 * @param {*} connector
 * @param {*} ast
 * @param {{ batchSize: number, pages: number, no_stream: boolean }} options
 * @returns
 */
const read = async (connector, ast, options) =>
    options.no_stream
        ? readAll(connector, ast, options)
        : stream(connector, ast, options);

const readAll = (connector, ast, options) => connector.query(ast, options);

const stream = async (connector, ast, options) => {
    const gen = connector.stream(
        ast,
        options,
        (message) => new OutOfBoundRequestError(message)
    );

    let rows = [];
    for await (const data of gen) rows = rows.concat(data);
    return rows;
};

module.exports = {
    count_ast,
    count,
    read,
};
