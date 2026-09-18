class PageParamDto {
    constructor(param) {
        if (param && typeof param === 'object') {
            if (typeof param.id !== 'undefined') {
                this.id = param.id;
            }
            if (typeof param.value !== 'undefined') {
                this.value = param.value;
            }
        }
    }
}

module.exports = PageParamDto;
