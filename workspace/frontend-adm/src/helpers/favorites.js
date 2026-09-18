import StateManager from 'lite-react-statemanager';
import $api from './axios';

const $favorites = {
    getAll: () => {
        $api.get('/favorites');
    },

    get(link, callbackFavorite = undefined, callbackLoading = undefined) {
        const link64 = encodeURIComponent(btoa(link));
        $api.get(`/favorites/${link64}`, { flashOff: true })
            .then((res) => {
                const hasInFavorites = res.data.result;
                if (callbackFavorite) {
                    callbackFavorite(hasInFavorites);
                }
            })
            .finally(() => {
                if (callbackLoading) {
                    callbackLoading();
                }
            });
    },

    change(state, data, callback = undefined) {
        const { link, icon, title } = data;
        if (state) {
            this.set(icon, title, link, callback);
        } else {
            this.del(link, callback);
        }
    },

    set(icon, title, link, callback = undefined) {
        $api.post('/favorites', { icon, title, link }).then((res) => {
            StateManager.setState({
                flash: {
                    show: true,
                    content: 'Добавлено в избранное',
                },
            });
            if (callback) {
                callback();
            }
        });
    },

    del(link, callback = undefined) {
        const link64 = encodeURIComponent(btoa(link));
        $api.delete(`/favorites/${link64}`).then((res) => {
            StateManager.setState({
                flash: {
                    show: true,
                    content: 'Удалено из избранного',
                },
            });
            if (callback) {
                callback();
            }
        });
    },
};

export default $favorites;
