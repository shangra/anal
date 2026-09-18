const QueryDto = require('../../../../core/db/dto/Query.dto');
const { SystemSettings } = sreda.models;

class SystemSettingsQueryDto extends QueryDto {
    // абстрактный метод, перегружается расширением adminpanel-search
    // eslint-disable-next-line no-unused-vars
    async search(searchQuery) {
        return null;
    }

    static getModel() {
        return SystemSettings;
    }
}

module.exports = SystemSettingsQueryDto;
