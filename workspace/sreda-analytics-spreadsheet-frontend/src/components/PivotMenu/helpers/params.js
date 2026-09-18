import { v4 as uuidv4 } from 'uuid';

import { TYPES_ITEM_LIST } from './static';

// pivotParams - стейт с элементами меню MetadataPivotMenu
// setPivotParams - сеттер стейта в MetadataPivotMenu

/**
 * Метод преобразования входящих данных к формату элементов меню
 * @param {unknown[]} array Массив данных для добавления в дерево
 * @returns {unknown[]} Массив преобразованных данных
 */
export const setTreeParameters = (array, usedItems = []) =>
    array.map((item) => {
        item.isActiveTableItem = true;
        item.isSelected = false; // признак, что элемент выбран к добавлению в блок полей/строй/значений/фильтраций
        item.isUsed = usedItems.includes(item.id); // признак, что элемент где-то уже выбран и используется

        if (item.values?.length > 0) {
            item.values = item.values.map((el) => ({ ...el, isUsed: true, isSelected: true }));
        }

        if (item.child && Array.isArray(item.child)) {
            item.hasChild = true;
            item.isActiveDropdown = false; // признак раскрытия чилдренов у элемента
            item.child = setTreeParameters(
                item.child.map((childItem) => ({
                    ...childItem,
                    id: childItem.id?.includes('/') ? childItem.id : `${item.id}/${childItem.id || childItem.name}`,
                    categoryId: item.id,
                    typeParam: item.typeParam,
                    isMasked: item.isMasked,
                    onoffFilter: childItem?.onoffFilter ? childItem.onoffFilter : item.onoffFilter,
                })),
                usedItems,
            );
        } else if (item.type === 'ref') {
            item.hasChild = true;
            item.isActiveDropdown = false;
            item.hasChildToUpload = true; // признак необходимости дозагрузить чилдрена из метаданных
            item.child = [];
        } else {
            item.hasChild = !!item.hasChild;
        }

        return item;
    });

// рекурсивный поиск и обновление найденного элемента по его ID значением newItem
export const updateArrayItem = (array, itemId, newItem) => {
    const newArray = array.map((item) => {
        if (item.id === itemId) item = newItem;
        if (item.hasChild) {
            item.child = updateArrayItem(item.child, itemId, newItem);
        }
        return item;
    });
    return newArray;
};
// рекурсивное обновление поля (field) значением (value) у найденного элемента по его ID (itemId)
export const updateArrayByItemId = (array, itemId, field, value) => {
    const newArray = array.map((item) => {
        if (item.id === itemId) item[field] = value;
        if (item.hasChild) {
            item.child = updateArrayByItemId(item.child, itemId, field, value);
        }
        return item;
    });
    return newArray;
};

// рекурсивное обновление поля (field) значением (value) у всех элементов в массиве
export const updateAllArrayItems = (array, field, value) => {
    const newArray = array.map((item) => {
        item[field] = value;
        if (item.hasChild) {
            item.child = updateAllArrayItems(item.child, field, value);
        }
        return item;
    });
    return newArray;
};

// поиск и инвертирование boolean значения (field) элемента в дереве по его uuid (itemId)
export const reverseItemIdValue = (array, itemId, field) => {
    const newArray = array.map((item) => {
        if (item.id === itemId) item[field] = !item[field];
        if (item.hasChild) {
            item.child = reverseItemIdValue(item.child, itemId, field);
        }
        return item;
    });
    return newArray;
};

/**
 * Метод добавления DISTINCT COUNT для измерений
 * @param {object} item
 * @returns {object}
 */
export const addDistinctAggregation = (item) => {
    if (!item?.child?.length) {
        item.child = [];
    }

    // Проверяем, что агрегация еще не добавлена
    if (!item.child.find((child) => child.name === 'distinctLen')) {
        item.child.push({
            name: 'distinctLen',
            sqlName: 'DISTINCT_COUNT',
            label: 'Количество уникальных',
            type: 'number',
            isSelected: true,
            isUsed: false,
            hasChild: false,
        });
        item.hasChild = true;
    }

    return item;
};

/**
 * Метод проставления дефолтного агрегата при добавлении значения с типом number и измерений
 * @param {?[]} array Массив полей
 */
const selectDefaultNumberAggregate = (array) => {
    array.forEach((item) => {
        // Добавляем агрегацию distinctLen для измерений при добавлении в values
        if (item.isSelected && item.typeParam === 'Dimension') {
            addDistinctAggregation(item);
        }

        if (item.isSelected && item.hasChild && item.type === 'number') {
            if (!item.child.find((child) => child.isSelected)) {
                item.child.forEach((child) => {
                    if (child.name === 'sum') child.isSelected = true;
                    return child;
                });
            }
        }
    });
};

/**
 * Метод удаления DISTINCT COUNT для измерений
 * @param {object} item
 * @returns {object}
 */
export const clearDistinctAggregation = (item) => {
    if (!item?.child?.length) return item;

    item.child = item.child.filter((child) => child?.name !== 'distinctLen');

    if (!item.child.length) {
        item.hasChild = false;
    }

    return item;
};

/**
 * Метод получения индекса поля по названию (sqlName) агрегата
 * @param {string} name Название агрегата
 * @param {?[]} fields Массив полей
 * @returns {number} Индекс агрегата
 */
const getFieldIndexByAggr = (name, fields = []) => {
    if (!name || !fields?.length) {
        return 0;
    }

    return Math.max(
        fields.findIndex((item) => name === item?.sqlName),
        0,
    );
};

/**
 * Метод проставления чекбокса у выбранного
 * в параметрах элемента по ID, а так же у всех его родителей.
 * @param {any[]} array Массив полей
 * @param {string} itemId UUID выбранного поля
 * @param {string} categoryId ID родителя
 * @return {any[]} Массив полей с выбранными полями
 */

export const selectItemById = (array, itemId, categoryId) => {
    const MEASURE_TYPE = 'Measure';

    return (
        array?.map((item) => {
            const { id, typeParam, hasChild, aggrFunc = '', child = [] } = item;

            if (id === itemId) {
                item.isSelected = !item.isSelected;

                if (typeParam !== MEASURE_TYPE || !child.length) {
                    return item;
                }

                if (item.isSelected) {
                    const index = getFieldIndexByAggr(aggrFunc, child);
                    const newChild = [...child];
                    newChild[index] = { ...child[index], isSelected: true };
                    item.child = newChild;
                } else {
                    item.child = child.map((childItem) => ({
                        ...childItem,
                        isSelected: false,
                    }));
                }

                return item;
            }

            if (hasChild && child.length > 0) {
                let hasSelected = false;
                let newChild = child;

                child.forEach((childItem) => {
                    if (childItem.id !== itemId || childItem.categoryId !== categoryId) return;

                    hasSelected = true;

                    const index = child.indexOf(childItem);
                    newChild = [...child];
                    newChild[index] = { ...childItem };
                    newChild[index].isSelected = !childItem.isSelected;
                });

                if (hasSelected && typeParam === MEASURE_TYPE) {
                    const selectedChildren = newChild.filter((childItem) => childItem.isSelected);
                    item.isSelected = selectedChildren.length > 0;
                }

                if (hasSelected) {
                    const newItem = { ...item };
                    newItem.child = newChild;
                    return newItem;
                }
            }

            return item;
        }) ?? []
    );
};

/**
 * Метод проставления чекбокса у всех элементов блока, а так же у всех его родителей.
 * @param {any[]} array Массив полей
 * @param {boolean} [value=true] значение isSelected
 * @return {any[]}
 */
export const selectItemValue = (array, value = true) => {
    const clearItems = (items) =>
        items?.map((item) => {
            const newItem = { ...item };

            newItem.isSelected = value;

            // Очищаем всех детей (у которых нет typeParam)
            if (newItem.hasChild && newItem.child?.length > 0) {
                newItem.child = clearItems(newItem.child);
            }

            return newItem;
        });

    return clearItems(array);
};

/**
 * Метод проставления чекбокса у выбранного (перемещаемого)
 * в параметрах элемента по ID, а так же у всех его родителей.
 * @param {any[]} array Массив полей
 * @param {string} itemId UUID выбранного (перемещаемого) поля
 * @param {string} categoryId ID родителя
 * @param {boolean} value isSelected
 * @return {any[]}
 */
export const selectItemValueById = (array, itemId, categoryId, value = true) => {
    const MEASURE_TYPE = 'Measure';

    return array.map((item) => {
        const { id, typeParam, aggrFunc = '', child = [] } = item;

        if (id === itemId) {
            item.isSelected = value;

            if (typeParam !== MEASURE_TYPE) {
                return item;
            }

            if (child.length > 0) {
                const index = getFieldIndexByAggr(aggrFunc, child);
                child[index].isSelected = value;
            }

            return item;
        }

        if (child.length > 0) {
            child.forEach((childItem) => {
                if (childItem.id !== itemId || childItem.categoryId !== categoryId) return;
                childItem.isSelected = value;

                if (typeParam === MEASURE_TYPE) {
                    item.isSelected = value;
                }
            });
        }

        return item;
    });
};

// находит тип родителя Dimension / Measure по id элемента
export const findParentType = (items, targetId) => {
    if (!items || !targetId) return null;

    for (const item of items) {
        if (item.id === targetId) return item.typeParam;

        if (item.hasChild && item.child?.length > 0) {
            const found = item.child.find((child) => child.id === targetId);
            if (found) return item.typeParam;

            const deeper = findParentType(item.child, targetId);
            if (deeper) return deeper;
        }
    }
    return null;
};

// очищает выбор чекбоксов по типу Dimension / Measure
export const clearByType = (array, targetType) => {
    const clearItems = (items) =>
        items?.map((item) => {
            const newItem = { ...item };

            // Очищаем родительский элемент нужного типа
            if (newItem.typeParam === targetType) {
                newItem.isSelected = false;

                // Очищаем всех детей (у которых нет typeParam)
                if (newItem.hasChild && newItem.child?.length > 0) {
                    newItem.child = newItem.child.map((child) => ({
                        ...child,
                        isSelected: false,
                    }));
                }
            }

            // Рекурсивно обрабатываем дочерние элементы
            if (newItem.hasChild && newItem.child?.length > 0) {
                newItem.child = clearItems(newItem.child);
            }

            return newItem;
        });

    return clearItems(array);
};

// находи typeParam родителя у вложенного элемента и очищает поля isSelected по типу Dimension / Measure
export const clearSelectedByType = (array, selectedItemType, id) => {
    if (!selectedItemType) {
        selectedItemType = findParentType(array, id);
    }

    const fieldsArray = clearByType(array, selectedItemType === 'Dimension' ? 'Measure' : 'Dimension');

    return fieldsArray;
};

// возвращает плоскую структуру элементов из дерева
export const getActiveItemsId = (arrayUsedItems = [], activeArray = []) => {
    activeArray.forEach((item) => {
        if (item.hasChild) {
            arrayUsedItems = getActiveItemsId(arrayUsedItems, item.child);
        }
        arrayUsedItems.push(item.parentId);
    });
    return arrayUsedItems;
};

// рекурсивное проставление на элементах признака того, что они уже используются
export const updateUsedItemsId = (arrayFields, arrayUsedItems) => {
    const newArray = arrayFields.map((item) => {
        if (arrayUsedItems.includes(item.id)) {
            item.isUsed = true;
        } else {
            item.isUsed = false;
        }
        if (item.hasChild) {
            item.child = updateUsedItemsId(item.child, arrayUsedItems);
        }
        return item;
    });
    return newArray;
};

export const getUsedItemIds = (pivotParams) => {
    let usedItems = [];
    TYPES_ITEM_LIST.forEach((type) => {
        usedItems = getActiveItemsId(usedItems, pivotParams?.[type]);
    }, []);
    return usedItems;
};

// проставление на элементах признака того, что они уже используются
export const updateIsUsed = (pivotParams, setPivotParams) => {
    const arrayUsedItems = getUsedItemIds(pivotParams);
    const fieldsArray = updateUsedItemsId(pivotParams.fields ?? [], arrayUsedItems);

    setPivotParams({
        ...pivotParams,
        fields: fieldsArray,
    });
};

// рекурсивно снимает все галочки выбора в параметрах и отмечает элементы, что они теперь используются
export const updateSelectedItemsFieldsArray = (array) => {
    array.forEach((item) => {
        if (item.isSelected) {
            item.isSelected = false;
            item.isUsed = true;
        }
        if (item.hasChild) {
            updateSelectedItemsFieldsArray(item.child);
        }
    });
};

/**
 * добавление выбранных элементов по кнопке "+" в блоки столбцов/строк/значений/фильтров
 * @param {object[]} fieldsArray Массив доступных для добавления мер/измерений
 * @param {object[]} currentArray Массив уже добавленных мер/измерений в блоке
 * @param {string} addTo Тип блока, в который добавляется элемент
 * @returns {boolean} Произведена ли вставка
 */
export const addSelectedItemsToArray = (fieldsArray = [], currentArray = [], destinationIndex = -1, addTo = 'values') => {
    // Если индекс не указан или некорректен, добавляем в конец
    // const insertAt = destinationIndex >= 0 ? destinationIndex : currentArray.length;

    let inserted = false;

    fieldsArray.forEach((item) => {
        const measureInBlock = currentArray.find((el) => el.parentId === item.id);
        let itemTypeParam = item.typeParam;

        if (!itemTypeParam) {
            itemTypeParam = findParentType(fieldsArray, item.id);
        }

        if (itemTypeParam === 'Measure' && addTo !== 'values') {
            return;
        }

        // Для измерений при добавлении в values добавляем child с агрегацией DISTINCT COUNT
        const itemForDistinctDimension = {};
        if (itemTypeParam === 'Dimension' && addTo === 'values' && item.isSelected && !measureInBlock) {
            addDistinctAggregation(itemForDistinctDimension);
        }

        const selectedChildren = [];
        if (item.hasChild) {
            item.child.forEach((attribute) => {
                if (attribute.isSelected) {
                    const isChildInBlock = currentArray.find(
                        (el) => el.parentId === attribute.id && el.categoryId === item.id,
                    );
                    if (item.typeParam === 'Dimension' && isChildInBlock && !measureInBlock) return;

                    if (itemTypeParam === 'Dimension' && addTo === 'values' && attribute.isSelected && !measureInBlock) {
                        addDistinctAggregation(itemForDistinctDimension);
                    }
                    const isIndependentAttribute = item.typeParam === 'Dimension' && !item.isSelected;
                    const selectedChild = {
                        ...attribute,
                        child: itemForDistinctDimension?.child ? itemForDistinctDimension?.child : [],
                        typeParam: item.typeParam,
                        id: uuidv4(),
                        parentId: attribute.id,
                        categoryId: item.id, // @todo Временное решение для поиска родителя в подполях как измерениях
                        isSelected: false,
                        isUsed: false,
                        isMasked: item.isMasked,
                    };

                    if (isIndependentAttribute && measureInBlock) {
                        const isAttributeAlreadyExists = measureInBlock?.child?.find(
                            (el) => el.parentId === attribute.id && el.categoryId === item.id,
                        );
                        if (isAttributeAlreadyExists) return;
                        measureInBlock?.child?.push(selectedChild);
                        inserted = true;
                    } else if (isIndependentAttribute && !measureInBlock) {
                        const isAttributeAlreadyExists = currentArray.find(
                            (el) => el.parentId === attribute.id && el.categoryId === item.id,
                        );
                        if (isAttributeAlreadyExists) return;
                        // Вставляем в указанную позицию
                        currentArray.splice(destinationIndex >= 0 ? destinationIndex : currentArray.length, 0, {
                            ...selectedChild,
                            name: `${item.name}/${attribute.name}`,
                            label: `${item.label}/${attribute.label}`,
                            description: `${item.description}/${attribute.description}`,
                            isIndependentAttribute,
                        });
                        inserted = true;
                    } else if (!isIndependentAttribute && measureInBlock) {
                        const isAttributeAlreadyExists = measureInBlock?.child?.find(
                            (el) => el.parentId === attribute.id && el.categoryId === item.id,
                        );
                        if (isAttributeAlreadyExists) return;
                        measureInBlock?.child?.push(selectedChild);
                        inserted = true;
                    } else if (!isIndependentAttribute && !measureInBlock) {
                        const isExists = selectedChildren.find(
                            (el) => el.parentId === attribute.id && el.categoryId === item.id,
                        );
                        if (isExists) return;
                        selectedChildren.push(selectedChild);
                        inserted = true;
                    }
                }
            });
        }

        if (item.isSelected && !measureInBlock) {
            // Вставляем в указанную позицию
            currentArray.splice(destinationIndex >= 0 ? destinationIndex : currentArray.length, 0, {
                ...item,
                id: uuidv4(),
                parentId: item.id,
                isSelected: false,
                isUsed: false,
                child: addTo === 'values' && itemTypeParam === 'Dimension' ? itemForDistinctDimension.child : selectedChildren,
            });
            inserted = true;
        }
    });

    return inserted;
};

// при переносе элемента из одного блока в другой нужно удалить его из перенесенного блока
// delItemFromOtherBlocks проходит по массивам параметров (за исключением текущего addTo) и удаляет элемент из них
const delItemFromOtherBlocks = (addTo, fieldsArray, pivotParams) => {
    const otherBlockTypes = TYPES_ITEM_LIST.filter((type) => type !== addTo);

    otherBlockTypes.forEach((type) => {
        if (!pivotParams[type]) return;

        fieldsArray.forEach((fieldItem) => {
            if (fieldItem.isSelected) {
                pivotParams[type] = pivotParams?.[type].filter((item) => item.parentId !== fieldItem.id);
            } else if (fieldItem.hasChild) {
                fieldItem.child.forEach((childItem) => {
                    if (!childItem.isSelected) return;

                    const insertInParent = pivotParams[addTo].some((el) => el.parentId === fieldItem.id);
                    if (fieldItem.typeParam === 'Dimension' && insertInParent) return;

                    pivotParams[type] = pivotParams?.[type].filter((item) => item.parentId !== childItem.id);
                });
            }
        });
    });
};

/**
 * Метод перемещения выбранного поля в список заданных параметров (блока)
 * @param {values|rows|columns|filter} addTo Код блока, в который перемещается поле
 * @param {object} pivotParams Параметры выбранной схемы (меню)
 * @param {(...args) => ?} setPivotParams Callback изменения данных схемы
 */
export const addSelectedItemsToBlockValid = (addTo, pivotParams, setPivotParams, destinationIndex = -1) => {
    const newPivotParams = structuredClone(pivotParams);

    const { fields = [] } = newPivotParams;

    // if (addTo !== 'values') {
    //     fields = fields.filter((el) => el.typeParam === 'Measure');
    // }
    // если блок, в которых перемещаются элементы - "значения", то выбираем агрегат по умолчанию
    if (addTo === 'values') {
        selectDefaultNumberAggregate(fields);
    }

    // todo вынести повторяющуюся логику в одну функцию
    // Добавляет выбранные item'ы  в distBlock
    const inserted = addSelectedItemsToArray(fields, newPivotParams?.[addTo], destinationIndex, addTo);
    if (inserted) {
        // Удаляет выбранные item'ы  из sourceBlock
        delItemFromOtherBlocks(addTo, fields, newPivotParams);
        // отмечаем элементы в параметрах, что они используются
        updateSelectedItemsFieldsArray(fields);
    }

    setPivotParams(newPivotParams);
};

// удаление элемента из дерева объектов по его ID (deletedItemId)
export const delItemFromBlock = (delFrom, deletedItemId, pivotParams, setPivotParams) => {
    const newBlock = structuredClone(pivotParams[delFrom]);
    const newFields = structuredClone(pivotParams.fields);

    const fieldsMap = new Map();
    const stack = [...newFields];
    while (stack.length) {
        const f = stack.pop();
        fieldsMap.set(f.id, f);
        if (f.child) stack.push(...f.child);
    }

    function markUnused(blockNode) {
        const field = fieldsMap.get(blockNode.parentId);
        if (field) field.isUsed = false;
        blockNode.child?.forEach((child) => markUnused(child));
    }

    // nodes – текущий массив узлов
    // parentNode – непосредственный родитель (если есть)
    // containerOfParent – массив, в котором лежит parentNode (чтобы можно было его удалить)
    function removeNode(nodes, parentNode = null, containerOfParent = null) {
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];

            if (node.id === deletedItemId) {
                // Проверяем, нужно ли удалить родителя
                if (
                    parentNode &&
                    parentNode.typeParam === 'Measure' &&
                    parentNode.categoryId === undefined &&
                    parentNode.child.length === 1
                ) {
                    // Удаляем родительский узел вместе с потомком
                    markUnused(parentNode);
                    const idx = containerOfParent.indexOf(parentNode);
                    if (idx !== -1) containerOfParent.splice(idx, 1);
                    return true;
                }

                // Обычное удаление
                markUnused(node);
                nodes.splice(i, 1);
                return true;
            }

            if (node.child?.length) {
                // Ищем в детях, передавая node как родителя и nodes как контейнер родителя
                if (removeNode(node.child, node, nodes)) {
                    return true; // останавливаем обход после успешного удаления
                }
            }
        }
        return false;
    }

    removeNode(newBlock);

    setPivotParams({
        ...pivotParams,
        fields: newFields,
        [delFrom]: newBlock,
    });
};

/**
 * Метод преобразования полученных слоев в формат меню
 * @param layers Слои
 * @param actualLayers Актуальные слои
 * @returns {*}
 */
export const transformLayers = (layers = [], actualLayers = []) => {
    const selectedLayers =
        layers.reduce((acc, layer) => {
            if (layer.id) {
                acc[layer.id] = layer.isSelected;
            }
            return acc;
        }, {}) || {};

    // Получаем актуальные данные и данные из кэша
    const allLayers = [...actualLayers];
    const actualList = {};

    for (const layer of actualLayers) {
        layer.isIrrelevant = false;
        layer.disabled = false;
        actualList[layer.id] = true;
    }

    for (const layer of layers) {
        if (actualList[layer.id]) {
            continue;
        }

        layer.isIrrelevant = true;
        layer.disabled = true;
        allLayers.push(layer);
    }

    return allLayers.map((layer) => {
        const isSelected = layer.isSelected ?? selectedLayers[layer.id] ?? false;
        // layer.onoff === false означает "слой выключен"
        // Использовался для установки статуса disabled
        const isLayerOff = layer.onoff === false;
        return {
            id: layer.id,
            description: layer.description,
            name: layer.name,
            label: layer.description,
            type: 'static',
            isSelected,
            hasChild: false,
            hasSorting: false,
            hasFilter: false,
            hasDelete: false,
            isIrrelevant: layer.isIrrelevant,
            ref: layer.ref,
            notices: layer.notices,
            isMask: layer.isMask ?? false,
            disabled: false,
            reason: layer.reason ?? '',
        };
    });
};

/**
 * Метод слияния схем
 * @param stateSchema Схема из состояния
 * @param snapshotSchema Схема из снапшота
 * @param listToMerge Список параметров для проверки
 */
export const mergeSchemas = (
    stateSchema = {},
    snapshotSchema = {},
    listToMerge = ['columns', 'rows', 'values', 'filter', 'layers'],
) => {
    const list = {};
    const result = {};

    // Собираем список имеющихся значений
    for (const item of listToMerge) {
        if (!stateSchema[item]?.length) {
            continue;
        }

        for (const field of stateSchema[item]) {
            list[field.parentId] = field;

            if (!field.child?.length) {
                continue;
            }

            for (const child of field.child) {
                list[child.parentId] = child;
            }
        }
    }

    for (const item of listToMerge) {
        result[item] = stateSchema[item] ? [...stateSchema[item]] : [];
        const snapshotData = snapshotSchema[item] || [];

        // Добавляем в него значения их кеша
        for (const elem of snapshotData) {
            if (list[elem.parentId]) {
                // Если у элемента есть дочерние элементы, то сливаем их и оставляем только уникальные элементы
                if (list[elem.parentId].child && elem.child?.length) {
                    // Порядок имеет значение так как предыдущие значения будут затерты следующими
                    const merged = [...elem.child, ...list[elem.parentId].child];
                    list[elem.parentId].child = [...new Map(merged.map((item) => [item.parentId, item])).values()];
                }

                continue;
            }

            result[item].push(elem);
        }
    }

    return result;
}; // убедитесь, что импорт корректен

// Фабрика статических параметров (можно использовать как есть)
const createStaticParam = (type) => {
    const base = {
        type: 'static',
        id: uuidv4(),
        hasChild: false,
        hasSorting: false,
        hasFilter: false,
        hasDelete: false,
    };

    if (type === 'values') {
        return {
            ...base,
            description: 'Значения',
            name: '__values__',
            label: 'Значения',
            typeParam: 'Values',
        };
    }
    if (type === 'layers') {
        return {
            ...base,
            description: 'Слои',
            name: '__layers__',
            label: 'Слои',
            typeParam: 'Layers',
        };
    }
    return null;
};

/**
 * Преобразует columns и rows согласно настройкам статических параметров.
 * @param {object} pivotParams - { columns, rows }
 * @param {object} options - { isStaticValues, isStaticLayers }
 * @returns {object} - обновлённые { columns, rows }
 */
export const transformColumnsAndRows = (pivotParams, options = {}) => {
    // Клонируем, чтобы не мутировать исходные массивы
    let { columns = [], rows = [] } = pivotParams || {};
    columns = [...columns];
    rows = [...rows];

    // Флаг: поле с именем name уже есть в любом из массивов
    const exists = (name) =>
        columns.some((f) => f.name === name && f.type === 'static') ||
        rows.some((f) => f.name === name && f.type === 'static');

    // Обработка '__values__'
    if (options.isStaticValues) {
        if (!exists('__values__')) {
            columns.unshift(createStaticParam('values'));
        }
    } else {
        // Удаляем из обоих массивов
        columns = columns.filter((f) => !(f.name === '__values__' && f.type === 'static'));
        rows = rows.filter((f) => !(f.name === '__values__' && f.type === 'static'));
    }

    // Обработка '__layers__'
    if (options.isStaticLayers) {
        if (!exists('__layers__')) {
            columns.unshift(createStaticParam('layers'));
        }
    } else {
        columns = columns.filter((f) => !(f.name === '__layers__' && f.type === 'static'));
        rows = rows.filter((f) => !(f.name === '__layers__' && f.type === 'static'));
    }

    return { columns, rows };
};

/**
 * Метод проверки актуальности полей
 * @param pivotParams Данные куба
 * @param fieldsList Список актуальных полей меню
 */
export const checkIrrelevantData = (pivotParams = {}, fieldsList = {}) => {
    // TODO подполя как измерения
    const updateField = (current) => {
        const id = current.parentId ?? current.id;

        // Отмечаем удаленное поле
        current.isIrrelevant = !fieldsList[id];

        // Актуализируем
        if (!current.isIrrelevant) {
            const source = fieldsList[id];
            const props = Object.keys(source).filter(
                (prop) => !['id', 'child', 'name', 'label', 'description'].includes(prop),
            );

            if (current.isIndependentAttribute && fieldsList[current.categoryId]) {
                current.name = `${fieldsList[current.categoryId].name}/${source.name}`;
                current.label = `${fieldsList[current.categoryId].label}/${source.label}`;
                current.description = `${fieldsList[current.categoryId].description}/${source.description}`;

                // Меняем название поля в фильтрах
                current.filter?.forEach((f) => {
                    f.field = `${fieldsList[current.categoryId].name}/${source.name}`;
                });
            } else {
                current.name = source.name;
                current.label = source.label;
                current.description = source.description;

                // Меняем название поля в фильтрах
                current.filter?.forEach((f) => {
                    f.field = source.name;
                });
            }

            for (const prop of props) {
                current[prop] = source[prop];
            }
        }

        for (const index in current.child ?? []) {
            updateField(current.child[index]);

            current.child[index].isMasked = current.isMasked;
        }
    };

    const { values = [], columns = [], rows = [], filter = [] } = pivotParams;
    // Проверяем актуальность полей
    for (const field of [...values, ...columns, ...rows, ...filter]) {
        if (field.type === 'static') continue;

        updateField(field, fieldsList);
    }
};

/**
 * Перемещает элемент в массиве вверх или вниз
 * @param {Array} items - Массив элементов
 * @param {string|number} itemId - ID элемента для перемещения
 * @param {'up'|'down'} direction - Направление перемещения
 * @returns {Array} Новый массив с измененным порядком
 */
export const moveItemInBlock = (items, itemId, direction) => {
    if (!items || items.length === 0) return items;

    const index = items.findIndex((item) => item.id === itemId);
    if (index === -1) return items;

    // Проверяем возможность перемещения
    if (direction === 'up' && index === 0) return items;
    if (direction === 'down' && index === items.length - 1) return items;

    const newItems = [...items];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    // Меняем местами элементы
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];

    return newItems;
};
