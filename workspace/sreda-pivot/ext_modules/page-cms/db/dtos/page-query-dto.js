const QueryDto = require('../../../../core/db/dto/Query.dto');
const { Page } = sreda.models;

class PageQueryDto extends QueryDto {
    // абстрактный метод, перегружается расширением adminpanel-search
    // eslint-disable-next-line no-unused-vars
    async search(searchQuery) {
        return null;
    }

    async getWhereParams(queryData) {
        const whereParams = {};
        const commonWhereParams = await super.getWhereParams(queryData);

        if (queryData.where?.active !== undefined) {
            switch (queryData.where.active) {
                case '10':
                case '01':
                case 10:
                    whereParams.active = [0, 1];
                    break;
                case '0':
                case '1':
                case 0:
                case 1:
                    whereParams.active = Number(queryData.where.active);
                    break;
                default:
                    whereParams.active = 1;
            }
        }
        if (queryData.where?.id !== undefined) {
            whereParams.id = queryData.where.id;
        }
        return QueryDto.mergeWhereOptions(commonWhereParams, whereParams);
    }

    static getModel() {
        return Page;
    }
}

module.exports = PageQueryDto;
