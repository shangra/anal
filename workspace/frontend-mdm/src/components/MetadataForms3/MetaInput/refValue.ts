import { fieldTypeName, typeNameToTypeCodeMapping } from './constant';

/** Каноническое ссылочное значение, как принимает/отдаёт UI (Ref/Composite). */
export interface RefValue {
    value: string | number | null;
    label?: string | null;
    link?: string | null;
}

export interface CompositeValue {
    type: number | string | null;
    value: string | number | null;
    link?: string | null;
    label?: string | null;
}

/**
 * Нормализует REF-значение из хранилища/БД (§5.2, узкое место №7).
 * Принимает:
 *  - голый id ('abc' / 123 / null / undefined);
 *  - { value, label } — уже нормализованный;
 *  - { id, presentation | name } — ответ сервера/метаданных.
 * Всегда возвращает канонический { value, label, link }.
 */
export function hydrateRefValue(raw: unknown, link?: string | null): RefValue {
    if (raw === null || raw === undefined || raw === '') {
        return { value: null, label: null, link: link ?? null };
    }

    if (typeof raw === 'object' && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;
        if ('value' in obj) {
            return {
                value: obj.value ?? null,
                label: obj.label ?? obj.presentation ?? null,
                link: obj.link ?? link ?? null,
            };
        }
        // Сырой вид сервера: { id, presentation } либо { id, name }
        return {
            value: obj.id ?? null,
            label: obj.presentation ?? obj.name ?? obj.label ?? (obj.id as string | null),
            link: link ?? null,
        };
    }

    return { value: raw as string | number, label: raw as string | number, link: link ?? null };
}

/** Канонический JSON для payload: голый id ссылки (или null). */
export function serializeRefValue(value: RefValue): string | number | null {
    return value?.value ?? null;
}

/**
 * Нормализует COMPOSITE-значение: принимает строку, { value, label },
 * { type, value, link } (type как код или имя) и возвращает канонический вид.
 */
export function hydrateCompositeValue(raw: unknown): CompositeValue {
    if (raw === null || raw === undefined) {
        return { type: null, value: null, link: null, label: null };
    }

    if (typeof raw === 'object' && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;
        if ('type' in obj || 'link' in obj || 'value' in obj) {
            return {
                type: obj.type ?? null,
                value: obj.value ?? null,
                link: (obj.link as string | null) ?? null,
                label: (obj.label as string | null) ?? null,
            };
        }
        return { type: null, value: null, link: null, label: null };
    }

    return { type: null, value: raw as string | null, link: null, label: null };
}

/** Переводит type Composite в числовой код для payload (см. MetaInput.onCompositeChange). */
export function compositeTypeToCode(type: string | number | null | undefined): number | null {
    if (type === null || type === undefined || type === '') return null;
    if (typeof type === 'number') return type;
    return typeNameToTypeCodeMapping[type] ?? null;
}

/** Канонический JSON для payload Composite. */
export function serializeCompositeValue(value: CompositeValue): { type: number | null; value: unknown; link: string | null } {
    return {
        type: compositeTypeToCode(value?.type),
        value: value?.value ?? null,
        link: value?.link ?? null,
    };
}

/**
 * По метаданным поля определяет, как нормализовать значение на входе (гидрация)
 * в зависимости от типа: REF/COMPOSITE → объект, остальное → как есть.
 */
export function hydrateValueByField(value: unknown, fieldType: string | undefined, link?: string | null) {
    if (fieldType === fieldTypeName.REF || fieldType === fieldTypeName.GREF) {
        return hydrateRefValue(value, link);
    }
    if (fieldType === fieldTypeName.COMPOSITE) {
        return hydrateCompositeValue(value);
    }
    return value;
}

/** Сериализация значения для payload по типу поля. */
export function serializeValueByField(value: unknown, fieldType: string | undefined) {
    if (fieldType === fieldTypeName.REF || fieldType === fieldTypeName.GREF) {
        return serializeRefValue(value as RefValue);
    }
    if (fieldType === fieldTypeName.COMPOSITE) {
        return serializeCompositeValue(value as CompositeValue);
    }
    return value;
}
