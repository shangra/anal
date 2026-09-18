module.exports = class UserDataDto {
    constructor(data) {
        if (data && typeof data === 'object') {
            if (typeof data.id !== 'undefined') {
                this.id = data.id;
            }
            if (typeof data.code !== 'undefined') {
                this.code = data.code;
            }
            if (typeof data.markdel !== 'undefined') {
                this.markdel = data.markdel;
            }
            if (typeof data.user_id !== 'undefined') {
                this.user_id = data.user_id;
            }
            if (typeof data.attribute_id !== 'undefined') {
                this.attribute_id = data.attribute_id;
            }
            if (typeof data.value !== 'undefined') {
                this.value = data.value;
            }
            if (typeof data.UAttribute?.name !== 'undefined') {
                this.name = data.UAttribute?.name;
            }
            if (typeof data.UAttribute?.type !== 'undefined') {
                this.type = data.UAttribute?.type;
            }
        }
    }
};
