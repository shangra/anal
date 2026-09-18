const QueryDto = require('../../../../core/db/dto/Query.dto');
const { User } = sreda.models;

class UserQueryDto extends QueryDto {
    constructor(...args) {
        super(...args);
        const [queryData] = args;
        if (queryData.limit && queryData.limit < 50) {
            this.limit = queryData.limit;
        } else {
            this.limit = 50;
        }
    }

    // абстрактный метод, перегружается расширением adminpanel-search
    async search(searchQuery) {
        return null;
    }

    async getWhereParams(queryData) {
        const whereParams = {};
        const commonWhereParams = await super.getWhereParams(queryData);

        if (queryData.where?.id !== undefined) {
            whereParams.id = queryData.where.id;
        }
        return QueryDto.mergeWhereOptions(commonWhereParams, whereParams);
    }

    static getModel() {
        return User;
    }
}

module.exports = UserQueryDto;
