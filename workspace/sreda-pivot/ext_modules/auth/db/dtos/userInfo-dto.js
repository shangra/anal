module.exports = class UserInfoDto {
    constructor(data) {
        if (data && typeof data === 'object') {
            if (typeof data.id !== 'undefined') {
                this.id = data.id;
            }
            if (typeof data.name !== 'undefined') {
                this.name = data.name;
            }
            if (typeof data.session !== 'undefined') {
                //! !!!!!!! data.session
                this.session = data.session;
            }
            if (typeof data.details !== 'undefined') {
                this.details = data.details;
            }
            if (typeof data.avatar !== 'undefined') {
                this.avatar = data.avatar;
            }
            if (typeof data.email !== 'undefined') {
                this.email = data.email;
            }
        }
    }
};
