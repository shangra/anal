module.exports = class RuleDto {
    constructor(rule) {
        if (rule && typeof rule === 'object') {
            if (typeof rule.id !== 'undefined') {
                this.id = rule.id;
            }
            if (typeof rule.name !== 'undefined') {
                this.name = rule.name;
            }
            if (typeof rule.details !== 'undefined') {
                this.details = rule.details;
            }
        }
    }
};
