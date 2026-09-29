import { v4 as uuidv4 } from 'uuid';

/**
 * Draft-слой строк табличных частей (§3.3).
 *
 * Контракт `_op`/`clientId`: каждая строка таб. части получает клиентский id и
 * операцию create|update|delete. Это подготавливает фронт к атомарной отправке
 * таб. частей с родителем в едином payload, не меняя бэкенд (обратная
 * совместимость: обычный массив строк продолжает отправляться при выключенном
 * флаге).
 */

/** Добавляет клиентский id и операцию новой строке, если draft включён. */
export const stampNewRow = (row, ownerId, draftEnabled) => {
    if (!draftEnabled) return { ...row };
    return {
        ...row,
        clientId: row.clientId ?? uuidv4(),
        _op: 'create',
    };
};

/** Отмечает строку на удаление (не вырезая из массива) при включённом draft. */
export const stampDeletedRow = (row, draftEnabled) => {
    if (!draftEnabled) return row;
    return {
        ...row,
        _op: 'delete',
        deleted: true,
    };
};

/** Проставляет _op:'update' при изменении существующей строки. */
export const stampUpdatedRow = (row, draftEnabled) => {
    if (!draftEnabled) return row;
    if (row._op === 'create' || row._op === 'delete') return row;
    return { ...row, _op: 'update' };
};

const isDeleted = (row) => row?.deleted === true || row?._op === 'delete';

/** Отбрасывает удалённые строки, если флаг выключен (текущий путь сохранения). */
export const dropDeletedRows = (rows, draftEnabled) => (draftEnabled ? rows : rows.filter((row) => !isDeleted(row)));

/**
 * Строит payload таб. части для сохранения (§1.2 PersistPayload).
 * При выключенном флаге — просто массив строк (обратная совместимость с бэком).
 * При включённом — контракт { rows: [{ id?, clientId, _op, values }] }.
 */
export const buildTabularPartPayload = (rows, draftEnabled) => {
    if (!Array.isArray(rows)) return rows;

    if (!draftEnabled) {
        return rows;
    }

    return {
        rows: rows
            .filter((row) => row?._op !== 'delete')
            .map((row) => ({
                id: row?.id ?? undefined,
                clientId: row?.clientId,
                _op: row?._op ?? 'update',
                values: Object.keys(row).reduce((acc, key) => {
                    const SERVICE_KEYS = ['id', 'clientId', '_op', 'deleted'];
                    if (SERVICE_KEYS.includes(key)) {
                        return acc;
                    }
                    acc[key] = row[key];
                    return acc;
                }, {}),
            })),
    };
};
