const { URule, URole, User } = sreda.models;
const RuleQueryDto = require('../../db/dtos/rule-query-dto');

class RulesModel {
    static async getAllRules(options = {}) {
        const formattedOptions = await RuleQueryDto.normalizeQuery(options);
        const extendedOptions = await formattedOptions.getOptions();
        extendedOptions.order = [['name', 'ASC']];
        return URule.findAll(extendedOptions);
    }

    static async getRules(ids, options = {}) {
        const formattedOptions = await RuleQueryDto.normalizeQuery(options);
        const currentOptions = {
            where: {
                id: ids,
            },
        };
        const extendedOptions = await formattedOptions.getOptions(
            currentOptions
        );
        return URule.findAll(extendedOptions);
    }

    static async getRule(id) {
        return URule.findOne({
            where: {
                id,
            },
        });
    }

    static async getRuleRoles(id) {
        const rule = await URule.findOne({
            where: {
                id,
            },
            include: {
                model: URole,
                where: {
                    markdel: 0,
                },
            },
        });
        return rule ? rule.URoles : [];
    }

    static async getRuleUsers(id) {
        const rule = await URule.findOne({
            where: {
                id,
            },
            include: {
                model: User,
                where: {
                    markdel: 0,
                },
            },
        });
        return rule ? rule.Users : [];
    }
}

module.exports = RulesModel;
