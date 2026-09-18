class TemplateDto {
    constructor(template) {
        if (template && typeof template === 'object') {
            if (typeof template.id !== 'undefined') {
                this.id = template.id;
            }
            if (typeof template.parent !== 'undefined') {
                this.parent = template.parent;
            }
            if (typeof template.name !== 'undefined') {
                this.name = template.name;
            }
            if (typeof template.description !== 'undefined') {
                this.description = template.description;
            }
            if (typeof template.type !== 'undefined') {
                this.type = template.type;
            }
            if (typeof template.data !== 'undefined') {
                this.data = template.data;
            }
            if (typeof template.script !== 'undefined') {
                this.script = template.script;
            }
            if (typeof template.markdel !== 'undefined') {
                this.markdel = template.markdel;
            }
            if (typeof template.ParentInfo !== 'undefined') {
                this.ParentInfo = template.ParentInfo;
            }
            if (typeof template.dataValues !== 'undefined') {
                this.countChildren = parseInt(template.dataValues.countChildren ?? -1);
            }
        }
    }
}

module.exports = TemplateDto;
