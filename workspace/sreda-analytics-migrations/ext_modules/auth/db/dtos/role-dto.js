module.exports = class RoleDto {
    constructor(role) {
        if (role && typeof role === 'object') {
            if (typeof role.id !== 'undefined') {
                this.id = role.id;
            }
            if (typeof role.code !== 'undefined') {
                this.code = role.code;
            }
            if (typeof role.markdel !== 'undefined') {
                this.markdel = role.markdel;
            }
            if (typeof role.name !== 'undefined') {
                this.name = role.name;
            }
            if (typeof role.color !== 'undefined') {
                this.color = role.color;
            }
            if (typeof role.details !== 'undefined') {
                this.details = role.details;
            }
            if (typeof role.createdAt !== 'undefined') {
                this.createdAt = role.createdAt;
            }
            if (typeof role.updatedAt !== 'undefined') {
                this.updatedAt = role.updatedAt;
            }
        }
    }
};
