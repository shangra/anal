import { fieldTypeName } from '../MetaInput/constant';
import { BlobInput } from './BlobInput';
import { BooleanInput } from './BooleanInput';
import { Composite } from './Composite';
import { DateInput } from './DateInput';
import { DateRangeInput } from './DateRangeInput';
import { DateTime } from './DateTime';
import { Float } from './Float';
import { Integer } from './Integer';
import { Period } from './Period';
import { Ref } from './Ref';
import { Select } from './Select';
import { String } from './String';
import { Text } from './Text';

/**
 * Реестр типов полей → компонент ввода (§5.1, узкие места №7).
 * Единая точка разрешения типа, чтобы edit-форма всегда рендерила компонент
 * из этого реестра, а REF/JSON/GREF не деградировали в String.
 */
export const INPUT_BY_TYPE = {
    [fieldTypeName.REF]: Ref,
    // TODO: выделенный GRef (дерево + lazy load). Пока fallback на Ref,
    // чтобы GREF не деградировал в String.
    [fieldTypeName.GREF]: Ref,
    [fieldTypeName.COMPOSITE]: Composite,
    [fieldTypeName.STRING]: String,
    [fieldTypeName.TEXT]: Text,
    [fieldTypeName.INTEGER]: Integer,
    [fieldTypeName.FLOAT]: Float,
    [fieldTypeName.REAL]: Float,
    [fieldTypeName.BOOLEAN]: BooleanInput,
    [fieldTypeName.DATE]: DateInput,
    [fieldTypeName.DATETIME]: DateTime,
    [fieldTypeName.DATERANGE]: DateRangeInput,
    [fieldTypeName.LIST]: Select,
    [fieldTypeName.SELECT]: Select,
    [fieldTypeName.PERIOD]: Period,
    [fieldTypeName.UUID]: String,
    [fieldTypeName.BLOB]: BlobInput,
    // TODO: выделенный Json (monaco/textarea + parse on blur). Пока fallback на
    // String, чтобы JSON-поле не падало в default-ветку без диагностики.
    [fieldTypeName.JSON]: String,
};

/**
 * Типы, для которых пока используется fallback-компонент (известная оговорка).
 * Выводим warning, чтобы расхождение было видно в консоли.
 */
const FALLBACK_TYPES = new Set([fieldTypeName.GREF, fieldTypeName.JSON]);

/**
 * Разрешает тип поля в компонент ввода. При отсутствии соответствия
 * возвращает String (минимальный безопасный дефолт) и предупреждает в консоль.
 */
export const resolveInput = (type) => {
    const input = INPUT_BY_TYPE[type];

    if (input) {
        if (FALLBACK_TYPES.has(type)) {
            console.warn(`[registry] тип "${type}" рендерится через fallback-компонент`);
        }
        return input;
    }

    console.warn(`[registry] нет компонента для типа "${type}", используем String`);
    return String;
};
