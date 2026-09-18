const SEMI_ADDITIVE = ['LAST_VALUE', 'FIRST_VALUE'];
const ARRAY_FUNCS = ['ARRAY'];
const AGGR_FUNCS = ['DISTINCT_COUNT'];

class AttributeClass {
    constructor() { }

    func(attribute) {
        if (typeof attribute !== 'object' || Array.isArray(attribute)) return attribute;

        let {
            func,
            // поле относительно готорого происходит агргация
            field,
            aggrFields,
            windowFunc,
            order,
            bounds,
            ecran
        } = attribute;

        const localFunc = func.toUpperCase();

        if (Array.isArray(field)) {
            field = field.map((item) => this.func(item));
        }

        if (ARRAY_FUNCS.includes(localFunc)) {
            const sql = field.map((item) => this.func(item));

            return `ARRAY[${sql.join(', ')}]`;
        }

        if (localFunc === 'NONAGG') {
            return `0`;
        }

        if (SEMI_ADDITIVE.includes(localFunc)) {
            const [orderField, orderDir] = order || [];

            const orderby = orderField ? `ORDER BY "${orderField}" ${orderDir || ''} ` : '';

            const partition = aggrFields?.length ? `PARTITION BY "${aggrFields.filter(Boolean).join('", "')}"` : "";

            return `${localFunc} ("${field.replaceAll('"', '')}") ${windowFunc} (${partition} ${orderby} ${bounds || ""})`;
        }

        let localFields = Array.isArray(field) ? field : [field];

        if (AGGR_FUNCS.includes(localFunc)) {
            const fields = localFields.map((item) => this.func(item)).join(', ');

            return `COUNT(DISTINCT "${fields}")`;
        }

        //TODO избавиться этот этого костыля
        if (ecran) {
            localFields = localFields.map(i => `"${i}"`);
        }

        return `${localFunc}(${localFields.map((item) => item).join(', ')})`;
    }

    toSQLfunc(attribute) {
        let { alias } = attribute;

        alias = alias ? `"${alias}"` : alias;

        const sql = this.func(attribute);

        return [sql, alias].filter(Boolean).join(' AS ');
    }
}

module.exports = AttributeClass;