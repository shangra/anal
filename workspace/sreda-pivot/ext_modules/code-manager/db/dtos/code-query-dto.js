const QueryDto = require('../../../../core/db/dto/Query.dto');
const { Code } = sreda.models;

class CodeQueryDto extends QueryDto {
    // абстрактный метод, перегружается расширением adminpanel-search
    async search(searchQuery) {
        return null;
    }

    static getModel() {
        return Code;
    }
}

module.exports = CodeQueryDto;
