import { INPUT_BY_TYPE, resolveInput } from '../../Inputs/registry';
import { fieldTypeName } from '../constant';
import {
    hydrateRefValue,
    serializeRefValue,
    hydrateCompositeValue,
    serializeCompositeValue,
    compositeTypeToCode,
} from '../refValue';
import { String } from '../../Inputs/String';
import { Text } from '../../Inputs/Text';
import { Ref } from '../../Inputs/Ref';
import { Composite } from '../../Inputs/Composite';
import { Integer } from '../../Inputs/Integer';
import { Float } from '../../Inputs/Float';
import { BooleanInput } from '../../Inputs/BooleanInput';
import { DateInput } from '../../Inputs/DateInput';
import { DateTime } from '../../Inputs/DateTime';
import { Select } from '../../Inputs/Select';
import { Period } from '../../Inputs/Period';

// Тяжёлые модули вне transformIgnorePatterns / с тяжёлой графом зависимостей.
// Мокаем, чтобы можно было подключить реестр инпутов без сети и ESM.
// (jest.mock поднимается babel-plugin-jest-hoist выше импортов.)
jest.mock('on-change', () => (obj) => obj);
jest.mock('../../../ui/windows.helper.js', () => ({
    default: { open: jest.fn() },
}));
jest.mock('../../../ui/modal.helper.js', () => ({
    default: { show: jest.fn() },
}));
jest.mock('../../../FormMetadata', () => ({ FormMetadata: () => null }));

/**
 * Тесты §7.4 — реестр типов + нормализация REF/Composite.
 */

describe('registry (INPUT_BY_TYPE / resolveInput)', () => {
    const expectations = [
        [fieldTypeName.REF, Ref],
        [fieldTypeName.GREF, Ref],
        [fieldTypeName.COMPOSITE, Composite],
        [fieldTypeName.STRING, String],
        [fieldTypeName.TEXT, Text],
        [fieldTypeName.INTEGER, Integer],
        [fieldTypeName.FLOAT, Float],
        [fieldTypeName.REAL, Float],
        [fieldTypeName.BOOLEAN, BooleanInput],
        [fieldTypeName.DATE, DateInput],
        [fieldTypeName.DATETIME, DateTime],
        [fieldTypeName.LIST, Select],
        [fieldTypeName.SELECT, Select],
        [fieldTypeName.PERIOD, Period],
    ];

    test('для каждого типа resolveInput возвращает компонент из реестра', () => {
        expectations.forEach(([type, Component]) => {
            expect(resolveInput(type)).toBe(Component);
        });
    });

    test('неизвестный тип → безопасный дефолт String', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        expect(resolveInput('unknown_type_xxx')).toBe(String);
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });

    test('TEXT маппится на Text, а не деградирует в String (фикс §5.1)', () => {
        expect(INPUT_BY_TYPE[fieldTypeName.TEXT]).toBe(Text);
        expect(INPUT_BY_TYPE[fieldTypeName.TEXT]).not.toBe(String);
    });
});

describe('hydrateRefValue (§5.2)', () => {
    test('голый id → канонический RefValue', () => {
        expect(hydrateRefValue('abc-123')).toEqual({
            value: 'abc-123',
            label: 'abc-123',
            link: null,
        });
    });

    test('null/undefined → пустой RefValue', () => {
        expect(hydrateRefValue(null)).toEqual({
            value: null,
            label: null,
            link: null,
        });
        expect(hydrateRefValue(undefined)).toEqual({
            value: null,
            label: null,
            link: null,
        });
    });

    test('{ value, label } → канонический RefValue', () => {
        expect(hydrateRefValue({ value: 'id1', label: 'Документ 1' }, 'guide')).toEqual({
            value: 'id1',
            label: 'Документ 1',
            link: 'guide',
        });
    });

    test('{ id, presentation } (ответ сервера) → канонический RefValue', () => {
        expect(hydrateRefValue({ id: 'id2', presentation: 'Документ 2' })).toEqual({
            value: 'id2',
            label: 'Документ 2',
            link: null,
        });
    });

    test('serializeRefValue → голый id для payload', () => {
        expect(serializeRefValue({ value: 'id1', label: 'Документ 1' })).toBe('id1');
        expect(serializeRefValue({ value: null, label: null })).toBeNull();
    });
});

describe('Composite round-trip', () => {
    test('hydrate строки raw-вида → канонический COMPOSITE', () => {
        expect(hydrateCompositeValue('plain-text')).toEqual({
            type: null,
            value: 'plain-text',
            link: null,
            label: null,
        });
    });

    test('hydrate уже нормализованного объекта не ломает его', () => {
        expect(hydrateCompositeValue({ type: 10, value: 'id1', link: 'guide' })).toEqual({
            type: 10,
            value: 'id1',
            link: 'guide',
            label: null,
        });
    });

    test('round-trip type: имя → код → payload', () => {
        expect(compositeTypeToCode('ref')).toBe(10);
        expect(compositeTypeToCode(10)).toBe(10);
        expect(compositeTypeToCode(null)).toBeNull();

        const serialized = serializeCompositeValue({
            type: 'ref',
            value: 'id1',
            link: 'guide',
        });
        expect(serialized).toEqual({ type: 10, value: 'id1', link: 'guide' });
    });
});
