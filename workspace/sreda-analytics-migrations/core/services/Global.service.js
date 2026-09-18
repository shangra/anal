const { promises: fsp } = require('fs');
const FormData = require('form-data');
const path = require('path');
const { createHash } = require('crypto');

const httpContext = require('../services/http-context');
const esbApi = require('./esb-api');

class NodeTree {
    constructor(data, value, parent) {
        this.data = data;
        this.value = value;
        this.parent = parent;
        this.children = [];
    }

    appendChildren(node) {
        this.children.push(node);
    }

    toJSON() {
        const result = {
            id: this.data,
        };

        if (this.children.length > 0) {
            result.children = this.children.map((value) => value.toJSON());
        }

        return result;
    }

    toLine() {
        let result = [];
        result.push(this.data);
        if (this.children.length > 0) {
            this.children.forEach((value) => {
                result = result.concat(value.toLine());
            });
        }
        return result;
    }

    toArray(childrenTree = undefined, thisChildren = false) {
        let result = [];
        let thisChildrens = thisChildren;
        if (
            thisChildrens ||
            !childrenTree ||
            (childrenTree && this.data === childrenTree)
        ) {
            result.push(this.value);
            thisChildrens = true;
        }
        if (this.children.length > 0) {
            this.children.forEach((value) => {
                const tree = value.toArray(childrenTree, thisChildrens);
                result = result.concat(tree);
            });
        }
        return result;
    }
}

class GlobalService {
    static async deleteFile(path) {
        await fsp.unlink(path).catch((e) => console.log(e));
    }

    static md5(str) {
        return createHash('md5').update(str).digest('hex');
    }

    static pathinfo = (fullfilename) => {
        const result = {};

        let ex = fullfilename.split('/');
        let maxExIndex = ex.length - 1;
        const basename = ex[maxExIndex];
        result.basename = basename;

        ex.pop(); // [maxExIndex] = undefined;
        const dirname = ex.join('/');
        result.dirname = dirname;

        ex = basename.split('.');
        maxExIndex = ex.length - 1;
        const extension = ex[maxExIndex];
        result.extension = extension;

        ex.pop(); // [maxExIndex] = undefined;
        const filename = ex.join('.');
        result.filename = filename;

        return result;
    };

    // /**
    //  * @param {string} url
    //  * @param {object} options
    //  * @returns {Promise<{ body: string | object | object[] | Blob | { errors: { message: string, stack: object[] }[], message: string, original: object, stack: string }, status: number }>}
    //  */
    // static async fetchESB(url, options = {}) {
    //     const { SID } = httpContext.get('sessionStorage');

    //     options.headers = {
    //         'Accept': 'application/json',
    //         ...(options?.headers ?? {}),
    //         'Origin': process.env.HOST,
    //         'Cookie': `SID=${SID}`,
    //         'trace-id': httpContext.get('trace-id'),
    //     };

    //     try {
    //         const response = await esbApi.fetch(url, options);

    //         const contentType = response.headers.get('Content-Type');

    //         let body = null;
    //         switch (true) {
    //             // All plain text types, e.g. text/plain, text/html or text/xml
    //             case /^text\/(?:[a-z0-9-_.]+[+]?)+\;?.*$/gmi.test(contentType):
    //                 body = await response.text();
    //                 break;
    //             // All JSON types, e.g. application/scim+json or application/ld+json
    //             case /^application\/(?:[a-z0-9-_]+[+-])*json\;?.*$/gmi.test(contentType):
    //                 body = await response.json();
    //                 break;
    //             // All other formats like application/octet-stream
    //             default:
    //                 body = await response.blob();
    //         }

    //         console.debug({ 'Content-Type': contentType, body, status: response.status });

    //         return { body, status: response.status };
    //     } catch (e) {
    //         console.error(e);

    //         return {
    //             body: {
    //                 errors: [{ message: e.message, stack: e.stack }],
    //                 message: "Непредвиденная ошибка",
    //                 original: {},
    //                 stack: ""
    //             },
    //             status: 500,
    //         };
    //     }
    // }

    /**
     * @param {string} url
     * @param {object} options
     * @returns {Promise<{ body: string | object | object[] | Blob | { errors: { message: string, stack: object[] }[], message: string, original: object, stack: string }, status: number }>}
     */
    static async #fetch(func, url, options = {}) {
        const { SID } = httpContext.get('sessionStorage');
        // const { SID } = httpContext.get('sessionStorage') ?? {}; //FYI стоит сделать так, здесь бывают исключения

        options.headers = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(options?.headers ?? {}),
            Origin: process.env.HOST,
            Cookie: `SID=${SID}`,
            'trace-id': httpContext.get('trace-id'),
        };

        try {
            const response = await func(url, options);

            const contentType = response.headers.get('Content-Type');

            let body = null;
            switch (true) {
                // All plain text types, e.g. text/plain, text/html or text/xml
                case /^text\/(?:[a-z0-9-_.]+[+]?)+\;?.*$/gim.test(contentType):
                    body = await response.text();
                    break;
                // All JSON types, e.g. application/scim+json or application/ld+json
                case /^application\/(?:[a-z0-9-_]+[+-])*json\;?.*$/gim.test(
                    contentType
                ):
                    body = await response.json();
                    break;
                // All other formats like application/octet-stream
                default:
                    body = await response.blob();
            }

            console.debug({
                'Content-Type': contentType,
                body,
                status: response.status,
            });

            return { body, status: response.status };
        } catch (e) {
            console.error(e);

            return {
                body: {
                    errors: [{ message: e.message, stack: e.stack }],
                    message: 'Непредвиденная ошибка',
                    original: {},
                    stack: '',
                },
                status: 500,
            };
        }
    }

    /**
     * @param {string} url
     * @param {object} options
     * @returns {Promise<{ body: string | object | object[] | Blob | { errors: { message: string, stack: object[] }[], message: string, original: object, stack: string }, status: number }>}
     */
    static async fetchLocalhost(url, options = {}) {
        const func = esbApi.simpleFetch;
        const localhostUrl = `http://${process.env.HOST}${url}`;
        return GlobalService.#fetch(func, localhostUrl, options);
    }

    /**
     * @param {string} url
     * @param {object} options
     * @returns {Promise<{ body: string | object | object[] | Blob | { errors: { message: string, stack: object[] }[], message: string, original: object, stack: string }, status: number }>}
     */
    static async fetchESB(url, options = {}) {
        const func = esbApi.fetch;
        return GlobalService.#fetch(func, url, options);
    }

    /**
     * @param {string} filepath Путь к файлу, без указания самого файла
     * @param {{ originalname: string, path?: string; buffer?: Buffer }} file
     * @param {string} [filename] Имя файла
     * @returns {Promise<{ body: string | object | object[] | Blob | { errors: { message: string, stack: object[] }[], message: string, original: object, stack: string }, status: number }>}
     */
    static async upload(filepath, file, filename) {
        const content = !Buffer.isBuffer(file.buffer)
            ? await fsp.readFile(file.path)
            : file.buffer;

        filename ||= file.originalname;

        const formData = new FormData();
        formData.append('upload', content, filename);
        formData.append('fullname', path.join(filepath, filename));
        formData.append('name', filename);

        return this.fetchESB('/files?recursive=true&replace=true', {
            method: 'POST',
            body: formData,
        });
    }

    /**
     * @deprecated use fetchESB instead
     */
    static async getFromEsb(url, options = {}, type = 'json') {
        const sessionStorage = httpContext.get('sessionStorage');
        const traceId = httpContext.get('trace-id');

        // const esbHost = process.env.ESB_HOST;
        const oldHeaders = options.headers ? { ...options.headers } : {};
        options.headers = {
            ...oldHeaders,
            origin: process.env.HOST,
            Cookie: `SID=${sessionStorage.SID}`,
            'trace-id': traceId,
        };
        let result = {};
        try {
            const response = await esbApi.fetch(url, options);
            if (type === 'json') {
                const text = await response.text();
                if (text.trim() !== '') {
                    result = JSON.parse(text);
                } else {
                    result = {};
                }
            } else if (type === 'blob') {
                result = await response.blob();
            }
            result.status = response.status;
        } catch (err) {
            console.log(err);
            result.message = 'Непредвиденная ошибка';
            result.status = 500;
            result.errors = [];
            result.errors.push({ message: err.message, stack: err.stack });
        }
        return result;
    }

    /**
     * @deprecated use upload instead
     */
    static async saveFileToESB(file, filename, toPath) {
        const sessionStorage = httpContext.get('sessionStorage');
        const traceId = httpContext.get('trace-id');
        const toDir = encodeURIComponent(toPath);

        // const host = process.env.ESB_HOST;
        const url = `/files/uploadtodirectory?id=${toDir}`;
        const isBuffer = Buffer.isBuffer(file.path);
        const fileContent = isBuffer
            ? file.path
            : await fsp.readFile(file.path);

        const ex = file.originalname.split('.');
        const maxExIndex = ex.length - 1;
        const extension = ex[maxExIndex];

        const filenameWithoutExtension = filename.replace(
            new RegExp(`.${extension}$`),
            ''
        );

        const formData = new FormData();
        formData.append(
            'upload',
            fileContent,
            `${filenameWithoutExtension}.${extension}`
        );
        const axiosResult = esbApi.axios
            .post(url, formData, {
                headers: {
                    Origin: process.env.HOST,
                    'Content-type': `multipart/form-data; boundary=${formData.getBoundary()}`,
                    Cookie: `SID=${sessionStorage.SID}`,
                    'trace-id': traceId,
                },
            })
            .then((response) => {
                console.log(response);
                return response;
            })
            .catch((error) => {
                console.log(error);
                return error.response;
            });

        return axiosResult;
    }

    static async getBase64FileFromEsb(fileId) {
        const sessionStorage = httpContext.get('sessionStorage');
        const traceId = httpContext.get('trace-id');
        // const esbHost = process.env.ESB_HOST;
        const axiosConfig = {
            responseEncoding: 'base64',
            headers: {
                Origin: process.env.HOST,
                Cookie: `SID=${sessionStorage.SID}`,
                'trace-id': traceId,
            },
        };
        return esbApi.axios
            .get(`/files/get/${fileId}`, axiosConfig)

            .then((response) => {
                const contentType = response.headers['content-type'];
                const base64strWithMime = `data:${contentType};base64,${response.data}`;
                return { status: response.status, data: base64strWithMime };
            })

            .catch((error) => {
                console.error(error);
                const data = Buffer.from(
                    error?.response?.data ?? '',
                    'base64'
                ).toString('utf8');
                return {
                    status: error.response?.status,
                    data: {
                        message: error.message,
                        code: error.code,
                        response: data,
                    },
                };
            });
    }

    static getTreeNode(inputArray = [], node = undefined) {
        const treeNode = GlobalService.SortTree(inputArray, node);
        return treeNode;
    }

    static SortTree(inputArray = [], node = undefined) {
        const NodesLink = {};

        const list = [...inputArray];

        let notEndWhile = true;
        let prohod = 0;
        const maxprohod = list.length * list.length; // n^2
        let index = 0;
        let root = null;

        while (notEndWhile) {
            prohod++;
            const node = list[index];

            if (node.id === node.parent) {
                // it's root
                const newNode = new NodeTree(node.id, node, null);
                root = newNode;
                NodesLink[node.id] = newNode;

                list.splice(index, 1);
                index = -1;
            } else {
                const indexLink = Object.keys(NodesLink).indexOf(node.parent);
                if (indexLink >= 0) {
                    const parentNode = NodesLink[node.parent];
                    const newNode = new NodeTree(node.id, node, parentNode);
                    parentNode.appendChildren(newNode);
                    NodesLink[node.id] = newNode;

                    list.splice(index, 1);
                    index = -1;
                }
            }

            index++;
            if (prohod === maxprohod || index >= list.length) {
                notEndWhile = false;
            }
        }

        let result = inputArray;
        if (root !== null) {
            result = root.toArray(node);
        }
        return result;
    }

    static transliterate(word, options = {}) {
        const a = {
            а: 'a',
            б: 'b',
            в: 'v',
            г: 'g',
            д: 'd',
            е: 'e',
            ё: 'yo',
            ж: 'zh',
            з: 'z',
            и: 'i',
            й: 'i',
            к: 'k',
            л: 'l',
            м: 'm',
            н: 'n',
            о: 'o',
            п: 'p',
            р: 'r',
            с: 's',
            т: 't',
            у: 'u',
            ф: 'f',
            х: 'h',
            ц: 'ts',
            ч: 'ch',
            ш: 'sh',
            щ: 'sch',
            ъ: '',
            ы: 'i',
            ь: '',
            э: 'e',
            ю: 'yu',
            я: 'ya',

            А: 'A',
            Б: 'B',
            В: 'V',
            Г: 'G',
            Д: 'D',
            Е: 'E',
            Ё: 'YO',
            Ж: 'ZH',
            З: 'Z',
            И: 'I',
            Й: 'I',
            К: 'K',
            Л: 'L',
            М: 'M',
            Н: 'N',
            О: 'O',
            П: 'P',
            Р: 'R',
            С: 'S',
            Т: 'T',
            У: 'U',
            Ф: 'F',
            Х: 'H',
            Ц: 'TS',
            Ч: 'CH',
            Ш: 'SH',
            Щ: 'SCH',
            Ъ: '',
            Ы: 'I',
            Ь: '',
            Э: 'E',
            Ю: 'YU',
            Я: 'YA',
        };

        const engLetter = [
            '1',
            '2',
            '3',
            '4',
            '5',
            '6',
            '7',
            '8',
            '9',
            '0',
            'a',
            'b',
            'c',
            'd',
            'e',
            'f',
            'g',
            'h',
            'i',
            'j',
            'k',
            'l',
            'm',
            'n',
            'o',
            'p',
            'q',
            'r',
            's',
            't',
            'u',
            'v',
            'w',
            'x',
            'y',
            'z',
        ];

        const b = {};
        Object.entries(a).forEach(([key, value]) => {
            b[value] = key;
        });

        const ext_array = options.ext_array ? options.ext_array : [];

        const wordArray = word.trim().split('');
        const newWordArray = [];
        for (const char of wordArray) {
            if (a[char]) {
                newWordArray.push(a[char]);
            } else if (ext_array[char]) {
                newWordArray.push(ext_array[char]);
            } else if (engLetter.indexOf(char.toLowerCase()) !== -1) {
                newWordArray.push(char);
            } else if (!options.onlyLetters) {
                newWordArray.push(char);
            }
        }
        return newWordArray.join('');
    }

    static getHashTagsFromContent(content) {
        const result = [];
        const regex = /#(?<tagname>\.*[\w,А-Яа-я]*)/gm;
        let m;
        while ((m = regex.exec(content)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            // The result can be accessed through the `m`-variable.
            if (m.groups.tagname.trim() !== '') {
                const tagname = m.groups.tagname.toLowerCase();
                if (result.indexOf(tagname) === -1) {
                    result.push(tagname);
                }
            }
        }

        return result;
    }

    static transliterateMis(str) {
        return GlobalService.transliterate(str.trim().toLowerCase(), {
            ext_array: { ' ': '_', _: '_', '-': '-', '.': '.' },
            onlyLetters: true,
        });
    }

    static ParamJSON(value) {
        let result = {};
        try {
            result = JSON.parse(value);
        } catch (e) {
            console.error(e);
        }
        return result;
    }

    /**
     * @param {string} id
     */
    static require(id) {
        if (id === 'GlobalService') {
            return GlobalService;
        }

        const [ext, service] = id.split('/').slice(-1)[0];

        const services = require('../../ext_modules/services');

        return services[ext].services[`${service}Service`];
    }

    static async limitedPromiseAll(tasks, limit) {
        if (!limit) {
            throw new Error('Лимит на выполнение не определен');
        }
        if (!Array.isArray(tasks)) {
            throw new Error('Неверный тип аргумента');
        }

        // Если прилетит пустой массив - limitedPromiseAll зависнет в бесконечном ожидании
        if (!tasks.length) {
            return Promise.resolve([]);
        }

        return new Promise((resolve, reject) => {
            const result = [];
            let processedTaskIndex;
            let handledTasksCount = 0;

            const handleTask = (task, taskIndex) => {
                task()
                    .then((res) => {
                        result[taskIndex] = res;

                        handledTasksCount++;
                        if (handledTasksCount === tasks.length) {
                            resolve(result);
                        }

                        processedTaskIndex++;
                        if (processedTaskIndex < tasks.length) {
                            const nextTask = tasks[processedTaskIndex];
                            handleTask(nextTask, processedTaskIndex);
                        }
                    })
                    .catch(reject);
            };

            const freeStartCount = tasks.length < limit ? tasks.length : limit;
            for (let i = 0; i < freeStartCount; i++) {
                const task = tasks[i];
                processedTaskIndex = i;
                handleTask(task, i);
            }
        });
    }
}

module.exports = GlobalService;
