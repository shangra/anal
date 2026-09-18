module.exports = class UserDto {
    constructor(user) {
        if (user && typeof user === 'object') {
            if (typeof user.id !== 'undefined') {
                this.id = user.id;
            }
            if (typeof user.login !== 'undefined') {
                this.login = user.login;
            }
            if (typeof user.description !== 'undefined') {
                this.description = user.description;
            }
            if (typeof user.status !== 'undefined') {
                this.status = user.status;
            }
            if (typeof user.markdel !== 'undefined') {
                this.markdel = user.markdel;
            }
        }
    }
};
