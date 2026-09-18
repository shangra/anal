// import axios, {AxiosRequestConfig, RawAxiosRequestHeaders} from 'axios';
const axios = require('axios');

const AbstractConnector = require('./AbstractConnector');
const {
    Sequelize,
    Op: SequelizeOp,
    QueryTypes,
    Utils: {
        Literal: SequelizeLiteral,
        SequelizeMethod,
    }
} = require('sequelize');

const CFGRESTCONNECTOR_ENABLED = sreda.env?.CFGRESTCONNECTOR_ENABLED ?? false;

async function getConnector(connector_id) {
    const ConnectorClass = require('../Connector.class'); // снаружи нельзя, circular dependency
    const Connector = new ConnectorClass();

    let connector_result;
    try {
        connector_result = await Connector.getConnector(connector_id, {});
    }
    catch (error) {
        console.error(`Коннектор отсутствует или настроен некорректно`, error);
        return {};
    }

    const { connector, connectorData: connector_data } = connector_result;
    return { connector, connector_data };
};

/**
 * разбиратор содержимого заголовка Set-Cookie
 * стоит унести куда-нибудь в утилиты
 */
function cookie_decode(cookie_encoded) {
    const cookie_decoded = { namevalue_str: "", name: "", value: "", props: Object.create(null) };
    const parts = cookie_encoded.split(";").filter((str) => !!str.trim());
    const namevalue_str = cookie_decoded.namevalue_str = parts.shift() ?? "";
    const namevalue_arr = namevalue_str.split("=");
    if (namevalue_arr.length > 1) {
        cookie_decoded.name = namevalue_arr.shift();
        cookie_decoded.value = namevalue_arr.join("=");
    }
    else {
        cookie_decoded.value = namevalue_str;
    }

    cookie_decoded.value = decodeURIComponent(cookie_decoded.value); // may throw

    for (const part of parts) {
        const kvv = part.split("=");
        const k = kvv.shift().trimLeft().toLowerCase();
        const v = kvv.join("=");
        switch (k) {
            case "expires":
                cookie_decoded.props.expires = new Date(v);
                break;
            case "max-age":
                const maxage_value = parseInt(v, 10);
                if (!Number.isNaN(maxage_value)) cookie_decoded.props.maxage = maxage_value;
                break;
            case "secure":
            case "httponly":
            case "partitioned":
                cookie_decoded.props[k] = true;
                break;
            case "samesite": // same as default, but left for completeness
                cookie_decoded.props.samesite = v;
                break;
            default:
                cookie_decoded.props[k] = v;
        }
    }

    return cookie_decoded;
};


class RESTError extends Error {
    constructor(error, opts = {}) {
        if ("string" == typeof error) {
            error = { message: error };
        }
        super(error.message);
        this.rawError = error;
    }
};

class RESTConnectorData {
    constructor(settings) {
        const axios_config = {
            method: 'post', // default 'get'
            // baseURL: 'https://some-domain.com/api',
            allowAbsoluteUrls: false,

            headers: {
                'Host': process.env.HOST ?? undefined,
                'X-Requested-With': 'RESTConnector',
            },
        };

        //TODO ssl?
        const ssl = null;
        // settings.(ca|cert|key)

        const settings_host = String(settings.host ?? "");
        axios_config.baseURL = ((null == ssl) ? "http://" : "https://") // is it correct for https:// to be on ssl?
            + (settings_host.length ? settings_host : "localhost")
            + (settings.port ? `:${settings.port}` : ":3080") // does ssl port differ?
        ;

        this.database = String(settings.database ?? "");
        // if (settings_database.length) {
        //     options.catalog = settings_database;
        // }

        this.schema = String(settings.schema ?? "");
        // if (settings_schema.length) {
        //     options.schema = settings_schema;
        // }

        this.user = String(settings.user ?? "");
        this.password = String(settings.password ?? "");

        this.axios = axios.create(axios_config);

        this.SID = null;
    }

    async auth_login() {
        let data;
        try {
            const reply = await this.axios({
                url: '/auth/login/',
                method: 'post',
                data: {
                    login: this.user,
                    password: this.password,
                    device: {},
                },
            });
            const set_cookie_headers = reply.headers['set-cookie'];
            const set_cookie = Array.isArray(set_cookie_headers) ? set_cookie_headers : [set_cookie_headers];
            const cookies = {};
            for (const cookie_encoded of set_cookie) {
                const cookie_decoded = cookie_decode(cookie_encoded);
                cookies[cookie_decoded.name] = cookie_decoded;
            }
            // console.log({ "related header(s)": reply.headers['set-cookie'], decoded: cookies });
            const SID = cookies.SID;
            if (!SID) throw new RESTError("SID Cookie was not found in response headers");
            return SID;
        }
        catch (error) {
            // if (!(error instanceof axios.AxiosError)) throw error;
            //FYI при неправильном логине-пароле выдаётся ошибка 400, но сессионная кука ТОЖЕ ВЫДАЁТСЯ!
            //FYI можно добыть её кодом из блока try, взяв reply = error.response и даже использовать для последующих запросов...
            //FYI при этом авторизация по такой куке ПРОПУСТИТ, однако в итоге всё равно будет ошибка доступа
            //FYI т.е. для невалидных логина-пароля авторизация всё равно проходит все круги, настоящую причину этого поведения
            //FYI я не знаю, могу предположить только два варианта: это защита от атаки по времени (если верить в людей, ну вдруг)
            //FYI или всё грустно и объясняется тем, что кто-то... сделал что-то не так
            throw error;
            // throw new RESTError("RESTConnector auth error");
        }
    }
};


class RESTConnector extends AbstractConnector {

//  ok  GENERIC     static          generateKeys(keys = {})
//  ok  GENERIC     static          getHash(settings)
//  tbd inspect             async   generateWithSql({ from, withOptions, attributes, options })
//  ok  self                async   connect(...args)
//  ok  GENERIC             async   getSslCredentials({ ca, cert, key })
//  tbd REVISIT                     transformOperations(where)
//  tbd REVISIT             async   transformAttributes(optionsAttributes)
//  tbd -------             async   generateRecursive({ parentFilter, attributes: searchAttr = [], fieldsWhere, where, fields, table, level })
//  tbd -------             async   findAllChildren(table, fields, parent)
//  tbd inspect                     addRlsOptions({ type, where, options })
//  tbd -------             async   findAll(table, options)
//  tbd !!!!!!!             async   findSQL(table, options)
//  tbd -------             async   count(table, options = {})
//  tbd -------             async   synch(table, options = {})
//  tbd -------             async   getAllConstrains(table)                       // pg-specific in base class
//  tbd -------             async   getAllActiveIndexes(table)                    // pg-specific in base class
//  ok  GENERIC             async   drop(table)
//  tbd REVISIT             async   isTableExist(table)
//  tbd ???????             async   model(table)
//  tbd revisit             async   querySql(SQL, options = {})
//  tbd -------             async   query(SQL, options)
//  tbd revisit             async   upsert(table, values, options, callback)
//  tbd self                async   create(table, values, options, callback)
//  tbd revisit             async   bulkCreate(table, values, options, callback)

    constructor(settings) {
        super(settings);
        this.esc = (val) => this.AbstractSequelize.escape(val);
        this.escid = (id) => this.queryGenerator.quoteIdentifier(id);
    }

    async connect(settings) {
        if (!this.connector) {
            this.connector = new RESTConnectorData(settings);
            this.connector.SID = /* no await */ this.connector.auth_login();
        }
        //FYI стоит обработать SID.expires / SID.maxage (однако, похоже, сервер использует только expires)
        //FYI и обновить сессионную куку; с другой стороны, инстанс всё равно не живёт столько, сколько валидна кука...
        return await this.connector.SID;
    }

    async findAll(table, options) {
        return this.remote_request("findAll", { table, options }, {});
    }

    async findAllChildren(table, fields, parent, options) {
        return this.remote_request("findAllChildren", { table, fields, parent, options }, {});
    }

    async count(table, options) {
        return this.remote_request("count", { table, options }, {});
    }

    async update(table, values, options) {
        return this.remote_request("update", { table, values, options }, {});
    }

    async create(table, values, options) {
        return this.bulkCreate(table, [values], options);
    }

    async bulkCreate(table, values, options) {
        return this.remote_request("bulkCreate", { table, values, options }, {});
    }

    async delete(table, options, serviceOptions) {
        return this.remote_request("delete", { table, options, serviceOptions }, {});
    }

    async synch(table, options) {
        return this.remote_request("synch", { table, options }, {});
    }

    async drop(table) {
        return this.remote_request("drop", { table }, {});
    }

    // async isTableExist(table) {
    //     return super.isTableExist(table);
    // }

    /**
     * @protected
     *
     * @param {string | { query: string, bind: any[] }} SQL
     * @param {*} options 
     */
    async query(SQL, options = {}) {
        return this.remote_request("query", { SQL, options }, {});
    }

    /**
     * @protected
     */
    async remote_request(meth, args, opts) {
        // console.log("RESTConnector.remote_request", { meth, args, opts });
        const SID = await this.connect(this.Model);

        const reply = await this.connector.axios({
            url: '/metadata/rest-provider/',
            method: 'post',
            headers: {
                Cookie: SID.namevalue_str,
            },
            data: {
                conf: { target: this.connector.database },
                meth,
                args,
                opts,
            },
        });

        const ans = reply.data;
        if (!ans || !ans.length || !Array.isArray(ans)) {
            const err = new RESTError(`RESTConnector.remote_request answer is missing on not valid`);
            console.error(err, reply);
            throw err;
        }
        if (ans.length == 2) {
            const err = new RESTError(`RESTConnector.remote_request answer is a rejection`);
            err.cause = ans[1];
            console.error(err, ans);
            throw err;
        }
        return ans[0];
    }

    static async remote_provide(conf, meth, args, opts) {
        const { target } = conf ?? {};

        if (!CFGRESTCONNECTOR_ENABLED) throw new RESTError("RESTConnector is disabled (CFGRESTCONNECTOR_ENABLED)");

        try {
            const { connector, connector_data } = await getConnector(target);
            if (!connector) throw new RESTError("Provided 'target' setting is missing, not valid or doesnt specify existing connector");
            if (connector instanceof RESTConnector) throw new RESTError("RESTConnector can not be chained"); // простейшая защита от зацикливания
            const res = await connector[meth](...Object.values(args ?? []));
            return res;
            //return [res];
        }
        catch (err) {
            console.error("RESTConnector.remote_provide ERROR:", err);
            throw err;
            // return [null, err];
        }
    }

};

module.exports = RESTConnector;
