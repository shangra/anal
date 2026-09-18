import type { ReactNode } from 'react';
import { NormalizedNode } from 'components/MetadataHier/types';
import { AddAction } from 'components/MetadataHier/actions/add';
import { SortAction } from 'components/MetadataHier/actions/sort';
import { isDeleteActionVisible, DeleteAction } from 'components/MetadataHier/actions/delete';
import { isEditAccessActionVisible, EditAccessAction } from '../actions/editAccess';
import { isUpdateActionVisible, UpdateAction } from '../actions/update';
import { DeleteIcon, PlusIcon, SortAscIcon, AccessLockIcon, UpdateIcon, TreeDataControlled } from 'ui-kit';

export const getContextMenuActions = (node: NormalizedNode, server: string): ReactNode[] => {
    const treeNode: TreeDataControlled = {
        id: node.nodeKey,
        title: node.name,
        hasChildren: node.expandable,
    };
    const treeNodes = [treeNode];

    const visibleActions: ReactNode[] = [];

    if (node.crud?.includes('c') && node.routes) {
        visibleActions.push(
            <AddAction server={server} nodes={treeNodes}>
                <PlusIcon size="small" />
                <p style={{ userSelect: 'none' }}>Добавить</p>
            </AddAction>,
        );
    }

    if (node.expandable) {
        visibleActions.push(
            <SortAction server={server} nodes={treeNodes}>
                <SortAscIcon size="small" />
                <p style={{ userSelect: 'none' }}>Сортировать</p>
            </SortAction>,
        );
    }

    if (isDeleteActionVisible(server, treeNodes)) {
        visibleActions.push(
            <DeleteAction server={server} nodes={treeNodes} isInContextMenu>
                <DeleteIcon size="small" />
                <p style={{ userSelect: 'none' }}>Удалить</p>
            </DeleteAction>,
        );
    }

    if (isEditAccessActionVisible(node)) {
        visibleActions.push(
            <EditAccessAction server={server} nodes={treeNodes}>
                <AccessLockIcon size="small" />
                <p style={{ userSelect: 'none' }}>Редактировать права</p>
            </EditAccessAction>,
        );
    }

    if (isUpdateActionVisible(server, treeNodes)) {
        visibleActions.push(
            <UpdateAction server={server} nodes={treeNodes} isInContextMenu>
                <UpdateIcon size="small" />
                <p style={{ userSelect: 'none' }}>Обновить</p>
            </UpdateAction>,
        );
    }

    if (visibleActions.length === 0) {
        return [<div style={{ userSelect: 'none', pointerEvents: 'none' }}>Нет доступных действий</div>];
    }

    return visibleActions;
};
