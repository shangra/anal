import { List, Loader, Pagination } from 'ui-kit';
import styles from './AccessList.module.css';
import { useState, useCallback } from 'react';
import { AccessGroup } from 'components/AccessMatrix/network';

interface AccessListItemProps<T> {
    items: T[];
    allItems: T[];
    idGetter: (item: T) => string;
    labelGetter: (item: T) => string;
    type: 'users' | 'roles' | 'rules' | 'groups';
    isEditing: boolean;
    onToggleItem?: (group: AccessGroup, id: string, isSelected?: boolean) => Promise<void>;
    currentGroup: AccessGroup;
    onPageChange?: (group: AccessGroup, page: number) => void;
    total?: number;
    offset?: number;
    isPagination?: boolean;
    _isListLoading?: boolean;
}

const AccessListItem = <T extends object>({
    items,
    allItems,
    idGetter,
    labelGetter,
    type,
    isEditing,
    onToggleItem,
    currentGroup,
    onPageChange,
    total = 0,
    offset = 0,
    isPagination = false,
    _isListLoading = false,
}: AccessListItemProps<T>) => {
    const limit = 20;
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    const [loadingIds, setLoadingIds] = useState<string[]>([]);

    // Move getHint outside of renderViewMode
    const getHint = useCallback(
        (item: any): string => {
            switch (type) {
                case 'users':
                    return item.login;
                case 'roles':
                case 'rules':
                    return item.details;
                case 'groups':
                    return item.info;
                default:
                    return '';
            }
        },
        [type],
    );

    const handleChange = useCallback(
        (checkedValues: string[]) => {
            const currentIds = items.map(idGetter);

            // Найдём добавленный элемент
            if (checkedValues.length > currentIds.length) {
                const addedId = checkedValues.find((id) => !currentIds.includes(id));
                if (addedId && onToggleItem) {
                    setLoadingIds((prev) => [...prev, addedId]);
                    onToggleItem(currentGroup, addedId, true).finally(() => {
                        setLoadingIds((prev) => prev.filter((id) => id !== addedId));
                    });
                }
            }

            // Найдём удалённый элемент
            if (checkedValues.length < currentIds.length) {
                const removedId = currentIds.find((id) => !checkedValues.includes(id));
                if (removedId && onToggleItem) {
                    setLoadingIds((prev) => [...prev, removedId]);
                    onToggleItem(currentGroup, removedId, false).finally(() => {
                        setLoadingIds((prev) => prev.filter((id) => id !== removedId));
                    });
                }
            }
        },
        [items, idGetter, onToggleItem, currentGroup],
    );

    const editModeOptions = useCallback(
        () =>
            allItems.map((item) => ({
                label: labelGetter(item),
                value: idGetter(item),
                disabled: loadingIds.includes(idGetter(item)),
            })),
        [allItems, labelGetter, idGetter, loadingIds],
    );

    const viewModeOptions = useCallback(
        () =>
            items.map((item) => ({
                label: labelGetter(item),
                hint: getHint(item),
            })),
        [items, labelGetter, getHint],
    );

    const actions = useCallback(
        (option: { value?: string }) =>
            option.value && loadingIds.includes(option.value) ? <Loader size="small" /> : undefined,
        [loadingIds],
    );

    if (isEditing && onToggleItem) {
        return (
            <div>
                <List
                    type="multiple"
                    options={editModeOptions()}
                    className={styles.listComponent}
                    value={items.map(idGetter)}
                    onChange={handleChange}
                    actions={actions}
                    // loading={isListLoading} // TODO: когда сделают нормальную загрузку списка
                />
                {totalPages > 1 && isPagination && onPageChange && (
                    <div className={styles.pagination}>
                        <Pagination
                            page={currentPage}
                            countPage={totalPages}
                            onSetPage={(page) => onPageChange(currentGroup, page)}
                        />
                    </div>
                )}
            </div>
        );
    }

    return <List type="unselectable" options={viewModeOptions()} className={styles.listComponent} />;
};

export default AccessListItem;
