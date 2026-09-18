import { useCallback, useMemo } from 'react';
import { BUTTON_COLOR, BUTTON_SIZE, BUTTON_VARIANT, DeleteIcon, IconButton, PopConfirm } from 'ui-kit';
import {
    getNodeByKey,
    clearSelectedIds,
    handleNodeDelete,
    removeNodeOptimistically,
    restoreRemovedNodes,
    filterAncestorNodes,
    type OptimisticDeleteSnapshot,
} from 'components/MetadataHier/lib/service';
import { deleteNode } from 'components/MetadataHier/actions/delete/api/api';
import { IActionProps } from 'components/MetadataHier/actions';
import type { NormalizedNode } from 'components/MetadataHier/types';
import $message from 'components/ui/MyFlash/message.helper';

import style from '../styles.module.css';

export const isDeleteActionVisible = (server: string, nodes: IActionProps['nodes']): boolean => {
    const targets = nodes
        .map((n) => getNodeByKey(server, n.id))
        .filter((n): n is NormalizedNode => Boolean(n))
        .filter((n) => n.crud?.includes('d'));
    return targets.length > 0;
};

export const DeleteAction = ({ server, nodes, children, isInContextMenu }: IActionProps) => {
    const allTargets = useMemo<NormalizedNode[]>(
        () =>
            nodes
                .map((n) => getNodeByKey(server, n.id))
                .filter((n): n is NormalizedNode => Boolean(n))
                .filter((n) => n.crud?.includes('d')),
        [nodes, server],
    );

    // Фильтруем выделенные элементы, которые являются потомками других выделенных элементов
    const targets = useMemo<NormalizedNode[]>(() => filterAncestorNodes(allTargets), [allTargets]);

    const handleConfirm = useCallback(async () => {
        if (targets.length === 0) return;

        // оптимистичное удаление
        const snapshots: OptimisticDeleteSnapshot[] = targets.map((n) => removeNodeOptimistically(server, n.nodeKey));

        if (!isInContextMenu) {
            clearSelectedIds(server);
        }

        try {
            await Promise.all(targets.map((n) => deleteNode(n, server)));

            await Promise.all(targets.map((n) => handleNodeDelete(server, n.nodeKey)));

            $message.show(targets.length > 1 ? 'Объекты успешно удалены!' : 'Объект успешно удалён!');
        } catch (e) {
            console.error(e);
            // Откатываем оптимистичное удаление для каждого узла, который мы трогали
            snapshots.forEach((snap) => restoreRemovedNodes(server, snap));
            $message.show('Ошибка при удалении');
        }
    }, [targets, server, isInContextMenu]);

    const confirmContent = (() => {
        if (targets.length === 0) return undefined;
        if (isInContextMenu || targets.length === 1) {
            return `Вы действительно хотите удалить объект "${targets[0].name}"?`;
        }
        return `Вы действительно хотите удалить ${targets.length} объекта(-ов)?`;
    })();

    if (targets.length === 0) return null;

    if (children) {
        return (
            <div
                onClick={(e) => {
                    e.stopPropagation();
                }}
            >
                <PopConfirm containerFullWidth content={confirmContent} onConfirm={handleConfirm}>
                    <div className={style.buttonContainer}>{children}</div>
                </PopConfirm>
            </div>
        );
    }

    return (
        <PopConfirm content={confirmContent} onConfirm={handleConfirm}>
            <IconButton
                icon={DeleteIcon}
                size={BUTTON_SIZE.MEDIUM}
                color={BUTTON_COLOR.ERROR}
                rounded
                variant={BUTTON_VARIANT.OUTLINED}
                title="Удалить элемент"
            />
        </PopConfirm>
    );
};
