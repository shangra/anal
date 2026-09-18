const GroupModel = require('./models/Groups.model');
const GroupDto = require('../db/dtos/group-dto');
const ApiError = require('../../../core/exceptions/ApiError');

class GroupsService {
    async getGroups(ids, options = {}) {
        const groups = await GroupModel.getGroups(ids, options);
        return groups.map((group) => new GroupDto(group));
    }

    async getAllGroups(options = {}) {
        const groups = await GroupModel.getAllGroups(options);
        return groups.map((group) => new GroupDto(group));
    }

    async getGroup(id) {
        return GroupModel.getGroup(id);
    }

    async checkGroup(id) {
        const group = await this.getGroup(id);
        if (!group) {
            throw ApiError.BadRequest('Такой группы не существует');
        }
        return group;
    }
}

module.exports = GroupsService;
