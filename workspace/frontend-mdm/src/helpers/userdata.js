import $api from './axios';

const $userdata = {
    getAll: (callback = undefined) => {
        $api.get('/users/getuserdata').then((res) => {
            if (callback) {
                callback(res.data);
            }
        });
    },

    get(key, callback = undefined) {
        $api.get(`/users/getuserdata/${key}`).then((res) => {
            if (callback) {
                callback(res.data);
            }
        });
    },

    set(key, value, callback = undefined) {
        $api.post(`/users/setuserdata/${key}`, value, {
            headers: {
                'Content-Type': 'text/plain',
            },
        }).then(() => {
            if (callback) {
                callback();
            }
        });
    },

    del(key, callback = undefined) {
        $api.delete(`/users/setuserdata/${key}`).then(() => {
            if (callback) {
                callback();
            }
        });
    },
};

export default $userdata;
