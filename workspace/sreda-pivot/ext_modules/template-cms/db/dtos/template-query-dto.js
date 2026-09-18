const QueryDto = require('../../../../core/db/dto/Query.dto');
const { Template } = sreda.models;

class TemplateQueryDto extends QueryDto {
    // абстрактный метод, перегружается расширением adminpanel-search
    // eslint-disable-next-line no-unused-vars
    async search(searchQuery) {
        return null;
    }

    static getModel() {
        return Template;
    }
}

module.exports = TemplateQueryDto;
