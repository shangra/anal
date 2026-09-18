const fs = require('fs');
const path = require("path");

const filePath = path.join(__dirname, `_index.json`);

const data = fs.readFileSync(filePath).toString();

const rows = JSON.parse(data);

const result = rows.data.map((data, index) => {
    const { req, res } = data;

    delete res.answerId

    const where = req.where || {};
    const systemWhere = req.systemWhere || {};
    const dictionaryWhere = req.dictionaryWhere || {};

    data.comment = '';
    data.comment += `№${index} |`;
    data.comment += `columns: ${req.columns.map(({ name }) => name)} | `
    data.comment += `rows: ${req.rows.map(({ name }) => name)} | `
    data.comment += `where: ${JSON.stringify(where)} | `
    data.comment += `systemWhere: ${JSON.stringify(systemWhere)} | `
    data.comment += `dictionaryWhere | ${JSON.stringify(dictionaryWhere)}`;

    return data;
});

fs.writeFileSync(filePath, JSON.stringify({ data: result }, null, 1));


module.exports = result;