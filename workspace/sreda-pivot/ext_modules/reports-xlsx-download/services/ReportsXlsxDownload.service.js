const Extensions = require("../../../core/class/Extensions.class");
const ExcelJS = require("exceljs");
const ReportServiceClass = require("../../reports/services/Reports.service");
const ReportService = new ReportServiceClass()

const NUMBER_REGEXP = /^(\-)?[0-9]+(\.[0-9]*)?$/;

class ReportsXlsxDownloadService extends Extensions {


    async postjson(infoserviceId, body) {
        const result = [];
        const rbody = { ...body, limit: 250000 };
        const data = await ReportService.setResultTableData(infoserviceId, undefined, rbody);

        const aliases = {};
        data.params.columns.forEach(col => {
            aliases[`${col.label}`] = { description: col.description, name: col.name };
        })

        const columns = data.table.columns;
        const columnRow = []
        columns.forEach((col) => {
            const label = col[0];
            const alias = aliases[label];
            columnRow.push(alias ? alias.description : label)
        })
        result.push(columnRow);

        const table = data.table.data;
        table.forEach((row) => {
            const dataRow = []
            row.forEach((item, colIndex) => {
                const labelColumn = columns[colIndex][0];
                const alias = aliases[labelColumn];
                const realData = data.refs[alias.name] ? data.refs[alias.name][item] : item;
                dataRow.push(realData ? realData : item)
            })
            result.push(dataRow);
        })

        return { result, data };
    }

    funcToDescription(func) {
        const transcript = {
            SUM: "Сумма",
            COUNT: "Количество",
            MAX: "Максимум",
            MIN: "Минимум",
            AVG: "Среднее",
        }
        return transcript[func] ?? func;
    }

    async postxlsx(infoserviceId, body) {
        const rbody = { ...body, limit: sreda.env?.MAXCOUNTXLSXREPORT ?? 250000 };

        const data = await ReportService.setResultTableData(infoserviceId, undefined, rbody);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sheet1');
        worksheet.addRow(['Для служебного пользования']);
        worksheet.addRow([]);
        worksheet.addRow(['Единицы измерения:', 'рубль']);

        const aliases = {};
        data.params.columns.forEach(col => {
            aliases[`${col.label}`] = { description: col.description, name: col.name };
        })

        // const MeasuresColumns = [] ;

        const columns = data.table.columns;
        const columnRow = []
        columns.forEach((columnName) => {

            let columnLabel = columnName;

            if (typeof columnName === "object") {
                const originalColumnName = columnName.field;
                columnLabel = data.treeObject.Measures?.[originalColumnName]?.description ?? columnName
                columnLabel = `${columnLabel} (${this.funcToDescription(columnName.func)})`;

            } else {
                let columnDescription = data.treeObject.Dimensions?.[columnName]?.description;
                if (!columnDescription) {
                    columnDescription = data.treeObject.Measures?.[columnName]?.description;
                }
                columnLabel = columnDescription ?? columnName
            }

            columnRow.push(columnLabel);
        })
        worksheet.addRow(columnRow)

        const table = data.table.data;
        table.forEach((row) => {
            const dataRow = []
            row.forEach((originalData, columnIndex) => {
                const columnName = data.table.columns[columnIndex];

                let viewedData = originalData;
                if (typeof columnName === "string") {
                    // Это измерение, его нужно преобразовывать
                    viewedData = data.refs?.[columnName]?.[originalData] ?? originalData;
                }

                if (typeof viewedData === 'string' && typeof columnName !== "string" && viewedData.match(NUMBER_REGEXP)) {
                    // При записи строки в виде числа может сокращаться число знаков после запятой - потому что больше 64 бит в JS не поместится
                    viewedData = parseFloat(viewedData);
                }

                dataRow.push(viewedData);
            })
            worksheet.addRow(dataRow)
        })

        const result = await workbook.xlsx.writeBuffer();
        return result;
    }

}

module.exports = ReportsXlsxDownloadService;
