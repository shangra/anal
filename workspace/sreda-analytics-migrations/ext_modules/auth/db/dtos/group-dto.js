module.exports = class GroupDto {
    constructor(inputObject) {
        if (inputObject && typeof inputObject === 'object') {
            if (inputObject.id !== undefined) this.id = inputObject.id;
            if (inputObject.code !== undefined) this.code = inputObject.code;
            if (inputObject.markdel !== undefined)
                this.markdel = inputObject.markdel;
            if (inputObject.createdAt !== undefined)
                this.createdAt = inputObject.createdAt;
            if (inputObject.updatedAt !== undefined)
                this.updatedAt = inputObject.updatedAt;
            if (inputObject.createdUser !== undefined)
                this.createdUser = inputObject.createdUser;
            if (inputObject.updatedUser !== undefined)
                this.updatedUser = inputObject.updatedUser;

            if (inputObject.name !== undefined) this.name = inputObject.name;
            if (inputObject.description !== undefined)
                this.description = inputObject.description;
            if (inputObject.open !== undefined) this.open = inputObject.open;
            if (inputObject.private !== undefined)
                this.private = inputObject.private;
            if (inputObject.logo !== undefined) this.logo = inputObject.logo;
        }
    }
};
