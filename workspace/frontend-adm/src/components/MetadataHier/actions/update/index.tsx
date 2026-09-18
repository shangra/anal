import React, { useCallback, useMemo } from 'react';
import { BUTTON_COLOR, BUTTON_SIZE, BUTTON_VARIANT, IconButton, UpdateIcon } from 'ui-kit';
import {
    clearSelectedIds,
    getNodeByKey,
    isRoot,
    reloadRootRecursively,
    handleReloadNode,
    isExpanded,
} from '../../lib/service';
import { clearCache } from 'components/MetadataHier/lib/cache';
import style from '../styles.module.css';
import { IActionProps } from 'components/MetadataHier/actions';
import type { NormalizedNode } from 'components/MetadataHier/types';

export const isUpdateActionVisible = (server: string, nodes: IActionProps['nodes']): boolean => {
    const resolved = nodes.map((n) => getNodeByKey(server, n.id)).filter((n): n is NormalizedNode => Boolean(n));
    const root = resolved.find((n) => isRoot(server, n.nodeKey));
    if (root) return true;
    return resolved.some((n) => n.loadStrategy === 'lazy' && isExpanded(server, n.nodeKey));
};

export const UpdateAction = ({ server, nodes, children }: IActionProps) => {
    const pairs = useMemo<Array<{ node: NormalizedNode; hasChildren: boolean }>>(
        () =>
            nodes
                .map((treeNode) => {
                    const normal = getNodeByKey(server, treeNode.id);
                    return normal ? { node: normal, hasChildren: !!treeNode.hasChildren } : null;
                })
                .filter((p): p is { node: NormalizedNode; hasChildren: boolean } => p !== null),
        [nodes, server],
    );

    // Узел можно обновить, если:
    //  • это корень дерева
    //  • или у него есть дочерние элементы
    const canRefresh = useCallback(
        (normal: NormalizedNode, hasChildren: boolean): boolean =>
            isRoot(server, normal.nodeKey) || hasChildren || normal.expandable || (normal.childrenIds?.length ?? 0) > 0,
        [server],
    );

    // Если родителя можно обновить — потомка убираем, так как вместе с родителем обновится и потомок
    // Если родителя нельзя обновить — потомка оставляем (он может обновиться независимо).
    const effectivePairs = useMemo(
        () =>
            pairs.filter(({ node }, _i, arr) => {
                const hasRefreshableAncestor = arr.some(({ node: ancestor, hasChildren: ah }) => {
                    if (ancestor.nodeKey === node.nodeKey) return false;
                    if (!node.nodeKey.startsWith(`${ancestor.nodeKey}/`)) return false;
                    return canRefresh(ancestor, ah);
                });
                return !hasRefreshableAncestor;
            }),
        [canRefresh, pairs],
    );

    // Кнопка видна когда:
    //  • ничего не выделено (nodes.length === 0) → обновим всё дерево
    //  • хотя бы один эффективный узел можно обновить
    const visible = nodes.length === 0 || effectivePairs.some((p) => canRefresh(p.node, p.hasChildren));

    const handleUpdate = useCallback(async () => {
        try {
            if (effectivePairs.length > 0) {
                const hasRoot = effectivePairs.some(({ node }) => isRoot(server, node.nodeKey));
                if (hasRoot) {
                    clearCache(server);
                    await reloadRootRecursively(server);
                } else {
                    const refreshable = effectivePairs.filter((p) => canRefresh(p.node, p.hasChildren));
                    await Promise.all(refreshable.map((p) => handleReloadNode(server, p.node.nodeKey)));
                }

                if (nodes.length > 1) {
                    clearSelectedIds(server);
                }
            } else {
                // Ничего не выделено — обновляем всё дерево рекурсивно
                clearCache(server);
                await reloadRootRecursively(server);
            }
        } catch (e) {
            console.error(e);
        }
    }, [effectivePairs, nodes.length, server, canRefresh]);

    if (!visible) return null;

    if (children) {
        return (
            <div className={style.buttonContainer} onClick={handleUpdate}>
                {children}
            </div>
        );
    }

    return (
        <IconButton
            icon={UpdateIcon}
            variant={BUTTON_VARIANT.OUTLINED}
            size={BUTTON_SIZE.MEDIUM}
            color={BUTTON_COLOR.SECONDARY}
            onClick={handleUpdate}
            title="Обновить дерево метаданных"
            rounded
        />
    );
};
