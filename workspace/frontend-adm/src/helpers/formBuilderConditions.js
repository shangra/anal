/**
 * Утилита для оценки условий отображения компонентов в FormBuilder
 *
 * Спецификация правил:
 * - $and/$or принимают массив условий
 * - Операторы: $eq (равенство), $ne (неравенство)
 * - Имя поля - это name компонента (например 'priority')
 *
 * @param {Object|String} showRules - Правила в JSON или строке
 * @param {Object} formValues - Значения формы (только поля выше текущего - "смотри только назад")
 * @returns {boolean} - true если компонент должен отображаться, false если скрыт
 *
 * @example
 * // Простое условие
 * evaluateCondition({ priority: { $eq: "high" } }, { priority: "high" }) // true
 *
 * // AND условие (массив)
 * evaluateCondition(
 *   { $and: [{ priority: { $eq: "high" } }, { status: { $ne: "closed" } }] },
 *   { priority: "high", status: "open" }
 * ) // true
 *
 * // OR условие
 * evaluateCondition(
 *   { $or: [{ priority: { $eq: "high" } }, { status: { $eq: "critical" } }] },
 *   { priority: "low", status: "critical" }
 * ) // true
 */
export function evaluateCondition(showRules, formValues) {
    if (!showRules || !formValues) return true;

    try {
        const parsedRules = typeof showRules === 'string' ? JSON.parse(showRules) : showRules;
        return evaluateRuleNode(parsedRules, formValues);
    } catch (error) {
        console.error('[FormBuilder] Error evaluating condition:', error, { showRules, formValues });
        return true; // По умолчанию показываем поле при ошибке
    }
}

/**
 * Извлекает имена полей из правил (для проверки циклических зависимостей)
 */
export function extractFieldNames(showRules) {
    const fieldNames = [];
    extractFieldNamesRecursive(showRules, fieldNames);
    return [...new Set(fieldNames)]; // Уникальные имена
}

function extractFieldNamesRecursive(node, fieldNames) {
    if (!node || typeof node !== 'object') return;

    // Обработка союза И
    if (node.$and) {
        if (Array.isArray(node.$and)) {
            node.$and.forEach((condition) => extractFieldNamesRecursive(condition, fieldNames));
        } else if (typeof node.$and === 'object') {
            Object.values(node.$and).forEach((condition) => extractFieldNamesRecursive(condition, fieldNames));
        }
    }

    // Обработка союза ИЛИ
    if (node.$or) {
        if (Array.isArray(node.$or)) {
            node.$or.forEach((condition) => extractFieldNamesRecursive(condition, fieldNames));
        } else if (typeof node.$or === 'object') {
            Object.values(node.$or).forEach((condition) => extractFieldNamesRecursive(condition, fieldNames));
        }
    }

    // Обработка простых правил (без комбинаторов)
    Object.keys(node).forEach((fieldName) => {
        if (fieldName === '$and' || fieldName === '$or') return;

        const operatorObj = node[fieldName];
        if (operatorObj && typeof operatorObj === 'object') {
            fieldNames.push(fieldName);
        }
    });
}

/**
 * Проверяет, нет ли циклических зависимостей в правилах
 * @param {Object} restrictions - объект с правилами
 * @param {string} currentFieldName - имя текущего поля
 * @param {Object} allFieldsMap - карта всех полей (имя -> поле)
 */
export function validateNoCyclicDependencies(restrictions, currentFieldName, allFieldsMap) {
    if (!restrictions || !restrictions.rules || !currentFieldName) return;

    const fieldNames = extractFieldNames(restrictions.rules);

    // Проверяем, что нет ссылок на само поле
    if (fieldNames.includes(currentFieldName)) {
        console.warn(
            `Отображение поля может зависеть только от полей, которые идут перед ним (над ним). Некорректное условие поля "${currentFieldName}" не будет исполнено (ссылка на само поле).`,
        );
        return;
    }

    // Находим позицию текущего поля
    const allFields = Object.values(allFieldsMap);
    let currentIndex = -1;
    for (let i = 0; i < allFields.length; i++) {
        if (allFields[i] && allFields[i].name === currentFieldName) {
            currentIndex = i;
            break;
        }
    }

    if (currentIndex === -1) return;

    // Проверяем, что все зависимые поля идут перед текущим
    for (const fieldName of fieldNames) {
        let depIndex = -1;
        for (let i = 0; i < allFields.length; i++) {
            if (allFields[i] && allFields[i].name === fieldName) {
                depIndex = i;
                break;
            }
        }

        // Если поле не найдено или оно идет после текущего
        if (depIndex === -1 || depIndex > currentIndex) {
            const depField = depIndex >= 0 ? allFields[depIndex] : null;
            const depName = depField ? depField.name : fieldName;
            console.warn(
                `Отображение поля может зависеть только от полей, которые идут перед ним (над ним). Некорректное условие поля "${currentFieldName}" не будет исполнено (ссылка на поле "${depName}" после текущего).`,
            );
        }
    }
}

/**
 * Рекурсивная оценка узла правил
 */
function evaluateRuleNode(node, formValues) {
    if (!node || typeof node !== 'object') return true;

    const keys = Object.keys(node);

    // Проверка комбинаторов
    if (keys.includes('$and')) {
        const conditions = node.$and;
        if (!Array.isArray(conditions)) return true; // Если не массив - игнорируем
        return conditions.every((condition) => evaluateRuleNode(condition, formValues));
    }

    if (keys.includes('$or')) {
        const conditions = node.$or;
        if (!Array.isArray(conditions)) return false; // Если не массив - скрываем
        return conditions.some((condition) => evaluateRuleNode(condition, formValues));
    }

    // Это простое правило (не комбинатор)
    // Формат: { fieldName: { $eq: value } } или { fieldName: { $ne: value } }
    for (const fieldName of keys) {
        const operatorObj = node[fieldName];
        if (!operatorObj || typeof operatorObj !== 'object') continue;

        const operator = Object.keys(operatorObj)[0];
        const expectedValue = operatorObj[operator];

        if (operator === '$eq') {
            const actualValue = formValues[fieldName];
            // Сравнение с учетом null/undefined
            if (expectedValue == null && actualValue == null) return true;
            if (expectedValue == null || actualValue == null) return false;
            return String(actualValue) === String(expectedValue);
        }

        if (operator === '$ne') {
            const actualValue = formValues[fieldName];
            // Сравнение с учетом null/undefined
            if (expectedValue == null && actualValue == null) return false;
            if (expectedValue == null || actualValue == null) return true;
            return String(actualValue) !== String(expectedValue);
        }
    }

    return true; // Неизвестное правило - показываем
}
