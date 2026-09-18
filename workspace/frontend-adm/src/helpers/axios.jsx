import axios from 'axios';
import StateManager from 'lite-react-statemanager';
import getDevice from './device';
import { userDataKeysDepended, BACKEND_PROXY } from '../settings/settings';
import HooksManager from './lite-react-hooks';

const $api = axios.create({
    withCredentials: true,
    baseURL: BACKEND_PROXY,
    headers: { 'Accept': 'application/json' }
});

// обработка ошибок
$api.interceptors.response.use(
    (config) => config,
    (error) => {
        console.error('error from interceptor');
        console.dir(error);
        const message = error.response ? error.response?.data?.message : error.message;
        const dataFlashOff = error?.config?.data && typeof error.config.data === 'string' && JSON.parse(error.config.data)?.flashOff;

        // Если config.flashOff и config.data.flashOff равны false, то отображать алерт с ошибкой
        if (!error?.config?.flashOff && !dataFlashOff) {
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

$api.interceptors.request.use((config) => {    
    if (config.fetchOptions && config.fetchOptions.async) {        
        config.url = `/async${config.url}`;
    }
    return config;
});

$api.interceptors.response.use(
    async (response) => {
        const config = response.config;

        if (config.fetchOptions && config.fetchOptions.async) {   
            // console.log("config.fetchOptions", config.fetchOptions, response.data);
            if (response.data.status === 'wait') {
                if (response.data.message) HooksManager.setHook({ asyncApi: { res: response, answerId: response.data.answerId } });
                
                response.config.method = 'GET';
                response.config.url = `/answer/${response.data.answerId}`;
                await new Promise(resolve => setTimeout(resolve, 1000));
                return $api(response.config); // Повторяем запрос
            } else if (response.data.status !== 'wait') {
                response.data = response.data.result ?? undefined; 
            }
        }

        return Promise.resolve(response);
    },
    (error) => {
        return Promise.reject(error); // Вернем отклоненный промис
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
            } else {
                // данные сессии без привязки к устройству записываются, если отсутствует такой ключ с id устройства
                if (!dataWithoutDeviceId[key]) {
                    dataWithoutDeviceId[key] = value;
                }
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
