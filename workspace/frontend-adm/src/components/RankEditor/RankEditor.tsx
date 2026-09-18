import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchRankingList, saveRankList } from 'components/RankEditor/api/api';
import { SortableList } from 'components/SortableList/SortableList';
import $modal from 'components/ui/MyModal/modal.helper';
import { Button, BUTTON_COLOR, BUTTON_VARIANT } from 'ui-kit';
import { SortableListItem } from 'components/SortableListItem';
import { HandEditSwitch, SortButton } from 'components/RankEditor/components';
import type { RankItem } from 'components/RankEditor/types';
import { getChildrenByKey, reorderChildrenLocally, findNearestLazyAncestor } from 'components/MetadataHier/lib/service';

interface RankEditorProps {
    server: string;
    mode: 'db' | 'local';
    classId: string;
    parentId: string;
    /** nodeKey узла, чьи дети сортируются — нужен для локального режима */
    nodeKey: string;
    callback: () => Promise<void>;
}

export const RankEditor = ({ server, mode, classId, parentId, nodeKey, callback }: RankEditorProps) => {
    const [items, setItems] = useState<RankItem[]>([]);
    const originalItems = useRef<RankItem[]>([]);
    const [isHandEdit, setIsHandEdit] = useState(false);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        if (mode === 'local') {
            // Нехранимые поля: список берём из уже загруженного дерева, без сети.
            const localItems: RankItem[] = getChildrenByKey(server, nodeKey).map((node) => ({
                id: node.id,
                code: 0,
                parent: findNearestLazyAncestor(server, node.nodeKey)?.id ?? '',
                class_id: node.classId ?? '',
                class: node.class ?? '',
                name: node.name,
                description: node.description,
                manifest: '',
                rank: 0,
            }));
            originalItems.current = localItems;
            setItems(localItems);
            setLoading(false);
            setLoadError(false);
            return;
        }

        setLoading(true);
        setLoadError(false);
        fetchRankingList(server, classId, parentId)
            .then((data) => {
                const sorted = [...(data.children ?? [])].sort((a, b) => a.rank - b.rank);
                originalItems.current = sorted;
                setItems(sorted);
            })
            .catch(() => {
                setLoadError(true);
                originalItems.current = [];
                setItems([]);
            })
            .finally(() => setLoading(false));
    }, [mode, server, classId, parentId, nodeKey]);

    const handleHandEditChange = useCallback(() => {
        setIsHandEdit((prev) => !prev);
    }, [setIsHandEdit]);

    const handleListChange = useCallback((reorderedList: RankItem[]) => {
        setItems(reorderedList.map((item, index) => ({ ...item, rank: index })));
    }, []);

    const handleSortDirectionChange = useCallback((direction: 'asc' | 'desc' | undefined) => {
        setItems(() => {
            if (direction === undefined) return [...originalItems.current];
            return [...originalItems.current].sort((a, b) => {
                const cmp = a.name.localeCompare(b.name, 'ru');
                return direction === 'asc' ? cmp : -cmp;
            });
        });
    }, []);

    const handleSave = useCallback(async () => {
        setSaving(true);

        try {
            if (mode === 'local') {
                // Только локальная перестановка в сторе дерева, без запроса на сервер.
                reorderChildrenLocally(server, nodeKey, items.map((item) => item.id));
            } else {
                await saveRankList(server, classId, parentId, items);
            }
            $modal.hide();
            await callback();
        } finally {
            setSaving(false);
        }
    }, [mode, server, classId, parentId, nodeKey, items, callback]);

    if (loading) return <div>Загрузка...</div>;
    if (loadError) return null;

    const isEmpty = items.length === 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '60vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
                <SortButton onChange={handleSortDirectionChange} />
                <HandEditSwitch isHandEdit={isHandEdit} onChange={handleHandEditChange} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <SortableList
                    items={items}
                    onChange={handleListChange}
                    renderItem={(item) => <SortableListItem name={item.name} />}
                    isDisabled={!isHandEdit}
                />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
                <Button onClick={handleSave} disabled={saving} color={BUTTON_COLOR.PRIMARY}>
                    {saving ? 'Сохранение...' : 'Сохранить'}
                </Button>
                <Button
                    onClick={() => {
                        $modal.hide();
                    }}
                    color={BUTTON_COLOR.SECONDARY}
                    variant={BUTTON_VARIANT.OUTLINED}
                >
                    Отменить
                </Button>
            </div>
        </div>
    );
};
