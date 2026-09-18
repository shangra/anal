module.exports = class TemplateParamDto {
    constructor(param) {
        if (param && typeof param === 'object') {
            if (typeof param.id !== 'undefined') {
                this.id = param.id;
            }
            if (typeof param.name !== 'undefined') {
                this.name = param.name;
            }
            if (typeof param.description !== 'undefined') {
                this.description = param.description;
            }
            if (typeof param.template_id !== 'undefined') {
                this.template_id = param.template_id;
            }
            if (typeof param.params_type_id !== 'undefined') {
                this.params_type_id = param.params_type_id;
            }
        }
    }
};
