import axios from 'axios';
import StateManager from 'lite-react-statemanager';
import getDevice from './device';
import { userDataKeysDepended, BACKEND_PROXY } from '../settings/settings';
import HooksManager from './lite-react-hooks';

const $api = axios.create({
    withCredentials: true,
    baseURL: BACKEND_PROXY,
});

export const $_api = axios.create({
    withCredentials: true,
    baseURL: BACKEND_PROXY,
});

// обработка ошибок
$api.interceptors.response.use(
    (config) => config,
    async (error) => {
        // eslint-disable-next-line no-console
        console.error('error from interceptor');
        // eslint-disable-next-line no-console
        console.dir(error);
        const message = error.response ? error.response?.data?.message : error.message;
        if (!error?.config?.flashOff) {
            StateManager.setState({
                flash: {
                    show: true,
                    content: (
                        <div>
                            <h5>{error.message}</h5>
                            {message}
                        </div>
                    ),
                },
            });
        }

        return Promise.reject(error);
    },
);
// добавление deviceId к наименованию ключей userdata, при отправке данных на сервер
// заменяются только ключи из массива UserDataKeysDepended
$api.interceptors.request.use((config) => {
    const currentUrl = config.url;
    if ((currentUrl.includes('/users/getuserdata') && config.method === 'get') || currentUrl.includes('/users/setuserdata')) {
        const regExp = /(\/users\/[g,s]etuserdata\/)(.*)/;
        config.url = currentUrl.replace(regExp, (match, p1, p2) => {
            const deviceId = getDevice().id;
            return userDataKeysDepended.includes(p2) ? `${currentUrl}_${deviceId}` : currentUrl;
        });
    }
    return config;
});

$api.interceptors.response.use((response) => {
    HooksManager.setHook({ $api: { res: response, req: response.config } });
    // приведение параметров сессии из типа {key_deviceId: value} к виду {key: value}
    // заменяются только ключи из массива UserDataKeysDepended
    if (response.config.url.includes('/users/getuserdata') && response.config.method === 'get') {
        const dataWithoutDeviceId = {};

        // текущий id устройства
        const deviceId = getDevice().id;
        const strForSearch = `_${deviceId}`;

        for (const [key, value] of Object.entries(response.data)) {
            if (key.includes(strForSearch)) {
                const keyWithoutDeviceId = key.split(strForSearch)[0];
                dataWithoutDeviceId[keyWithoutDeviceId] = value;
            } else if (!dataWithoutDeviceId[key]) {
                // данные сессии без привязки к устройству записываются, если отсутствует такой ключ с id устройства
                dataWithoutDeviceId[key] = value;
            }
        }
        response.data = dataWithoutDeviceId;
    }

    // Если приложение должно работать только с одной темой для предотвращения резких переключений темы
    // в случае помещения данных о юзере (вместе с темой) в StateManager Store - замена темы пользователя на нужную
    if (response.config.url === '/users/getuserdata' && response.config.method === 'get' && process.env.REACT_APP_THEME) {
        response.data.theme = process.env.REACT_APP_THEME;
    }

    return response;
});

export default $api;
