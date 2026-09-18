const QueryDto = require('../../../../core/db/dto/Query.dto');
const { Group } = sreda.models;

class GroupQueryDto extends QueryDto {
    // абстрактный метод, перегружается расширением adminpanel-search
    async search(searchQuery) {
        return null;
    }

    static getModel() {
        return Group;
    }
}

module.exports = GroupQueryDto;
