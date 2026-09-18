const Extensions = require('../../../core/class/Extensions.class');
// const { PythonShell } = require('python-shell');
// const path = require('path');
// const fsp = require('fs').promises;
// const { spawn } = require('child_process');
const ApiError = require('../../../core/exceptions/ApiError');
const PivotClass = require('./Pivot.class');
const PivotPandasClass = wrapper("../pivot/services/pivot_service")
const PivotPandas = new PivotPandasClass();

class PivotPythonService extends Extensions {
    async get(jsonImport, metadata) {
        if (!sreda.env.PIVOT_WORKER_ON) {
            const PivotI = new PivotClass(jsonImport.data, metadata);

            const jsonObject = await PivotI.pivot_node_table(
                jsonImport.settings.index,
                jsonImport.settings.columns,
                jsonImport.settings.values,
                jsonImport.settings.aggfunc,
                metadata?.order
            );

            return jsonObject.flat_to_ndf().to_nodes();
        }

        try {
            const jsonObject = JSON.parse(await PivotPandas.pivot(jsonImport));

            const newColumns = [];
            for (const columns of jsonObject.columns) {
                let lastColumn = '';
                const newColumn = [];
                for (const val of columns) {
                    const splittingColumn = '' + val ? ('' + val).split(":->:") : [''];
                    if (splittingColumn.length > 1) { lastColumn = splittingColumn.pop() }
                    splittingColumn.forEach((col, index) => {
                        if (lastColumn.toLowerCase() !== col.toLowerCase()) newColumn.push(col);
                    });
                }
                newColumn.push(lastColumn);
                newColumns.push(newColumn);
            }
            jsonObject.columns = newColumns;

            if (Array.isArray(jsonObject.index)) {
                jsonObject.index = jsonObject.index.map((item) => `${item}`);
            }

            return jsonObject;
        } catch (e) {
            throw ApiError.BadRequest('Ошибка разбора в Python', [e, jsonImport]);
        }
    }
}

module.exports = PivotPythonService;
