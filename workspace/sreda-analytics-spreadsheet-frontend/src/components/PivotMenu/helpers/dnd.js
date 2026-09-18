import { arrayMove } from '@dnd-kit/sortable';

import { canDrop, getDragSource } from './dndRules';
import {
    addDistinctAggregation,
    addSelectedItemsToBlockValid,
    clearDistinctAggregation,
    clearSelectedByType,
    delItemFromBlock,
    selectItemValueById,
} from './params';

// ─────────────────────────────────────────────────────────────────────────────
// Вспомогательные утилиты
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Рекурсивно ищет элемент в дереве items по id.
 * Возвращает { index, parent, depth, item } или null.
 */
const findItemDepth = (itemList, id, depth = 0) => {
    for (let i = 0; i < itemList.length; i++) {
        if (itemList[i].id === id) {
            return { index: i, parent: itemList, depth, item: itemList[i] };
        }
        if (itemList[i].child?.length) {
            const found = findItemDepth(itemList[i].child, id, depth + 1);
            if (found) return found;
        }
    }
    return null;
};

/**
 * Рекурсивно ищет элемент по id в плоской / вложенной структуре.
 */
export const findItem = (items, id) => {
    if (!items) return null;
    for (const item of items) {
        if (item.id === id) return item;
        if (item.child?.length) {
            const found = findItem(item.child, id);
            if (found) return found;
        }
    }
    return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Определение цели (destination) из события dnd-kit
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Проверяет, является ли over реальной droppable-целью (контейнером или SortableItem).
 * over обязан содержать sourceBlock в data.current.
 */
const isValidOver = (over) => {
    if (!over) return false;
    // Контейнер: useDroppable с data.current.type === 'container'
    // SortableItem: useSortable с data.current.originalId
    const data = over.data?.current;
    return !!data?.sourceBlock;
};

/**
 * Возвращает { destinationBlock, overOriginalId } из события onDragEnd / onDragOver.
 * Приоритет — data.current.sourceBlock/originalId, затем id.split('_')[0].
 */
const getDestination = (over) => {
    if (!over || !isValidOver(over)) return { destinationBlock: null, overOriginalId: null };

    const destinationBlock = over.data.current?.sourceBlock || over.id?.split('_')[0] || null;
    const overOriginalId = over.data.current?.originalId || over.id?.split('_')[1] || null;

    return { destinationBlock, overOriginalId };
};

/**
 * Вычисляет целевой индекс вставки для заданного over.
 *
 * Правило:
 *  - over — контейнер (type === 'container'): курсор в пустой зоне ниже
 *    последнего SortableItem -> вставляем в конец.
 *  - over — SortableItem: вставляем перед этим элементом.
 */
const resolveTargetIndex = (over, overOriginalId, destinationItems) => {
    if (over.data.current?.type === 'container') {
        return destinationItems?.length ?? 0;
    }
    const idx = destinationItems?.findIndex((item) => item.id === overOriginalId) ?? -1;
    return idx !== -1 ? idx : destinationItems?.length ?? 0;
};

/**
 * Обработчик начала перетаскивания.
 * Вызывается только если getDragSource вернул не null.
 *
 * - Для fields: сбрасывает isActiveDropdown + выделяет перетаскиваемый элемент.
 * - Для остальных блоков (layers, filter, columns, rows, values): no-op.
 */
export const onDragStart = (event, pivotParams, setPivotParams) => {
    const source = getDragSource(event);
    if (!source) return;

    const { sourceBlock, originalId, element } = source;

    if (sourceBlock === 'fields') {
        let fieldsArray = selectItemValueById(pivotParams.fields, originalId, element?.categoryId, true);
        fieldsArray = clearSelectedByType(fieldsArray, element?.typeParam, originalId);
        setPivotParams({ ...pivotParams, fields: fieldsArray });
    }
};

/**
 * Обработчик окончания перетаскивания.
 * Единая таблица переходов на основе canDrop.
 */
export const onDragEnd = (event, pivotParams, setPivotParams) => {
    const { active, over } = event;
    const source = getDragSource(event);
    if (!source) return;

    const { sourceBlock, originalId } = source;
    const paramType = active.data.current?.element?.typeParam ?? null;

    const { destinationBlock, overOriginalId } = getDestination(over);

    // Нет цели — удаляем из items-блоков (кроме fields и layers)
    if (!over || !destinationBlock) {
        if (sourceBlock !== 'fields' && sourceBlock !== 'layers') {
            delItemFromBlock(sourceBlock, originalId, pivotParams, setPivotParams);
        }
        return;
    }

    // Проверяем допустимость перехода
    if (!canDrop(sourceBlock, destinationBlock, paramType)) return;

    // добавляем distinct count для измерений при переходе в values
    if (paramType === 'Dimension') {
        if (destinationBlock === 'values') {
            addDistinctAggregation(active.data.current?.element);
        } else {
            clearDistinctAggregation(active.data.current?.element);
        }
    }

    // -- fields -> items-блок: добавление выбранных полей ----------------------
    if (sourceBlock === 'fields') {
        const destinationIndex = resolveTargetIndex(over, overOriginalId, pivotParams[destinationBlock]);
        addSelectedItemsToBlockValid(destinationBlock, pivotParams, setPivotParams, destinationIndex);
        return;
    }

    // ── сортировка / перемещение внутри и между items-блоками ────────────────
    const items = pivotParams[sourceBlock];
    if (!items) return;

    // Сортировка внутри одного блока (включая layers и child)
    if (sourceBlock === destinationBlock) {
        const activeInfo = findItemDepth(items, originalId);
        if (!activeInfo) return;

        const { parent: activeParent, index: oldIndex } = activeInfo;

        // Вспомогательная функция применения отсортированного массива к state
        const applySortedArray = (sortedArray) => {
            if (activeParent === items) {
                // Верхний уровень
                setPivotParams({ ...pivotParams, [sourceBlock]: sortedArray }, true);
            } else {
                // Вложенный child — ищем путь до родителя и обновляем
                const updateNested = (itemList) => {
                    for (let i = 0; i < itemList.length; i++) {
                        if (itemList[i].child === activeParent) {
                            const newItems = [...itemList];
                            newItems[i] = { ...itemList[i], child: sortedArray };
                            setPivotParams({ ...pivotParams, [sourceBlock]: newItems }, true);
                            return true;
                        }
                        if (itemList[i].child && updateNested(itemList[i].child)) return true;
                    }
                    return false;
                };
                updateNested(items);
            }
        };

        // Если over — контейнер (пустая зона ниже списка) — перемещаем в конец текущего уровня
        if (over.data.current?.type === 'container') {
            const newIndex = activeParent.length - 1;
            if (oldIndex === newIndex) return;
            applySortedArray(arrayMove(activeParent, oldIndex, newIndex));
            return;
        }

        const overInfo = findItemDepth(items, overOriginalId);

        if (!overInfo) return;
        if (activeInfo.depth !== overInfo.depth) return; // не смешиваем уровни
        if (activeInfo.index === overInfo.index) return;

        const { parent: overParent, index: newIndex } = overInfo;

        if (activeParent !== overParent) return; // разные родители — игнор

        applySortedArray(arrayMove(activeParent, oldIndex, newIndex));
        return;
    }

    // Перемещение между разными items-блоками
    const destinationIndex = resolveTargetIndex(over, overOriginalId, pivotParams[destinationBlock]);
    moveSelectedItemsDnd(sourceBlock, destinationBlock, originalId, pivotParams, setPivotParams, destinationIndex);
};

/**
 * Обработчик перетаскивания над элементом (preview / подсветка).
 * Возвращает { container, index } для отображения placeholder, или null
 */
export const onDragOver = (event, pivotParams) => {
    const { over } = event;
    if (!over) return null;

    const source = getDragSource(event);
    if (!source) return null;

    const { sourceBlock } = source;
    const paramType = event.active.data.current?.element?.typeParam ?? null;

    const { destinationBlock, overOriginalId } = getDestination(over);

    if (!destinationBlock || destinationBlock === sourceBlock) return null;
    if (!canDrop(sourceBlock, destinationBlock, paramType)) return null;
    // Не показываем placeholder при перемещении «назад» в fields/layers
    if (destinationBlock === 'fields' || destinationBlock === 'layers') return null;

    const targetIndex = resolveTargetIndex(over, overOriginalId, pivotParams[destinationBlock]);

    return { container: destinationBlock, index: targetIndex };
};

/**
 * Вспомогательная функция перемещения между блоками
 */
export const moveSelectedItemsDnd = (sourceBlock, destinationBlock, itemId, pivotParams, setPivotParams, destinationIndex) => {
    const sourceArray = [...(pivotParams?.[sourceBlock] ?? [])];

    const itemIndex = sourceArray.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) return;

    const [movedItem] = sourceArray.splice(itemIndex, 1);

    const destinationArray = pivotParams?.[destinationBlock] ? [...pivotParams[destinationBlock]] : [];
    destinationArray.splice(destinationIndex, 0, movedItem);

    setPivotParams(
        {
            ...pivotParams,
            [sourceBlock]: sourceArray,
            [destinationBlock]: destinationArray,
        },
        true,
    );
};
