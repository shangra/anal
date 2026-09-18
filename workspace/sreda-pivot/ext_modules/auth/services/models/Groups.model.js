const { GroupUser, Group, User } = sreda.models;
const GroupQueryDto = require('../../db/dtos/group-query-dto');

class GroupsModel {
    static async getUsersInGroup(group_id) {
        const users = await GroupUser.findAll({
            where: { group_id },
        });
        return users;
    }

    static async createGroup(data) {
        return Group.create(data);
    }

    static async AddGroup(group) {
        let addGroup;
        let GroupUsers;
        if (group.id === '') {
            addGroup = await Group.create({
                name: group.name,
                info: group.info,
                logo_link: group.logo,
                open_group: group.open_group,
                all_users_add: group.all_users_add,
            });
            GroupUsers = await GroupUser.create({
                group_id: addGroup.id,
                user_id: group.user,
            });
        } else {
            addGroup = {
                name: group.name,
                info: group.info,
                logo_link: group.logo,
                open_group: group.open_group,
                all_users_add: group.all_users_add,
            };
            const updGroup = await Group.update(addGroup, {
                where: {
                    id: group.id,
                },
            });
            addGroup.id = group.id;
            GroupUsers = {};
        }

        return { Group: addGroup, GroupUsers };
    }

    static async GetGroupInfo(groupId) {
        const GroupData = await Group.findOne({ where: { id: groupId } });
        return GroupData;
    }

    static async getGroups(ids, options = {}) {
        const formattedOptions = await GroupQueryDto.normalizeQuery(options);
        const currentOptions = {
            where: {
                id: ids,
            },
        };
        const extendedOptions = await formattedOptions.getOptions(
            currentOptions
        );
        return Group.findAll(extendedOptions);
    }

    static async getAllGroups(options = {}) {
        const formattedOptions = await GroupQueryDto.normalizeQuery(options);
        const extendedOptions = await formattedOptions.getOptions();
        return Group.findAll(extendedOptions);
    }

    static async getGroup(id) {
        return Group.findOne({
            where: {
                id,
            },
            all: true,
        });
    }

    static async getOpenGroups() {
        return Group.findAll({
            where: {
                open: true,
            },
        });
    }

    static async getGroupByName(name, markdel) {
        const groupData = await Group.findOne({
            where: {
                name,
                markdel,
            },
        });
        return groupData;
    }

    static async updateGroup(id, data) {
        return Group.update(data, {
            where: {
                id,
            },
            returning: true,
        });
    }

    static async delGroup(id) {
        await Group.destroy({
            where: {
                id,
            },
        });
    }

    static async getGroupUsers(group_id) {
        const group = await Group.findOne({
            where: {
                id: group_id,
            },
            include: {
                model: User,
                through: {
                    where: {
                        markdel: 0,
                    },
                },
            },
        });
        return group ? group.Users : [];
    }

    static getGroupsUserIds(groupIds) {
        if (groupIds.length === 0) return [];

        return GroupUser.findAll({
            where: { group_id: groupIds },
            attributes: ['user_id'],
            group: ['user_id'],
        });
    }

    static async addUserGroup(user_id, group_id) {
        return GroupUser.create({
            user_id,
            group_id,
        });
    }

    static async delUserGroup(user_id, group_id) {
        return GroupUser.destroy({
            where: {
                user_id,
                group_id,
            },
        });
    }
}

module.exports = GroupsModel;
