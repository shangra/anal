/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 */

const compression = require('compression');

const config = sreda.env.COMPRESSION_CONFIG || { level: 1 };

/**
 * @param {Request} req
 * @param {Response} res
 */
const filter = (req, res) =>
    !req.headers['x-no-compression'] ? false : compression.filter(req, res);

module.exports = compression({ filter, ...config });
