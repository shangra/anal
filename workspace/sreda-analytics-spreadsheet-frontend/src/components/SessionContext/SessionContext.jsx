import StateManager from 'lite-react-statemanager';
import React from 'react';

import $api from '../../helpers/axios';
import getDevice from '../../helpers/device';
import { initState } from '../../initState';
import { BACKEND_PROXY, FRONTEND_URL } from '../../settings/settings';
import AuthForm from '../AuthForm/AuthForm';
import Loader from '../Loader/Loader';

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
        super.componentDidMount();
        this.getUserMeta();
        StateManager.setState({ ...initState, device: this.state.device, resetApp: this.props.resetApp });
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
        const osTheme = window.matchMedia('(prefers-color-scheme: dark)');
        const currTheme = osTheme.matches ? 'dark' : 'light';
        return currTheme;
    };

    subBackgroundImageHash = (store) => {
        const root = document.documentElement;
        this.setBackgroundImageByTheme(root.dataset.theme);
        this.setBackgroundImageByBackgroundImageHash(store);
    };

    subSessionContext = (store) => {
        const { theme } = store;
        if (theme) {
            let currTheme;
            if (theme === 'auto') {
                currTheme = this.getCurrOsTheme();
            } else {
                currTheme = theme ?? 'dark';
            }
            const root = document.documentElement;
            root.dataset.theme = currTheme;
            this.setBackgroundImageByTheme(root.dataset.theme);
        } else {
            const root = document.documentElement;
            root.dataset.theme = this.getCurrOsTheme();
        }

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
                StateManager.setState({
                    user: res.data.user ?? {},
                    theme: res.data.theme,
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
                <div
                    className="DesktopContainer"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
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
            return (
                <div
                    className="DesktopContainer"
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    Сервер недоступен
                </div>
            );

        return this.props.children;
    }
}

export default SessionContext;
