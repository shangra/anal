import { serializeValueByField, hydrateValueByField } from '../MetaInput/refValue';

/**
 * Адаптер гидрации/сериализации строки по метаданным полей (§5.2).
 *
 * REF/COMPOSITE-значения на входе (из БД/сервера) приводятся к каноническому
 * виду { value, label, link } / { type, value, link, label }, на выходе
 * (payload на сервер) — к каноническому JSON (голый id / { type, value, link }).
 *
 * @param fieldsMeta Record<имяПоля, FieldMeta> — имя поля в ключ, метаданные в значении.
 */
export const hydrateRow = (row, fieldsMeta = {}) => {
    if (!row || typeof row !== 'object') return row;

    const hydrated = {};
    Object.entries(fieldsMeta).forEach(([field, fieldMeta]) => {
        if (!(field in row)) return;
        const raw = row[field];
        const fieldType = fieldMeta?.type;
        const link = typeof fieldMeta?.ref === 'object' ? fieldMeta.ref?.link : fieldMeta?.ref ?? null;
        hydrated[field] = hydrateValueByField(raw, fieldType, link);
    });

    // Служебные поля (id, clientId, _op и пр.) переносим без изменений
    Object.keys(row).forEach((key) => {
        if (!(key in hydrated)) {
            hydrated[key] = row[key];
        }
    });

    return hydrated;
};

export const serializeRow = (row, fieldsMeta = {}) => {
    if (!row || typeof row !== 'object') return row;

    const serialized = {};
    Object.entries(fieldsMeta).forEach(([field, fieldMeta]) => {
        if (!(field in row)) return;
        serialized[field] = serializeValueByField(row[field], fieldMeta?.type);
    });

    // Служебные поля переносим как есть
    Object.keys(row).forEach((key) => {
        if (!(key in serialized)) {
            serialized[key] = row[key];
        }
    });

    return serialized;
};
