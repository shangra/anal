const Extensions = require('../../../core/class/Extensions.class');

class LoggersService extends Extensions {
    async resHeaderParse(headers) {
        const headersArray = headers.split('\n');
        const headersObjects = {};

        headersArray.map((header) => {
            header.trim();
            const nameValue = header.split(':');
            if (nameValue.length > 1) {
                headersObjects[nameValue[0].trim()] = nameValue[1].trim();
            }
        });

        return headersObjects;
    }

    async buildLog(typeMessage, req, res, sessionStorage = {}, responseData, context) {
        const resHeaders = res._header === null ? {} : await this.resHeaderParse(res._header);
        const userInfo = sessionStorage?.user?.info === undefined ? {} : sessionStorage.user.info;

        const widgetInfo = {
            SelfBoardWidgets: 0,
            Favorites: 0,
        };
        let widgets = [];
        if (sessionStorage?.Dashboard) {
            widgets = widgets.concat(sessionStorage.Dashboard);
        }
        if (sessionStorage?.Favorites) {
            widgetInfo.Favorites = sessionStorage.Favorites.length;
            widgets = widgets.concat(sessionStorage.Favorites);
        }
        const SelfBoardKeys = Object.keys(sessionStorage).filter(
            (keyName) => keyName.slice(0, 9) === 'SelfBoard'
        );
        SelfBoardKeys.map((key) => {
            widgetInfo.SelfBoardWidgets += sessionStorage[key].length;
            widgets = widgets.concat(sessionStorage[key]);
        });
        widgets = widgets.map((value) => {
            const widget = value.component.properties;
            return {
                id: widget.json.id,
                name: widget.json.name,
                description: widget.json.description,
                template: widget.json.template,
                widgetSettings: widget.widgetSettings,
            };
        });

        const themes = {};
        const themeKeys = Object.keys(sessionStorage).filter(
            (keyName) => keyName.slice(0, 5) === 'theme'
        );
        themeKeys.map((key) => {
            const value = sessionStorage[key];
            themes[value] = themes[value] === undefined ? 1 : themes[value] + 1;
        });

        const assistants = {};
        const assistantKeys = Object.keys(sessionStorage).filter(
            (keyName) => keyName.slice(0, 9) === 'assistant'
        );
        assistantKeys.map((key) => {
            const value = sessionStorage[key];
            assistants[value] = assistants[value] === undefined ? 1 : assistants[value] + 1;
        });

        let responseJSON = '';
        let responseTEXT = '';
        try {
            responseJSON = JSON.parse(responseData);
            responseJSON = responseData.toString('base64');
        } catch (e) {
            if (responseData) {
                responseTEXT = responseData.toString('base64');
            }
        }

        const user = {
            id: sessionStorage?.user?.id,
            login: sessionStorage?.user?.login,
            status: sessionStorage?.user?.status,
            info: sessionStorage?.user?.info,
            rules: sessionStorage?.user?.ruleLogs,
            roles: sessionStorage?.user?.roles,
            groups: sessionStorage?.user?.groups,
        };

        const { traceId } = context;

        const data = {
            typeMessage,
            server: process.env.ESB_NAME,
            date: Date.now(),

            // Request
            method: req.method,
            url: req.url,
            originalUrl: req.originalUrl,
            params: req.params, // JSON
            query: req.query, // JSON
            startTime: req._startTime.getTime(), // DateTime
            cookies: req.cookies, // JSON
            signedCookies: req.signedCookies, // JSON
            sessionID: req.sessionID,
            routePath: req.route?.path ?? '',
            headers: req.headers, // JSON
            headerAccept: req.headers.accept === undefined ? '' : req.headers.accept,
            headerUserAgent:
                req.headers['user-agent'] === undefined ? '' : req.headers['user-agent'],
            headerSecChUaPlatform:
                req.headers['sec-ch-ua-platform'] === undefined
                    ? ''
                    : req.headers['sec-ch-ua-platform'],
            headerSecChUa: req.headers['sec-ch-ua'] === undefined ? '' : req.headers['sec-ch-ua'],
            headerHost: req.hostname === undefined ? '' : req.headers.host,
            body: req.body === undefined ? '' : req.body, // STRING

            // Response
            resStartTime: res._startTime !== undefined ? res._startTime.getTime() : Date.now(), // DateTime
            resStatusCode: res.statusCode,
            resStatusMessage: res.statusMessage,
            resHeader: resHeaders,
            resHeaderXPoweredBy:
                resHeaders['X-Powered-By'] === undefined ? '' : resHeaders['X-Powered-By'],
            description: res.locals.description ? res.locals.description : '',

            // sessionStorage : sessionStorage, //JSON
            themes,
            assistants,

            user,
            userId: sessionStorage?.user?.id === undefined ? '' : sessionStorage.user.id,
            userLogin: sessionStorage?.user?.login === undefined ? '' : sessionStorage.user.login,
            userStatus:
                sessionStorage?.user?.status === undefined ? '' : sessionStorage.user.status,

            userName: userInfo.name === undefined ? '' : userInfo.name,
            userDetails: userInfo.details === undefined ? '' : userInfo.details,

            deviceId: sessionStorage.deviceId === undefined ? '' : sessionStorage.deviceId,
            allWidgets: widgets,
            SelfBoardWidgetsCount: widgetInfo.SelfBoardWidgets,
            FavoritesWidgetsCount: widgetInfo.Favorites,

            responseJSON, // JSON
            responseTEXT, // STRING

            traceId,
        };

        return data;
    }
}

module.exports = LoggersService;
