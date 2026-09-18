const QueryDto = require('../../../../core/db/dto/Query.dto');
const { Role } = sreda.models;

class RoleQueryDto extends QueryDto {
    // абстрактный метод, перегружается расширением adminpanel-search
    async search(searchQuery) {
        return null;
    }

    static getModel() {
        return Role;
    }
}

module.exports = RoleQueryDto;
