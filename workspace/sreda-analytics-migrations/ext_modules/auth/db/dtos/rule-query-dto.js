const QueryDto = require('../../../../core/db/dto/Query.dto');
const { Rule } = sreda.models;

class RuleQueryDto extends QueryDto {
    // абстрактный метод, перегружается расширением adminpanel-search
    async search(searchQuery) {
        return null;
    }

    static getModel() {
        return Rule;
    }
}

module.exports = RuleQueryDto;
