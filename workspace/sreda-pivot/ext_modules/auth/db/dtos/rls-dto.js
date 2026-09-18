module.exports = class RlsDto {
    constructor(rls) {
        if (rls && typeof rls === 'object') {
            if (typeof rls.table_name !== 'undefined') {
                this.table_name = rls.table_name;
            }
            if (typeof rls.table_id !== 'undefined') {
                this.table_id = rls.table_id;
            }
            if (typeof rls.owner_id !== 'undefined') {
                this.owner_id = rls.owner_id;
            }
            if (typeof rls.owner !== 'undefined') {
                this.owner = rls.owner;
            }
            if (typeof rls.type !== 'undefined') {
                this.type = rls.type;
            }
        }
    }
};
