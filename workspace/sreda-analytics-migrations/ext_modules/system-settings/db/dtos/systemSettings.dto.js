class SystemSettingsDto {
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

            if (typeof data.parent !== 'undefined') {
                this.parent = data.parent;
            }
            if (typeof data.name !== 'undefined') {
                this.name = data.name;
            }
            if (typeof data.description !== 'undefined') {
                this.description = data.description;
            }
            if (typeof data.type !== 'undefined') {
                this.type = data.type;
            }
            if (typeof data.value !== 'undefined') {
                this.value = data.value;
            }
        }
    }
}

module.exports = SystemSettingsDto;
