import { updateArrayByItemId } from '../../helpers/params';
import { aggregateNames } from '../../helpers/static';

export const calcGroupItems = (items) => {
    const groups = {};
    const regularItems = [];

    items.forEach((item) => {
        if (item.groupTag && !item.tagLabel) {
            if (!groups[item.groupTag]) {
                groups[item.groupTag] = [];
            }
            groups[item.groupTag].push(item);
        } else if (!item.tagLabel) {
            regularItems.push(item);
        }
    });

    return { groups, regularItems };
};

export const getSearchedItems = (items, searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') {
        return { searchedItems: items, parentIdsToOpen: [], groupTagsToOpen: [] };
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        return { searchedItems: [], parentIdsToOpen: [], groupTagsToOpen: [] };
    }

    const searchLower = searchTerm.toLowerCase();
    const parentIdsToOpen = new Set();
    const groupTagsToOpen = new Set();

    const searchRecursively = (itemList, parentPath = [], currentGroupTag = null, depth = 0) => {
        const result = [];

        for (const originalItem of itemList) {
            const matchesDescription = originalItem.description?.toLowerCase().includes(searchLower);
            const matchesName = originalItem.name?.toLowerCase().includes(searchLower);
            const matchesLabel = originalItem.label?.toLowerCase().includes(searchLower);
            const matchesTagLabel = originalItem.tagLabel?.toLowerCase().includes(searchLower);
            const matchesGroupTag = originalItem.groupTag?.toLowerCase().includes(searchLower);
            const matchesSearch = matchesDescription || matchesTagLabel || matchesGroupTag || matchesName || matchesLabel;

            let matchingChildren = [];
            const hasChildren = originalItem.child && originalItem.child.length > 0;

            //  поиск детей только на 1 уровне вложенности
            if (hasChildren && depth < 1) {
                matchingChildren = searchRecursively(
                    originalItem.child,
                    [...parentPath, originalItem.id],
                    originalItem.groupTag || currentGroupTag,
                    depth + 1,
                );
            }

            // Определяем, нужно ли показывать элемент
            const shouldShow = matchesSearch || matchingChildren.length > 0;

            if (shouldShow) {
                // Если элемент подошел сам по себе - НЕ раскрываем его
                // Если подошли дети - раскрываем родителя
                // Но если подошли и дети, и родитель - раскрыть родителя
                if ((!matchesSearch && matchingChildren.length > 0) || (matchesSearch && matchingChildren.length > 0)) {
                    parentPath.forEach((parentId) => {
                        parentIdsToOpen.add(parentId);
                    });
                    if (originalItem.groupTag) {
                        groupTagsToOpen.add(originalItem.groupTag);
                    }
                    if (currentGroupTag) {
                        groupTagsToOpen.add(currentGroupTag);
                    }
                    // раскрываем текущий элемент
                    parentIdsToOpen.add(originalItem.id);
                }

                if (matchesSearch) {
                    if (originalItem.groupTag) {
                        groupTagsToOpen.add(originalItem.groupTag);
                    }
                    if (currentGroupTag) {
                        groupTagsToOpen.add(currentGroupTag);
                    }
                }

                const whichChildrenToShow = () => {
                    let res;
                    if (matchesSearch) {
                        if (matchingChildren.length > 0) {
                            res = matchingChildren;
                        } else {
                            res = originalItem.child;
                        }
                    } else {
                        res = matchingChildren;
                    }
                    return res;
                };

                const itemCopy = {
                    ...originalItem,
                    child: whichChildrenToShow(),
                    hasChild: matchesSearch ? hasChildren : matchingChildren.length > 0,
                };

                result.push(itemCopy);
            }
        }

        return result;
    };

    const searchResults = searchRecursively(items);
    return {
        searchedItems: searchResults,
        parentIdsToOpen: Array.from(parentIdsToOpen),
        groupTagsToOpen: Array.from(groupTagsToOpen),
    };
};

export const syncItemStates = (currentItems, newItems) => {
    const statesMap = {
        isSelected: new Map(),
        isUsed: new Map(),
    };

    const extractStates = (list) => {
        list?.forEach((item) => {
            if (item.isSelected) statesMap.isSelected.set(item.id, true);
            if (item.isUsed) statesMap.isUsed.set(item.id, true);
            if (item.child?.length) extractStates(item.child);
        });
    };
    extractStates(newItems);

    const updateItems = (list) =>
        list.map((item) => {
            const updated = { ...item };

            // Применяем все состояния
            Object.keys(statesMap).forEach((stateKey) => {
                updated[stateKey] = statesMap[stateKey].has(item.id);
            });

            if (item.child?.length) updated.child = updateItems(item.child);

            return updated;
        });

    return updateItems(currentItems);
};

export const updateSearchResults = (params) => {
    const { items, search, openItems, openGroups } = params;

    // Проверка на пустые items
    if (!items || !Array.isArray(items)) {
        return { searchedItems: [], openItems: {}, openGroups: {} };
    }

    // 1. Фильтруем элементы, убираем aggregateNames
    const filteredItems = items.map((item) => {
        const child = item?.child?.filter((el) => !aggregateNames.includes(el?.name) || item.typeParam === 'Measure');
        return { ...item, child, hasChild: !!child?.length };
    });

    // 2. Форматируем элементы с группами
    const formattedItems = filteredItems.reduce((acc, item) => {
        const hasGroupTag = item.groupTag && item.groupTag !== '';
        const groupNotExist = acc.every((el) => el.tagLabel !== item.groupTag);

        if (groupNotExist && hasGroupTag) {
            acc.push(item);
            acc.push({
                tagLabel: item.groupTag,
                id: `group_${item.groupTag}_${item.typeParam}`,
                typeParam: item.typeParam,
                groupTag: item.groupTag,
            });
        } else {
            acc.push(item);
        }
        return acc;
    }, []);

    const hasActiveSearch = search && search.trim() !== '';

    // 3. Получаем результаты поиска
    let searchedItemsResult;
    let parentIdsToOpen = [];
    let groupTagsToOpen = [];

    if (hasActiveSearch) {
        const result = getSearchedItems(formattedItems, search);
        searchedItemsResult = result.searchedItems;
        parentIdsToOpen = result.parentIdsToOpen || [];
        groupTagsToOpen = result.groupTagsToOpen || [];
    } else {
        searchedItemsResult = formattedItems;
    }

    let itemsWithOpenParents = [...searchedItemsResult];

    // 4. Обработка результатов поиска
    if (hasActiveSearch) {
        // Раскрываем родителей
        parentIdsToOpen.forEach((parentId) => {
            itemsWithOpenParents = updateArrayByItemId(itemsWithOpenParents, parentId, 'isActiveDropdown', true);
        });

        const newOpenItems = {};
        parentIdsToOpen.forEach((parentId) => {
            newOpenItems[parentId] = true;
        });

        const newOpenGroups = {};
        groupTagsToOpen.forEach((groupTag) => {
            newOpenGroups[groupTag] = true;
        });

        return {
            searchedItems: itemsWithOpenParents,
            openItems: newOpenItems,
            openGroups: newOpenGroups,
        };
    }

    // 5. без поиска  - просто применяем сохраненные состояния открытия групп/элементов
    Object.keys(openItems).forEach((itemId) => {
        if (openItems[itemId]) {
            itemsWithOpenParents = updateArrayByItemId(itemsWithOpenParents, itemId, 'isActiveDropdown', true);
        }
    });

    return {
        searchedItems: itemsWithOpenParents,
        openItems,
        openGroups,
    };
};
