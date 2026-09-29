import { buildTabularPartPayload, stampNewRow, stampDeletedRow, stampUpdatedRow } from '../tabularDraft';

/**
 * Тесты §7.3 — draft-контракт таб. частей (_op/clientId).
 */

describe('buildTabularPartPayload', () => {
    test('при выключенном флаге — возвращает массив строк (обратная совместимость)', () => {
        const rows = [{ id: 'a', code: '1' }];
        expect(buildTabularPartPayload(rows, false)).toBe(rows);
    });

    test('новая строка попадает в payload с _op:"create" и clientId', () => {
        const newRow = stampNewRow({ code: '999' }, undefined, true);
        const payload = buildTabularPartPayload([newRow], true);

        expect(payload.rows).toHaveLength(1);
        expect(payload.rows[0]._op).toBe('create');
        expect(payload.rows[0].clientId).toBeDefined();
        expect(payload.rows[0].id).toBeUndefined();
        // значения — без служебных полей
        expect(payload.rows[0].values).toEqual({ code: '999' });
    });

    test('mix create + update + delete: удалённые отбрасываются', () => {
        const created = stampNewRow({ code: '1' }, undefined, true);
        const updated = stampUpdatedRow({ id: 'a', code: '2', clientId: 'c-a' }, true);
        const deleted = stampDeletedRow({ id: 'b', code: '3', clientId: 'c-b' }, true);

        const payload = buildTabularPartPayload([created, updated, deleted], true);

        expect(payload.rows).toHaveLength(2);
        expect(payload.rows[0]).toMatchObject({ _op: 'create' });
        expect(payload.rows[1]).toEqual({
            id: 'a',
            clientId: 'c-a',
            _op: 'update',
            values: { code: '2' },
        });
    });

    test('существующая строка без _op получает _op:"update" по умолчанию', () => {
        const payload = buildTabularPartPayload([{ id: 'a', code: '5', clientId: 'c-a' }], true);
        expect(payload.rows[0]._op).toBe('update');
    });
});

describe('stamp helpers', () => {
    test('stampNewRow не меняет строку при выключенном флаге', () => {
        const row = { code: '1' };
        expect(stampNewRow(row, undefined, false)).toEqual({ code: '1' });
    });

    test('stampUpdatedRow не перезаписывает _op:"create"', () => {
        const row = { code: '1', _op: 'create' };
        expect(stampUpdatedRow(row, true)).toBe(row);
    });

    test('stampDeletedRow выключенный флаг — строка как есть', () => {
        expect(stampDeletedRow({ code: '1' }, false)).toEqual({ code: '1' });
    });
});
