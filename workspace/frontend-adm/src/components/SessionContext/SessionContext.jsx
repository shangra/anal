import StateManager from 'lite-react-statemanager';
import React from 'react';

import $api from 'helpers/axios';
import getDevice from 'helpers/device';
import { initState } from '../../initState';
import { BACKEND_PROXY, FRONTEND_URL } from '../../settings/settings';
import AuthForm from 'components/AuthForm/AuthForm';
import Loader from 'components/Loader/Loader';

class SessionContext extends Loader {
    constructor(props) {
        super(props);

        const isIE = navigator.userAgent.toUpperCase().match(/(TRIDENT)|(MSIE)/);
        this.state = {
            ...this.state,
            error: false,
            device: getDevice(),
            isIE,
        };
        this.getUserMeta = this.getUserMeta.bind(this);
        this.subSessionContext = this.subSessionContext.bind(this);
    }

    componentDidMount() {
        document.documentElement.dataset.theme = 'dark';
        super.componentDidMount();
        this.getUserMeta();
        StateManager.setState({ ...initState, device: this.state.device, resetApp: this.props.resetApp, theme: 'dark' });
        StateManager.subscribeState({ theme: { subSessionContext: this.subSessionContext } });
        StateManager.subscribeState({ backgroundImageHash: { subBackgroundImageHash: this.subBackgroundImageHash } });
    }

    componentWillUnmount() {
        StateManager.unsubscribeState({ theme: ['subSessionContext'] });
        StateManager.unsubscribeState({ backgroundImageHash: ['setBackgroundImageHash'] });
    }

    //-----------------------------------------

    setBackgroundImage = (url = undefined) => {
        const { body } = document;
        if (url) {
            body.style.backgroundImage = `url(${url})`;
            body.style.backgroundSize = 'cover';
            body.style.backgroundPosition = 'top center';
            body.style.backgroundRepeat = 'no-repeat';

            // LIFEFUCK без этого не перерисовывает сам body и картинка не обновляется
            body.style.cssText += ';-webkit-transform:rotateZ(0deg)';
            body.style.cssText += ';-webkit-transform:none';
        } else {
            body.style.backgroundImage = ``;
            delete body.style.backgroundSize;
            delete body.style.backgroundPosition;
            delete body.backgroundRepeat;

            // LIFEFUCK без этого не перерисовывает сам body и картинка не обновляется
            body.style.cssText += ';-webkit-transform:rotateZ(0deg)';
            body.style.cssText += ';-webkit-transform:none';
        }
        document.body = body;
    };

    setBackgroundImageByBackgroundImageHash = (store) => {
        const { backgroundImageHash } = store;
        if (backgroundImageHash) {
            if (backgroundImageHash === 'none') {
                this.setBackgroundImage();
                const root = document.documentElement;
                if (root.dataset.theme === 'galaxy') {
                    this.setBackgroundImage(`${FRONTEND_URL}/images/galaxy-background.png`);
                }
            } else {
                this.setBackgroundImage(`${BACKEND_PROXY}/backgrounds/image/${backgroundImageHash}/background.jpg`);
            }
        }
    };

    setBackgroundImageByTheme = (data) => {
        if (
            data !== 'galaxy' &&
            (StateManager.state.backgroundImageHash === 'none' || !StateManager.state.backgroundImageHash)
        ) {
            this.setBackgroundImage();
        } else if (
            data === 'galaxy' &&
            (StateManager.state.backgroundImageHash === 'none' || !StateManager.state.backgroundImageHash)
        ) {
            this.setBackgroundImage(`${FRONTEND_URL}/images/galaxy-background.png`);
        }
    };

    getCurrOsTheme = () => {
        // В коробке светлая тема даёт белое-на-белом (модалки/панели). Держим dark по умолчанию.
        return 'dark';
    };

    subBackgroundImageHash = (store) => {
        const root = document.documentElement;
        this.setBackgroundImageByTheme(root.dataset.theme);
        this.setBackgroundImageByBackgroundImageHash(store);
    };

    subSessionContext = (store) => {
        const { theme } = store;
        const root = document.documentElement;
        // light/auto → dark: иначе модалки и панели сливаются (белое на белом)
        const currTheme = theme === 'galaxy' ? 'galaxy' : 'dark';
        root.dataset.theme = currTheme;
        this.setBackgroundImageByTheme(root.dataset.theme);
        this.setBackgroundImageByBackgroundImageHash(store);
    };

    async getUserMeta() {
        this.startLoading();

        // запись в сессию текущего id устройства
        await $api.post('/devices', { device: this.state.device }).catch((e) => this.setState({ error: e }));

        // получение данных пользователя из сессии для текущего устройства
        await $api
            .get(`/users/getuserdata`)
            .then((res) => {
                const rawTheme = res.data.theme;
                // light/auto ломают контраст модалок в коробке — фиксируем dark
                const theme =
                    !rawTheme || rawTheme === 'auto' || rawTheme === 'light' ? 'dark' : rawTheme;
                StateManager.setState({
                    user: res.data.user ?? {},
                    theme,
                    assistant: res.data.assistant,
                    backgroundImageHash: res.data.backgroundImageHash,
                });
            })
            .catch((e) =>
                this.setState({
                    error: e,
                }),
            )
            .finally(this.stopLoading);
    }

    render() {
        if (this.state.isIE)
            return (
                <div className="DesktopContainer d-flex flex-column justify-content-center align-items-center">
                    <div>Internet Explorer не поддерживается.</div>
                    <div>Пожалуйста смените браузер.</div>
                </div>
            );
        if (this.state.isLoading !== 0) return <div>Загрузка</div>;

        if (this.state.error && StateManager.state.errorViews?.[this.state?.error?.response?.status]) {
            return StateManager.state.errorViews?.[this.state?.error?.response?.status];
        }

        if (!StateManager.state?.user?.id) {
            return (
                <div style={{ display: 'grid', height: '100vh' }}>
                    <div style={{ justifySelf: 'center', alignSelf: 'center' }}>
                        <AuthForm />
                    </div>
                </div>
            );
        }

        if (this.state.error)
            return <div className="DesktopContainer d-flex justify-content-center align-items-center">Сервер недоступен</div>;

        return this.props.children;
    }
}

export default SessionContext;
