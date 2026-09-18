const cors = require('cors');

module.exports = cors({
    credentials: true,
    origin: sreda.env.CORS_ORIGIN ?? [].concat(sreda.env.CORS_ORIGIN),
});
