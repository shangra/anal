function resolveAttributeName(attr) {
    if (attr == null) return null;
    if (Array.isArray(attr)) return String(attr[0]);
    if (typeof attr === 'object') return attr.field || attr.alias || null;
    return String(attr);
}

function attributeHasPhysicalColumn(attr, existingColumns) {
    const name = resolveAttributeName(attr);
    if (!name) return false;
    if (existingColumns.has(name)) return true;
    const prefix = `${name}__`;
    for (const column of existingColumns) {
        if (column.startsWith(prefix)) return true;
    }
    return false;
}

function splitQualifiedTable(table, defaultSchema) {
    if (typeof table !== 'string' || !table) {
        return { tableName: table, schema: defaultSchema };
    }
    const cleaned = table.replace(/"/g, '');
    const parts = cleaned.split('.');
    if (parts.length >= 2) {
        return { schema: parts[0], tableName: parts.slice(1).join('.') };
    }
    return { tableName: cleaned, schema: defaultSchema };
}

const WHERE_OPS = new Set(['$and', '$or', '$not', 'and', 'or', 'not']);

function sanitizeWhere(where, existingColumns) {
    if (where == null || typeof where !== 'object') return where;

    if (Array.isArray(where)) {
        return where
            .map((item) => sanitizeWhere(item, existingColumns))
            .filter((item) => {
                if (item == null) return false;
                if (typeof item !== 'object') return true;
                return Array.isArray(item) ? item.length > 0 : Object.keys(item).length > 0;
            });
    }

    const result = {};
    for (const [key, value] of Object.entries(where)) {
        if (WHERE_OPS.has(key) || key.startsWith('$')) {
            const cleaned = sanitizeWhere(value, existingColumns);
            if (cleaned == null) continue;
            if (typeof cleaned === 'object') {
                const empty = Array.isArray(cleaned)
                    ? cleaned.length === 0
                    : Object.keys(cleaned).length === 0;
                if (empty) continue;
            }
            result[key] = cleaned;
            continue;
        }

        if (attributeHasPhysicalColumn(key, existingColumns)) {
            result[key] = value;
        }
    }
    return result;
}

function sanitizeOrder(order, existingColumns) {
    if (!Array.isArray(order)) return order;
    return order.filter((item) => {
        const field = Array.isArray(item) ? item[0] : item;
        return attributeHasPhysicalColumn(field, existingColumns);
    });
}

async function getPhysicalColumns(connector, table) {
    if (typeof connector?.introspectColumns !== 'function') return null;
    try {
        const { schema, tableName } = splitQualifiedTable(table, connector.settings?.schema);
        const cols = await connector.introspectColumns(tableName, schema);
        const existing = new Set(Object.keys(cols || {}));
        return existing.size > 0 ? existing : null;
    } catch {
        return null;
    }
}

async function restrictAttributesToTable(connector, table, attributes) {
    const existing = await getPhysicalColumns(connector, table);
    if (!existing) return attributes;
    if (!attributes?.length) return attributes;
    return attributes.filter((attr) => attributeHasPhysicalColumn(attr, existing));
}

function applyPhysicalColumnsToOptions(options, existingColumns) {
    const next = { ...options };

    if (existingColumns) {
        if (Array.isArray(next.attributes) && next.attributes.length) {
            next.attributes = next.attributes.filter((attr) =>
                attributeHasPhysicalColumn(attr, existingColumns),
            );
            if (!next.attributes.length) delete next.attributes;
        }

        if (next.where) {
            next.where = sanitizeWhere(next.where, existingColumns);
        }

        if (next.order) {
            next.order = sanitizeOrder(next.order, existingColumns);
            if (!next.order?.length) delete next.order;
        }
    } else if (!next.attributes?.length) {
        delete next.attributes;
    }

    return next;
}

module.exports = {
    resolveAttributeName,
    attributeHasPhysicalColumn,
    splitQualifiedTable,
    sanitizeWhere,
    sanitizeOrder,
    getPhysicalColumns,
    restrictAttributesToTable,
    applyPhysicalColumnsToOptions,
};
