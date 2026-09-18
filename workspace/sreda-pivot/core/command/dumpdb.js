/**
 *  Консольное приложение для получения дампов из БД backend'а
 *  Используемые ключи:
 *      -db unu -DB (сокращение от DataBase) - указывает на то, что надо сделать дамп всей БД
 *
 *      -t или -T (сокращение от Table) - указывает из какой таблицы требуется выгрузить данные.
 *                                        Например -t Page - выгрузить из таблицы Page
 *      -w или -W (сокращение от Where) - указывает условия для выгрузки в формате json
 *                                        Например -w '{ "code": [1,2] }' - выгрузить из таблицы данные где поле code равно 1 или 2
 *                                        Поддерживаются сложные условия Sequelize:
 *                                        Пример: '{"code": { "[gt]": 2} }'
 *                                        Аналогичен условию { code: { [Op.gt]: 2} }
 *                                        Который в результате сформирует условие в запросе
 *                                        WHERE code > 2
 *      -o или -O (сокращение от Output) - указывает в какой файл сохранить вывод.
 *                                        без указания параметра сохраняет в файл по шаблону output_%ТЕКУЩЕЕ ВРЕМЯ%.json
 *      -r или -R (сокращение от Restore) - указывает на файл который требуется восстановить в БД
 *                                          либо на папку с файлами в формате 'output_(*).json' которые будут восстановлены в БД
 *
 * Пример использования:
 *      node dumpdb.js -t Page -w '{"code":[1,2]}'
 *      Выгрузит из таблицы Page и всех связанных таблиц всё, что подходит под указанное условие, поле code равно 1 или 2,
 *      на выходе сформирует файл например 'output_1644499055380.json'
 *
 *      node dumpdb.js -t Page -w '{"code":1}' -o test.json
 *      Выгрузит из таблицы Page и всех связанных таблиц всё, что подходит под указанное условие, поле code равно 1,
 *      на выходе сформирует файл например 'test.json'
 *
 *       node dumpdb.js -db
 *       Выгрузить все таблицы со всеми записями в текущую папку
 *
 *       node dumpdb.js -db -o ./db/dumps/
 *       Выгрузить все таблицы со всеми записями в папку ./db/dumps/
 *
 *       node dumpdb.js -db -o ./db/dumps/ --now
 *       Выгрузить все таблицы со всеми записями в папку ./db/dumps/[Y-m-d H:M:S]
 *       Где [Y-m-d H:M:S] - текущая дата и время
 *
 *       node dumpdb.js -db -w '{"updatedAt": { "[gt]": 1644561868234} }'
 *       Выгрузить все таблицы с записями которые были обновлены после 11.02.2022 9:50 в текущую папку
 *
 *       node dumpdb.js -r test.json
 *       Загрузит из файла 'test.json' все данные в соответствии с правилами которые были при выгрузке этого файла
 *       Если в процессе загрузки произойдет ошибка, то все данные будут откатаны(rollback) по транзакции и выводится ошибка
 *       При успешном результате вернется json в формате { result: true, msg: "ok" }
 *
 *       node dumpdb.js -r
 *       Загрузит из текущей папки все файлы в формате 'output_*.json' в БД
 *
 *       node dumpdb.js -r ./db/dumps/
 *       Загрузит из папки ./db/dumps/ все файлы '*.json' в БД
 *
 *       node dumpdb.js -r ./db/dumps/ --recurse
 *       Загрузит рекурсивно из папки ./db/dumps/ все файлы'*.json' в БД
 * */

// 19522605@cab-wsm-0068645 backend % node dumpdb.js -r ./db/dumps/
// /Users/19522605/www/portalmis.bb/backend
// [
//   '/usr/local/bin/node',
//   '/Users/19522605/www/portalmis.bb/backend/dumpdb.js',
//   '-r',
//   './db/dumps/'
// ]

const fs = require('fs');
const path = require('path');
const httpContext = require('../services/http-context');

require('../');

const DumpDBService = require('../../ext_modules/dump-cms/services/DumpDB.service');

let Restore = false;
let dumpFullDB = false;
let inputFile = 'output.json';
const params = {};

for (const key in process.argv) {
    const intkey = parseInt(key);
    const arg = process.argv[key];
    if (arg.toLowerCase() === '-t') {
        // Это таблица за параметром должно быть название таблицы
        params.table = process.argv[intkey + 1];
    }
    if (arg.toLowerCase() === '-w') {
        // Это условие за параметром должно быть условие к таблицам
        const Where = process.argv[intkey + 1];
        params.where = JSON.parse(Where);
    }

    if (arg.toLowerCase() === '-o') {
        // Это условие за параметром должно быть условие к таблицам
        params.todir = process.argv[intkey + 1];
        params.outputFile = process.argv[intkey + 1];
    }

    if (arg.toLowerCase() === '-db') {
        params.table = 'DB';
        dumpFullDB = true;
    }

    if (arg.toLowerCase() === '-r') {
        // Это условие за параметром должно быть условие к таблицам
        if (process.argv[intkey + 1] !== undefined) {
            inputFile = process.argv[intkey + 1];
        } else {
            inputFile = './';
        }
        Restore = true;
    }
}

const NowDate = Date.now();

function getAllFilesRecurse(inputFile) {
    let allFiles = [];
    const files = fs.readdirSync(inputFile);
    for (const key in files) {
        const filePath = path.join(inputFile, files[key]);
        if (fs.lstatSync(filePath).isDirectory()) {
            // Это папка
            const resFiles = getAllFilesRecurse(filePath);
            allFiles = [...allFiles, ...resFiles];
        } else if (path.parse(filePath).ext === '.json') {
            allFiles.push(filePath);
        }
    }

    return allFiles;
}

function dateFormat(date, fstr, utc) {
    utc = utc ? 'getUTC' : 'get';
    return fstr.replace(/%[YmdHMS]/g, (m) => {
        switch (m) {
            case '%Y':
                return date[`${utc}FullYear`](); // no leading zeros required
            case '%m':
                m = 1 + date[`${utc}Month`]();
                break;
            case '%d':
                m = date[`${utc}Date`]();
                break;
            case '%H':
                m = date[`${utc}Hours`]();
                break;
            case '%M':
                m = date[`${utc}Minutes`]();
                break;
            case '%S':
                m = date[`${utc}Seconds`]();
                break;
            default:
                return m.slice(1); // unknown code, remove %
        }
        // add leading zero if required
        return `0${m}`.slice(-2);
    });
}

async function main(params) {
    const DumpTable = async (params) => {
        const result = await DumpDBService.Dump(params);

        if (!result?.length) {
            console.error('Empty table');

            return { result: false };
        }

        const dataFile = JSON.stringify(result, null, '    ');

        console.log(params.outputFile);
        fs.writeFileSync(params.outputFile, dataFile);
        console.log(`Save to ${params.outputFile}`);

        return result;
    };

    const RestoreTable = async (fileName) => {
        console.log(`== ${fileName}: restoring =======`);
        const start = Date.now();

        const sessionStorage = {
            user: {
                id: '00000000-0000-0000-0000-000000000000',
                rules: {
                    '90499885-ae60-440b-a59f-cfd3958110cd': {
                        name: 'AllRead',
                        details: 'AllRead',
                    },
                    '12e32c9d-6e4f-4d57-ae22-5cddaabf343c': {
                        name: 'Administrator',
                        details: 'Administrator',
                    },
                    '4df82939-0cd0-447e-9d37-1efd6fab37f0': {
                        name: 'FilesWrite',
                        details: 'Редактирование файлов',
                    },
                    '2fcb45e6-f1b3-47ca-9d26-af1b99abc113': {
                        name: 'PagesWrite',
                        details: 'Редактирование страниц',
                    },
                    'b6df04e5-52b5-479d-a339-0462b32a9e98': {
                        id: 'b6df04e5-52b5-479d-a339-0462b32a9e98',
                        name: 'WidgetsWrite',
                        details: 'Редактирование виджетов',
                    },
                    '07ed8360-e059-4e50-9fcd-4e214e291d5a': {
                        id: '07ed8360-e059-4e50-9fcd-4e214e291d5a',
                        name: 'TemplatesWrite',
                        details: 'Редактирование шаблонов',
                    },
                },
            },
        };
        httpContext.set('sessionStorage', sessionStorage);

        console.log(fileName.trim());
        const result = await DumpDBService.restoreFromFile(fileName);
        console.log(result);
        console.log(`== ${fileName}: restored (${Date.now() - start}s)`);
    };

    if (Restore) {
        const exist = fs.existsSync(inputFile);
        if (exist) {
            const stat = fs.lstatSync(inputFile);
            if (stat.isDirectory()) {
                //

                let allFileList = [];
                if (process.argv.indexOf('--recurse') >= 0) {
                    allFileList = getAllFilesRecurse(inputFile);
                } else {
                    const files = fs.readdirSync(inputFile);
                    for (const key in files) {
                        const fileName = files[key];
                        if (path.parse(fileName).ext === '.json') {
                            allFileList.push(inputFile + fileName);
                        }
                        // const regex = /^output_(.*)\.json$/gm;
                        // if (regex.exec(fileName) !== null) {
                        //     allFileList.push(inputFile+fileName);
                        // }
                    }
                }

                console.log(allFileList);
                for (const key in allFileList) {
                    await RestoreTable(allFileList[key]);
                }
            } else {
                await RestoreTable(inputFile);
            }
        }
    } else if (dumpFullDB) {
        let appendDate = '';
        if (process.argv.indexOf('--now') >= 0) {
            appendDate = dateFormat(new Date(), '%Y-%m-%d %H:%M:%S', true);
            if (!fs.existsSync(path.join(params.todir ?? '', appendDate))) {
                fs.mkdirSync(path.join(params.todir ?? '', appendDate), {
                    recursive: true,
                });
            }
        }
        const tableList = await DumpDBService.GetTableList(params);
        for (const key in tableList) {
            const tableName = tableList[key];
            params.table = tableName;
            const outputFile = `${NowDate}_${params.table}.json`;
            params.outputFile = path.join(
                params.todir ?? '',
                appendDate,
                outputFile
            );
            await DumpTable(params);
        }
    } else {
        const outputFile = `${NowDate}_${params.table}.json`;
        params.outputFile = (params.todir ?? '') + outputFile;
        await DumpTable(params);
    }
}

let time = Date.now();
const showTimer = () => {
    time = Date.now() - time;
    const seconds = time / 1000;
    console.log(`Время выполнения(сек) - ${seconds} time - ${time}`);
};

httpContext.ns.run(() => {
    main(params)
        .then(() => {
            showTimer();
        })
        .catch((err) => {
            console.error(err);
            showTimer();
        })
        .finally(() => process.exit());
});
